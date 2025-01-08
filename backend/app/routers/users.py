from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import text
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.auth import verify_email_verification_token
from app.utils.auth import create_access_token, create_email_verification_token
from app.utils.auth import hash_password, verify_password, get_current_user
from app.utils.aws_s3 import s3_client, AWS_BUCKET_NAME, AWS_REGION
from app.utils.email import send_verification_email
import shutil
import os
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

import boto3
from botocore.exceptions import NoCredentialsError
import uuid

@router.put("/update-avatar", status_code=200, response_model=dict)
async def update_avatar(
    avatar: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate the avatar file type
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
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the user's dashboard information including points, lessons completed, avatar, and other stats.
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
        "avatar": current_user.avatar,  
    }

# @router.put("/update-profile", response_model=UserResponse)
# async def update_profile(
#     user_update: UserUpdate,
#     db: AsyncSession = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     result = await db.execute(select(User).where(User.user_id == current_user.user_id))
#     user = result.scalar()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     user.username = user_update.username or user.username
#     user.email = user_update.email or user.email
#     user.avatar = user_update.avatar or user.avatar  
#     if user_update.password:
#         user.password = hash_password(user_update.password)

#     await db.commit()
#     await db.refresh(user)
#     return user

MIN_USERNAME_LENGTH = 3
MIN_PASSWORD_LENGTH = 8
EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
PASSWORD_SPECIAL_CHARS = "!@#$%^&*()-_+="

@router.put("/update-profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the current user
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
        # Validate email format
        if not re.match(EMAIL_REGEX, user_update.email):
            raise HTTPException(status_code=400, detail="Invalid email address.")

        # Check if the email is already registered
        existing_email = await db.execute(select(User).where(User.email == user_update.email))
        if existing_email.scalar():
            raise HTTPException(status_code=400, detail="Email is already registered.")

        # Generate a verification token
        verification_token = create_email_verification_token(user_update.email)

        # Send verification email
        try:
            await send_verification_email(user_update.email, verification_token)
        except Exception as e:
            logging.error(f"Failed to send verification email: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to send verification email.")

        # Temporarily store the new email in `temp_email`
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

    # Commit changes to the database
    await db.commit()
    await db.refresh(user)

    return user


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """
    Verifies the email using the provided token.
    If valid, updates the user's email and clears the temp_email field.
    """
    try:
        # Decode and validate the token
        email = verify_email_verification_token(token)

        # Fetch the user with matching `temp_email`
        result = await db.execute(select(User).where(User.temp_email == email))
        user = result.scalar()

        if not user:
            raise HTTPException(
                status_code=404, detail="User not found or token is invalid."
            )

        
        user.email = user.temp_email
        user.temp_email = None
        await db.commit()

        return {"message": "Email verified successfully."}
    except Exception as e:
        logging.error(f"Email verification failed: {str(e)}")
        raise HTTPException(
            status_code=400, detail="Email verification failed. Please try again."
        )
