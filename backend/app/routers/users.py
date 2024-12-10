from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.utils.auth import hash_password, verify_password
from sqlalchemy.future import select
import bcrypt

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# Endpoint to create a user
@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if the email already exists
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalar()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    new_user = User(
        username=user.username,
        email=user.email,
        password=hashed_password,
        is_admin=False,  
        points=0
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

# Endpoint to get user details
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Endpoint to update user details
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    existing_user = result.scalar()
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_user.username = user.username
    existing_user.email = user.email
    existing_user.password = hash_password(user.password)
    await db.commit()
    await db.refresh(existing_user)
    return existing_user

# Endpoint to delete a user
@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))