from flask import Blueprint, jsonify, request
import sqlite3
import os

transactions_bp = Blueprint('transactions', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'transactions.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@transactions_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """Get transactions, optionally filtered by user UPI ID."""
    upi_id = request.args.get('upi_id')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if upi_id:
            # Get transactions where the user is either sender or receiver
            cursor.execute('''
                SELECT * FROM upi_transactions 
                WHERE sender_upi_id = ? OR receiver_upi_id = ?
                ORDER BY timestamp DESC
            ''', (upi_id, upi_id))
        else:
            # Just return recent transactions if no ID specified
            cursor.execute('SELECT * FROM upi_transactions ORDER BY timestamp DESC LIMIT 50')
            
        rows = cursor.fetchall()
        transactions = [dict(row) for row in rows]
        
        return jsonify({"transactions": transactions}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@transactions_bp.route('/transactions/<transaction_id>', methods=['GET'])
def get_transaction_by_id(transaction_id):
    """Get detailed status for a specific transaction."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM upi_transactions WHERE transaction_id = ?', (transaction_id,))
        row = cursor.fetchone()
        
        if row:
            return jsonify(dict(row)), 200
        else:
            return jsonify({"error": "Transaction not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
