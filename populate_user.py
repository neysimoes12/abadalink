from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing, Base
import uuid
import random

# Initialize DB
Base.metadata.create_all(bind=engine)

def populate_user_specific():
    session = Session(engine)
    
    TARGET_EMAIL = "ney@gmail.com"
    TARGET_NAME = "Ney Simoes"
    NUM_LISTINGS = 30
    
    print(f"🚀 Iniciando População para {TARGET_EMAIL}...")

    # --- 1. Get or Create User ---
    user = session.query(User).filter(User.email == TARGET_EMAIL).first()
    
    if not user:
        print(f"User {TARGET_EMAIL} not found. Creating...")
        user = User(
            id=uuid.uuid4(),
            name=TARGET_NAME,
            email=TARGET_EMAIL,
            cpf=f"{random.randint(100,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(10,99)}",
            is_verified=True,
            kyc_status="VERIFIED",
            profile_image_url=f"https://ui-avatars.com/api/?name=Ney+S&background=random&color=fff"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"✅ User Created: {user.name} ({user.id})")
    else:
        print(f"✅ User Found: {user.name} ({user.id})")

    # --- 2. Create Diverse Listings ---
    print(f"🎫 Gerando {NUM_LISTINGS} anúncios diversos...")
    
    blocos = [
        "Vumbora", "Camaleão", "Nana", "Eva", "Me Abraça", 
        "Largadinho", "Coruja", "Crocodilo", "Timbalada", "Olodum"
    ]
    camarotes = [
        "Camarote Salvador", "Camarote Villa", "Camarote Club", 
        "Camarote Brahma", "Camarote Expresso 2222", "Camarote Planeta Band"
    ]
    all_events = blocos + camarotes
    dates = ["2026-02-12", "2026-02-13", "2026-02-14", "2026-02-15", "2026-02-16", "2026-02-17"]
    circuits = ["Barra-Ondina", "Campo Grande"]

    count_created = 0
    
    for i in range(NUM_LISTINGS):
        # Diversify Types: 
        # 0-10: SALE (Only selling)
        # 10-20: EXCHANGE (Trading)
        # 20-30: BUY (Procura)
        
        if i < 10:
            type_mode = "SALE"
        elif i < 20:
            type_mode = "EXCHANGE"
        else:
            type_mode = "BUY"
            
        event = random.choice(all_events)
        event_date = random.choice(dates)
        
        if type_mode == "BUY":
            listing = AbadaListing(
                id=uuid.uuid4(),
                seller_id=user.id,
                event_name=event,
                type="PROCURA",
                circuit=random.choice(circuits),
                event_date=event_date,
                gender=random.choice(["UNISEX", "M", "F"]),
                interest_event_name=event,
                product_value=random.randint(400, 2000),
                status="AVAILABLE",
                accepts_exchange=True
            )
        else:
            # Sale or Exchange
            type_val = "CAMAROTE" if "Camarote" in event else "BLOCO"
            
            # Exchange Logic
            wants_exchange = (type_mode == "EXCHANGE")
            
            if wants_exchange:
                num_interests = random.randint(1, 3)
                interests = random.sample(all_events, num_interests)
                interest_str = ", ".join(interests)
            else:
                interest_str = None
            
            listing = AbadaListing(
                id=uuid.uuid4(),
                seller_id=user.id,
                event_name=event,
                type=type_val,
                circuit=random.choice(circuits),
                event_date=event_date,
                gender=random.choice(["UNISEX", "M", "F"]),
                interest_event_name=interest_str,
                product_value=random.randint(500, 4000),
                image_url=f"https://placehold.co/600x400/orange/white?text={event.replace(' ', '+')}",
                status="AVAILABLE",
                accepts_exchange=wants_exchange
            )
        
        session.add(listing)
        count_created += 1

    session.commit()
    print(f"✨ Sucesso! {count_created} anúncios criados para {TARGET_EMAIL}.")
    print("💡 Logue com este email e código 123456 para ver seus anúncios.")

if __name__ == "__main__":
    populate_user_specific()
