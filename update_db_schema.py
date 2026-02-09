from sqlalchemy import text
from database_models import engine

def add_image_url_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE abada_listings ADD COLUMN image_url VARCHAR;"))
            conn.commit()
            print("✅ Column 'image_url' added to 'abada_listings' table.")
        except Exception as e:
            print(f"⚠️ Could not add column (might already exist): {e}")

if __name__ == "__main__":
    add_image_url_column()
