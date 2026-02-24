import csv
import json
import uuid
import datetime
import os

def convert_csv_to_upi_json(csv_path, output_json_path):
    upi_transactions = []
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse timestamp and format to ISO 8601 with IST (+05:30) timezone
            try:
                # Assuming format: "2024-06-22 04:06:38"
                ts_obj = datetime.datetime.strptime(row['Timestamp'], "%Y-%m-%d %H:%M:%S")
                # Add IST timezone offset
                tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
                iso_ts = ts_obj.replace(tzinfo=tz).isoformat()
            except ValueError:
                iso_ts = row['Timestamp']

            # Create a realistic NPCI-style UPI JSON structure
            upi_txn = {
                "head": {
                    "msgId": str(uuid.uuid4()),
                    "orgId": row['Sender UPI ID'].split('@')[-1] if '@' in row['Sender UPI ID'] else "NPCI",
                    "ts": iso_ts,
                    "ver": "2.0"
                },
                "txn": {
                    "id": row['Transaction ID'],
                    "note": "UPI Payment",
                    "refId": "RRN" + "".join(str(uuid.uuid4().int)[:12]), # Simulated 12-digit RRN
                    "refUrl": "https://upi.npci.org.in/",
                    "ts": iso_ts,
                    "type": "PAY"
                },
                "payer": {
                    "addr": row['Sender UPI ID'],
                    "name": row['Sender Name'],
                    "amount": {
                        "value": str(row['Amount (INR)']),
                        "curr": "INR"
                    }
                },
                "payee": {
                    "addr": row['Receiver UPI ID'],
                    "name": row['Receiver Name'],
                    "amount": {
                        "value": str(row['Amount (INR)']),
                        "curr": "INR"
                    }
                },
                "resp": {
                    "result": "SUCCESS" if row['Status'].upper() == "SUCCESS" else "FAILURE",
                    "errCode": "00" if row['Status'].upper() == "SUCCESS" else "U19" # U19 = Transaction failed
                }
            }
            upi_transactions.append(upi_txn)
            
    with open(output_json_path, mode='w', encoding='utf-8') as out_f:
        # Save as a pretty-printed JSON array
        json.dump(upi_transactions, out_f, indent=2)
        
    print(f"Successfully converted {len(upi_transactions)} transactions to NPCI UPI JSON format.")
    print(f"Saved to: {output_json_path}")
    
    # Print a sample of the first transaction
    print("\nSample Transaction Output:")
    print(json.dumps(upi_transactions[0], indent=2))

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(current_dir) # Go up one level to root
    csv_file = os.path.join(project_dir, "transactions.csv")
    json_file = os.path.join(project_dir, "upi_transactions.json")
    
    if os.path.exists(csv_file):
        convert_csv_to_upi_json(csv_file, json_file)
    else:
        print(f"Error: Could not find {csv_file}")
