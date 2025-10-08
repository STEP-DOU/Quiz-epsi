from datetime import datetime
from pydantic import BaseModel, constr
from typing import Any, List, Dict, Optional
from typing import Optional, Dict, Any, List

class UserBase(BaseModel):
    username: constr(min_length=3, max_length=50)

class UserCreate(UserBase):
    password: constr(min_length=6, max_length=128)

class UserLogin(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True  # ✅ Remplace from_attributes par orm_mode

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MissionBase(BaseModel):
    title: str
    description: str
    difficulty: str = "Facile"
    max_score: int = 100

class MissionCreate(MissionBase):
    pass

class MissionRead(MissionBase):
    id: int
    class Config:
        orm_mode = True

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
    class Config:
        orm_mode = True



# Timer / session
class GameSessionCreate(BaseModel):
    duration_seconds: int = 1200  # 20 minutes

class GameSessionRead(BaseModel):
    id: int
    user_id: int
    started_at: datetime
    expires_at: str
    class Config:
        orm_mode = True

# Puzzle
class PuzzleBase(BaseModel):
    title: str
    type: str  # "QUIZ" | "CODE" | "DND" | "SCHEMA"
    payload: Dict[str, Any]
    solution: Dict[str, Any]
    max_score: int = 100

class PuzzleCreate(PuzzleBase):
    pass

class PuzzleRead(BaseModel):
    id: int
    title: str
    type: str
    payload: Dict[str, Any]
    max_score: int
    class Config:
        orm_mode = True

# Soumission (réponse joueur)
class SubmissionIn(BaseModel):
    puzzle_id: int
    answer: Dict[str, Any]  # structure varie selon type

class SubmissionOut(BaseModel):
    puzzle_id: int
    correct: bool
    earned_score: int
    feedback: Optional[str] = None




# Collaboration / Rooms
class CollabRoomCreate(BaseModel):
    duration_seconds: int = 1200  # 20 min par défaut

class CollabRoomRead(BaseModel):
    id: int
    code: str
    status: str
    started_at: datetime
    expires_at: Optional[str] = None
    class Config:
        orm_mode = True

class JoinRoomIn(BaseModel):
    role: Optional[str] = None  # si None => auto-attribution

class MemberRead(BaseModel):
    user_id: int
    username: str
    role: Optional[str] = None

# (Déjà présent côté gameplay/puzzles si tu as suivi l’étape précédente)
# PuzzleRead, SubmissionIn/Out, etc.
