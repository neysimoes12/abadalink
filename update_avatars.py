"""Script to update Partner User Profile Photo"""
from sqlalchemy.orm import Session
from database_models import engine, User

def update_partner_avatar():
    with Session(engine) as db:
        # Update Partner
        partner = db.query(User).filter(User.email == "matcher@carnaval.com").first()
        if partner:
            # Using a public placeholder for testing
            partner.profile_image_url = "https://ui-avatars.com/api/?name=Foliao+Parceiro&background=random&size=128"
            db.commit()
            print(f"✅ Updated avatar for {partner.name}")
        else:
            print("Partner not found")

        # Update Admin too just in case
        admin = db.query(User).filter(User.email == "neyrvsimoes@gmail.com").first()
        if admin and not admin.profile_image_url:
             admin.profile_image_url = "https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff&size=128"
             db.commit()
             print(f"✅ Updated avatar for {admin.name}")

if __name__ == "__main__":
    update_partner_avatar()
