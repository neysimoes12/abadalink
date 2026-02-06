from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing, ReferenceItem
import uuid

def seed_database():
    with Session(engine) as db:
        # 1. Users
        claudia = User(name="Claudia Leitte", email="claudia@axemusic.com", cpf="111", is_verified=True, reputation_score=5.0)
        foliao = User(name="Folião Desesperado", email="foliao@carnaval.com", cpf="222", is_verified=True)

        if db.query(User).filter_by(email=claudia.email).first():
            print("Seed data already exists.")
            return

        db.add(claudia)
        db.add(foliao)
        db.flush()

        # 2. Reference Data
        refs = [
            # Circuits
            ReferenceItem(category="CIRCUIT", name="Dodô", neighborhood="Barra-Ondina"),
            ReferenceItem(category="CIRCUIT", name="Osmar", neighborhood="Campo Grande"),
            ReferenceItem(category="CIRCUIT", name="Batatinha", neighborhood="Pelourinho"),

            # Blocos (With Default Circuit)
            ReferenceItem(category="BLOCO", name="Coruja", default_circuit="Dodô"),
            ReferenceItem(category="BLOCO", name="Camaleão", default_circuit="Dodô"),
            ReferenceItem(category="BLOCO", name="Vumbora", default_circuit="Dodô"),
            
            # Camarotes
            ReferenceItem(category="CAMAROTE", name="Salvador", default_circuit="Dodô"),
            ReferenceItem(category="CAMAROTE", name="Villa", default_circuit="Dodô"),
        ]
        db.add_all(refs)
        db.flush()

        # 3. Listings
        listing_vip = AbadaListing(
            seller_id=claudia.id,
            event_name="Salvador",
            type="CAMAROTE",
            circuit="Dodô",
            event_date="Quinta (27/02)",
            gender="Unissex",
            
            interest_type="CAMAROTE",
            interest_event_name="Villa",
            interest_circuit="Dodô",
            interest_event_date="Sexta (28/02)",
            interest_gender="Feminino",

            product_value=1500.00,
            max_difference=500.00,

            status="AVAILABLE"
        )

        db.add(listing_vip)
        db.commit()

        print("✅ DATABASE SEEDED WITH CIRCUITS & ASSOCIATIONS")

if __name__ == "__main__":
    seed_database()
