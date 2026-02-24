import os
import chromadb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "chroma_db")

def migrate():
    print("Connecting to local ChromaDB...")
    try:
        local_client = chromadb.PersistentClient(path=DB_DIR)
        local_collection = local_client.get_collection("upi_docs")
    except Exception as e:
        print(f"Error connecting to local DB: {e}")
        return

    print("Connecting to ChromaDB Cloud...")
    try:
        cloud_client = chromadb.CloudClient(
          api_key='ck-G93Dis7nxA95doVsD39p73kX183jPV7F5sZwgxoGoS3C',
          tenant='63f8521e-f6ab-466f-b259-cc0e7949b2b3',
          database='upi-DA'
        )
        cloud_collection = cloud_client.get_or_create_collection("upi_docs")
    except Exception as e:
        print(f"Error connecting to cloud DB: {e}")
        return

    print("Fetching data from local collection...")
    data = local_collection.get(include=["embeddings", "documents", "metadatas"])

    ids = data.get("ids", [])
    if not ids:
        print("No documents found in local database.")
        return

    embeddings = data.get("embeddings")
    documents = data.get("documents")
    metadatas = data.get("metadatas")

    print(f"Total documents to migrate: {len(ids)}")

    batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i+batch_size]
        batch_embeddings = embeddings[i:i+batch_size] if embeddings is not None else None
        batch_documents = documents[i:i+batch_size] if documents is not None else None
        batch_metadatas = metadatas[i:i+batch_size] if metadatas is not None else None
        
        print(f"Uploading batch {i} to {i+len(batch_ids)}...")
        try:
            cloud_collection.add(
                ids=batch_ids,
                embeddings=batch_embeddings,
                documents=batch_documents,
                metadatas=batch_metadatas
            )
        except Exception as e:
            print(f"Failed to upload batch {i}: {e}")

    print("Migration complete!")
    print(f"Cloud DB now has {cloud_collection.count()} documents.")

if __name__ == "__main__":
    migrate()
