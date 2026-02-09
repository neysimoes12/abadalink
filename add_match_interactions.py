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
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='match_interactions'")
    if cursor.fetchone():
        print("Table match_interactions already exists.")
        conn.close()
        return

    print("Creating match_interactions table...")
    cursor.execute("""
    CREATE TABLE match_interactions (
        id CHAR(32) PRIMARY KEY,
        user_id CHAR(32) NOT NULL,
        target_listing_id CHAR(32) NOT NULL,
        my_listing_id CHAR(32),
        status VARCHAR NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(target_listing_id) REFERENCES abada_listings(id),
        FOREIGN KEY(my_listing_id) REFERENCES abada_listings(id)
    )
    """)
    
    conn.commit()
    conn.close()
    print("Migration complete: match_interactions table created.")

if __name__ == "__main__":
    migrate()
