from database_models import Base, engine, AbadaListing
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("🔍 Checking AbadaListings...")

all_listings = db.query(AbadaListing).all()
print(f"Total Listings: {len(all_listings)}")

available = [l for l in all_listings if l.status == "AVAILABLE"]
print(f"Total AVAILABLE: {len(available)}")

# Check Trocas (Interest + Not Procura)
trocas = [l for l in available if l.interest_event_name and l.type != "PROCURA"]
print(f"Trocas (Frontend Logic): {len(trocas)}")

# Check Vendas (No Interest + Not Procura)
vendas = [l for l in available if not l.interest_event_name and l.type != "PROCURA"]
print(f"Vendas (Frontend Logic): {len(vendas)}")

# Check Compras (Procura)
compras = [l for l in available if l.type == "PROCURA"]
print(f"Compras (Frontend Logic): {len(compras)}")

if trocas:
    print(f"Sample Troca: ID={trocas[0].id}, Event={trocas[0].event_name}, Interest={trocas[0].interest_event_name}, Type={trocas[0].type}")
else:
    print("❌ No Trocas found!")

db.close()
