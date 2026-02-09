import sqlite3
import os

DB_PATH = "abada_v4.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
    if cursor.fetchone():
        print("Table transactions already exists.")
    else:
        print("Creating transactions table...")
        cursor.execute("""
        CREATE TABLE transactions (
            id CHAR(32) PRIMARY KEY,
            buyer_id CHAR(32) NOT NULL,
            seller_id CHAR(32) NOT NULL,
            listing_id CHAR(32) NOT NULL,
            final_value FLOAT DEFAULT 0.0,
            status VARCHAR DEFAULT 'PENDING',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY(buyer_id) REFERENCES users(id),
            FOREIGN KEY(seller_id) REFERENCES users(id),
            FOREIGN KEY(listing_id) REFERENCES abada_listings(id)
        )
        """)
        print("Table transactions created.")

    # Check reviews
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'")
    if cursor.fetchone():
        print("Table reviews already exists.")
    else:
        print("Creating reviews table...")
        cursor.execute("""
        CREATE TABLE reviews (
            id CHAR(32) PRIMARY KEY,
            reviewer_id CHAR(32) NOT NULL,
            reviewed_id CHAR(32) NOT NULL,
            transaction_id CHAR(32) NOT NULL,
            rating FLOAT NOT NULL,
            comment VARCHAR,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(reviewer_id) REFERENCES users(id),
            FOREIGN KEY(reviewed_id) REFERENCES users(id),
            FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        )
        """)
        print("Table reviews created.")
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
