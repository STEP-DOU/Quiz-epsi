from fastapi import FastAPI
from .database import Base, engine
from .routes import users, missions
from .routes import users, missions, gameplay, collab

app = FastAPI(title="Mission Vitale API")

Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(missions.router)
app.include_router(gameplay.router)
app.include_router(collab.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API Mission Vitale 🚑"}
