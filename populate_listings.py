from database_models import Base, engine, User, EventItem, AbadaListing
from sqlalchemy.orm import sessionmaker
import random
import uuid

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("🚀 Iniciando criação de anúncios...")

# Fetch Data
users = db.query(User).all()
events = db.query(EventItem).all()

if not users:
    print("❌ Nenhum usuário encontrado. Rode populate_db.py primeiro.")
    exit()

if not events:
    print("❌ Nenhum evento encontrado. Rode reset_db.py primeiro.")
    exit()

# Configuration
days = ["Quinta", "Sexta", "Sábado", "Domingo", "Segunda", "Terça"]
genders = ["Masculino", "Feminino", "Unissex"]

# Clear existing listings first to avoid duplicates/mess
print("🧹 Limpando anúncios antigos...")
db.query(AbadaListing).delete()
db.commit()

listings_created = 0

for user in users:
    # Skip admin if you want, or include them. Let's include everyone.
    
    num_listings = random.randint(2, 3) # At least 2 per user
    
    for _ in range(num_listings):
        event = random.choice(events)
        day = random.choice(days)
        gender = random.choice(genders)
        
        if random.random() < 0.2:
            # 20% PROCURA (Buy/Wanted)
            type_ = "PROCURA"
            # For PROCURA, we need to know WHAT they want.
            # Use interest fields. event_name can be "Procurando..." or generic.
            event_name_ = "Busco Abadá"
            interest_event_name = event.name
        else:
            # 80% Normal Listings (Bloco/Camarote)
            type_ = event.category
            event_name_ = event.name
            
            # Simple pricing logic
            base_price = 400.0 if event.category == "BLOCO" else 800.0
            if day in ["Domingo", "Segunda"]: base_price *= 1.5
            elif day == "Terça": base_price *= 0.8
            if gender == "Masculino": base_price *= 1.2
            elif gender == "Feminino": base_price *= 0.9
            final_price = base_price + random.randint(-50, 50)
            
            # 50% chance of being an EXCHANGE (having interest)
            if random.random() < 0.5:
                # Pick another random event as interest
                interest_event = random.choice(events)
                interest_event_name = interest_event.name
            else:
                interest_event_name = None

        listing = AbadaListing(
            seller_id=user.id,
            event_name=event_name_,
            type=type_,
            event_date=day,
            gender=gender.upper(), # "UNISSEX" from db
            image_url=event.logo_url if type_ != "PROCURA" else None,
            product_value=round(final_price, 2) if type_ != "PROCURA" else 0.0,
            accepts_exchange=True if interest_event_name else False,
            status="AVAILABLE",
            interest_event_name=interest_event_name
        )
        
        db.add(listing)
        listings_created += 1

db.commit()
db.close()

print(f"✅ {listings_created} anúncios criados e distribuídos para {len(users)} usuários!")
