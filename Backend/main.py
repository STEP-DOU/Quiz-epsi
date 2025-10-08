from fastapi import FastAPI
from .database import Base, engine
from .routes import users

app = FastAPI(title="Mission Vitale API")

# Création des tables SQLite
Base.metadata.create_all(bind=engine)

# Inclusion de la route users
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API Mission Vitale 🚑"}
