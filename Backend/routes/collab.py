# Backend/routes/collab.py
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta, timezone
import secrets, string, json, jwt

from ..database import get_db
from .. import models
from ..schemas import CollabRoomCreate, CollabRoomRead, JoinRoomIn, MemberRead
from ..utils.security import get_current_user, SECRET_KEY, ALGORITHM
from ..utils.ws_manager import ConnectionManager

router = APIRouter(prefix="/collab", tags=["collaboration"])
manager = ConnectionManager()

ROLES = ["diagnostic", "labo", "pharmacie", "it"]

def _gen_code(n: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))

def _iso_utc(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

# --- In-memory locks d'énigmes par room ---
# key: (room_code, puzzle_id) -> user_id
ROOM_LOCKS: dict[tuple[str,int], int] = {}

# ---------- Endpoints HTTP ----------
@router.post("/rooms", response_model=CollabRoomRead, status_code=status.HTTP_201_CREATED)
def create_room(payload: CollabRoomCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    code = _gen_code()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=payload.duration_seconds)
    room = models.CollabRoom(
        code=code,
        owner_id=current_user["user_id"],
        status="running",
        started_at=now.replace(tzinfo=None),
        expires_at=_iso_utc(expires),
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.get("/rooms/{code}", response_model=CollabRoomRead)
def get_room(code: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    room = db.query(models.CollabRoom).filter(models.CollabRoom.code == code).first()
    if not room:
        raise HTTPException(404, "Salle introuvable")
    return room

@router.post("/rooms/{code}/join", response_model=list[MemberRead])
def join_room(code: str, payload: JoinRoomIn, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    room = db.query(models.CollabRoom).filter(models.CollabRoom.code == code).first()
    if not room:
        raise HTTPException(404, "Salle introuvable")
    if room.status == "finished":
        raise HTTPException(403, "Salle terminée")

    # attribution du rôle
    desired = payload.role
    if desired and desired not in ROLES:
        raise HTTPException(400, f"Rôle invalide. Choix: {ROLES}")

    taken_roles = {m.role for m in db.query(models.CollabMember).filter(models.CollabMember.room_id == room.id).all() if m.role}
    role = None
    if desired:
        if desired in taken_roles:
            raise HTTPException(409, f"Rôle déjà pris: {desired}")
        role = desired
    else:
        # auto-attribution du premier rôle libre
        for r in ROLES:
            if r not in taken_roles:
                role = r
                break

    # upsert membre
    member = db.query(models.CollabMember).filter(and_(
        models.CollabMember.room_id == room.id,
        models.CollabMember.user_id == current_user["user_id"]
    )).first()
    if member:
        member.role = role or member.role
    else:
        member = models.CollabMember(room_id=room.id, user_id=current_user["user_id"], role=role)
        db.add(member)

    db.commit()

    # retour: liste des membres
    rows = db.query(models.CollabMember, models.User).join(models.User, models.User.id == models.CollabMember.user_id).filter(
        models.CollabMember.room_id == room.id
    ).all()
    out = [MemberRead(user_id=u.id, username=u.username, role=m.role) for (m,u) in rows]
    return out

@router.get("/rooms/{code}/members", response_model=list[MemberRead])
def list_members(code: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    room = db.query(models.CollabRoom).filter(models.CollabRoom.code == code).first()
    if not room:
        raise HTTPException(404, "Salle introuvable")
    rows = db.query(models.CollabMember, models.User).join(models.User, models.User.id == models.CollabMember.user_id).filter(
        models.CollabMember.room_id == room.id
    ).all()
    return [MemberRead(user_id=u.id, username=u.username, role=m.role) for (m,u) in rows]

# ---------- WebSocket ----------
# Protocole d'événements (JSON):
# { "type": "chat" , "text": "hello" }
# { "type": "state", "puzzle_id": 3, "state": {...} }  -- partage d'état (DND/SCHEMA)
# { "type": "lock" , "puzzle_id": 3 }                   -- verrouiller l'énigme
# { "type": "unlock", "puzzle_id": 3 }
# { "type": "ping" }
# Broadcast serveur inclut: type, from_user, role, timestamp, etc.

@router.websocket("/ws/{code}")
async def ws_room(websocket: WebSocket, code: str, token: str = Query(...)):
    # Auth manuelle via token JWT en query (token=BearerToken). Côté front, mets le token brut (sans "Bearer ").
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("uid")
        if not username or not user_id:
            await websocket.close(code=4401)
            return
    except Exception:
        await websocket.close(code=4401)
        return

    # vérifie que la salle existe
    from ..database import SessionLocal
    db = SessionLocal()
    room = db.query(models.CollabRoom).filter(models.CollabRoom.code == code).first()
    if not room:
        await websocket.close(code=4404)
        db.close()
        return

    # rôle éventuel du membre
    m = db.query(models.CollabMember).filter(
        and_(models.CollabMember.room_id == room.id, models.CollabMember.user_id == user_id)
    ).first()
    role = m.role if m else None
    db.close()

    await manager.connect(code, websocket, {"user_id": user_id, "username": username, "role": role})
    await manager.broadcast(code, {"type": "presence_join", "user": username, "role": role, "ts": datetime.utcnow().isoformat()+"Z"})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except Exception:
                await manager.send_personal(websocket, {"type": "error", "message": "JSON invalide"})
                continue

            mtype = msg.get("type")
            nowz = datetime.utcnow().isoformat() + "Z"

            if mtype == "chat":
                txt = msg.get("text", "")
                await manager.broadcast(code, {
                    "type": "chat",
                    "from": username,
                    "role": role,
                    "text": txt,
                    "ts": nowz
                })

            elif mtype == "state":
                # partage d'état d'un puzzle (ex: positions DnD, edges SCHEMA)
                pid = int(msg.get("puzzle_id", 0))
                st = msg.get("state", {})
                await manager.broadcast(code, {
                    "type": "state",
                    "from": username,
                    "role": role,
                    "puzzle_id": pid,
                    "state": st,
                    "ts": nowz
                })

            elif mtype == "lock":
                pid = int(msg.get("puzzle_id", 0))
                key = (code, pid)
                if key in ROOM_LOCKS and ROOM_LOCKS[key] != user_id:
                    await manager.send_personal(websocket, {"type":"lock_denied", "puzzle_id": pid, "locked_by": ROOM_LOCKS[key]})
                else:
                    ROOM_LOCKS[key] = user_id
                    await manager.broadcast(code, {"type":"lock_acquired", "puzzle_id": pid, "by_user": username, "ts": nowz})

            elif mtype == "unlock":
                pid = int(msg.get("puzzle_id", 0))
                key = (code, pid)
                owner = ROOM_LOCKS.get(key)
                if owner in (None, user_id):
                    ROOM_LOCKS.pop(key, None)
                    await manager.broadcast(code, {"type":"lock_released", "puzzle_id": pid, "by_user": username, "ts": nowz})
                else:
                    await manager.send_personal(websocket, {"type":"unlock_denied", "puzzle_id": pid})

            elif mtype == "ping":
                await manager.send_personal(websocket, {"type":"pong", "ts": nowz})

            else:
                await manager.send_personal(websocket, {"type":"error", "message":"type inconnu"})
    except WebSocketDisconnect:
        await manager.disconnect(code, websocket)
        await manager.broadcast(code, {"type": "presence_leave", "user": username, "ts": datetime.utcnow().isoformat()+"Z"})
