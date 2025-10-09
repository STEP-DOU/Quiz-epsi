# Backend/models.py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    JSON,  # générique (ok pour SQLite / Postgres)
)
from sqlalchemy.orm import relationship

from .database import Base


# -------------------------
# Utilisateurs & Score
# -------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    scores = relationship("Score", back_populates="user", cascade="all, delete-orphan")
    missions_progress = relationship("PlayerMission", back_populates="user", cascade="all, delete-orphan")


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_score = Column(Integer, default=0)
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="scores")


# -------------------------
# Progression par mission
# -------------------------
class PlayerMission(Base):
    __tablename__ = "player_missions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    score = Column(Integer, default=0)
    completed = Column(Integer, default=0)  # 0 = en cours, 1 = terminé
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="missions_progress")
    mission = relationship("Mission", back_populates="players")


# -------------------------
# Session de jeu (timer)
# -------------------------
class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    # ISO8601 (simple à manipuler côté front)
    expires_at = Column(String, nullable=False)


# -------------------------
# Collaboration
# -------------------------
class CollabRoom(Base):
    __tablename__ = "collab_rooms"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)    # ex: 6 caractères
    owner_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="waiting")        # waiting | running | finished
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(String, nullable=True)        # ISO8601


class CollabMember(Base):
    __tablename__ = "collab_members"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("collab_rooms.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, nullable=True)  # diagnostic | labo | pharmacie | it
    joined_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uix_room_user"),)


# -------------------------
# Missions & Puzzles
# -------------------------
class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    difficulty = Column(String, default="facile")
    max_score = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relations
    puzzles = relationship(
        "Puzzle",
        back_populates="mission",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    players = relationship("PlayerMission", back_populates="mission", cascade="all, delete-orphan")


class Puzzle(Base):
    __tablename__ = "puzzles"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    title = Column(String, nullable=False)
    # String pour accepter aussi IMG_QUIZ / IMG_RECON sans migration d'Enum
    type = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    solution = Column(JSON, nullable=True)
    max_score = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("Mission", back_populates="puzzles")
