"""Script to seed PERFECT MATCHES for the Admin User"""
from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing
import uuid

def seed_matches():
    with Session(engine) as db:
        # 1. Create a Partner User
        partner_email = "matcher@carnaval.com"
        partner = db.query(User).filter(User.email == partner_email).first()
        
        if not partner:
            partner = User(
                name="Folião Parceiro",
                email=partner_email,
                cpf="99988877766",
                is_verified=True,
                reputation_score=5.0
            )
            db.add(partner)
            db.commit()
            print(f"Created partner user: {partner.name}")
        else:
            print(f"Using existing partner: {partner.name}")

        # 2. Create Compatible Listings (Inverse of Admin's first few listings)
        
        # Match 1: Admin has Camaleão (Quinta) / Wants Camarote Salvador (Sexta)
        # Partner has Camarote Salvador (Sexta) / Wants Camaleão (Quinta)
        match1 = AbadaListing(
            seller_id=partner.id,
            event_name="Camarote Salvador",
            type="CAMAROTE",
            circuit="Dodô (Barra-Ondina)",
            event_date="Sexta (28/02)",
            gender="Unissex",
            
            accepts_exchange=True,
            interest_type="BLOCO",
            interest_event_name="Camaleão",
            interest_circuit="Dodô (Barra-Ondina)",
            interest_event_date="Quinta (27/02)",
            interest_gender="Unissex",
            
            product_value=1800.00,
            status="AVAILABLE"
        )

        # Match 2: Admin has Vumbora (Sexta) / Wants Camarote Villa (Sábado)
        # Partner has Camarote Villa (Sábado) / Wants Vumbora (Sexta)
        match2 = AbadaListing(
            seller_id=partner.id,
            event_name="Camarote Villa",
            type="CAMAROTE",
            circuit="Dodô (Barra-Ondina)",
            event_date="Sábado (01/03)",
            gender="Unissex",
            
            accepts_exchange=True,
            interest_type="BLOCO",
            interest_event_name="Vumbora",
            interest_circuit="Dodô (Barra-Ondina)",
            interest_event_date="Sexta (28/02)",
            interest_gender="Unissex",
            
            product_value=1600.00,
            status="AVAILABLE"
        )
        
        # Match 3 (Partial): Partner has something Admin wants, but wants something else
        # Admin wants: Camarote Brahma (Domingo) (from index 2 logic in seed_real matches)
        # Partner has: Camarote Brahma (Domingo)
        match3 = AbadaListing(
            seller_id=partner.id,
            event_name="Camarote Brahma",
            type="CAMAROTE",
            circuit="Dodô (Barra-Ondina)",
            event_date="Domingo (02/03)",
            gender="Unissex",
            
            accepts_exchange=True,
            interest_type="BLOCO",
            interest_event_name="Me Abraça", # Admin doesn't have this one
            
            product_value=1400.00,
            status="AVAILABLE"
        )

        db.add_all([match1, match2, match3])
        db.commit()
        
        print("✅ Seeded 3 Matches (2 Perfect, 1 Partial)")

if __name__ == "__main__":
    seed_matches()
