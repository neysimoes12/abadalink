"""Script to seed database with 10 Real Blocos and 10 Real Camarotes"""
from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing
import uuid
import random

def seed_real_data():
    with Session(engine) as db:
        # Get Admin User
        admin_email = 'neyrvsimoes@gmail.com'
        admin = db.query(User).filter(User.email == admin_email).first()
        
        if not admin:
            print(f"Admin user {admin_email} not found. Please run setup_admin.py first.")
            return

        print(f"Seeding data for seller: {admin.name}")

        # Real Carnival Data
        blocos = [
            "Camaleão", "Vumbora", "Nana", "Eva", "Me Abraça",
            "Largadinho", "Coruja", "Crocodilo", "Timbalada", "Olodum"
        ]
        
        camarotes = [
            "Camarote Salvador", "Camarote Villa", "Camarote Brahma", "Camarote Club", 
            "Camarote Nana", "Expresso 2222", "Camarote Harém", "Planeta Band", 
            "Camarote Mirante", "Camarote Pier"
        ]

        days = [
            "Quinta (27/02)", "Sexta (28/02)", "Sábado (01/03)", 
            "Domingo (02/03)", "Segunda (03/03)", "Terça (04/03)"
        ]
        
        circuits = ["Dodô (Barra-Ondina)", "Osmar (Campo Grande)"]
        genders = ["Masculino", "Feminino", "Unissex"]

        listings = []

        # 1. Create 10 Bloco Listings
        for i, nome_bloco in enumerate(blocos):
            day = days[i % len(days)]
            circuit = circuits[0] if i % 2 == 0 else circuits[1]
            gender = genders[i % len(genders)]
            
            listing = AbadaListing(
                seller_id=admin.id,
                event_name=nome_bloco,
                type="BLOCO",
                circuit=circuit,
                event_date=day,
                gender=gender,
                
                # Make some available for exchange
                accepts_exchange=True,
                interest_type="CAMAROTE",
                interest_event_name=camarotes[i % len(camarotes)],
                interest_circuit="Dodô (Barra-Ondina)",
                interest_event_date=days[(i + 1) % len(days)],
                interest_gender="Unissex",
                
                product_value=500.00 + (i * 50),
                max_difference=100.00,
                status="AVAILABLE"
            )
            listings.append(listing)

        # 2. Create 10 Camarote Listings
        for i, nome_camarote in enumerate(camarotes):
            day = days[(i + 2) % len(days)] # Shift days for variety
            gender = "Unissex" # Camarotes usually unissex/shirt
            
            listing = AbadaListing(
                seller_id=admin.id,
                event_name=nome_camarote,
                type="CAMAROTE",
                circuit="Dodô (Barra-Ondina)", # Camarotes mostly in Barra
                event_date=day,
                gender=gender,
                
                accepts_exchange=True,
                interest_type="BLOCO",
                interest_event_name=blocos[i % len(blocos)],
                interest_circuit="Dodô (Barra-Ondina)",
                interest_event_date=days[(i + 3) % len(days)],
                interest_gender="Unissex",
                
                product_value=1200.00 + (i * 100),
                max_difference=200.00,
                status="AVAILABLE"
            )
            listings.append(listing)

        # Add all to DB
        db.add_all(listings)
        db.commit()
        
        print(f"✅ Successfully created {len(listings)} listings (10 Blocos, 10 Camarotes) for {admin.name}")

if __name__ == "__main__":
    seed_real_data()
