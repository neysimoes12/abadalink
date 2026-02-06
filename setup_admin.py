"""Script to set up admin user"""
from sqlalchemy.orm import Session
from database_models import engine, User

def setup_admin():
    with Session(engine) as db:
        user = db.query(User).filter(User.email == 'neyrvsimoes@gmail.com').first()
        
        if not user:
            # Create new user
            user = User(
                name='Neyr Simoes',
                email='neyrvsimoes@gmail.com',
                cpf='00000000000',
                is_admin=True,
                is_verified=True,
                email_verified=True,
                kyc_status='VERIFIED'
            )
            db.add(user)
            db.commit()
            print(f'Usuario criado: {user.id}')
        else:
            # Update existing user
            user.is_admin = True
            user.is_verified = True
            user.email_verified = True
            user.kyc_status = 'VERIFIED'
            db.commit()
            print(f'Usuario atualizado: {user.id}')
        
        print(f'Email: {user.email}')
        print(f'Admin: {user.is_admin}')
        print(f'KYC: {user.kyc_status}')

if __name__ == '__main__':
    setup_admin()
