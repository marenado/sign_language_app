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
