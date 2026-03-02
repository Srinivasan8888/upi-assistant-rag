# INTERVIEW ANSWERS — PART 1 (Sections A, B, C, D)

# General / RAG Pipeline / Embeddings / Vector Database

---

## SECTION A — GENERAL / PROJECT OVERVIEW

**A1. What is this project? Explain it in 2 minutes.**
This is a UPI Dispute Assistant — an AI-powered chatbot for bank staff and users to handle UPI payment disputes, refunds, and fraud reporting. The core technology is RAG (Retrieval-Augmented Generation). I've ingested real regulatory PDFs from NPCI, RBI, and individual banks into a vector database. When a user asks a question, the system retrieves the most relevant chunks from those documents, then sends that context plus the query to Google Gemini Flash, which generates a grounded answer. Users can also upload transaction receipts (images/PDFs) and the AI will analyze them using Gemini's multimodal capabilities. The stack is Next.js 14 on the frontend, Node.js + Express + MongoDB on the backend, and Google Gemini Flash as the LLM.

**A2. What problem does this solve?**
UPI disputes are complex — different rules apply for failed payments, fraud, unauthorized debits, and wrong credits. Bank staff waste time searching through NPCI circulars and RBI guidelines. This assistant gives instant, document-grounded answers and also auto-generates ready-to-send complaint templates and action links like cybercrime.gov.in, saving significant time per query.

**A3. Who is the target user?**
Primarily bank support staff handling UPI dispute escalations, and also end users who want to understand their rights and next steps when a UPI transaction goes wrong.

**A4. Why did you choose UPI disputes as the domain?**
UPI fraud in India crossed Rs 11,000 crore in FY24. The dispute process is entirely manual and confusing. It is a domain where RAG shines — there are authoritative PDF documents (NPCI circulars, RBI guidelines) that the AI must reference accurately, and hallucination would be harmful.

**A5. What is RAG? Why did you use it instead of fine-tuning?**
RAG is Retrieval-Augmented Generation. Instead of relying on the LLM's parametric memory, you retrieve relevant documents at query time and inject them into the prompt as context. I used RAG instead of fine-tuning because: (1) fine-tuning teaches the model new style, not new facts — it still hallucinates; (2) RAG is updatable — admins can upload new NPCI circulars without retraining; (3) RAG provides source citations; (4) fine-tuning is expensive and slow.

**A6. What is the difference between RAG and a regular LLM chatbot?**
A regular LLM chatbot relies entirely on knowledge baked into its weights during training — this knowledge has a cutoff date and the model can hallucinate. RAG retrieves real documents at runtime and feeds that context to the LLM, so the answer is grounded in actual policy documents. Think of it as an open-book exam vs a closed-book exam.

**A7. How does your system prevent hallucination?**
The system prompt instructs Gemini to answer using the provided context from our vector search. If no context is retrieved, the model falls back to general knowledge about UPI/banking (by design — to avoid unhelpful refusals), but the retrieved chunks from real NPCI/RBI PDFs are the primary source of truth.

**A8. What is the full tech stack?**
Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, NextAuth.js, Axios, react-markdown, jsPDF. Backend: Node.js, Express, Mongoose, MongoDB Atlas, @xenova/transformers, pdf-parse, Multer, express-validator. AI: Google Gemini Flash, Xenova all-MiniLM-L6-v2 embedding model. Python layer (legacy): Flask, ChromaDB, sentence-transformers, LangChain. Deployment: Netlify (frontend), MongoDB Atlas (database).

**A9. Walk me through a user's journey.**
User opens the app → NextAuth checks session (Google or credentials login) → Welcome screen shows the TransactionAnalyzer widget and 4 suggestion cards → User types a question → Frontend sends POST /api/chat with session_id, query, and optional file → Backend embeds the query with MiniLM → Runs $vectorSearch on MongoDB → Builds context string from top-5 chunks → Sends prompt + context + optional file to Gemini Flash → Saves both messages to MongoDB → Returns answer with sources → Frontend renders AI response as markdown with source badges.

**A10. What happens if the vector database returns no results?**
The context string becomes "No relevant context found." and this is passed to Gemini as-is. The system prompt gives Gemini explicit permission to use its general knowledge about UPI and banking in this case, so it still gives a helpful answer rather than refusing.

---

## SECTION B — RAG PIPELINE

**B1. Explain the three phases of your RAG pipeline.**
Phase 1 - Ingestion (offline): Admin uploads PDF → text extracted → split into chunks → each chunk embedded with MiniLM → stored in MongoDB as {text, embedding, metadata}. Phase 2 - Retrieval (runtime): User query embedded with same MiniLM → $vectorSearch on MongoDB returns top-5 semantically similar chunks → context string built. Phase 3 - Generation (runtime): Context + user query + optional file sent to Gemini Flash → grounded answer returned with source citations.

