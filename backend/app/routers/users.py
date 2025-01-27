from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Query
from sqlalchemy.future import select
from typing import List
from sqlalchemy.orm import selectinload
from fastapi import Body
from app.models.task import Task
from sqlalchemy.sql import text
from app.schemas.user import TaskCompletionRequest
from app.database import get_db
from app.schemas.task import TaskResponse
from app.models.language import Language  
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate,PointsUpdateRequest
from app.utils.auth import (
    verify_email_verification_token,
    create_access_token,
    create_email_verification_token,
    hash_password,
    verify_password,
    get_current_user,
)
from app.utils.aws_s3 import s3_client, AWS_BUCKET_NAME, AWS_REGION
from app.utils.email_utils import send_verification_email
from app.models.module import Module
from app.models.lesson import Lesson
from app.schemas.module import ModuleCreate, ModuleResponse
from app.schemas.lesson import LessonCreate, LessonResponse
from app.utils.auth import require_admin
import boto3
from botocore.exceptions import NoCredentialsError
import uuid
import re
import logging

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

logger = logging.getLogger(__name__)

# Constants for validation
MIN_USERNAME_LENGTH = 3
MIN_PASSWORD_LENGTH = 8
EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
PASSWORD_SPECIAL_CHARS = "!@#$%^&*()-_+="

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

# Update user avatar
@router.put("/update-avatar", status_code=200, response_model=dict)
async def update_avatar(
    avatar: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if avatar.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPEG or PNG files are allowed.")

    unique_filename = f"{current_user.user_id}_{uuid.uuid4().hex}_{avatar.filename}"

    try:
        # Upload the file to S3
        s3_client.upload_fileobj(
            avatar.file,
            AWS_BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": avatar.content_type}  # Set content type
        )

        # Generate the file URL
        avatar_url = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"

        # Update the user's avatar in the database
        current_user.avatar = avatar_url
        await db.commit()
        await db.refresh(current_user)

        return {"avatar": avatar_url}

    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading avatar: {str(e)}")

# Dashboard data
@router.get("/dashboard", status_code=status.HTTP_200_OK)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.is_admin:
        # Admin-specific dashboard logic
        modules_created_query = await db.execute(select(Module).where(Module.created_by == current_user.user_id))
        lessons_created_query = await db.execute(select(Lesson).join(Module).where(Module.created_by == current_user.user_id))

        modules_created = modules_created_query.scalars().all()
        lessons_created = lessons_created_query.scalars().all()

        return {
            "dashboard_type": "admin",
            "modules_created": len(modules_created),
            "lessons_created": len(lessons_created),
            "message": f"Welcome to the admin dashboard, {current_user.username}!"
        }

    # Regular user dashboard logic
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
        "avatar": current_user.avatar,
    }


# @router.get("/dashboard", status_code=status.HTTP_200_OK)
# async def get_dashboard(
#     current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
# ):
#     logger.info(
#         f"User accessing dashboard: {current_user.email}, is_admin: {current_user.is_admin}"
#     )

#     if current_user.is_admin:
#         logger.info("Redirecting admin to admin-specific dashboard.")
#         return {"message": "Admins cannot access the regular dashboard."}

#     # Fetch user-specific dashboard data
#     lessons_completed_query = text("""
#         SELECT COUNT(*) FROM lesson 
#         WHERE EXISTS (
#             SELECT 1 FROM progress 
#             WHERE progress.lesson_id = lesson.lesson_id 
#               AND progress.user_id = :user_id 
#               AND progress.is_completed = TRUE
#         )
#     """)
#     lessons_completed_result = await db.execute(
#         lessons_completed_query, {"user_id": current_user.user_id}
#     )
#     lessons_completed = lessons_completed_result.scalar() or 0

#     return {
#         "username": current_user.username,
#         "email": current_user.email,
#         "points": current_user.points,
#         "lessons_completed": lessons_completed,
#     }


