from pydantic import BaseModel, EmailStr, Field
from pydantic import BaseModel
from typing import Optional



class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    avatar: Optional[str]

class Config:
        from_attributes = True
        orm_mode = True 


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, description="Updated username")
    email: Optional[EmailStr] = Field(None, description="Updated email")
    password: Optional[str] = Field(None, description="Updated password")
    avatar: Optional[str] = Field(None, description="Updated avatar URL")


class PointsUpdateRequest(BaseModel):
    points: int

class TaskCompletionRequest(BaseModel):
    points_earned: int