**B2. What is "ingestion"?**
Ingestion is the offline process of preparing your knowledge base. You take raw documents (PDFs), extract text, split into manageable chunks, convert each chunk to a vector embedding using an embedding model, and store those vectors in a database alongside the original text. This is done once per document, not at query time.

**B3. What is "retrieval"?**
Retrieval is the real-time step where the user's query is embedded using the same model used during ingestion, and a nearest-neighbor search finds the stored chunks most semantically similar to that query. The top-K chunks are returned as context.

**B4. What is "generation"?**
Generation is the final step where the retrieved context and the user's question are assembled into a prompt and sent to the LLM (Gemini Flash). The LLM generates an answer conditioned on that context, making it grounded rather than purely from memory.

**B5. What is a document chunk? Why chunk documents?**
A chunk is a small piece of text split from a larger document — in my project, ~1000 characters. LLMs have context window limits, so you can't pass an entire 50-page PDF. Also, smaller, focused chunks produce better embeddings — a 1000-char chunk about "UPI refund timelines" will embed very close to the query "how long does refund take," which a 50-page document as a whole would not.

**B6. What chunk size did you use and why 1000 characters?**
1000 characters (~150-200 words). Too small (200 chars) = chunks lose context, embeddings are less meaningful. Too large (5000 chars) = LLM gets overloaded, retrieval is imprecise. 1000 chars captures one coherent idea from a regulatory paragraph — a good balance between specificity and context.

**B7. What is chunk overlap and why 100 characters?**
Chunk overlap means adjacent chunks share some text. With overlap=100 in chunk.py, the last 100 characters of one chunk appear at the start of the next. This prevents information at chunk boundaries from being lost. If a key sentence spans the boundary between two chunks, overlap ensures it's fully captured in at least one chunk.

**B8. What are the separators in RecursiveCharacterTextSplitter?**
["\n\n", "\n", " ", ""]. The splitter tries each separator in order. First it tries to split on double newlines (paragraph breaks) — most natural split. If chunks are still too large, it tries single newlines (line breaks). Then spaces (words). Finally empty string (individual characters, last resort). This "recursive" approach preserves natural language structure.

**B9. What happens when you chunk poorly?**
Bad chunking = bad retrieval. Example: if a chunk splits mid-sentence like "The refund timeline for failed UPI transactions is T+1 worki" → "ng days," neither chunk embeds well. The meaning is broken. The embedding of the first chunk won't match queries about "refund timeline" correctly.

**B10. How does your Node.js chunking differ from Python chunking?**
The Node.js ingest.js uses a simple loop: `for (let i = 0; i < text.length; i += chunkSize)` — pure character-based slicing with no overlap and no awareness of sentence or paragraph boundaries. The Python chunk.py uses LangChain's RecursiveCharacterTextSplitter with chunk_overlap=100 and semantic separators. The Python approach produces higher quality chunks.

**B11. Character-level chunking vs semantic chunking?**
Character-level: split every N characters, ignoring sentence/paragraph structure. Simple, fast, but can break mid-sentence. Semantic chunking: split on meaningful boundaries (paragraphs, sentences). More complex but produces contextually complete chunks with better embeddings.

**B12. Why return n_results=5?**
5 chunks × ~1000 chars = ~5000 characters of context. This fits comfortably inside Gemini's context window while providing enough diverse sources. Returning too many (20+) would bloat the prompt and may confuse the LLM; too few (1-2) risks missing relevant information.

**B13. How is the context string built?**

```
for (const chunk of results) {
    const source = chunk.metadata?.source || 'unknown';
    context_str += `\n--- Source: ${source} ---\n${chunk.text}\n`;
    if (!seen_sources.has(source)) {
        sources_list.push(source);
        seen_sources.add(source);
    }
}
```

Each chunk is labeled with its source filename. Unique sources are collected in sources_list for the citation badges in the UI.

**B14. How do you handle source deduplication?**
A JavaScript Set called `seen_sources` tracks which source filenames have already been added to `sources_list`. Before pushing a source, we check `seen_sources.has(source)`. Multiple chunks from the same PDF (e.g., "NPCI_Circular.pdf") only appear once in the sources list.

