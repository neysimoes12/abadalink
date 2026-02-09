from database_models import engine
from sqlalchemy.orm import Session

# Dependency for DB Session
def get_db():
    with Session(engine) as session:
        yield session
