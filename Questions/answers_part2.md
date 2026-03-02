# INTERVIEW ANSWERS — PART 2 (Sections E, F, G)

# Backend / MongoDB / Authentication

---

## SECTION E — BACKEND (Node.js + Express)

**E1. What is Express.js?**
Express is a minimal Node.js web framework. It handles HTTP routing, middleware chaining, and request/response management. In this project it powers the REST API on port 5000 with three route groups: /api/chat, /api/admin, /api/auth.

**E2. What are the three route files?**
`chat.js` — handles all chatting: send message, get history, list/delete sessions. `admin.js` — handles document management: list documents, ingest PDF, list users. `auth.js` — handles user synchronization to MongoDB on login.

**E3. Walk me through POST /api/chat step by step.**

1. express-validator checks session_id is not empty. 2. Destructure {session_id, query, file_b64, mime_type, userEmail} from req.body. 3. Return 400 if no query AND no file. 4. Save user message to MongoDB via Message.create(). 5. Fetch last 5 messages of this session for context. 6. Call generateResponse(query, recentMessages, file_b64, mime_type) from rag.js. 7. Inside generateResponse: embed query → vector search → build context → send to Gemini. 8. Save assistant message with sources_used to MongoDB. 9. Return {message, sources} as JSON.

**E4. What is express-validator? Where is it used?**
A middleware library for validating and sanitizing request data. In chat.js: `body('session_id').notEmpty()` ensures the session_id field exists and is not blank. `validationResult(req)` collects any validation errors and returns a 400 if any exist.

**E5. What is a session_id and how is it generated?**
A session_id is a unique string identifier for one conversation thread. Generated on the frontend:

```javascript
`session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
// e.g., "session_1709123456789_x7k2m"
```

Date.now() provides timestamp uniqueness; the random suffix prevents collisions within the same millisecond.

**E6. Why do you fetch the last 5 messages for context?**
To provide the LLM with recent conversation history so it can answer follow-up questions. Without this, "What about the refund for that?" would have no context. We limit to 5 to keep the prompt size small — passing 50 messages would exceed context windows and add latency.

**E7. What is Multer?**
A Node.js middleware for handling `multipart/form-data` (file uploads). In admin.js: `const upload = multer({ dest: 'uploads/' })` saves uploaded files to the uploads/ directory with a generated filename. The route uses `upload.single('pdf')` to process one file field named "pdf".

**E8. What is pdf-parse and how does it work?**
`pdf-parse` is a Node.js library that extracts raw text from PDF files. It takes a Buffer (file contents), parses the PDF structure, and returns a `data` object where `data.text` contains all extracted text as a string. It does not preserve formatting or images.

**E9. Why is ingestPDF() called without await?**

```javascript
ingestPDF(req.file.path, document._id); // no await
res.json({ message: "PDF upload started" }); // returns immediately
```

PDF processing (text extraction + embedding every chunk) can take 30-60 seconds for large documents. If we awaited, the HTTP request would time out (typically 30s). By firing without await, the route returns immediately with "upload started" while processing continues in the background Node.js event loop.

**E10. Risk of fire-and-forget ingestion and production fix?**
Risk: If the server crashes mid-ingestion, the job is silently lost. The document record stays in "pending" status forever, and no one knows. Fix: Use a proper job queue — BullMQ with Redis. The job is persisted to Redis, can be retried on failure, progress can be tracked, and workers can be scaled independently.

**E11. What status values can a Document have?**
Three values: `'pending'` — created in DB when upload starts, ingestion not done yet. `'ingested'` — all chunks embedded and stored successfully. `'failed'` — an error occurred during processing (set in the catch block).

**E12. What does fs.unlinkSync() do and why?**
`fs.unlinkSync(filePath)` synchronously deletes a file from disk. Called after successful ingestion to remove the temporary file that Multer saved to the `uploads/` directory. Without this, the uploads folder would grow indefinitely, consuming disk space.

**E13. What is CORS and how is it configured?**
CORS (Cross-Origin Resource Sharing) is a browser security policy that blocks requests from a different origin (domain/port) unless the server explicitly allows it. Config:

```javascript
cors({
  origin: ["https://upi-rag.netlify.app", "http://localhost:3000"],
  credentials: true,
});
```

Only these two origins can call the API. `app.options("*", cors())` handles preflight OPTIONS requests.

**E14. Why is credentials: true needed in CORS?**
Browsers don't send cookies or auth headers to cross-origin requests by default. NextAuth uses cookies for the NextAuth session. `credentials: true` on the server, combined with `withCredentials: true` in Axios on the frontend, allows cookies to be sent and received cross-origin.

**E15. What is dotenv?**
`dotenv` reads the `.env` file in the current directory and loads its key-value pairs into `process.env`. Called immediately at server startup: `dotenv.config()`. This keeps secrets (API keys, DB passwords) out of the source code.

**E16. What does process.exit(1) mean in db.js?**
It terminates the Node.js process with exit code 1 (error). Called if MongoDB connection fails at startup. Exit code 0 = success; non-zero = failure. Since the entire app depends on the database, there's no point running without it.

**E17. Difference between ES Modules and CommonJS?**
CommonJS (default Node.js): `require()` and `module.exports`. ES Modules: `import` and `export`. The backend has `"type": "module"` in package.json, enabling ES module syntax (`import express from 'express'`). ES Modules support static analysis and tree-shaking; the syntax is also used in the frontend, making the codebase consistent.

**E18. What is nodemon and why is it a devDependency?**
Nodemon watches your source files and automatically restarts the Node.js server when you save a change. It's only needed during development — in production you don't want the server restarting on every file change, so it's a devDependency.

**E19. What is the /api/health endpoint for?**
A health check endpoint: `GET /api/health → { status: 'ok', message: 'UPI Assistant API is running' }`. Used by load balancers, uptime monitors (e.g., UptimeRobot), and deployment platforms to verify the server is alive. Returns 200 = healthy, any other code = unhealthy.

**E20. How does the delete session route work?**

```javascript
router.delete("/sessions/:sessionId", async (req, res) => {
  const result = await Message.deleteMany({ session_id: sessionId, userEmail });
  // deleteMany removes ALL messages in that session for that user
});
```

We also scope by userEmail so users can only delete their own sessions.

---

## SECTION F — MONGODB & MONGOOSE

**F1. What is Mongoose? What is a schema?**
Mongoose is an ODM (Object Document Mapper) for MongoDB in Node.js. A schema defines the shape of documents in a collection — field names, types, validations, defaults. It provides structure to MongoDB's otherwise schema-less documents.

**F2. Describe the User schema.**

```javascript
{ email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now } }
```

Email is normalized to lowercase and trimmed. Role is enum-constrained. The unique constraint prevents duplicate accounts.

**F3. Describe the Message schema.**

```javascript
{ session_id: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources_used: [String],  // filenames of PDFs used in RAG retrieval
  timestamp: { type: Date, default: Date.now },
  userEmail: { type: String, required: false } }
