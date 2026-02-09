import random
import uuid
from faker import Faker
from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing

fake = Faker('pt_BR')

def populate():
    session = Session(engine)
    
    # 1. Find Target User
    ney = session.query(User).filter_by(email="ney@gmail.com").first()
    if not ney:
        print("User ney@gmail.com not found. Please create it first.")
        return

    print(f"Target User: {ney.name} ({ney.id})")
    
    # 2. Get Ney's Listings
    ney_listings = session.query(AbadaListing).filter_by(seller_id=ney.id, status="AVAILABLE").all()
    if not ney_listings:
        print("Ney has no available listings. Cannot generate matches.")
        return

    # 3. Generate 80 Matches
    count = 0
    while count < 80:
        # Pick a target listing from Ney
        target = random.choice(ney_listings)
        
        # Create a random user
        new_user = User(
            id=uuid.uuid4(),
            name=fake.name(),
            email=fake.email(),
            cpf=fake.cpf(),
            is_verified=random.choice([True, False]),
            reputation_score=random.uniform(3.5, 5.0)
        )
        session.add(new_user)
        session.flush() # Get ID
        
        # Create the Counter-Listing
        # Logic: If Ney has X and wants Y, new user must have Y and want X.
        
        final_type = "BLOCO"
        final_event = "Unknown"
        final_interest = None
        
        # LOGIC 1: Ney wants to EXCHANGE (Trade)
        if target.interest_event_name and target.type != "PROCURA":
            # Ney has A ("Camaleão"), Wants B ("Vumbora")
            # New User must Have B ("Vumbora"), Want A ("Camaleão")
            
            wants_list = [x.strip() for x in target.interest_event_name.split(",")]
            chosen_want = wants_list[0] # e.g. "Vumbora"
            
            final_event = chosen_want 
            final_interest = target.event_name
            final_type = "BLOCO"
            
        # LOGIC 2: Ney wants to BUY (Procura)
        elif target.type == "PROCURA":
            # Ney Wants X ("Coruja")
            # New User must Have X ("Coruja") to Sell
            final_event = target.interest_event_name # "Coruja"
            final_interest = None # Selling for money
            final_type = "BLOCO" # Or CAMAROTE
            
        # LOGIC 3: Ney wants to SELL
        else:
            # Ney Has X ("Nana")
            # New User must Want X ("Nana") -> Type PROCURA
            final_event = "Busca" # Or empty, type is PROCURA
            final_type = "PROCURA"
            final_interest = target.event_name # "Nana"
        
        listing = AbadaListing(
            id=uuid.uuid4(),
            seller_id=new_user.id,
            event_name=final_event,
            type=final_type,
            circuit=target.circuit,
            event_date=target.event_date,
            gender=target.gender,
            interest_event_name=final_interest,
            product_value=random.uniform(200, 1000)
        )
        
        session.add(listing)
        count += 1
        
        # Commit every 10 to avoid huge transaction
        if count % 10 == 0:
             session.commit()
             print(f"Created {count} matches...")

    session.commit()
    print("Done! 80 matches created.")

if __name__ == "__main__":
    populate()
