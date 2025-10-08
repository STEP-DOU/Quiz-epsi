from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import json

from ..database import get_db
from .. import models
from ..schemas import (
    GameSessionCreate, GameSessionRead,
    PuzzleCreate, PuzzleRead,
    SubmissionIn, SubmissionOut
)
from ..utils.security import get_current_user

router = APIRouter(prefix="/game", tags=["game"])

# -------- Timer / session --------
@router.post("/session", response_model=GameSessionRead, status_code=status.HTTP_201_CREATED)
def create_session(payload: GameSessionCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=payload.duration_seconds)
    session = models.GameSession(
        user_id=current_user["user_id"],
        started_at=now.replace(tzinfo=None),
        expires_at=expires.isoformat().replace("+00:00", "Z")
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/session/current", response_model=GameSessionRead)
def get_current_session(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # simple: on prend la dernière session créée par l’utilisateur
    s = db.query(models.GameSession)\
        .filter(models.GameSession.user_id == current_user["user_id"])\
        .order_by(models.GameSession.id.desc()).first()
    if not s:
        raise HTTPException(404, "Aucune session. Créez-en une.")
    return s

def _session_active(session: models.GameSession) -> bool:
    try:
        expires = datetime.fromisoformat(session.expires_at.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) < expires
    except Exception:
        return False

# -------- CRUD puzzles (admin/test) --------
@router.post("/puzzles", response_model=PuzzleRead, status_code=status.HTTP_201_CREATED)
def create_puzzle(payload: PuzzleCreate, db: Session = Depends(get_db)):
    p = models.Puzzle(
        title=payload.title,
        type=payload.type,
        payload=json.dumps(payload.payload, ensure_ascii=False),
        solution=json.dumps(payload.solution, ensure_ascii=False),
        max_score=payload.max_score,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return PuzzleRead(
        id=p.id, title=p.title, type=p.type,
        payload=json.loads(p.payload), max_score=p.max_score
    )

@router.get("/puzzles", response_model=list[PuzzleRead])
def list_puzzles(db: Session = Depends(get_db)):
    out = []
    for p in db.query(models.Puzzle).all():
        out.append(PuzzleRead(id=p.id, title=p.title, type=p.type, payload=json.loads(p.payload), max_score=p.max_score))
    return out

@router.get("/puzzles/{puzzle_id}", response_model=PuzzleRead)
def get_puzzle(puzzle_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Puzzle).filter(models.Puzzle.id == puzzle_id).first()
    if not p:
        raise HTTPException(404, "Puzzle introuvable")
    return PuzzleRead(id=p.id, title=p.title, type=p.type, payload=json.loads(p.payload), max_score=p.max_score)

# -------- Validation générique --------
def _grade_quiz(answer: dict, solution: dict, max_score: int) -> tuple[bool,int,str]:
    # solution: {"correct": [0,2]} indices corrects
    # answer:   {"selected": [ ... ]}
    correct_set = set(solution.get("correct", []))
    sel_set = set(answer.get("selected", []))
    total_correct = len(correct_set)
    good = len(correct_set & sel_set)
    bad = len(sel_set - correct_set)
    # scoring simple
    score = max(0, int(max_score * (good / max(1, total_correct)) - bad * (max_score * 0.2)))
    is_ok = (sel_set == correct_set)
    return is_ok, score, f"Bonne(s) réponse(s): {good}/{total_correct}"

def _grade_code(answer: dict, solution: dict, max_score: int) -> tuple[bool,int,str]:
    # solution: {"expected":"HELLO"} | avec options: {"case_sensitive": false, "strip": true}
    expected = solution.get("expected", "")
    case_sensitive = solution.get("case_sensitive", False)
    strip_ = solution.get("strip", True)
    user = answer.get("text", "")
    if strip_:
        user = user.strip()
        expected = expected.strip()
    if not case_sensitive:
        user = user.lower()
        expected = expected.lower()
    ok = (user == expected)
    return ok, (max_score if ok else 0), ("Code juste" if ok else "Code incorrect")

def _grade_dnd(answer: dict, solution: dict, max_score: int) -> tuple[bool,int,str]:
    # Drag&Drop: on vérifie le mapping positions
    # solution: {"targets": {"slot1":"cardA", "slot2":"cardB"}}
    # answer:   {"targets": {"slot1":"cardA", "slot2":"cardX"}}
    sol = solution.get("targets", {})
    ans = answer.get("targets", {})
    total = len(sol)
    good = sum(1 for k,v in sol.items() if ans.get(k) == v)
    ok = good == total
    score = int(max_score * (good / max(1,total)))
    return ok, score, f"Placements corrects: {good}/{total}"

def _grade_schema(answer: dict, solution: dict, max_score: int) -> tuple[bool,int,str]:
    # Schéma: vérif des connexions
    # solution: {"edges":[["A","B"],["B","C"]]}
    # answer:   {"edges":[["A","B"],["B","C"]]}
    def _norm_edges(lst):
        return {tuple(sorted(e)) for e in lst}
    sol_edges = _norm_edges(solution.get("edges", []))
    ans_edges = _norm_edges(answer.get("edges", []))
    total = len(sol_edges)
    good = len(sol_edges & ans_edges)
    ok = good == total
    score = int(max_score * (good / max(1,total)))
    return ok, score, f"Connexions correctes: {good}/{total}"

@router.post("/submit", response_model=SubmissionOut)
def submit_answer(payload: SubmissionIn, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # timer
    s = db.query(models.GameSession)\
        .filter(models.GameSession.user_id == current_user["user_id"])\
        .order_by(models.GameSession.id.desc()).first()
    if not s or not _session_active(s):
        raise HTTPException(403, "Session expirée ou absente. Relancez le compte à rebours.")

    p = db.query(models.Puzzle).filter(models.Puzzle.id == payload.puzzle_id).first()
    if not p:
        raise HTTPException(404, "Puzzle introuvable.")

    sol = json.loads(p.solution)
    ans = payload.answer

    if p.type == "QUIZ":
        ok, score, fb = _grade_quiz(ans, sol, p.max_score)
    elif p.type == "CODE":
        ok, score, fb = _grade_code(ans, sol, p.max_score)
    elif p.type == "DND":
        ok, score, fb = _grade_dnd(ans, sol, p.max_score)
    elif p.type == "SCHEMA":
        ok, score, fb = _grade_schema(ans, sol, p.max_score)
    else:
        raise HTTPException(400, "Type de puzzle inconnu.")

    # on enregistre comme une “mission” (réutilise PlayerMission)
    existing = db.query(models.PlayerMission).filter(
        models.PlayerMission.user_id == current_user["user_id"],
        models.PlayerMission.mission_id == p.id
    ).first()
    if existing:
        existing.score = max(existing.score, score)  # garde le meilleur
        existing.completed = 1 if ok else existing.completed
        db.commit()
        db.refresh(existing)
    else:
        pm = models.PlayerMission(
            user_id=current_user["user_id"],
            mission_id=p.id,
            score=score,
            completed=1 if ok else 0
        )
        db.add(pm)
        db.commit()

    return SubmissionOut(puzzle_id=p.id, correct=ok, earned_score=score, feedback=fb)
