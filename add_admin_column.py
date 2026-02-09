from sqlalchemy import text
from database_models import engine

def add_admin_column():
    with engine.connect() as conn:
        try:
            # Check if column exists first to avoid error? SQLite doesn't invoke easy check, 
            # but adding it if it exists throws error, which we can catch.
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;"))
            conn.commit()
            print("✅ Column 'is_admin' added to 'users' table.")
        except Exception as e:
            print(f"⚠️ Could not add column (might already exist): {e}")

if __name__ == "__main__":
    add_admin_column()
