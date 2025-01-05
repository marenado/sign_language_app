from pydantic import BaseModel, EmailStr
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
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    avatar: Optional[str] 