```

sources_used stores the filenames of the PDFs whose chunks were retrieved for that response.

**F4. Describe the DocumentChunk schema. Why embedding: [Number]?**

```javascript
{ documentId: ObjectId (ref: 'Document'),
  text: String (required),
  embedding: [Number] (required),  // 384 floats
  metadata: Mixed (default: {}) }
```

`[Number]` stores an array of floating-point values — the 384-dimensional vector. MongoDB Atlas Vector Search works on this field with a vectorSearch index.

**F5. Describe the Document schema.**
Stores metadata about uploaded PDFs: filename, source_domain (e.g., "NPCI Guidelines"), doc_category (array of tags), status ('pending'/'ingested'/'failed'), chunk_count, uploaded_at timestamp.

**F6. What does index: true on session_id and email do?**
Creates a B-tree index in MongoDB. Without it, queries like `Message.find({ session_id: ... })` require a full collection scan — O(n). With the index, MongoDB jumps directly to matching documents — O(log n). Critical for performance as message count grows.

**F7. What does unique: true on email do?**
Creates a unique index — MongoDB rejects any insert/update that would result in two documents with the same email value. If you try to insert a duplicate, MongoDB throws a `duplicate key error`.

**F8. What do lowercase: true and trim: true do on email?**
`lowercase: true` automatically converts the value to lowercase before saving ("User@Gmail.COM" → "user@gmail.com"). `trim: true` removes leading/trailing whitespace. Both ensure consistent email matching regardless of how the user typed their email.

**F9. What is findOneAndUpdate? What does upsert: true mean?**

```javascript
User.findOneAndUpdate(
  { email: email }, // filter
  { $set: { name, role, lastLogin } }, // update
  { upsert: true, new: true }, // options
);
```

It finds one document matching the filter and updates it. `upsert: true` means if no document matches, MongoDB creates a new one. This is the "create if not exists, update if exists" (upsert) pattern — perfect for user synchronization.

**F10. What does { new: true } mean?**
By default, findOneAndUpdate returns the document as it was BEFORE the update. `{ new: true }` makes it return the document AFTER the update — so you get the freshly updated values in the response.

**F11. What is an aggregation pipeline in MongoDB?**
A sequence of data transformation stages applied to a collection's documents. Each stage transforms the data and passes the result to the next stage. Like a Unix pipe for database operations: `collection | stage1 | stage2 | stage3 → result`.

**F12. Explain the sessions aggregation pipeline.**
Stage 1 `$match`: filter messages by userEmail. Stage 2 `$group`: group by session_id, capture the first user message as title using `$first + $cond`, and `$min: '$timestamp'` for the earliest message time. Stage 3 `$project`: reshape output — rename \_id to id, use the captured title or 'New Chat'. Stage 4 `$sort`: order by createdAt descending (newest first).

**F13. What does $min: '$timestamp' do?**
In the `$group` stage, `$min` returns the smallest (earliest) value of timestamp across all messages in each session group. This gives us the start time of each conversation, used as `createdAt` for the sidebar.

**F14. What does $cond do? How is it used for title?**
`$cond` is MongoDB's ternary operator: `[condition, valueIfTrue, valueIfFalse]`.

```javascript
title: {
  $cond: [
    { $ne: ["$firstUserMessage", null] },
    "$firstUserMessage",
    "New Chat",
  ];
}
```

If the first user message is not null, use it as the title; otherwise use 'New Chat'. This is needed because $first might capture an assistant message if the user message was somehow missing.

**F15. How does the admin/users $lookup work?**

```javascript
$lookup: { from: 'messages', localField: 'email', foreignField: 'userEmail', as: 'messages' }
```

Like a SQL LEFT JOIN — for each User document, MongoDB finds all Message documents where `message.userEmail === user.email` and attaches them as an array called `messages`. Each user document then has their full message history embedded.

**F16. What does { $size: "$messages" } compute?**
Returns the number of elements in the `messages` array — the total message count for that user (both user messages and assistant messages combined). Displayed in the admin console as "X chats."

**F17. What does $max: "$messages.timestamp" compute?**
Returns the most recent timestamp from all of a user's messages — used as `lastActive`. If they have no messages, it falls back to `lastLogin` via the $cond operator.

**F18. What does .lean() do in Mongoose?**

```javascript
const allChunks = await DocumentChunk.find({}, {...}).lean();
```

`.lean()` returns plain JavaScript objects instead of full Mongoose document objects. Mongoose documents have getters, setters, validation methods, and instance methods — all overhead. `.lean()` skips that instantiation, making queries significantly faster when you only need to read data.

**F19. What does .sort({ timestamp: -1 }) mean?**
Sort documents by the `timestamp` field in descending order (-1). So the most recent messages come first. Used in chat history to get recent messages: `.sort({ timestamp: -1 }).limit(5)`.

**F20. What is mongoose.Schema.Types.Mixed?**
A schema type that accepts any value — object, array, string, number, nested object. Used for the `metadata` field in DocumentChunk because metadata content varies: `{ source: "NPCI.pdf", chunk_index: 3 }`. Without Mixed, you'd have to define every possible metadata property upfront.

---

## SECTION G — AUTHENTICATION

**G1. What is NextAuth.js?**
NextAuth.js is an authentication library for Next.js. It handles OAuth flows, session management, JWT creation/verification, and custom credential validation out of the box. The `/api/auth/[...nextauth]/route.ts` file is a catch-all route that handles all auth-related endpoints: sign-in, sign-out, callback, session.

**G2. What session strategy does your app use?**
`strategy: "jwt"` — JSON Web Token strategy. Sessions are stored as encrypted cookies in the browser, not in a database. On each request, the token is decoded and verified using NEXTAUTH_SECRET. No session table in the database is needed.

**G3. Difference between JWT and session-based auth?**
Database sessions: a session ID is stored in a cookie; a lookup table maps that ID to user data on every request — state is on the server. JWT: all user data (email, role) is encoded inside the signed token in the cookie — state is on the client. JWT is stateless (scales easier, no DB lookup per request) but tokens cannot be revoked until they expire.

**G4. Two providers you support?**

1. `GoogleProvider` — full OAuth 2.0 PKCE flow with Google. 2. `CredentialsProvider` — custom username/password handler that accepts any credentials for demo purposes.

**G5. What is GoogleProvider and what does it need?**
GoogleProvider implements the Google OAuth 2.0 flow. Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console. The user is redirected to Google's consent screen, authorizes, and Google redirects back to `/api/auth/callback/google` with an authorization code which NextAuth exchanges for a token.

**G6. What does your authorize() function do in CredentialsProvider?**

```javascript
async authorize(credentials) {
    if (credentials.username === "admin" && credentials.password === "admin")
        return { id: "1", name: "Admin User", email: "admin@example.com" };
    const isEmail = credentials.username.includes("@");
    const email = isEmail ? credentials.username : `${credentials.username}@example.com`;
    return { id: Math.random().toString(), name: credentials.username.split("@")[0], email };
}
```

Demo mode: accepts any credentials. "admin"/"admin" returns a hardcoded admin user. Any email-formatted input is used as-is; non-email inputs get @example.com appended.

**G7. What is NEXTAUTH_SECRET and what happens if missing?**
A secret string used to sign and encrypt JWT tokens and cookies. Without it (or with a weak one), tokens could be forged — compromising the entire auth system. The code provides a fallback for development, but in production it should always be set as a strong random string.

**G8. How do you determine if a user is admin?**

```javascript
const adminEmail = (process.env.SUPERADMIN_EMAIL || "admin@example.com")
  .trim()
  .toLowerCase();
