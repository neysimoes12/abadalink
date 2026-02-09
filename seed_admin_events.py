from sqlalchemy.orm import Session
from database_models import engine, EventItem
import uuid

def seed_events():
    events = [
        {"category": "BLOCO", "name": "Camaleão", "day": "Domingo", "circuit": "Barra", "gender": "UNISSEX"},
        {"category": "BLOCO", "name": "Camaleão", "day": "Segunda", "circuit": "Barra", "gender": "UNISSEX"},
        {"category": "BLOCO", "name": "Camaleão", "day": "Terça", "circuit": "Barra", "gender": "UNISSEX"},
        {"category": "CAMAROTE", "name": "Camarote Salvador", "day": "Sábado", "circuit": "Barra", "gender": "UNISSEX"},
        {"category": "CAMAROTE", "name": "Camarote Brahma", "day": "Sexta", "circuit": "Barra", "gender": "UNISSEX"},
    ]
    
    with Session(engine) as session:
        # Avoid duplicates
        for e in events:
            exists = session.query(EventItem).filter(
                EventItem.name == e['name'], 
                EventItem.day == e['day']
            ).first()
            if not exists:
                session.add(EventItem(**e))
        
        session.commit()
        print("Eventos iniciais semeados com sucesso!")

if __name__ == "__main__":
    seed_events()
