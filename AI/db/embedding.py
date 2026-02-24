from sentence_transformers import SentenceTransformer

# Load the model once when the module is imported
print("Loading MiniLM embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def create_embedding(text):
    try:
        # Standardize content to remove newlines for better embeddings
        text = text.replace("\n", " ")
        return model.encode(text).tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return []

def create_query_embedding(text):
    # Same process for query
    return create_embedding(text)
