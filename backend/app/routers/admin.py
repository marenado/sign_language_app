from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import text
from app.utils.auth import require_admin, get_current_user
from app.database import get_db
from app.models.user import User
from app.models.module import Module
from app.models.language import Language
from app.schemas.module import ModuleCreate, ModuleResponse
from app.schemas.language import LanguageCreate, LanguageResponse
from typing import Optional, List
import logging

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# Fetch menu options based on user role
@router.get("/menu-options")
async def get_menu_options(current_user: User = Depends(get_current_user)):
    """
    Return menu options based on the user's role.
    Admins won't see the "Dashboard" tab.
    """
    if current_user.is_admin:
        return {"menu": ["Dictionary", "Modules", "Settings"]}
    else:
        return {"menu": ["Dashboard", "Dictionary", "Modules", "Settings"]}


@router.post("/modules", response_model=ModuleResponse)
async def create_module(
    module: ModuleCreate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new module
    """
    logging.info(f"Creating module with data: {module.dict()}")

    # Validate the language ID
    result = await db.execute(select(Language).where(Language.id == module.language_id))
    language = result.scalar()
    if not language:
        raise HTTPException(status_code=400, detail="Invalid language ID.")

    try:
        new_module = Module(
            title=module.title,
            description=module.description,
            version=module.version,
            prerequisite_mod=module.prerequisite_mod,
            created_by=current_admin.user_id,
            modified_by=current_admin.user_id,
            language_id=module.language_id,
        )
        db.add(new_module)
        await db.commit()
        await db.refresh(new_module)
        return new_module
    except Exception as e:
        logging.error(f"Error creating module: {e}")
        raise HTTPException(status_code=500, detail="Failed to create module")


@router.get("/modules", response_model=List[ModuleResponse])
async def get_modules(
    language_id: Optional[int] = None,  # Optional language filter
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Fetch all modules created by the current admin, optionally filtered by language
    """
    try:
        query = select(Module).where(Module.created_by == current_admin.user_id)
        if language_id:
            query = query.where(Module.language_id == language_id)  # Filter by language ID

        result = await db.execute(query)
        modules = result.scalars().all()
        logging.info(f"Modules fetched: {modules}")
        return modules
    except Exception as e:
        logging.error(f"Error fetching modules: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch modules")


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Delete a module by ID
    """
    try:
        result = await db.execute(select(Module).where(Module.module_id == module_id))
        module = result.scalar()

        if not module:
            raise HTTPException(status_code=404, detail="Module not found.")

        if module.created_by != current_admin.user_id:
            raise HTTPException(status_code=403, detail="You are not authorized to delete this module.")

        # Delete related lessons
        await db.execute(
            text("DELETE FROM lesson WHERE module_id = :module_id").bindparams(module_id=module_id)
        )

        # Delete the module
        await db.delete(module)
        await db.commit()

        logging.info(f"Module {module_id} deleted successfully.")
        return {"message": "Module deleted successfully."}
    except Exception as e:
        logging.error(f"Error deleting module: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete module")


@router.put("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: int,
    updated_data: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Update a module by ID and automatically increment the version
    """
    try:
        # Fetch the module to update
        result = await db.execute(select(Module).where(Module.module_id == module_id))
        module = result.scalar()

        if not module:
            raise HTTPException(status_code=404, detail="Module not found.")

        if module.created_by != current_admin.user_id:
            raise HTTPException(status_code=403, detail="You are not authorized to update this module.")

        # Validate language ID if updating it
        if updated_data.language_id:
            language_result = await db.execute(select(Language).where(Language.id == updated_data.language_id))
            if not language_result.scalar():
                raise HTTPException(status_code=400, detail="Invalid language ID.")

        # Update module fields
        module.title = updated_data.title or module.title
        module.description = updated_data.description or module.description
        module.prerequisite_mod = updated_data.prerequisite_mod or module.prerequisite_mod
        module.modified_by = current_admin.user_id
        module.language_id = updated_data.language_id or module.language_id

        # Automatically increment the version
        module.version += 1

        await db.commit()
        await db.refresh(module)

        logging.info(f"Module {module_id} updated successfully.")
        return module
    except Exception as e:
        logging.error(f"Error updating module: {e}")
        raise HTTPException(status_code=500, detail="Failed to update module")


@router.get("/languages", response_model=List[LanguageResponse])
async def get_languages(db: AsyncSession = Depends(get_db)):
    """
    Fetch all available languages
    """
    try:
        result = await db.execute(select(Language))
        languages = result.scalars().all()
        logging.info(f"Languages fetched: {languages}")
        return languages
    except Exception as e:
        logging.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch languages")


@router.post("/languages", response_model=LanguageResponse)
async def add_language(language: LanguageCreate, db: AsyncSession = Depends(get_db)):
    """
    Add a new language
    """
    try:
        # Check if the language already exists
        existing_language = await db.execute(select(Language).where(Language.code == language.code))
        if existing_language.scalars().first():
            raise HTTPException(status_code=400, detail="Language already exists.")

        new_language = Language(code=language.code, name=language.name)
        db.add(new_language)
        await db.commit()
        await db.refresh(new_language)
        logging.info(f"Language {language.code} added successfully.")
        return new_language
    except Exception as e:
        logging.error(f"Error adding language: {e}")
        raise HTTPException(status_code=500, detail="Failed to add language")
