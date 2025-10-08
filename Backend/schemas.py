from datetime import datetime
from pydantic import BaseModel, constr

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
