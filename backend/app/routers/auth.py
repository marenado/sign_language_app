from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.utils.auth import verify_password, create_access_token
from sqlalchemy.future import select

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Endpoint for user login
@router.post("/login", response_model=TokenResponse)
async def login_user(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}
