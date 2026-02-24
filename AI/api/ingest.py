import config
import os
import glob
from tqdm import tqdm
from load_pdf import load_pdf
from chunk import split_text
from embedding import create_embedding
from vectordb import store_chunks
import time

# Use CORPUS_DIR from config
CORPUS_DIR = config.CORPUS_DIR

def process_file(file_path):
    print(f"Processing: {file_path}")
    try:
        # 1. Load Text
        text = load_pdf(file_path)
        if not text:
            print(f"Warning: No text extracted from {file_path}")
            return

        # 2. Split Text
        chunks = split_text(text)
        if not chunks:
            print(f"Warning: No chunks generated from {file_path}")
            return
            
        print(f"  - Generated {len(chunks)} chunks")

        # 3. Create Embeddings in batches
        embeddings = []
        valid_chunks = []
        metadatas = []
        
        # Local embeddings are fast, can batch but loop is fine
        for chunk in tqdm(chunks, desc="  - Creating embeddings"):
            emb = create_embedding(chunk)
            if emb:
                embeddings.append(emb)
                valid_chunks.append(chunk)
        
        if embeddings:
            store_metadatas = [{"source": os.path.basename(file_path)} for _ in valid_chunks]
            store_chunks(valid_chunks, embeddings, store_metadatas)

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    if not os.path.exists(CORPUS_DIR):
        print(f"Error: Directory {CORPUS_DIR} not found.")
        return

    # Walk through directory recursively
    pdf_files = []
    print(f"Scanning for PDFs in: {CORPUS_DIR}")
    for root, dirs, files in os.walk(CORPUS_DIR):
        for file in files:
            if file.lower().endswith(".pdf"):
                pdf_files.append(os.path.join(root, file))

    print(f"Found {len(pdf_files)} PDF files.")

    if not pdf_files:
        print("No PDF files found to ingest. Exiting.")
        return

    for pdf_file in pdf_files:
        process_file(pdf_file)

    print("\nIngestion Complete! Vector DB updated.")

if __name__ == "__main__":
    main()
