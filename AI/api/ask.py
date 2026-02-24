import sys
import json
import argparse
import logging

# Suppress warnings and logs from libraries
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
logging.getLogger('chromadb').setLevel(logging.ERROR)
logging.getLogger('sentence_transformers').setLevel(logging.ERROR)

try:
    import chromadb
    from embedding import create_query_embedding
    from vectordb import query_similar_chunks
    import google.generativeai as genai
    import config
except ImportError as e:
    print(json.dumps({"error": f"Import error: {str(e)}"}))
    sys.exit(1)

def get_rag_response(question):
    # 1. Embed Question
    query_emb = create_query_embedding(question)
    if not query_emb:
        return {"error": "Failed to create embedding"}

    # 2. Retrieve Similar Chunks
    try:
        results = query_similar_chunks(query_emb, n_results=5)
    except Exception as e:
        return {"error": f"Retrieval failed: {str(e)}"}
    
    if not results['documents'] or not results['documents'][0]:
        return {
            "answer": "I couldn't find any relevant information in the provided documents.",
            "sources": []
        }

    chunks = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    # Deduplicate sources
    seen_sources = set()
    sources_list = []
    
    context_str = ""
    for i, chunk in enumerate(chunks):
        source = metadatas[i].get('source', 'unknown') if metadatas else 'unknown'
        context_str += f"\n--- Source Document: {source} ---\n{chunk}\n"
        
        if source not in seen_sources:
            sources_list.append(source)
            seen_sources.add(source)

    # 3. Generate Answer via Gemini
    model = genai.GenerativeModel('gemini-3-flash-preview')
    
    prompt_content = f"""
    You are a helpful UPI Assistant for bank staff.
    Answer the question ONLY using the provided context below.
    If the context doesn't contain the answer, say "I don't have enough information in the provided context."
    Do not make up facts. Cite the source document if possible.

    Context:
    {context_str}
    
    Question: {question}
    """
    
    try:
        response = model.generate_content(prompt_content)
        answer_text = response.text
        
        return {
            "answer": answer_text,
            "sources": sources_list
        }
    except Exception as e:
        return {"error": f"Gemini generation failed: {str(e)}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="The question to ask")
    args = parser.parse_args()
    
    response = get_rag_response(args.query)
    
    # Print JSON to stdout for Node.js to capture
    print(json.dumps(response))
