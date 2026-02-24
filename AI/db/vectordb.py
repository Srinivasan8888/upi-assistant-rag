import chromadb
import os

# Use a persistent client to store vector DB locally
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "chroma_db")
os.makedirs(DB_DIR, exist_ok=True)
client = chromadb.PersistentClient(path=DB_DIR)

# Get collection (or create if not exists)
collection = client.get_or_create_collection("upi_docs")

def store_chunks(chunks, embeddings, metadatas=None):
    if not chunks:
        return

    # Chroma expects unique IDs. We can generate them.
    # Count current items to append properly without collision
    start_idx = collection.count()
    ids = [str(start_idx + i) for i in range(len(chunks))]
    
    # Simple retry logic for batch addition could be added, but minimal example:
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas if metadatas else [{"source": "unknown"} for _ in chunks],
        ids=ids
    )
    print(f"Stored {len(chunks)} chunks in ChromaDB")

def query_similar_chunks(query_embedding, n_results=5):
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    return results
