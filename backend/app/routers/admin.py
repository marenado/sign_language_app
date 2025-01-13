from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.utils.auth import require_admin
from app.database import get_db
from app.models.user import User
from app.models.module import Module
from app.models.lesson import Lesson
from app.schemas.module import ModuleCreate, ModuleResponse
from app.schemas.lesson import LessonCreate, LessonResponse
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
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
from app.models.module import Module
from app.models.lesson import Lesson
from app.schemas.module import ModuleCreate, ModuleResponse
from app.schemas.lesson import LessonCreate, LessonResponse
from app.utils.auth import require_admin
import shutil
import os
import boto3
from botocore.exceptions import NoCredentialsError
import uuid
import re
import logging
from sqlalchemy.sql import text
from app.models.module import Module
from app.models.lesson import Lesson
from app.utils.auth import require_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

@router.post("/modules/", response_model=ModuleResponse)
async def create_module(
    module: ModuleCreate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    new_module = Module(
        title=module.title,
        description=module.description,
        version=module.version,
        prerequisite_mod=module.prerequisite_mod,
        created_by=current_admin.user_id
    )
    db.add(new_module)
    await db.commit()
    await db.refresh(new_module)
    return new_module



@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    # Fetch the module
    result = await db.execute(select(Module).where(Module.module_id == module_id))
    module = result.scalar()

    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")

    # Ensure the module belongs to the current admin
    if module.created_by != current_admin.user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to delete this module.")

    # Delete related lessons first (foreign key constraint)
    await db.execute(
        text("DELETE FROM lesson WHERE module_id = :module_id").bindparams(module_id=module_id)
    )

    # Delete the module
    await db.delete(module)
    await db.commit()

    return {"message": "Module deleted successfully."}


# Create a module (Admin only)
@router.post("/modules", response_model=ModuleResponse)
async def create_module(
    module: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    new_module = Module(
        title=module.title,
        description=module.description,
        version=module.version,
        prerequisite_mod=module.prerequisite_mod,
        created_by=current_admin.user_id
    )
    db.add(new_module)
    await db.commit()
    await db.refresh(new_module)
    return new_module

# Create a lesson (Admin only)
@router.post("/lessons", response_model=LessonResponse)
async def create_lesson(
    lesson: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    # Check if the module exists
    result = await db.execute(select(Module).where(Module.module_id == lesson.module_id))
    module = result.scalar()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    new_lesson = Lesson(
        title=lesson.title,
        description=lesson.description,
        version=lesson.version,
        duration=lesson.duration,
        difficulty=lesson.difficulty,
        module_id=lesson.module_id
    )
    db.add(new_lesson)
    await db.commit()
    await db.refresh(new_lesson)
    return new_lesson


@router.post("/register-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_admin(
    user: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if the current user is a super-admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super-admins can register admins.")

    # Check if the email is already registered
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalar()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # Hash the password
    hashed_password = hash_password(user.password)

    # Create the new admin user
    new_admin = User(
        username=user.username,
        email=user.email,
        password=hashed_password,
        is_admin=True,
        is_verified=True  # Admins should start verified
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    return new_admin


@router.put("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: int,
    updated_data: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Updates an existing module. Only the admin who created the module can modify it.
    """
    # Fetch the module
    result = await db.execute(select(Module).where(Module.module_id == module_id))
    module = result.scalar()

    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")

    # Ensure the module belongs to the current admin
    if module.created_by != current_admin.user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to update this module.")

    # Update the module's fields
    module.title = updated_data.title or module.title
    module.description = updated_data.description or module.description
    module.version = updated_data.version or module.version
    module.prerequisite_mod = updated_data.prerequisite_mod or module.prerequisite_mod

    # Commit the changes
    await db.commit()
    await db.refresh(module)

    return module
