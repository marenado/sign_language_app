from pydantic import BaseModel
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class SignupRequest(BaseModel):
    username: str = Field(..., max_length=150, description="Username with a maximum of 150 characters")
    email: EmailStr = Field(..., max_length=254, description="Valid email address")
    password: str = Field(..., min_length=8, description="Password with a minimum of 8 characters")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    
class EmailValidationRequest(BaseModel):
    email: str

