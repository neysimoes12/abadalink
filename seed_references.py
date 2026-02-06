"""Script to populate ReferenceItem table with Real Carnival Options"""
from sqlalchemy.orm import Session
from database_models import engine, ReferenceItem

def seed_references():
    with Session(engine) as db:
        print("Seeding Reference Items (Dropdown Options)...")
        
        blocos = [
            "Camaleão", "Vumbora", "Nana", "Eva", "Me Abraça",
            "Largadinho", "Coruja", "Crocodilo", "Timbalada", "Olodum"
        ]
        
        camarotes = [
            "Camarote Salvador", "Camarote Villa", "Camarote Brahma", "Camarote Club", 
            "Camarote Nana", "Expresso 2222", "Camarote Harém", "Planeta Band", 
            "Camarote Mirante", "Camarote Pier"
        ]

        # 1. Add Blocos
        for name in blocos:
            exists = db.query(ReferenceItem).filter(
                ReferenceItem.category == "BLOCO", 
                ReferenceItem.name == name
            ).first()
            
            if not exists:
                db.add(ReferenceItem(category="BLOCO", name=name, default_circuit="Dodô"))
                print(f"Added Bloco: {name}")

        # 2. Add Camarotes
        for name in camarotes:
            exists = db.query(ReferenceItem).filter(
                ReferenceItem.category == "CAMAROTE", 
                ReferenceItem.name == name
            ).first()
            
            if not exists:
                db.add(ReferenceItem(category="CAMAROTE", name=name, default_circuit="Dodô"))
                print(f"Added Camarote: {name}")

        db.commit()
        print("✅ Reference Items Seeded Successfully")

if __name__ == "__main__":
    seed_references()
