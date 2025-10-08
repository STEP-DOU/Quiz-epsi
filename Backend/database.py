# Backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./mission_vitale.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ✅ Dépendance FastAPI pour récupérer une session DB par requête
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
