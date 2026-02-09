import sys
from sqlalchemy.orm import Session
from database_models import engine, User

def update_email(old_email, new_email):
    with Session(engine) as session:
        user = session.query(User).filter(User.email == old_email).first()
        if not user:
            print(f"Erro: Usuário com email '{old_email}' não encontrado.")
            # Check if new email already exists, maybe they just want to promote it
            target_user = session.query(User).filter(User.email == new_email).first()
            if target_user:
                print(f"Aviso: Usuário '{new_email}' já existe. Promovendo a Admin...")
                target_user.is_admin = True
                session.commit()
                print(f"Sucesso: {new_email} agora é administrador.")
            return

        # Check if new email works
        existing = session.query(User).filter(User.email == new_email).first()
        if existing:
             print(f"Erro: O email '{new_email}' já está em uso por outro usuário.")
             return
        
        user.email = new_email
        user.is_admin = True # Ensure admin
        session.commit()
        print(f"Sucesso: Email alterado de '{old_email}' para '{new_email}' e status Admin garantido.")

if __name__ == "__main__":
    update_email("ney@gmail.com", "neyrvsimoes@gmail.com")
