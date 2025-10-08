from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    scores = relationship("Score", back_populates="user")

class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_score = Column(Integer, default=0)
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="scores")

class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    difficulty = Column(String, default="Facile")
    max_score = Column(Integer, default=100)

class PlayerMission(Base):
    __tablename__ = "player_missions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    mission_id = Column(Integer, ForeignKey("missions.id"))
    score = Column(Integer, default=0)
    completed = Column(Integer, default=0)  # 0 = en cours, 1 = terminé
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="missions_progress")
    mission = relationship("Mission", backref="players")



# Session de jeu (pour gérer le compte à rebours)
class GameSession(Base):
    __tablename__ = "game_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    # timestamp ISO (string) de fin pour simplicité
    expires_at = Column(String, nullable=False)  # ex: "2025-10-08T12:34:00Z"

# Puzzle générique : 4 types = QUIZ / CODE / DND / SCHEMA
class Puzzle(Base):
    __tablename__ = "puzzles"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)         # "QUIZ" | "CODE" | "DND" | "SCHEMA"
    payload = Column(Text, nullable=False)        # JSON string (définition du puzzle)
    solution = Column(Text, nullable=False)       # JSON string (solution côté serveur)
    max_score = Column(Integer, default=100)



# --- Collaboration temps réel ---

class CollabRoom(Base):
    __tablename__ = "collab_rooms"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)   # ex: 6 caractères
    owner_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="waiting")       # waiting | running | finished
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(String, nullable=True)       # ISO8601 '...Z'

class CollabMember(Base):
    __tablename__ = "collab_members"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("collab_rooms.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, nullable=True)  # "diagnostic" | "labo" | "pharmacie" | "it"
    joined_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uix_room_user"),
    )
