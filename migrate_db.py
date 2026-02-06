"""
Database Migration Script
Adds KYC and MFA fields to existing users table

Run this script once to add the new columns to the existing database.
"""
import sqlite3
import os

DATABASE_PATH = "abada_v4.db"

def run_migration():
    if not os.path.exists(DATABASE_PATH):
        print(f"Database not found at {DATABASE_PATH}")
        return False
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    # New columns to add
    new_columns = [
        ("kyc_status", "VARCHAR DEFAULT 'PENDING'"),
        ("kyc_verified_at", "DATETIME"),
        ("document_type", "VARCHAR"),
        ("document_number", "VARCHAR"),
        ("mfa_enabled", "BOOLEAN DEFAULT 0"),
        ("mfa_secret", "VARCHAR"),
        ("email_verified", "BOOLEAN DEFAULT 0"),
        ("profile_image_url", "VARCHAR"),
    ]
    
    added = []
    for column_name, column_def in new_columns:
        if column_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_def}")
                added.append(column_name)
                print(f"✅ Added column: {column_name}")
            except sqlite3.OperationalError as e:
                print(f"⚠️ Column {column_name} might already exist: {e}")
        else:
            print(f"⏭️ Column already exists: {column_name}")
    
    conn.commit()
    conn.close()
    
    if added:
        print(f"\n✅ Migration complete! Added {len(added)} columns.")
    else:
        print("\n✅ No new columns needed. Database is up to date.")
    
    return True


if __name__ == "__main__":
    print("=" * 50)
    print("AbadáLink Database Migration")
    print("=" * 50)
    run_migration()
