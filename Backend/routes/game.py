# Backend/routes/game.py
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


# ============== CRUD Puzzles ==============

@router.post("/puzzles", response_model=schemas.PuzzleOut)
def create_puzzle(p: schemas.PuzzleCreate, db: Session = Depends(get_db)):
    obj = models.Puzzle(
        mission_id=p.mission_id,
        title=p.title,
        type=p.type,            # accepte aussi "IMG_QUIZ", "IMG_RECON"
        payload=p.payload,
        solution=p.solution,
        max_score=p.max_score,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/puzzles", response_model=list[schemas.PuzzleOut])
def list_puzzles(mission_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Puzzle)
    if mission_id is not None:
        q = q.filter(models.Puzzle.mission_id == mission_id)
    return q.order_by(models.Puzzle.created_at.desc()).all()


@router.get("/puzzles/{puzzle_id}", response_model=schemas.PuzzleOut)
def get_puzzle(puzzle_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Puzzle).get(puzzle_id)  # OK pour SQLAlchemy 1.4
    # (si tu es en SQLAlchemy 2.x: p = db.get(models.Puzzle, puzzle_id))
    if not p:
        raise HTTPException(status_code=404, detail="Puzzle introuvable")
    return p


# ============== Soumission d'une réponse ==============

@router.post("/submit", response_model=schemas.SubmissionOut)
def submit_answer(sub: schemas.SubmissionIn, db: Session = Depends(get_db)):
    """
    body attendu:
    {
      "puzzle_id": 123,
      "answer": { ... }   # selon le type du puzzle
    }
    """
    puzzle = db.query(models.Puzzle).get(sub.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    answer = sub.answer or {}
    sol = puzzle.solution or {}
    correct = False
    feedback = ""

    if puzzle.type in ("QUIZ", "IMG_QUIZ"):
        # solution.correct = [indices]
        expected = set(sol.get("correct", []))
        got = set(answer.get("selected", []))
        correct = expected == got

    elif puzzle.type == "CODE":
        exp = (sol.get("text") or "").strip()
        acc = [exp] + [*(sol.get("accepted") or [])]
        got = str(answer.get("text", "")).strip()
        if sol.get("case_insensitive", True):
            acc = [a.lower() for a in acc]
            got = got.lower()
        correct = got in acc

    elif puzzle.type == "DND":
        # mapping exact attendu
        correct = (sol.get("mapping") or {}) == (answer.get("targets") or {})

    elif puzzle.type == "SCHEMA":
        # edges = liste de paires ordonnées
        correct = (sol.get("edges") or []) == (answer.get("edges") or [])

    elif puzzle.type == "IMG_RECON":
        # ordre final (ex: [0..n-1])
        correct = (sol.get("order") or []) == (answer.get("order") or [])

    earned = puzzle.max_score if correct else 0
    return schemas.SubmissionOut(
        puzzle_id=sub.puzzle_id,
        correct=correct,
        earned_score=earned,
        feedback=feedback,
    )
