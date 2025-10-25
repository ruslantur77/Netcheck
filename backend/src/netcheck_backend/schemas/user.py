from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr


class UserAuth(UserBase):
    password: str


class UserRegisterRequest(UserBase):
    name: str
    password: str


class UserResponse(UserBase):
    id: UUID
    registered_at: datetime


class UserRmqData(UserBase):
    id: UUID
    name: str


class UserInDB(UserBase):
    id: UUID
    hashed_password: str
    registered_at: datetime
