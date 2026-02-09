import sys
import uuid
from sqlalchemy.orm import Session
from database_models import engine, User

def promote_user(email):
    with Session(engine) as session:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            print(f"Erro: Usuário com email {email} não encontrado.")
            return
        
        user.is_admin = True
        session.commit()
        print(f"Sucesso: {user.name} ({email}) agora é administrador!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python promote_admin.py seu_email@exemplo.com")
    else:
        promote_user(sys.argv[1])
