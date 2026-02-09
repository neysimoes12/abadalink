from sqlalchemy.orm import Session
from database_models import engine, User, Base

def verify_ney():
    session = Session(engine)
    email = "ney@gmail.com"
    
    user = session.query(User).filter(User.email == email).first()
    
    if user:
        user.is_verified = True
        user.kyc_status = "VERIFIED"
        session.commit()
        print(f"✅ Sucesso! Usuário {email} agora é VERIFICADO!")
    else:
        print(f"❌ Erro: Usuário {email} não encontrado.")

if __name__ == "__main__":
    verify_ney()
