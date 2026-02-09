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
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='verification_requests'")
    if cursor.fetchone():
        print("Table verification_requests already exists.")
    else:
        print("Creating verification_requests table...")
        cursor.execute("""
        CREATE TABLE verification_requests (
            id CHAR(32) PRIMARY KEY,
            user_id CHAR(32) NOT NULL,
            document_type VARCHAR NOT NULL,
            document_number VARCHAR NOT NULL,
            front_image_url VARCHAR,
            back_image_url VARCHAR,
            selfie_image_url VARCHAR,
            status VARCHAR DEFAULT 'PENDING',
            admin_notes VARCHAR,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)
        print("Table verification_requests created.")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
