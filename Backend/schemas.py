# Backend/schemas.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Literal, List

from pydantic import BaseModel, Field, constr

# =========================
# Users / Auth
# =========================
class UserBase(BaseModel):
    username: constr(min_length=3, max_length=50)

class UserCreate(UserBase):
    password: constr(min_length=6, max_length=128)

class UserLogin(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# =========================
# Missions
# =========================
class MissionCreate(BaseModel):
    title: str
    description: str = ""
    difficulty: str = "facile"
    max_score: int = 100

class MissionOut(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    max_score: int
    created_at: datetime
    model_config = {"from_attributes": True}


# =========================
# Player ↔ Mission (progression)
# =========================
class PlayerMissionBase(BaseModel):
    mission_id: int
    score: int = 0
    completed: int = 0

class PlayerMissionCreate(PlayerMissionBase):
    pass

class PlayerMissionRead(PlayerMissionBase):
    id: int
    user_id: int
    date: datetime
    model_config = {"from_attributes": True}


# =========================
# Timer / Session de jeu
# =========================
class GameSessionCreate(BaseModel):
    duration_seconds: int = 1200  # 20 minutes

class GameSessionRead(BaseModel):
    id: int
    user_id: int
    started_at: datetime
    expires_at: str
    model_config = {"from_attributes": True}


# =========================
# Puzzles
# =========================

# ✅ Tous les types autorisés par l’API
PuzzleType = Literal["QUIZ", "CODE", "DND", "SCHEMA", "IMG_QUIZ", "IMG_RECON"]

class PuzzleCreate(BaseModel):
    title: str
    type: PuzzleType
    payload: Dict[str, Any] = Field(default_factory=dict)
    solution: Optional[Dict[str, Any]] = None
    max_score: int = 100
    mission_id: int = Field(..., description="ID de la mission parente")

class PuzzleOut(BaseModel):
    id: int
    mission_id: int
    title: str
    type: str
    payload: Dict[str, Any]
    solution: Optional[Dict[str, Any]] = None
    max_score: int
    created_at: datetime
    model_config = {"from_attributes": True}

# (alias rétro-compat si ton code importait PuzzleRead)
PuzzleRead = PuzzleOut


# =========================
# Soumissions (réponses joueur)
# =========================
class SubmissionIn(BaseModel):
    puzzle_id: int
    answer: Dict[str, Any]  # structure varie selon le type

class SubmissionOut(BaseModel):
    puzzle_id: int
    correct: bool
    earned_score: int
    feedback: Optional[str] = None


# =========================
# Collaboration / Salles
# =========================
class CollabRoomCreate(BaseModel):
    duration_seconds: int = 1200  # 20 min

class CollabRoomRead(BaseModel):
    id: int
    code: str
    status: str
    started_at: datetime
    expires_at: Optional[str] = None
    model_config = {"from_attributes": True}

class JoinRoomIn(BaseModel):
    role: Optional[str] = None  # si None => auto-attribution

class MemberRead(BaseModel):
    user_id: int
    username: str
    role: Optional[str] = None
