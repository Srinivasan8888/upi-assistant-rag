# UPI Dispute Assistant

AI-powered assistant for UPI disputes, refunds, and fraud reporting using RAG (Retrieval Augmented Generation).

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB
- **AI**: Google Gemini Flash
- **Vector DB**: chromadb

## Project Structure

User types → Node saves user msg → calls Flask RAG → gets answer + [filenames] → saves assistant msg → returns to frontend → displays answer with source badges

```
upi-assistant-rag/
├── backend/          # Express API
│   ├── config/       # Database config
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   └── services/     # Business logic
├── frontend/         # Next.js app
│   ├── app/          # App router
│   ├── components/   # React components
│   └── lib/          # Utilities
└── package.json      # Root workspace
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/upi-assistant
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Start MongoDB

Make sure MongoDB is running locally or use MongoDB Atlas.

### 4. Run Development Servers

From root directory:

```bash
npm run dev
```

This starts both backend (port 5000) and frontend (port 3000).

Or run separately:

```bash
# Backend
npm run dev:backend

# Frontend
npm run dev:frontend
```

### 5. Configure Google Login (Optional but Recommended)

To enable the "Continue with Google" button on the new `/login` and `/register` pages, you need Google OAuth credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a Project and navigate to **APIs & Services -> Credentials**.
3. Create an **OAuth Client ID**.
4. Set the **Authorized redirect URI** to: `http://localhost:3000/api/auth/callback/google`
5. Create a file named `.env.local` inside the `frontend/` directory.
6. Add your keys along with a NEXTAUTH_SECRET:

   ```env
   GOOGLE_CLIENT_ID="your_google_client_id_here.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your_google_secret_here"
   NEXTAUTH_SECRET="any_long_random_string_like_this_123"
   ```

7. Restart your dev server (`start.bat`) to apply the new environment variables!

## Features

- Chat interface with UPI dispute assistant
- PDF ingestion for NPCI/RBI documents
- RAG-based responses with source citations
- Session-based chat history
- Beautiful UI with shadcn/ui components

## API Endpoints

### Chat

- `POST /api/chat` - Send message
- `GET /api/chat/history/:sessionId` - Get chat history

### Admin

- `GET /api/admin/documents` - List ingested documents
- `POST /api/admin/ingest-pdf` - Upload and ingest PDF

## Next Steps

1. Implement vector embeddings and storage
2. Add RAG retrieval logic
3. Integrate with MongoDB Atlas Vector Search
4. Add authentication
5. Deploy to AWS (EC2 + S3 + CloudFront)

## License

ISC