**B15. What is a context window and why does it matter?**
A context window is the maximum number of tokens an LLM can process in a single request — input + output combined. If we pass too many chunks, we exceed the limit and the API throws an error. Gemini Flash has a very large context window (1M tokens for 1.5 Flash), so 5 chunks of 1000 chars each is trivially small. But for GPT-3.5 (4K tokens), this would matter enormously.

---

## SECTION C — EMBEDDINGS

**C1. What is a sentence embedding?**
An embedding is a fixed-length numerical vector that represents the semantic meaning of a piece of text. Similar texts produce vectors that are close to each other in high-dimensional space. "UPI payment failed" and "UPI transaction declined" would have very similar embedding vectors even though the words are different.

**C2. What model do you use?**
`all-MiniLM-L6-v2` from Hugging Face. In Python: via `sentence-transformers` library. In Node.js: via `@xenova/transformers` (a JavaScript port of Hugging Face Transformers).

**C3. How many dimensions? (384)**
The model produces 384-dimensional vectors. Each chunk and each query becomes a list of 384 floating point numbers.

**C4. What does pooling: 'mean' mean?**
The MiniLM model internally processes each token in the text and produces a vector per token. Mean pooling calculates the average of all token vectors to produce a single fixed-length vector for the whole input. This is one of the most common pooling strategies for sentence embeddings.

**C5. What does normalize: true do?**
It scales the output vector to unit length (magnitude = 1). This means cosine similarity can be computed as a simple dot product. It also makes scores directly comparable across different inputs, since magnitude differences no longer affect the similarity score.

**C6. Why replace `\n` with space before embedding?**
`\n` characters can confuse tokenizers and produce inconsistent embeddings. PDF text often has arbitrary line breaks. Replacing them with spaces ensures the text is treated as continuous prose, which produces better embeddings.

**C7. What is cosine similarity? Write the formula.**
Cosine similarity measures the angle between two vectors. A score of 1.0 = identical direction (maximum similarity). Score of 0 = orthogonal. Score of -1 = opposite.
Formula: `cos(θ) = (A · B) / (|A| × |B|)`
Where A·B is the dot product, and |A|, |B| are the magnitudes (Euclidean norms).

**C8. Walk me through the cosineSimilarity() function in rag.js.**

```javascript
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]; // compute A·B
    normA += vecA[i] * vecA[i]; // compute |A|²
    normB += vecB[i] * vecB[i]; // compute |B|²
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)); // divide
}
```

It loops once through both 384-element arrays simultaneously, accumulating the dot product and the squared magnitudes, then divides.

**C9. Why cosine over Euclidean distance for text?**
Euclidean distance is affected by vector magnitude. A long paragraph about UPI and a short sentence about UPI would have very different magnitudes but nearly the same direction. Cosine similarity is length-invariant — it only cares about the angle (direction/meaning), not the magnitude (length of text).

**C10. Range of cosine similarity values?**
-1 to +1. In practice, for text embeddings with mean pooling and normalization, values are typically 0 to 1 because word embeddings are rarely negative directions of each other.

**C11. Why must you use the SAME embedding model for both ingestion and retrieval?**
The model defines the coordinate space. If you embed documents with model A (384-dim space) and queries with model B (768-dim space), the vectors exist in completely different spaces. Similarity scores would be meaningless — you'd be comparing apples to oranges geometrically.

**C12. Difference between sentence-transformers (Python) and @xenova/transformers (JS)?**
`sentence-transformers` is the original Python library from Hugging Face. `@xenova/transformers` is a JavaScript port that runs the same ONNX-format models in Node.js (or the browser). They produce identical vectors for the same input and same model — my migration confirmed this.

**C13. Why does the model load only once?**

```javascript
let embedder;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}
```

Loading the model downloads weights from HuggingFace and initializes the pipeline — this takes several seconds. The singleton pattern (if !embedder) ensures this happens only once when the server starts, and subsequent calls reuse the already-loaded model instantly.

**C14. What happens if model dimensions don't match?**
The cosine similarity function would compare vectors of different lengths — accessing undefined indices in one array. You'd get NaN (Not a Number) as the similarity score. The $vectorSearch in MongoDB Atlas would throw an error since the query vector dimension must match the index dimension.

**C15. How does model.encode() work in Python?**
`model.encode(text)` in sentence-transformers: tokenizes the text, runs it through the transformer layers, applies mean pooling over token embeddings, optionally normalizes, and returns a numpy array of floats. `.tolist()` converts the numpy array to a plain Python list for JSON serialization.

---

## SECTION D — VECTOR DATABASE

**D1. What is a vector database? How is it different from a regular DB?**
A regular database stores and retrieves data by exact matches or range queries (e.g., WHERE age > 25). A vector database stores high-dimensional vectors and retrieves them by semantic similarity — "find me the 5 vectors most geometrically similar to this query vector." It's built for nearest-neighbor search, which is fundamentally different from B-tree indexing.

