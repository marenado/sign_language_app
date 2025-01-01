from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.auth import hash_password, verify_password, get_current_user

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# Create a user
@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
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

# Get user details by ID 
@router.get("/id/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Update user details
@router.put("/id/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user: UserUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    existing_user = result.scalar()
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_user.username = user.username or existing_user.username
    existing_user.email = user.email or existing_user.email
    if user.password:
        existing_user.password = hash_password(user.password)
    await db.commit()
    await db.refresh(existing_user)
    return existing_user

# Delete a user
@router.delete("/id/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()

# Get current user's profile
@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


from sqlalchemy.sql import text  

@router.get("/dashboard", status_code=status.HTTP_200_OK)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the user's dashboard information including points, lessons completed, and other stats.
    """
    
    lessons_completed_query = text("""
        SELECT COUNT(*) FROM lesson 
        WHERE EXISTS (
            SELECT 1 FROM progress 
            WHERE progress.lesson_id = lesson.lesson_id 
              AND progress.user_id = :user_id 
              AND progress.is_completed = TRUE
        )
    """)
    lessons_completed_result = await db.execute(lessons_completed_query, {"user_id": current_user.user_id})
    lessons_completed = lessons_completed_result.scalar() or 0

    time_spent_query = text("""
        SELECT SUM(duration) FROM user_activity_log WHERE user_id = :user_id
    """)
    time_spent_result = await db.execute(time_spent_query, {"user_id": current_user.user_id})
    total_time_spent = time_spent_result.scalar() or 0

    return {
        "username": current_user.username,
        "email": current_user.email,
        "points": current_user.points,
        "lessons_completed": lessons_completed,
        "total_time_spent": total_time_spent,  
    }
