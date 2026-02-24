import os
import sys
import chromadb
from pymongo import MongoClient

def migrate_cloud_to_mongo():
    print("Connecting to ChromaDB Cloud...")
    try:
        cloud_client = chromadb.CloudClient(
          api_key='ck-G93Dis7nxA95doVsD39p73kX183jPV7F5sZwgxoGoS3C',
          tenant='63f8521e-f6ab-466f-b259-cc0e7949b2b3',
          database='upi-DA'
        )
        cloud_collection = cloud_client.get_collection("upi_docs")
        print(f"Cloud DB connected. Documents found: {cloud_collection.count()}")
    except Exception as e:
        print(f"Error connecting to cloud DB: {e}")
        return

    print("Fetching data from cloud collection...")
    data = cloud_collection.get(include=["embeddings", "documents", "metadatas"])

    ids = data.get("ids", [])
    if not ids:
        print("No documents found in cloud database.")
        sys.exit(0)

    embeddings = data.get("embeddings")
    documents = data.get("documents")
    metadatas = data.get("metadatas")

    print(f"Total documents to migrate: {len(ids)}")

    # Connect to MongoDB
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ENV_PATH = os.path.join(BASE_DIR, "backend", ".env")
    mongodb_uri = "mongodb://localhost:27017/upi-assistant"
    
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                if line.startswith("MONGODB_URI="):
                    mongodb_uri = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    print(f"Connecting to MongoDB at {mongodb_uri}...")
    try:
        mongo_client = MongoClient(mongodb_uri)
        db = mongo_client.get_database()
        mongo_collection = db["documentchunks"]  # Mongoose model uses lowercase plural
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    print(f"Migrating {len(documents)} document chunks to MongoDB...")

    migrated_count = 0
    for i in range(len(ids)):
        # Handle cases where metadatas might be None or the specific item is None
        meta = {}
        if metadatas is not None and i < len(metadatas) and metadatas[i] is not None:
            meta = metadatas[i]
            
        # Convert embedding to list if it's a numpy array, MongoDB can't serialize numpy arrays
        emb = embeddings[i]
        if hasattr(emb, "tolist"):
            emb = emb.tolist()
            
        doc = {
            "text": documents[i],
            "embedding": emb,
            "metadata": meta,
            "__v": 0
        }
        
        # Store the original Chroma ID
        doc["metadata"]["chroma_id"] = ids[i]

        try:
            # Use replace_one with upsert
            result = mongo_collection.replace_one(
                {"metadata.chroma_id": ids[i]},
                doc,
                upsert=True
            )
            # If it was inserted or modified
            if result.upserted_id or result.modified_count > 0 or result.matched_count > 0:
                migrated_count += 1
        except Exception as e:
            # Safely print without unicode errors
            error_str = str(e).encode('ascii', 'replace').decode('ascii')
            print(f"Failed to insert chunk {ids[i]}: {error_str[:200]}")

    print(f"Migration complete. {migrated_count}/{len(ids)} chunks successfully inserted/updated in MongoDB.")

if __name__ == "__main__":
    migrate_cloud_to_mongo()
