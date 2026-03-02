# INTERVIEW ANSWERS — PART 3 (Sections H, I, J)

# Frontend / System Prompt & AI / Python-Flask Layer

---

## SECTION H — FRONTEND (Next.js + React)

**H1. What is Next.js? What is the App Router?**
Next.js is a React framework that adds server-side rendering (SSR), file-based routing, API routes, and build optimization on top of React. The App Router (Next.js 13+) uses the `app/` directory where every folder with a `page.tsx` becomes a route. Routes are server components by default. It replaces the older `pages/` directory approach.

**H2. What is the "use client" directive?**
Next.js components are server components by default (run on the server, no browser APIs). `"use client"` at the top of a file marks it as a Client Component — it runs in the browser and can use React hooks (`useState`, `useEffect`), browser APIs (`window`, `document`), and event handlers. ChatInterface.tsx requires `"use client"` because it uses useState, useEffect, useRef, and event handlers.

**H3. What are the main state variables in ChatInterface?**
`messages` — current conversation's messages array. `input` — textarea value. `loading` — shows typing indicator when true. `sessionId` — current session string ID. `sessions` — list of all past sessions for the sidebar. `sidebarOpen` — sidebar collapse state. `selectedFile`, `fileBase64`, `fileMimeType` — file attachment state. `profileMenuOpen` — user dropdown visibility. `mounted` — hydration fix flag.

**H4. What is useCallback and why wrap loadSessions in it?**
`useCallback(fn, [deps])` memoizes a function so it doesn't get recreated on every render. `loadSessions` is listed as a dependency in the sessions useEffect. Without `useCallback`, a new function reference is created each render, causing an infinite loop: render → new loadSessions → useEffect re-runs → re-render → new loadSessions... `useCallback` stabilizes the reference.

**H5. What three refs are used?**
`scrollRef` — div at the bottom of messages, scrolled into view on new messages. `textareaRef` — the input textarea, used to auto-resize its height based on content. `fileInputRef` — the hidden file input element, programmatically cleared (`fileInputRef.current.value = ""`) after removing an attachment.

**H6. How does auto-scroll work?**

```javascript
useEffect(() => {
  scrollRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, loading]);
```

A `<div ref={scrollRef} />` is placed at the very end of the message list. Whenever messages or loading changes (new message added, or AI typing indicator appears), this element scrolls into the viewport smoothly using the browser's native scrollIntoView API.

**H7. How does textarea auto-resize work?**

```javascript
useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = "auto"; // reset
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 160) + "px";
  }
}, [input]);
```

