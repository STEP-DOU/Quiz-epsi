from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from .. import models
from ..utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from ..schemas import UserCreate, UserLogin, UserRead, Token

router = APIRouter(prefix="/users", tags=["users"])

# Enregistrement d'un nouvel utilisateur
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    user = models.User(username=payload.username, password_hash=hash_password(payload.password))
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe déjà.")

# Connexion utilisateur et génération du token
@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants invalides.")
    token = create_access_token({"sub": user.username, "uid": user.id})
    return {"access_token": token, "token_type": "bearer"}

# Liste de tous les utilisateurs
@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

# Route protégée : profil utilisateur courant
@router.get("/me", response_model=UserRead)
def read_current_user(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return user
