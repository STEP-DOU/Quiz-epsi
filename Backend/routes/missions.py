# Backend/routes/missions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas

router = APIRouter()

@router.post("/", response_model=schemas.MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(payload: schemas.MissionCreate, db: Session = Depends(get_db)):
    m = models.Mission(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@router.get("/", response_model=List[schemas.MissionOut])
def list_missions(db: Session = Depends(get_db)):
    return db.query(models.Mission).order_by(models.Mission.created_at.desc()).all()

@router.get("/{mission_id}/puzzles", response_model=List[schemas.PuzzleOut])
def list_puzzles_for_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(models.Mission).get(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return (
        db.query(models.Puzzle)
        .filter(models.Puzzle.mission_id == mission_id)
        .order_by(models.Puzzle.id.asc())
        .all()
    )
