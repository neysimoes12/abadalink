import sys
from sqlalchemy import select
from sqlalchemy.orm import Session
from database_models import engine, User

def promote_to_admin(email):
    with Session(engine) as session:
        stmt = select(User).where(User.email == email)
        user = session.execute(stmt).scalar_one_or_none()
        
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return
        
        user.is_admin = True
        session.commit()
        print(f"✅ User '{user.name}' ({email}) is now an ADMIN.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <email>")
    else:
        promote_to_admin(sys.argv[1])
