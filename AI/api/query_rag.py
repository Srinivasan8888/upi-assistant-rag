import chromadb
from embedding import create_query_embedding
from vectordb import query_similar_chunks
import ollama

def get_answer(question):
    print(f"\nProcessing Question: {question}")
    
    # 1. Embed Question (Local MiniLM)
    query_emb = create_query_embedding(question)
    if not query_emb:
        return "Error creating query embedding."

    # 2. Retrieve Similar Chunks (top 5)
    results = query_similar_chunks(query_emb, n_results=5)
    
    if not results['documents'] or not results['documents'][0]:
        return "No relevant documents found."

    chunks = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    # 3. Construct Context String
    context_str = ""
    for i, chunk in enumerate(chunks):
        source = metadatas[i].get('source', 'unknown') if metadatas else 'unknown'
        context_str += f"\n--- Source Document: {source} ---\n{chunk}\n"

    # 4. Prompt Engineering for RAG
    # Using 'gemma' model in Ollama. Ensure 'ollama pull gemma' is run.
    MODEL_NAME = "gemma" 

    prompt_content = f"""
    Answer ONLY using the provided context below.
    If the context doesn't contain the answer, say "I don't have enough information in the provided context."

    CRITICAL FORMATTING RULES:
    1. Do not include raw source filenames in your response (e.g., do not write "(Source: document.pdf)").
    2. Write in a clear, narrative style.
    3. Use clean markdown formatting without redundant asterisks (e.g., use `### Title` instead of `### **Title**`).

    ACTIONABLE RESOLUTIONS:
    If the user's question involves filing a dispute, reporting fraud, or contacting support, you MUST proactively generate:
    1. **Direct Action Links**: Provide markdown links to relevant portals if known (e.g., `[National Cyber Crime Portal](https://cybercrime.gov.in)`). 
    2. **Mailto Links**: If an email is required, provide a mailto link with a pre-filled subject and body (e.g., `[Email Support](mailto:support@bank.com?subject=Fraud%20Report&body=...)`).
    3. **Complaint Templates**: Provide a professional, ready-to-copy text template in a markdown code block (` ```text `) that the user can copy and paste into forms or emails. The template should include placeholders like `[Transaction ID]`, `[Amount]`, and `[Date]`.

    Context:
    {context_str}
    
    Question: {question}
    """
    
    # 5. Generate Answer via Ollama
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[
                {
                    'role': 'user',
                    'content': prompt_content
                }
            ]
        )
        return response['message']['content']
    except Exception as e:
        return f"Error generating answer from Ollama: {e}\n(Make sure Ollama is running and you have pulled the model: `ollama pull gemma`)"

def main():
    print("==========================================")
    print("   UPI Assistant (Local RAG Pipeline) Ready")
    print("==========================================")
    print("Type 'exit' to quit.\n")
    
    while True:
        question = input("Q: ")
        if question.lower() in ('exit', 'quit'):
            print("Goodbye!")
            break
        
        if not question.strip():
            continue

        print("Searching knowledge base & Thinking...")
        answer = get_answer(question)
        print("\n--- Answer ---")
        print(answer)
        print("------------------------------------------\n")

if __name__ == "__main__":
    main()
