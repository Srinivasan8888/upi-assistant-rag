import random
import json
import os
import sys
from datetime import datetime, timedelta
from sentence_transformers import SentenceTransformer
import chromadb

# Suppress noisy logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "chroma_db")
OUTPUT_JSON = os.path.join(BASE_DIR, "bulk_transactions.json")

def get_random_date():
    return (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%d-%m-%y")

def generate_sms(scenario):
    amount = round(random.uniform(500.0, 50000.0), 2)
    bank = random.choice(["HDFC Bank", "SBI", "ICICI", "Axis Bank", "Kotak"])
    ac_num = f"XX{random.randint(1000, 9999)}"
    date_str = get_random_date()
    date_formatted = random.choice([date_str, date_str.replace("-", "/")])
    ref_num = f"1{random.randint(10000000000, 99999999999)}"
    
    if scenario == "legit_payment":
        merchant = random.choice(["AmazonSeller", "SwiggyInsta", "Zomato", "UberIndia", "RelianceRTL"])
        return f"Dear UPI user A/C {ac_num} debited by {amount} on date {date_formatted} trf to {merchant} Ref No {ref_num}. If not u? call 18002586161 to block UPI"
    elif scenario == "legit_receive":
        sender = random.choice(["Rahul Kumar", "Priya Singh", "Amit Patel"])
        return f"Rs {amount} credited to a/c {ac_num} on {date_formatted} by {sender} (UPI Ref no {ref_num}). Balance: Rs {round(amount + random.randint(1000, 50000), 2)}"
    elif scenario == "phishing_kyc":
        return f"Dear Customer, your {bank} A/c {ac_num} will be BLOCKED today! Please update your PAN/KYC immediately by clicking here: http://bit.ly/update-kyc-{random.randint(100,999)}"
    elif scenario == "phishing_reward":
        return f"Congratulations! You have won a cashback of Rs {amount} from PhonePe. Click here and enter your UPI PIN to claim your reward: hwttp://rewards-{random.randint(10,99)}.com/claim"
    elif scenario == "fraud_deduction":
        return f"Alert: A/C {ac_num} debited by INR {amount} via UPI to 'PAYU-GAME-TXN' on {date_formatted}. Ref: {ref_num}. Not you? Click link sms-{random.randint(10,99)}.verify.com to reverse."
    elif scenario == "electricity_bill_scam":
        num = random.randint(7000000000, 9999999999)
        return f"Dear consumer your Electricity power will be disconnected tonight at 9.30 pm from electricity office. Your previous month bill was not update. Please immediately call with our electricity officer {num}"
    elif scenario == "olx_qr_scan_scam":
        return f"Sender has requested money. Open your UPI app and SCAN the QR code or enter your 6 digit UPI pin to receive Rs {amount} for your OLX posting."
    return ""

scenarios = [
    ("legit_payment", "✅ Safe: Normal Merchant Payment"),
    ("legit_receive", "✅ Safe: Normal Received Money"),
    ("fraud_deduction", "🔴 High Risk: Unexpected Game/Betting Deduction with suspicious link"),
    ("phishing_kyc", "🔴 High Risk: Classic KYC/PAN update phishing link"),
    ("phishing_reward", "🔴 High Risk: Fake Cashback scam requesting PIN"),
    ("electricity_bill_scam", "🔴 High Risk: Fake Electricity Disconnection threat"),
    ("olx_qr_scan_scam", "🔴 High Risk: Scan to Receive Money Scam (OLX/Quikr)"),
]

def generate_bulk_data(num_samples=200):
    data = []
    for _ in range(num_samples):
        scen_key, scen_desc = random.choice(scenarios)
        sms = generate_sms(scen_key)
        
        doc_text = f"Sample Historical Transaction:\nSMS Content: \"{sms}\"\nClassification: {scen_desc}\nReason: Matches known pattern '{scen_key}' observed in historical data."
        
        data.append({
            "id": f"tx_sim_{random.randint(1000000, 9999999)}",
            "sms": sms,
            "scenario": scen_key,
            "classification": scen_desc,
            "document_text": doc_text
        })
    return data

if __name__ == "__main__":
    print(f"Generating 500 bulk transactions for knowledge base...")
    transactions = generate_bulk_data(500)
    
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(transactions, f, indent=4)
        
    print(f"Saved {len(transactions)} items to {OUTPUT_JSON}")
    
    print("Loading embedding model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    print("Connecting to ChromaDB...")
    chroma_client = chromadb.PersistentClient(path=DB_DIR)
    collection = chroma_client.get_or_create_collection("upi_docs")
    
    print("Embedding and ingesting into ChromaDB in batches...")
    
    batch_size = 50
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i+batch_size]
        
        documents = [item["document_text"] for item in batch]
        ids = [item["id"] for item in batch]
        metadatas = [{"source": "bulk_transactions.json", "type": "simulated_sms_pattern"} for _ in batch]
        embeddings = embedding_model.encode(documents).tolist()
        
        collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Ingested batch {i//batch_size + 1}/{(len(transactions)+batch_size-1)//batch_size}...")
        
    print(f"Done! ChromaDB now has {collection.count()} total documents.")