# Update user profile
@router.put("/update-profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.user_id == current_user.user_id))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate and check for unique username
    if user_update.username:
        if len(user_update.username) < MIN_USERNAME_LENGTH:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters long.")
        existing_username = await db.execute(
            select(User).where(User.username == user_update.username, User.user_id != user.user_id)
        )
        if existing_username.scalar():
            raise HTTPException(status_code=400, detail="Username is already taken.")
        user.username = user_update.username

    # Handle email changes
    if user_update.email and user_update.email != user.email:
        if not re.match(EMAIL_REGEX, user_update.email):
            raise HTTPException(status_code=400, detail="Invalid email address.")
        existing_email = await db.execute(select(User).where(User.email == user_update.email))
        if existing_email.scalar():
            raise HTTPException(status_code=400, detail="Email is already registered.")
        verification_token = create_email_verification_token(user_update.email)
        try:
            await send_verification_email(user_update.email, verification_token)
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to send verification email.")
        user.temp_email = user_update.email

    # Handle password updates
    if user_update.password:
        if len(user_update.password) < MIN_PASSWORD_LENGTH:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
        if not any(char.isdigit() for char in user_update.password):
            raise HTTPException(status_code=400, detail="Password must contain at least one number.")
        if not any(char.isupper() for char in user_update.password):
            raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
        if not any(char.islower() for char in user_update.password):
            raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
        if not any(char in PASSWORD_SPECIAL_CHARS for char in user_update.password):
            raise HTTPException(status_code=400, detail="Password must contain at least one special character.")
        user.password = hash_password(user_update.password)

    await db.commit()
    await db.refresh(user)
    return user

# Email verification
@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    try:
        email = verify_email_verification_token(token)
        result = await db.execute(select(User).where(User.temp_email == email))
        user = result.scalar()
        if not user:
            raise HTTPException(status_code=404, detail="User not found or token is invalid.")
        user.email = user.temp_email
        user.temp_email = None
        await db.commit()
        return {"message": "Email verified successfully."}
    except Exception as e:
        logger.error(f"Email verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Email verification failed. Please try again.")
    
@router.get("/settings", response_model=UserResponse)
async def get_user_settings(current_user: User = Depends(get_current_user)):
    """
    Retrieve current user's settings (profile information).
    """
    return current_user

@router.put("/settings", response_model=UserResponse)
async def update_user_settings(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the current user's settings.
    """
    result = await db.execute(select(User).where(User.user_id == current_user.user_id))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user data
    if user_update.username:
        user.username = user_update.username
    if user_update.email:
        user.email = user_update.email
    if user_update.password:
        user.password = hash_password(user_update.password)

    await db.commit()
    await db.refresh(user)
    return user



@router.get("/modules", response_model=list[dict])
async def get_user_modules(
    language_id: int = Query(..., description="Language ID for filtering modules"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get modules for the current user filtered by language and with status, including lessons.
    """
    try:
        # Fetch all modules for the selected language
        modules_query = await db.execute(
            select(Module).where(Module.language_id == language_id).order_by(Module.module_id)
        )
        all_modules = modules_query.scalars().all()

        # Fetch user's progress
        user_progress_query = text("""
            SELECT lesson.module_id, lesson.lesson_id, COUNT(progress.lesson_id) AS lessons_completed
            FROM lesson
            LEFT JOIN progress ON progress.lesson_id = lesson.lesson_id
            AND progress.user_id = :user_id AND progress.is_completed = TRUE
            GROUP BY lesson.module_id, lesson.lesson_id
        """)
        user_progress_result = await db.execute(
            user_progress_query, {"user_id": current_user.user_id}
        )

        # Convert user progress into a dictionary
        user_progress = {
            row.lesson_id: row.lessons_completed for row in user_progress_result.mappings()
        }

        response = []
        for module in all_modules:
            # Get lessons in this module
            lessons_query = await db.execute(
                select(Lesson).where(Lesson.module_id == module.module_id)
            )
            lessons = lessons_query.scalars().all()

            # Add lesson details
            lessons_response = []
            for lesson in lessons:
                # Fetch total points for the lesson
                total_points_query = await db.execute(
                    text("SELECT COALESCE(SUM(points), 0) FROM task WHERE lesson_id = :lesson_id"),
                    {"lesson_id": lesson.lesson_id},
                )
                total_points = total_points_query.scalar()

                # Fetch earned points for the lesson
                earned_points_query = await db.execute(
                    text("SELECT COALESCE(score, 0) FROM progress WHERE user_id = :user_id AND lesson_id = :lesson_id"),
                    {"user_id": current_user.user_id, "lesson_id": lesson.lesson_id},
                )
                earned_points = earned_points_query.scalar()

                lesson_status = "completed" if user_progress.get(lesson.lesson_id) else "in-progress"
                lessons_response.append({
                    "id": lesson.lesson_id,
                    "title": lesson.title,
                    "status": lesson_status,
                    "earned_points": earned_points,
                    "total_points": total_points,
                })

            completed_lessons = sum(1 for lesson in lessons_response if lesson["status"] == "completed")
            is_completed = completed_lessons == len(lessons)

            # Determine the module's status
            is_unlocked = True
            if module.prerequisite_mod:
                prerequisite_module_query = await db.execute(
                    select(Module).where(Module.module_id == module.prerequisite_mod)
                )
                prerequisite_module = prerequisite_module_query.scalar()
                if prerequisite_module:
                    prereq_lessons_query = await db.execute(
                        select(Lesson).where(Lesson.module_id == prerequisite_module.module_id)
                    )
                    prereq_lessons = prereq_lessons_query.scalars().all()
                    prereq_completed = all(
                        user_progress.get(lesson.lesson_id) for lesson in prereq_lessons
                    )
                    is_unlocked = prereq_completed

            module_status = "locked" if not is_unlocked else "completed" if is_completed else "in-progress"

            response.append({
                "id": module.module_id,
                "title": module.title,
                "description": module.description,
                "lessons_completed": completed_lessons,
                "total_lessons": len(lessons),
                "status": module_status,
                "lessons": lessons_response,  # Include lessons in response
            })

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch modules: {str(e)}")




@router.get("/languages", response_model=list[dict])
async def get_languages(db: AsyncSession = Depends(get_db)):
    """
    Get all available languages.
    """
    languages_query = await db.execute(select(Language).order_by(Language.id))
    languages = languages_query.scalars().all()

    response = [{"id": language.id, "name": language.name, "code": language.code} for language in languages]
    return response



@router.get("/lessons/{lesson_id}/tasks", response_model=List[TaskResponse])
async def get_tasks_for_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch all tasks for a specific lesson.
    """
    logger.info(f"Fetching tasks for lesson ID: {lesson_id}")
    try:
        # Query tasks with their associated videos (if any)
        tasks_query = await db.execute(
            select(Task)
            .where(Task.lesson_id == lesson_id)
            .options(selectinload(Task.videos))  # Eager load videos relationship
            .order_by(Task.task_id)
        )
        tasks = tasks_query.scalars().all()

        if not tasks:
            raise HTTPException(status_code=404, detail=f"No tasks found for lesson ID: {lesson_id}")

        # Serialize the tasks
        task_responses = [TaskResponse.from_orm(task) for task in tasks]
        return task_responses
    except HTTPException as http_ex:
        logger.error(f"HTTPException fetching tasks for lesson ID {lesson_id}: {str(http_ex)}")
        raise http_ex
    except Exception as e:
        logger.error(f"Unexpected error fetching tasks for lesson ID {lesson_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")

@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task_by_id(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch a single task by its task_id.
    """
    logger.info(f"Fetching task ID: {task_id}")
    try:
        task_query = await db.execute(
            select(Task).where(Task.task_id == task_id).options(selectinload(Task.videos))
        )
        task = task_query.scalar()

        if not task:
            raise HTTPException(status_code=404, detail=f"Task with ID {task_id} not found")

        return task
    except Exception as e:
        logger.error(f"Error fetching task ID {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch the task")
    


    # Get current user's points
@router.get("/points", response_model=dict)
async def get_user_points(
    current_user: User = Depends(get_current_user)
):
    """
    Fetch the current user's points.
    """
    return {"points": current_user.points}

# Update user's points
@router.post("/update-points", status_code=200)
async def update_points(
    request: PointsUpdateRequest,  # Accepting from the request body
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user points
    current_user.points += request.points
    await db.commit()
    await db.refresh(current_user)
    
    return {"message": "Points updated successfully", "total_points": current_user.points}


@router.post("/lessons/{lesson_id}/complete", status_code=200)
async def mark_lesson_complete(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks the lesson as complete only if the user has earned 70% of the total points.
    """
    try:
        # Get total points for the lesson
        total_points_query = await db.execute(
            text("SELECT COALESCE(SUM(points), 0) FROM task WHERE lesson_id = :lesson_id"),
            {"lesson_id": lesson_id},
        )
        total_points = total_points_query.scalar() or 0
        logger.info(f"Total points for lesson {lesson_id}: {total_points}")

        if total_points == 0:
            raise HTTPException(status_code=400, detail="No tasks found for the lesson to calculate points.")

        # Get user points for the lesson
        user_points_query = await db.execute(
            text("SELECT COALESCE(score, 0) FROM progress WHERE user_id = :user_id AND lesson_id = :lesson_id"),
            {"user_id": current_user.user_id, "lesson_id": lesson_id},
        )
        user_points = user_points_query.scalar() or 0
        logger.info(f"User {current_user.user_id} points for lesson {lesson_id}: {user_points}")

        # Check if user has enough points to complete the lesson
        required_points = 0.7 * total_points
        if user_points < required_points:
            raise HTTPException(
                status_code=400,
                detail=f"You have not earned enough points to complete the lesson. "
                       f"Required: {required_points}, Earned: {user_points}"
            )

        # Mark lesson as complete
        progress_query = text("""
            UPDATE progress
            SET is_completed = TRUE, completed_at = NOW()
            WHERE user_id = :user_id AND lesson_id = :lesson_id
        """)
        await db.execute(progress_query, {"user_id": current_user.user_id, "lesson_id": lesson_id})
        await db.commit()

        # Update user total points
        current_user.points += user_points
        await db.commit()

        return {"message": "Lesson marked as complete and points added to your account"}
    except HTTPException as http_ex:
        logger.error(f"HTTP Error: {http_ex.detail}")
        raise http_ex
    except Exception as e:
        await db.rollback()
        logger.error(f"Unexpected error marking lesson complete: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error marking lesson as complete: {str(e)}")



@router.post("/lessons/{lesson_id}/tasks/{task_id}/complete", status_code=200)
async def complete_task(
    lesson_id: int,
    task_id: int,
    request: TaskCompletionRequest = Body(...),  # Use TaskCompletionRequest as the body
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks a task as completed for the user and updates the progress score.
    """
    try:
        points_earned = request.points_earned  # Extract points_earned from the request body

        # Ensure the task exists and belongs to the lesson
        task_query = await db.execute(
            select(Task).where(Task.task_id == task_id, Task.lesson_id == lesson_id)
        )
        task = task_query.scalar()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found in the lesson")

        # Update or insert task completion progress
        progress_query = text("""
            INSERT INTO progress (user_id, lesson_id, is_completed, score, attempts, time_spent)
            VALUES (:user_id, :lesson_id, FALSE, :points_earned, 1, 0)
            ON CONFLICT (user_id, lesson_id)
            DO UPDATE SET
                score = progress.score + :points_earned,
                attempts = progress.attempts + 1
        """)
        await db.execute(
            progress_query,
            {"user_id": current_user.user_id, "lesson_id": lesson_id, "points_earned": points_earned},
        )
        await db.commit()

        return {"message": "Task points updated successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating task points: {str(e)}")



@router.get("/top-users", response_model=List[dict])
async def get_top_users(db: AsyncSession = Depends(get_db)):
    """
    Get the top 5 users with the highest points, excluding superadmin users, and include their avatars.
    """
    try:
        # Query the top 5 users ordered by points in descending order and excluding superadmin users
        result = await db.execute(
            select(User.username, User.points, User.avatar)
            .where(User.is_admin == False)  # Exclude admin users
            .order_by(User.points.desc())  # Order by points in descending order
            .limit(5)  # Limit the result to top 5 users
        )
        top_users = result.all()

        if not top_users:
            raise HTTPException(status_code=404, detail="No users found.")

        # Prepare the response data, prefixing avatar URLs with the S3 base URL if necessary
    # base_url = "https://singlearnavatarstorage.s3.amazonaws.com/"  # Replace with your actual S3 bucket URL
        return [
            {
                "username": user.username,
                "points": user.points,
                "avatar": f"{user.avatar}" if user.avatar else None
            }
            for user in top_users
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch top users: {str(e)}")
