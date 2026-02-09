from database_models import Base, engine, User
from sqlalchemy.orm import sessionmaker
import random
import uuid

# CPF Generator
def generate_cpf():
    cpf = [random.randint(0, 9) for _ in range(9)]
    
    # First digit
    sum1 = sum(x * y for x, y in zip(cpf, range(10, 1, -1)))
    digit1 = (sum1 * 10 % 11) % 10
    cpf.append(digit1)
    
    # Second digit
    sum2 = sum(x * y for x, y in zip(cpf, range(11, 1, -1)))
    digit2 = (sum2 * 10 % 11) % 10
    cpf.append(digit2)
    
    return "".join(map(str, cpf))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("🚀 Iniciando população do banco de dados...")

names = ["João", "Maria", "Pedro", "Ana", "Lucas", "Julia", "Mateus", "Larissa", "Gabriel", "Sofia", "Enzo", "Valentina", "Rafael", "Isabela", "Gustavo", "Beatriz", "Felipe", "Mariana", "Bruno", "Camila"]
surnames = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"]

users_to_create = []

for i in range(100):
    name = f"{random.choice(names)} {random.choice(surnames)}"
    email = f"user{i}_{uuid.uuid4().hex[:4]}@example.com"
    cpf = generate_cpf()
    phone = f"119{random.randint(10000000, 99999999)}"
    
    user = User(
        name=name,
        email=email,
        cpf=cpf,
        phone=phone,
        is_verified=random.choice([True, False]),
        kyc_status=random.choice(["VERIFIED", "PENDING", "REJECTED"]),
        is_blocked=random.choice([True, False] + [False]*10) # 10% chance of being blocked
    )
    users_to_create.append(user)

db.bulk_save_objects(users_to_create)
db.commit()
db.close()

print(f"✅ {len(users_to_create)} usuários criados com sucesso!")
