# Backend/utils/ws_manager.py
from typing import Dict, Set, Optional
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.users: Dict[WebSocket, dict] = {}  # {ws: {"user_id":..., "username":..., "role":...}}

    async def connect(self, room_code: str, websocket: WebSocket, user: dict):
        await websocket.accept()
        self.rooms.setdefault(room_code, set()).add(websocket)
        self.users[websocket] = user

    async def disconnect(self, room_code: str, websocket: WebSocket):
        try:
            if room_code in self.rooms:
                self.rooms[room_code].discard(websocket)
            self.users.pop(websocket, None)
        except Exception:
            pass

    async def broadcast(self, room_code: str, message: dict):
        for ws in list(self.rooms.get(room_code, [])):
            try:
                await ws.send_json(message)
            except Exception:
                # retire silencieusement les websockets mortes
                self.rooms[room_code].discard(ws)
                self.users.pop(ws, None)

    async def send_personal(self, websocket: WebSocket, message: dict):
        await websocket.send_json(message)
