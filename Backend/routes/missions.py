from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import MissionCreate, MissionRead, PlayerMissionCreate, PlayerMissionRead
from ..utils.security import get_current_user

router = APIRouter(prefix="/missions", tags=["missions"])


# ➕ Ajouter une mission (pour le mode admin ou phase de test)
@router.post("/", response_model=MissionRead, status_code=status.HTTP_201_CREATED)
def create_mission(payload: MissionCreate, db: Session = Depends(get_db)):
    mission = models.Mission(**payload.dict())
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


# 📜 Lister toutes les missions disponibles
@router.get("/", response_model=list[MissionRead])
def list_missions(db: Session = Depends(get_db)):
    return db.query(models.Mission).all()


# 🎯 Récupérer une mission spécifique par son ID
@router.get("/{mission_id}", response_model=MissionRead)
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(models.Mission).filter(models.Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable.")
    return mission


# ✅ Un joueur valide une mission
@router.post("/complete", response_model=PlayerMissionRead)
def complete_mission(
    payload: PlayerMissionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Vérifier que la mission existe
    mission = db.query(models.Mission).filter(models.Mission.id == payload.mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable.")

    # Vérifier si l'utilisateur a déjà complété cette mission
    existing = db.query(models.PlayerMission).filter(
        models.PlayerMission.user_id == current_user["user_id"],
        models.PlayerMission.mission_id == payload.mission_id
    ).first()

    # Si la mission existe déjà, on met à jour le score
    if existing:
        existing.score = payload.score
        existing.completed = 1
        db.commit()
        db.refresh(existing)
        return existing

    # Sinon, on crée un nouvel enregistrement
    progress = models.PlayerMission(
        user_id=current_user["user_id"],
        mission_id=payload.mission_id,
        score=payload.score,
        completed=1
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


# 📋 Lister toutes les missions terminées par le joueur connecté
@router.get("/my_missions", response_model=list[PlayerMissionRead])
def get_my_missions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return db.query(models.PlayerMission).filter(
        models.PlayerMission.user_id == current_user["user_id"]
    ).all()


