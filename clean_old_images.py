from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker
from database_models import Base, User, AbadaListing
import os
from dotenv import load_dotenv

load_dotenv()

# Setup DB
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def clean_images():
    db = SessionLocal()
    try:
        print("🔍 Checking for legacy images (Base64)...")
        
        # 1. Clean Users
        users = db.query(User).all()
        cleaned_count = 0
        for user in users:
            if user.profile_image_url:
                if not user.profile_image_url.startswith("http"):
                    # Likely Base64 or invalid
                    print(f"   - Clearing User {user.id} image (Length: {len(user.profile_image_url)})")
                    user.profile_image_url = None
                    cleaned_count += 1
        
        # 2. Clean Listings (New field, likely empty, but good to check)
        listings = db.query(AbadaListing).all()
        for listing in listings:
            if listing.image_url and not listing.image_url.startswith("http"):
                 print(f"   - Clearing Listing {listing.id} image")
                 listing.image_url = None
                 cleaned_count += 1

        db.commit()
        print(f"✅ Cleanup complete. {cleaned_count} images cleared.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_images()
