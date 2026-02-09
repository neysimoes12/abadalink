from database_models import Base, engine, User, EventItem
from sqlalchemy.orm import sessionmaker
import uuid

import sys

# Confirmation
if "--force" in sys.argv:
    print("⚠️  MODO FORCE: Resetando banco sem confirmação...")
else:
    print("⚠️  ATENÇÃO: Isso apagará TODOS os dados do banco de dados!")
    confirm = input("Digite 'CONFIRMAR' para continuar: ")

    if confirm != "CONFIRMAR":
        print("Operação cancelada.")
        exit()

print("🗑️  Apagando tabelas...")
Base.metadata.drop_all(bind=engine)

print("✨  Recriando tabelas...")
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("👤  Criando usuário admin padrão...")
admin_user = User(
    email="admin@abadalink.com",
    name="Administrador",
    cpf="00000000000",
    phone="11999999999",
    is_admin=True,
    is_verified=True,
    kyc_status="VERIFIED"
)
db.add(admin_user)

# Add some initial Events
print("🎉  Criando eventos iniciais...")
events = [
    EventItem(name="Camarote Salvador", category="CAMAROTE", logo_url="https://example.com/logo1.png"),
    EventItem(name="Camarote Villa", category="CAMAROTE", logo_url="https://example.com/logo2.png"),
    EventItem(name="Bloco Camaleão", category="BLOCO", logo_url="https://example.com/logo3.png"),
    EventItem(name="Bloco Vumbora", category="BLOCO", logo_url="https://example.com/logo4.png"),
    EventItem(name="Bloco Coruja", category="BLOCO", logo_url="https://example.com/logo5.png"),
    EventItem(name="Camarote Club", category="CAMAROTE", logo_url="https://example.com/logo6.png"),
    EventItem(name="Camarote Brahma", category="CAMAROTE", logo_url="https://example.com/logo7.png"),
]
for event in events:
    db.add(event)

db.commit()
db.close()

print("✅  Banco de dados resetado com sucesso!")
print("🔑  Admin: admin@abadalink.com / admin123")
