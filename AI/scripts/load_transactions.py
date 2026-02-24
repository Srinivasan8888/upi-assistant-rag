import pandas as pd
import sqlite3
import os

DB_PATH = "transactions.db"

def init_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH) # Start fresh for demonstration
    
    conn = sqlite3.connect(DB_PATH)
    
    # Read the CSV file into a pandas DataFrame
    df = pd.read_csv("../transactions.csv")
    
    # Ensure column names are easy to work with in SQL
    df.columns = ["transaction_id", "timestamp", "sender_name", "sender_upi_id", "receiver_name", "receiver_upi_id", "amount", "status"]
    
    # Save the dataframe to a new SQL table 'upi_transactions'
    df.to_sql("upi_transactions", conn, if_exists="replace", index=False)
    
    print(f"Successfully loaded {len(df)} transactions into {DB_PATH}")
    
    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM upi_transactions LIMIT 2;")
    rows = cursor.fetchall()
    print("\nSample Data:")
    for row in rows:
        print(row)
        
    conn.close()

if __name__ == "__main__":
    init_db()
