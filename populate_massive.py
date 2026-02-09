from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing, Base
import uuid
import random

# Initialize DB
Base.metadata.create_all(bind=engine)

def populate_massive():
    session = Session(engine)
    
    print("🚀 Iniciando População Massiva de Dados...")

    # --- Configuration ---
    NUM_USERS = 50
    LISTINGS_PER_USER_AVG = 2
    
    blocos = [
        "Vumbora", "Camaleão", "Nana", "Eva", "Me Abraça", 
        "Largadinho", "Coruja", "Crocodilo", "Timbalada", "Olodum"
    ]
    camarotes = [
        "Camarote Salvador", "Camarote Villa", "Camarote Club", 
        "Camarote Brahma", "Camarote Expresso 2222", "Camarote Planeta Band"
    ]
    all_events = blocos + camarotes
    
    dates = ["2026-02-12", "2026-02-13", "2026-02-14", "2026-02-15", "2026-02-16", "2026-02-17"] # Thu-Tue
    circuits = ["Barra-Ondina", "Campo Grande"]
    
    first_names = ["João", "Maria", "Pedro", "Ana", "Lucas", "Julia", "Gabriel", "Beatriz", "Matheus", "Larissa", "Rafael", "Camila", "Gustavo", "Fernanda", "Felipe", "Amanda", "Bruno", "Carolina", "Daniel", "Leticia"]
    last_names = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Carvalho", "Ferreira", "Ribeiro", "Almeida", "Costa", "Gomes", "Martins", "Araujo", "Barbosa"]

    created_users = []

    # --- 1. Create Users ---
    print(f"👤 Criando {NUM_USERS} usuários...")
    for i in range(NUM_USERS):
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{i}@demo.com" # Ensure uniqueness
        
        # Check if exists
        existing = session.query(User).filter(User.email == email).first()
        if existing:
            created_users.append(existing)
            continue
            
        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            cpf=f"{random.randint(100,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(10,99)}",
            is_verified=True,
            kyc_status="VERIFIED",
            profile_image_url=f"https://ui-avatars.com/api/?name={fname}+{lname}&background=random&color=fff"
        )
        session.add(user)
        created_users.append(user)
    
    session.commit()
    print(f"✅ {len(created_users)} usuários prontos.")

    # --- 2. Create Listings ---
    print(f"🎫 Gerando abadás e desejos...")
    
    count_listings = 0
    
    for user in created_users:
        # Determine how many listings this user has (0 to 3)
        num_listings = random.choices([1, 2, 3], weights=[30, 50, 20])[0]
        
        for _ in range(num_listings):
            # Decide Type: Sale/Exchange (80%) vs Buy (20%)
            is_procura = random.random() < 0.2
            
            event = random.choice(all_events)
            event_date = random.choice(dates)
            
            if is_procura:
                # User wants to BUY 'event'
                listing = AbadaListing(
                    id=uuid.uuid4(),
                    seller_id=user.id,
                    event_name=event, # They want this
                    type="PROCURA",
                    circuit=random.choice(circuits),
                    event_date=event_date,
                    gender=random.choice(["UNISEX", "M", "F"]),
                    interest_event_name=event, # Redundant but clear
                    product_value=random.randint(400, 2000),
                    status="AVAILABLE",
                    accepts_exchange=True
                )
            else:
                # User HAS 'event' (Selling or Exchanging)
                type_val = "CAMAROTE" if "Camarote" in event else "BLOCO"
                
                # Does user want to exchange? 60% yes
                wants_exchange = random.random() < 0.6
                
                if wants_exchange:
                    # Pick 1 to 3 interests to increase match chances
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
                    image_url=f"https://placehold.co/600x400/purple/white?text={event.replace(' ', '+')}",
                    status="AVAILABLE",
                    accepts_exchange=True if wants_exchange else False
                )
            
            session.add(listing)
            count_listings += 1

    session.commit()
    print(f"✨ População concluída! {count_listings} novos anúncios criados.")
    print("🔥 O banco agora está cheio de oportunidades de match!")

if __name__ == "__main__":
    populate_massive()