First reset to "auto" to collapse. Then set to scrollHeight (the content's actual height), capped at 160px. This makes the textarea grow as the user types and shrink when they delete text.

**H8. What is the hydration mismatch problem and your fix?**
Next.js pre-renders pages on the server (SSR). On the server, there's no knowledge of the user's dark/light theme preference. If the server renders a Sun icon but the client renders a Moon icon, React throws a hydration mismatch error. The fix: `const [mounted, setMounted] = useState(false)`. On server: mounted=false, render nothing. After client mount (useEffect): mounted=true, render the correct theme icon.

**H9. What is react-markdown and remark-gfm?**
`react-markdown` converts a markdown string into React elements — headings, bold, lists, code blocks, links, etc. `remark-gfm` is a remark plugin that adds GitHub Flavored Markdown support: tables, strikethrough, task lists, and autolinks. Used to render AI responses which contain markdown.

**H10. How does the custom code renderer in ReactMarkdown work?**
The `components` prop of ReactMarkdown lets you override how specific HTML elements are rendered. The `code` override checks if the code block is inline or block (`if (!inline)`). For block code: renders a dark container with two overlay buttons — Copy (copies to clipboard, shows Check icon for 2s) and Download PDF (uses jsPDF to save the code as a .pdf file).

**H11. What is jsPDF? How do you export complaint letters?**
jsPDF is a JavaScript library for generating PDF files in the browser. The complaint template is formatted inside a triple-backtick block by the AI. When the user clicks the Download button on that code block:

```javascript
const doc = new jsPDF();
doc.setFont("helvetica", "normal");
doc.setFontSize(11);
const splitText = doc.splitTextToSize(codeString, 180);
doc.text(splitText, 15, 20);
doc.save("Complaint_Letter.pdf");
```

This creates and downloads a formatted PDF directly in the browser — no server round-trip.

**H12. What is useSession() from NextAuth?**
A React hook provided by `next-auth/react` that returns `{ data: session, status }`. `session` contains the user object (email, name, role) from the JWT token. `status` is "loading", "authenticated", or "unauthenticated". The component re-renders automatically when the auth state changes.

**H13. How does file attachment work in chat?**
User clicks the paperclip icon → hidden file `<input ref={fileInputRef}>` is triggered. `handleFileChange` fires: sets `selectedFile` (File object), sets `fileMimeType` (file.type). Uses `FileReader.readAsDataURL(file)` to read the file as a base64 data URL string. In the `onload` callback, strips the `"data:mime/type;base64,"` prefix and stores the raw base64 in `fileBase64` state.

**H14. Why do you split(",")[1] from the FileReader result?**
`FileReader.readAsDataURL()` returns a string like: `"data:application/pdf;base64,JVBERi0xLjQ..."`. The actual base64 content is after the comma. `resultString.split(",")[1]` extracts just the base64 payload, which is what Gemini's `inlineData.data` expects.

**H15. What is the sendMessage function flow?**

1. Validate: has query or file, not currently loading. 2. Optimistically add user message to UI immediately (don't wait for server). 3. Clear input and file attachment. 4. POST to /api/chat with {session_id, query, file_b64, mime_type, userEmail}. 5. On success: append assistant message to messages array. 6. If first message: refresh sessions list. 7. On error: append error message. 8. Finally: setLoading(false).

**H16. What is "optimistic UI"? Does your chat use it?**
Optimistic UI means updating the UI immediately before the server response arrives, assuming the request will succeed. Yes — the user's message appears in the chat instantly when they press send, before the API call completes. This makes the app feel fast and responsive.

**H17. How does session history load from the server?**
`loadSessions()` calls `GET /api/chat/sessions?email=user@email.com` which returns all sessions for that user sorted newest-first. Displayed in the sidebar. When the user clicks a session, `loadSession(sid)` calls `GET /api/chat/history/:sid?email=...` which returns all messages for that session.

**H18. What framework is used for icons?**
`lucide-react` — a tree-shakeable React icon library with 1000+ SVG icons (Bot, Send, Trash2, Menu, etc). Icons are used as JSX components: `<Bot className="w-4 h-4 text-white" />`.

**H19. What is withCredentials: true in Axios?**
Tells Axios to include cookies in cross-origin requests. This is required for NextAuth session cookies to be sent with every API call to the Express backend (different origin/port). Must be paired with `credentials: true` in the backend's CORS config.

**H20. How does theme toggling work?**
`next-themes` provides `ThemeProvider` (wrapped in `app/layout.tsx`) and the `useTheme()` hook. `const { theme, setTheme } = useTheme()`. Clicking the toggle: `setTheme(theme === "dark" ? "light" : "dark")`. next-themes persists the choice to localStorage and applies a `dark` class to the `<html>` element, which Tailwind's dark mode variant reads.

**H21. What is TransactionAnalyzer and where is it shown?**
A widget displayed on the welcome screen (before any messages exist). Users paste a suspicious UPI SMS or transaction description → click "Analyze Risk" → the component sends a specially structured prompt to the same /api/chat endpoint → parses the JSON response → displays a color-coded risk card (High=red, Medium=amber, Low=green) with reasoning and next steps.

**H22. How is the profile dropdown closed on outside click?**

```jsx
{
  profileMenuOpen && (
    <>
      {/* Transparent backdrop covers the entire screen */}
      <div
        className="fixed inset-0 z-10"
        onClick={() => setProfileMenuOpen(false)}
      />
      {/* Dropdown sits above the backdrop at z-20 */}
      <div className="absolute right-0 top-full ... z-20"> ... </div>
    </>
  );
}
```

A transparent full-screen div captures any click outside the dropdown and closes it. The dropdown itself is at a higher z-index so clicks inside it don't propagate to the backdrop.

**H23. What happens when you click "Share"?**

```javascript
const url = `${window.location.origin}/share/${sessionId}`;
navigator.clipboard.writeText(url);
alert("Read-only chat link copied to clipboard!");
```

It generates a `/share/:sessionId` URL and copies it to the clipboard using the Web Clipboard API. This would allow sharing a read-only view of the conversation with a bank officer (the share route would need to be implemented server-side).

---

## SECTION I — SYSTEM PROMPT & AI

**I1. What is a system prompt?**
A system prompt is a set of hidden instructions given to the LLM before any user conversation. It defines the AI's persona, rules, constraints, and output format. Users don't see it — they only see the resulting behavior. It's how developers "program" LLM behavior without changing model weights.

**I2. What are the sections in your system prompt?**

1. Role definition ("You are a professional UPI Assistant for bank staff"). 2. File attachment handling rules. 3. General knowledge fallback permission. 4. Critical formatting rules (no raw filenames, clean markdown). 5. Future date handling note (don't flag 2026/2027 test dates as fraud). 6. Actionable resolutions (generate direct links, mailto links, and complaint templates in code blocks).

**I3. Why tell the AI not to include raw source filenames?**
The UI handles source citations automatically with colored badge components. If the AI wrote "(Source: NPCI_Circular_2023.pdf)" inside its response text, it would appear as raw text in the markdown, creating duplicate and ugly citations. Keeping citations out of the AI response body allows the frontend to render them as styled badges below the message.

**I4. Why allow Gemini to use general knowledge if context is missing?**
RAG retrieval can fail (no matching chunks) for very specific or unusual queries. Without this permission, Gemini would say "I don't have enough information to answer" — useless for a support tool. The prompt explicitly says "Always prioritize providing actionable advice over refusing to answer." This keeps the assistant helpful even for edge cases not covered by the corpus.

**I5. Why ask for complaint templates inside triple backticks?**
The custom `code` component in ReactMarkdown detects triple-backtick code blocks and renders them with a "Copy" button and a "Download PDF" button. By instructing Gemini to put complaint letters inside code blocks, we get one-click copy-to-clipboard and PDF export for free, without any extra UI work.

**I6. What is the future date instruction?**

```
SPECIAL NOTE FOR TRANSACTION ANALYZER:
The user might submit transactions with dates in the future (e.g., 2026/2027) generated
by a test script. DO NOT mark a transaction as 'High Risk' or 'Fraud' purely because
the date is in the future.
```

The test data (`bulk_transactions.json`) was generated with future dates. Without this instruction, Gemini would flag all test transactions as suspicious purely based on the date, creating false positives and breaking demonstrations.

**I7. What is Gemini Flash? How is it different from Gemini Pro?**
Gemini Flash is Google's speed-optimized model — lower latency, lower cost, slightly lower capability than Gemini Pro/Ultra. "Flash" = faster response for interactive use cases like chatbots. Gemini Pro would give higher quality answers but at higher cost and latency. For a support chatbot where response time matters, Flash is the right choice.

**I8. What is multimodal AI? How does your app use it?**
Multimodal AI can process multiple types of inputs — text, images, audio, video, PDFs — not just text. In this project: users can upload a transaction receipt (image/PDF) alongside their text query. The file is sent as base64 to Gemini's API which can read/analyze the image and extract transaction IDs, dates, amounts, and status — answering questions about the specific uploaded file.

**I9. What is the inlineData format in Gemini's API?**

```javascript
contents.push({
  inlineData: {
    data: file_b64, // raw base64 string
    mimeType: mime_type, // e.g., "image/jpeg" or "application/pdf"
  },
});
```

Gemini's API accepts file data inline in the request body. For larger files in production, you'd use File API (upload separately, get a URI, reference by URI).

**I10. result.text vs result.response.text()?**
Old Google AI SDK: `result.response.text()` — text was a method call on a nested response object. New `@google/genai` SDK (v1.x): `result.text` — text is a direct string property on the result. The code comments this explicitly to warn about the breaking change between SDK versions.

**I11. What happens if Gemini fails?**

```javascript
try {
    const result = await ai.models.generateContent({...});
    return { response: result.text, sources: sources_list };
} catch (err) {
    console.error('Gemini Generation failed:', err);
    throw new Error(`Gemini failed: ${err.message}`);
}
```

The error is logged and re-thrown, propagating to the chat route's catch block, which returns a 500 status. The frontend catches this and displays "Sorry, I encountered an error. Please check your connection and try again."

**I12. Why instantiate GoogleGenAI lazily?**

```javascript
let ai;
if (!ai) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}
```

Same pattern as the embedding model singleton. The client initialization validates the API key and sets up HTTP connection pools. Doing this lazily (first request) rather than at module load time means the server starts faster and only initializes the client when actually needed.

**I13. What does the prompt do differently when a file is uploaded?**
If no query text and a file is uploaded: the prompt instructs "your primary task is to provide a clear summary of the attached file (listing successful vs failed transactions) and ask the user which specific transaction they need help with." If both query and file are present: normal RAG flow plus the file is analyzed in context of the question.

**I14. What is prompt engineering? Examples from your project.**
Prompt engineering is the craft of writing instructions to LLMs to reliably get the desired behavior. Examples: (1) Telling Gemini exactly what JSON structure to return for the Transaction Analyzer. (2) Instructing it to never say "I don't know" but to use general knowledge. (3) Requiring complaint templates in triple-backtick blocks for the copy/export feature. (4) Specifying not to flag future dates as fraud.

**I15. Risks of LLMs returning JSON?**
LLMs are not deterministic structured output systems. Risks: model wraps JSON in markdown (` ```json ` fences), adds explanatory text before/after the JSON, uses single quotes instead of double quotes, truncates the JSON. Mitigation in this project: strip markdown fences with `.replace(/```json/g, "")`, then `JSON.parse()`. Better approaches: Gemini's structured output mode (JSON schema enforcement), or retry logic if parsing fails.

**I16. What is hallucination in LLMs? How does RAG reduce it?**
Hallucination = LLMs confidently stating false information that wasn't in their training data (e.g., making up a specific NPCI circular that doesn't exist). RAG reduces this by providing the actual document text as context in the prompt. The LLM answers from the provided context rather than from memory. Source citations also let users verify the answer.

---

## SECTION J — PYTHON / FLASK LAYER

**J1. What is Flask? What is a Blueprint?**
Flask is a lightweight Python web framework. A Blueprint is a way to organize related routes into a modular, reusable component. `transactions_bp = Blueprint('transactions', __name__)` creates a blueprint that groups all transaction-related routes. It gets registered on the main Flask app with `app.register_blueprint(transactions_bp)`.

**J2. What is SQLite? Why use it for transactions?**
SQLite is a serverless, file-based relational database built into Python's standard library. No separate database server process is needed. Used for the `upi_transactions.db` file containing the test transaction dataset. For a read-heavy demo dataset, SQLite is perfectly adequate. In production, you'd use PostgreSQL or MongoDB.

**J3. What is conn.row_factory = sqlite3.Row?**
By default, SQLite returns rows as plain tuples — you'd access columns by index: `row[0]`, `row[1]`. Setting `conn.row_factory = sqlite3.Row` makes rows behave like dictionaries — you access columns by name: `row['transaction_id']`. `dict(row)` converts it to a plain Python dict, which is then JSON-serializable.

**J4. How does GET /transactions work?**

```python
upi_id = request.args.get('upi_id')  # optional query param
if upi_id:
    # parameterized query - safe from SQL injection
    cursor.execute('SELECT * FROM upi_transactions WHERE sender_upi_id = ? OR receiver_upi_id = ? ORDER BY timestamp DESC', (upi_id, upi_id))
else:
    cursor.execute('SELECT * FROM upi_transactions ORDER BY timestamp DESC LIMIT 50')
```

If a upi_id param is provided, filters transactions where that ID is sender OR receiver. Otherwise returns the 50 most recent transactions.

**J5. SQL query for user transactions?**
`SELECT * FROM upi_transactions WHERE sender_upi_id = ? OR receiver_upi_id = ? ORDER BY timestamp DESC`
Gets all transactions where the user participated (as sender or receiver), sorted newest-first. The `?` placeholders are the upi_id value passed twice.

**J6. What does ? (parameterized query) prevent?**
SQL injection attacks. If you concatenated user input directly into the SQL string: `f"WHERE upi_id = '{upi_id}'"`, a malicious user could pass `'; DROP TABLE upi_transactions; --` and destroy the database. With `?` placeholders, the database driver treats the value as data, never as SQL code.

**J7. Why is conn.close() in a finally block?**
The `finally` block always executes, even if an exception occurs in the `try` block. This guarantees the database connection is always released back to the pool (or closed), preventing connection leaks. Without `finally`, an exception would leave the connection open indefinitely.

**J8. What is SentenceTransformer in Python?**
`from sentence_transformers import SentenceTransformer` — a Python library by Hugging Face built on top of PyTorch/Transformers. `SentenceTransformer('all-MiniLM-L6-v2')` downloads and loads the specified model. Provides a simple `.encode(text)` method that returns embeddings as numpy arrays.

**J9. Why is the model loaded at module import time?**

```python
# embedding.py — top level, runs when module is imported
print("Loading MiniLM embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
```

Model loading is slow (downloads ~23MB of weights, initializes PyTorch). By loading at import time (when the Flask app starts), it's ready for all subsequent requests. If loaded per-request, every embedding call would take seconds instead of milliseconds.

**J10. What does model.encode(text).tolist() return?**
`model.encode(text)` returns a numpy array of shape (384,) — 384 float32 values. `.tolist()` converts the numpy array to a plain Python list `[0.123, -0.045, ...]`. Python lists are JSON-serializable (numpy arrays are not), so `.tolist()` is needed before storing or returning the embedding.

**J11. What is RecursiveCharacterTextSplitter?**
A LangChain text splitter that tries to keep semantically meaningful units together. It recursively tries splitting on the provided separators in order, aiming to produce chunks of `chunk_size` characters. "Recursive" means if a split still produces oversized chunks, it recurses with the next separator.

**J12. Why does chunk.py try two different import paths?**

```python
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        raise ImportError("Please install langchain or langchain-text-splitters")
```

LangChain reorganized their package structure — the splitters moved from `langchain.text_splitter` to `langchain_text_splitters` in newer versions. This try/except handles both old and new versions, making the code compatible without pinning exact versions.

**J13. What is chunk_overlap=100?**
Chunk overlap means adjacent chunks share 100 characters of text. If chunk A ends at character 1000, chunk B starts at character 900. This 100-char overlap ensures that a key sentence at the boundary appears completely in at least one chunk, preventing information loss at split points.

**J14. What are the separators and why that order?**
`["\n\n", "\n", " ", ""]` — tried in order from most semantic to least:

1. `"\n\n"` — paragraph break, best natural split point
2. `"\n"` — line break, second choice
3. `" "` — split at word boundaries, not mid-word
4. `""` — last resort: split character by character
   This ensures the splitter always produces splits at the most natural linguistic boundary available.

**J15. ChromaDB's query() vs MongoDB's $vectorSearch?**
ChromaDB query(): local Python process, synchronous, returns L2 distances (lower=better), data stored in local files, no auth. MongoDB $vectorSearch: cloud-hosted, async, returns cosine similarity scores (higher=better), HNSW indexing, supports millions of vectors, persistent across deployments, integrated with existing MongoDB data.