**D2. Original vector database? (ChromaDB)**
ChromaDB — an open-source, local vector database. In the Python layer, `chromadb.PersistentClient(path=DB_DIR)` creates a file-based store in the `chroma_db/` directory.

**D3. Current vector database? (MongoDB Atlas Vector Search)**
MongoDB Atlas with its built-in $vectorSearch aggregation stage, using an HNSW index on the `embedding` field of the DocumentChunk collection.

**D4. Why migrate from ChromaDB to MongoDB Atlas?**
ChromaDB is local-only — it stores data in a folder on disk. It cannot be shared across multiple server instances, has no built-in auth, and cannot be hosted in the cloud as a managed service. MongoDB Atlas is cloud-native, already being used for messages/users/documents, provides managed vector search, and means one fewer service to maintain.

**D5. What is PersistentClient in ChromaDB?**
`chromadb.PersistentClient(path=DB_DIR)` creates a ChromaDB instance that saves its data to disk at the specified path. The alternative is `chromadb.Client()` which is in-memory only and loses data on restart. Persistent client survives server restarts.

**D6. How does ChromaDB's collection.add() work?**

```python
collection.add(
    documents=chunks,      # list of text strings
    embeddings=embeddings, # list of lists of floats
    metadatas=metadatas,   # list of dicts with source info
    ids=ids                # unique string IDs
)
```

All four lists must be the same length. Each index corresponds to one chunk.

**D7. How do you generate unique IDs in ChromaDB?**

```python
start_idx = collection.count()  # current number of items
ids = [str(start_idx + i) for i in range(len(chunks))]
```

We get the current count and append from there — so if there are already 50 chunks, new IDs are "50", "51", "52"... This avoids ID collision with existing items.

**D8. What is collection.query() in ChromaDB?**

```python
results = collection.query(
    query_embeddings=[query_embedding],  # 2D list: [[v1, v2, ...]]
    n_results=5
)
```

Returns a dict with keys: `documents`, `metadatas`, `distances`, `ids`. Documents are the text chunks, distances are the similarity scores (lower = more similar for L2 distance in ChromaDB).

**D9. What is MongoDB Atlas $vectorSearch?**
It's a MongoDB aggregation stage that performs approximate nearest-neighbor vector search using an HNSW index. You provide a query vector and it returns the most similar stored vectors along with their source documents.

**D10. numCandidates vs limit in $vectorSearch?**
`numCandidates: 100` — Atlas traverses the HNSW graph and considers 100 candidate neighbors. `limit: 5` — From those 100, returns only the top 5 by score. Higher numCandidates = better recall (finds the truly closest vectors) but slower. It's the standard ANN (Approximate Nearest Neighbor) recall-vs-speed trade-off.

**D11. What index name does your code use?**
`'default'` — the name of the Atlas Search index defined on the DocumentChunk collection with vectorSearch type on the `embedding` field.

**D12. What is HNSW?**
Hierarchical Navigable Small World — a graph-based data structure for approximate nearest neighbor search. It builds a multi-layer graph where each node connects to nearby nodes. Searching starts at the top layer (coarse) and drills down to finer layers, finding the approximate closest vectors much faster than brute-force O(n) comparison. Time complexity: O(log n) for search.

**D13. What is ANN (Approximate Nearest Neighbor)?**
Instead of finding the exact closest vector (requires comparing against every stored vector — O(n)), ANN algorithms find vectors that are "close enough" very quickly. The trade-off is a small chance of missing the true nearest neighbor. For practical RAG systems, approximate results are perfectly acceptable.

**D14. What is the fallback when Atlas isn't available?**

```javascript
// In rag.js, when $vectorSearch throws 'SearchNotEnabled':
const allChunks = await DocumentChunk.find(
  {},
  { text: 1, metadata: 1, embedding: 1 },
).lean();
for (const chunk of allChunks) {
  chunk.score = cosineSimilarity(queryEmbedding, chunk.embedding);
}
results = allChunks.sort((a, b) => b.score - a.score).slice(0, 5);
```

Pull all chunks into Node.js memory, compute cosine similarity for each one, sort, take top-5.

**D15. Trade-offs of the fallback method?**
Pros: works without any vector index, no cloud setup required for development. Cons: O(n) — scales linearly with number of chunks. For 100 chunks it's fast; for 100,000 chunks, it fetches gigabytes of data over the network and takes seconds. Not production-viable for large knowledge bases.
