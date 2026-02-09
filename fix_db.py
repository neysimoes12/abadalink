import sqlite3
import os

DB_FILE = "abada_v4.db"

def migrate_db():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Check columns in messages table
    cursor.execute("PRAGMA table_info(messages)")
    columns = [info[1] for info in cursor.fetchall()]
    
    print(f"Current columns: {columns}")

    # Add deleted_by_sender if missing
    if "deleted_by_sender" not in columns:
        print("Adding deleted_by_sender column...")
        cursor.execute("ALTER TABLE messages ADD COLUMN deleted_by_sender BOOLEAN DEFAULT 0")
    
    # Add deleted_by_receiver if missing
    if "deleted_by_receiver" not in columns:
        print("Adding deleted_by_receiver column...")
        cursor.execute("ALTER TABLE messages ADD COLUMN deleted_by_receiver BOOLEAN DEFAULT 0")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate_db()
