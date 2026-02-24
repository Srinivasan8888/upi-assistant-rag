import chromadb
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "chroma_db")

if not os.path.exists(DB_DIR):
    print("ChromaDB directory not found.")
else:
    try:
        client = chromadb.PersistentClient(path=DB_DIR)
        collection = client.get_or_create_collection("upi_docs")
        count = collection.count()
        print(f"ChromaDB Collection 'upi_docs' has {count} documents.")
    except Exception as e:
        print(f"Error accessing ChromaDB: {e}")
