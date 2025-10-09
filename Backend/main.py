from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routes import users, missions, game

# Ces imports sont optionnels : ils seront inclus seulement s'ils existent

try:
    from .routes import collab
    HAS_COLLAB = True
except Exception:
    HAS_COLLAB = False

app = FastAPI(title="Mission Vitale API")

# CORS : accepte localhost / 127.0.0.1 sur n'importe quel port (Vite etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],   # inclut OPTIONS (pré-vol)
    allow_headers=["*"],   # ex: Content-Type, Authorization
    expose_headers=["*"],
    max_age=600,
)

# Création des tables SQLite
Base.metadata.create_all(bind=engine)

# Routes
app.include_router(users.router)
app.include_router(missions.router, prefix="/missions", tags=["Missions"])
app.include_router(game.router, prefix="/game", tags=["Game"])
app.include_router(missions.router)
if HAS_COLLAB:
    app.include_router(collab.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API Mission Vitale 🚑"}
