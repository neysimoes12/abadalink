import sqlite3
import os

DB_FILE = "abada_v4.db"

def migrate_db():
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file {DB_FILE} not found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        print("Attempting to add 'phone' column to 'users' table...")
        cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR")
        conn.commit()
        print("Success: Column 'phone' added.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Info: Column 'phone' already exists.")
        else:
            print(f"Error adding column: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_db()