const userEmail = (user.email || "").trim().toLowerCase();
const role = userEmail === adminEmail ? "admin" : "user";
```

If the authenticated user's email matches the `SUPERADMIN_EMAIL` environment variable, they get the "admin" role. Normalized with trim() and toLowerCase() to prevent whitespace/case issues.

**G9. Where is the role stored?**
In the JWT token as `token.role`. The jwt callback runs on every sign-in and token refresh, embedding the role into the token payload. The session callback then surfaces `token.role` as `session.user.role`.

**G10. Three NextAuth callbacks?**
`signIn({ user })` — fires after successful auth. Used to sync user to MongoDB backend. `jwt({ token, user })` — fires when a JWT is created/updated. Used to embed role in the token. `session({ session, token })` — fires when a session is accessed client-side. Used to expose role and email to `useSession()`.

**G11. What does the signIn callback do?**
It fires a fire-and-forget `fetch` to our Node.js backend at `POST /api/auth/sync` with the user's email, name, and computed role. This creates or updates the user record in MongoDB. It always returns `true` to allow sign-in even if the sync fails.

**G12. What does the jwt callback do?**
Only fires with a `user` object on initial sign-in (not on subsequent token refreshes unless the token changes). Sets `token.role` based on the admin email comparison, and ensures `token.email` is always present. On subsequent requests, the token is passed through unchanged.

**G13. What does the session callback do?**
Called every time `useSession()` is invoked on the client. Takes the JWT token's data and attaches it to the session object: `(session.user as any).role = token.role` and `session.user.email = token.email`. This makes the role available throughout the React app.

**G14. What is the custom signIn page?**
`pages: { signIn: "/login" }` tells NextAuth to redirect all `signIn()` calls to `/app/login/page.tsx` instead of NextAuth's default sign-in page. We have a custom-designed login UI.

**G15. What is (session.user as any).role?**
NextAuth's default TypeScript type for `session.user` doesn't include a `role` field. `as any` is a TypeScript type assertion that bypasses the type checker, allowing us to access the custom `role` property we added in the session callback. In production, you'd extend the NextAuth types properly using module augmentation.

**G16. How is the admin page protected?**

```javascript
if (status === "unauthenticated") router.push("/login");
else if (status === "authenticated" && session.user?.role !== "admin")
  router.push("/");
```

Client-side guard in the admin page's useEffect. Non-admins are redirected to the home page immediately.

**G17. What is OAuth? How does Google OAuth work?**
OAuth 2.0 is an authorization framework. Google OAuth: (1) User clicks "Sign in with Google" → redirect to Google. (2) Google shows consent screen. (3) User approves → Google redirects back with an authorization code. (4) NextAuth exchanges that code for access_token and id_token via Google's token endpoint. (5) User profile extracted from id_token. (6) NextAuth creates a JWT session.

**G18. Access token vs refresh token?**
Access token: short-lived (1 hour), proves authentication for API calls. Refresh token: long-lived, used to obtain new access tokens without re-login. NextAuth manages this internally when using OAuth providers.

**G19. What is the Authorized redirect URI in Google Cloud Console?**
`http://localhost:3000/api/auth/callback/google` for development and `https://upi-rag.netlify.app/api/auth/callback/google` for production. Google will only redirect to these whitelisted URIs after OAuth consent — prevents token theft via redirect hijacking.
