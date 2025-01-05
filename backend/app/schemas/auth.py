from pydantic import BaseModel
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
