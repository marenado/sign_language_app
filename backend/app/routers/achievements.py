from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from app.database import get_db
from app.models.user_achievement import UserAchievement
from app.models.achievement import Achievement
from app.models.user import User

router = APIRouter(
    prefix="/user-achievements",
    tags=["User Achievements"]
)

# Fetch all achievements for a specific user
@router.get("/{user_id}", response_model=list[dict])
async def get_user_achievements(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetch all achievements for a specific user.
    """
    try:
        result = await db.execute(
            select(Achievement.name, Achievement.description, UserAchievement.awarded_at)
            .join(UserAchievement, Achievement.achievement_id == UserAchievement.achievement_id)
            .where(UserAchievement.user_id == user_id)
        )
        achievements = result.all()
        return [
            {"name": ach.name, "description": ach.description, "awarded_at": ach.awarded_at}
            for ach in achievements
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching achievements: {str(e)}")

# Assign an achievement to a user
@router.post("/")
async def assign_achievement_to_user(
    user_id: int,
    achievement_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Assign an achievement to a user.
    """
    try:
        # Validate user existence
        user = await db.execute(select(User).where(User.user_id == user_id))
        if not user.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="User not found.")

        # Validate achievement existence
        achievement = await db.execute(select(Achievement).where(Achievement.achievement_id == achievement_id))
        if not achievement.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Achievement not found.")

        # Check if the achievement is already assigned
        existing_achievement = await db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id
            )
        )
        if existing_achievement.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Achievement already assigned to the user.")

        # Assign the achievement
        new_user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement_id,
            awarded_at=datetime.utcnow()
        )
        db.add(new_user_achievement)
        await db.commit()
        return {"message": "Achievement successfully assigned to user."}
    except HTTPException as e:
        raise e  # Re-raise specific HTTP errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning achievement: {str(e)}")

# Fetch all users who have a specific achievement
@router.get("/achievement/{achievement_id}", response_model=list[dict])
async def get_users_with_achievement(achievement_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetch all users who have been awarded a specific achievement.
    """
    try:
        result = await db.execute(
            select(User.user_id, User.username, UserAchievement.awarded_at)
            .join(UserAchievement, User.user_id == UserAchievement.user_id)
            .where(UserAchievement.achievement_id == achievement_id)
        )
        users = result.all()
        return [
            {"user_id": user.user_id, "username": user.username, "awarded_at": user.awarded_at}
            for user in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users with achievement: {str(e)}")
