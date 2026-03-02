import os
import pandas as pd
from datasets import Dataset
from dotenv import load_dotenv

# Ragas and Langchain imports
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

# Load environment variables (Make sure GEMINI_API_KEY is present in your .env or environment)
load_dotenv()

def run_evaluation():
    print("Initializing Google Generative AI for Ragas Evaluation...")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in environment variables.")
        return

    # Use Gemini Flash or Pro as the evaluator LLM
    eval_llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0,
    )
    
    # Use Gemini Embeddings for the evaluation process (distinct from MiniLM used in local retrieval)
    eval_embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001"
    )

    # ---------------------------------------------------------
    # Example Dataset for Ragas Evaluation
    # Replace this with a generated dataset from your true RAG pipeline queries.
    # In practice, you would:
    # 1. Take a list of test questions.
    # 2. Query your Vector DB to get 'contexts'.
    # 3. Query your Gemini RAG App to get 'answer'.
    # 4. Have a human-curated 'ground_truth' answer.
    # ---------------------------------------------------------
    
    data_samples = {
        'question': [
            'How can I check my UPI transaction status?',
            'What should I do if my money is deducted but the transaction failed?',
        ],
        'answer': [
            'You can check your UPI transaction status via your bank app or the BHIM UPI app history.',
            'If money is deducted but the transaction failed, it is usually refunded within 3 to 5 business days. You can also file a dispute.'
        ],
        'contexts': [
            ['Users can track and view the status of all their UPI transactions from the transaction history section of their PSP or bank app.'],
            ['In case of a failed transaction where the account is debited, the amount will be reversed within T+3 to T+5 days. Users can raise a complaint if the refund is not received.']
        ],
        'ground_truth': [
            'Check the transaction history on your bank or UPI application.',
            'Wait for 3-5 days for auto-reversal, or raise a complaint with your bank.'
        ]
    }
    
    dataset = Dataset.from_dict(data_samples)
    
    print("\nStarting evaluation of sample questions...")
    print(f"Dataset Size: {len(data_samples['question'])} questions\n")

    # Run Ragas Evaluation
    try:
        result = evaluate(
            dataset=dataset,
            metrics=[
                context_precision,
                faithfulness,
                answer_relevancy,
                context_recall,
            ],
            llm=eval_llm,
            embeddings=eval_embeddings,
            raise_exceptions=False # So that evaluation doesn't completely stop on a single API glitch
        )
        
        # Convert to Pandas DataFrame for a nice tabular view
        df = result.to_pandas()
        
        print("\n=== Evaluation Results ===")
        print(df[['question', 'faithfulness', 'answer_relevancy', 'context_precision', 'context_recall']])
        
        # Save to CSV for reporting
        output_file = "ragas_evaluation_report.csv"
        df.to_csv(output_file, index=False)
        print(f"\nDetailed evaluation report saved to: {output_file}")
        
    except Exception as e:
        print(f"Error during Ragas evaluation: {e}")

if __name__ == "__main__":
    run_evaluation()
