# routers/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional, List
import logging
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.user import User
from app.models.module import Module
from app.models.language import Language
from app.models.lesson import Lesson
from app.models.task import Task
from app.models.task_video import TaskVideo
from app.models.video_reference import VideoReference

from app.schemas.user import UserResponse, UserUpdate
from app.schemas.module import ModuleCreate, ModuleResponse
from app.schemas.language import LanguageCreate, LanguageResponse
from app.schemas.lesson import LessonCreate, LessonResponse
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.schemas.video_reference import VideoReferenceResponse

from app.utils.auth import require_admin, get_current_user_cookie, hash_password


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/menu-options")
async def get_menu_options(current_user: User = Depends(get_current_user_cookie)):
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
    language_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Fetch all modules created by the current admin, optionally filtered by language
    """
    try:
        query = select(Module).where(Module.created_by == current_admin.user_id)
        if language_id:
            query = query.where(Module.language_id == language_id)

        result = await db.execute(query)
        modules = result.scalars().all()
        logging.info(f"Modules fetched: {modules}")
        return modules
    except Exception as e:
        logging.error(f"Error fetching modules: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch modules")


from fastapi import Response, status
from sqlalchemy import select, update


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(Module).where(Module.module_id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    if module.created_by != current_admin.user_id:
        raise HTTPException(
            status_code=403, detail="You are not authorized to delete this module."
        )

    try:
        lesson_ids_sq = select(Lesson.lesson_id).where(Lesson.module_id == module_id)
        task_ids_sq = select(Task.task_id).where(Task.lesson_id.in_(lesson_ids_sq))

        await db.execute(delete(TaskVideo).where(TaskVideo.task_id.in_(task_ids_sq)))

        await db.execute(delete(Task).where(Task.task_id.in_(task_ids_sq)))
        await db.execute(delete(Lesson).where(Lesson.lesson_id.in_(lesson_ids_sq)))

        await db.execute(
            update(Module)
            .where(Module.prerequisite_mod == module_id)
            .values(prerequisite_mod=None)
        )

        await db.execute(delete(Module).where(Module.module_id == module_id))
        await db.commit()

        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        await db.rollback()
        logging.error(f"Error deleting module {module_id}: {e}", exc_info=True)
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
        result = await db.execute(select(Module).where(Module.module_id == module_id))
        module = result.scalar()

        if not module:
            raise HTTPException(status_code=404, detail="Module not found.")

        if module.created_by != current_admin.user_id:
            raise HTTPException(
                status_code=403, detail="You are not authorized to update this module."
            )

        if updated_data.language_id:
            language_result = await db.execute(
                select(Language).where(Language.id == updated_data.language_id)
            )
            if not language_result.scalar():
                raise HTTPException(status_code=400, detail="Invalid language ID.")

        module.title = updated_data.title or module.title
        module.description = updated_data.description or module.description
        module.prerequisite_mod = (
            updated_data.prerequisite_mod or module.prerequisite_mod
        )
        module.modified_by = current_admin.user_id
        module.language_id = updated_data.language_id or module.language_id

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
        existing_language = await db.execute(
            select(Language).where(Language.code == language.code)
        )
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


@router.post("/lessons", response_model=LessonResponse)
async def create_lesson(
    lesson: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Create a new lesson. Automatically sets version to 1 if not provided.
    """

    result = await db.execute(
        select(Module).where(Module.module_id == lesson.module_id)
    )
    module = result.scalar()
    if not module:
        raise HTTPException(status_code=400, detail="Invalid module ID.")

    version = lesson.version if lesson.version is not None else 1

    new_lesson = Lesson(
        title=lesson.title,
        description=lesson.description,
        module_id=lesson.module_id,
        version=version,
        duration=lesson.duration,
        difficulty=lesson.difficulty,
    )

    try:
        db.add(new_lesson)
        await db.commit()
        await db.refresh(new_lesson)
        logging.info(f"Lesson {lesson.title} created successfully.")
        return new_lesson
    except Exception as e:
        await db.rollback()
        logging.error(f"Error creating lesson: {e}")
        raise HTTPException(status_code=500, detail="Failed to create lesson")


@router.get("/lessons", response_model=List[LessonResponse])
async def get_lessons(
    module_id: int,
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Fetch lessons for a specific module with optional pagination.
    """
    try:
        result = await db.execute(
            select(Lesson)
            .where(Lesson.module_id == module_id)
            .offset(offset)
            .limit(limit)
        )
        lessons = result.scalars().all()
        if not lessons:
            raise HTTPException(status_code=404, detail="No lessons found.")
        return lessons
    except Exception as e:
        await db.rollback()
        logging.error(f"Error fetching lessons for module {module_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch lessons")


@router.put("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    updated_data: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Update a lesson by ID.
    Automatically increments the lesson version.
    Allows partial updates for other fields.
    """

    result = await db.execute(select(Lesson).where(Lesson.lesson_id == lesson_id))
    lesson = result.scalar()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    try:
        if updated_data.title:
            lesson.title = updated_data.title
        if updated_data.description:
            lesson.description = updated_data.description
        if updated_data.module_id:
            module_result = await db.execute(
                select(Module).where(Module.module_id == updated_data.module_id)
            )
            module = module_result.scalar()
            if not module:
                raise HTTPException(status_code=400, detail="Invalid module ID.")
            lesson.module_id = updated_data.module_id
        if updated_data.duration:
            lesson.duration = updated_data.duration
        if updated_data.difficulty:
            lesson.difficulty = updated_data.difficulty

        lesson.version += 1

        await db.commit()
        await db.refresh(lesson)
        logging.info(f"Lesson {lesson_id} updated successfully.")
        return lesson
    except Exception as e:
        await db.rollback()
        logging.error(f"Error updating lesson: {e}")
        raise HTTPException(status_code=500, detail="Failed to update lesson")


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(Lesson).where(Lesson.lesson_id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    try:
        task_ids_sq = select(Task.task_id).where(Task.lesson_id == lesson_id)

        await db.execute(delete(TaskVideo).where(TaskVideo.task_id.in_(task_ids_sq)))
        await db.execute(delete(Task).where(Task.lesson_id == lesson_id))

        await db.execute(delete(Lesson).where(Lesson.lesson_id == lesson_id))
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception:
        await db.rollback()
        logging.exception("Error deleting lesson")
        raise HTTPException(status_code=500, detail="Failed to delete lesson")


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Create a new task with associated videos.
    """

    result = await db.execute(select(Lesson).where(Lesson.lesson_id == task.lesson_id))
    lesson = result.scalar()
    if not lesson:
        raise HTTPException(status_code=400, detail="Invalid lesson ID.")

    if task.video_ids:
        videos_result = await db.execute(
            select(VideoReference).where(VideoReference.video_id.in_(task.video_ids))
        )
        valid_videos = videos_result.scalars().all()
        valid_video_ids = {video.video_id for video in valid_videos}
        if set(task.video_ids) != valid_video_ids:
            raise HTTPException(status_code=400, detail="Invalid video IDs provided.")

    try:
        new_task = Task(
            task_type=task.task_type,
            content=task.content,
            correct_answer=task.correct_answer,
            lesson_id=task.lesson_id,
            version=task.version,
            points=task.points,
        )
        db.add(new_task)
        await db.commit()
        await db.refresh(new_task)

        for video_id in task.video_ids:
            task_video = TaskVideo(task_id=new_task.task_id, video_id=video_id)
            db.add(task_video)

        await db.commit()
        await db.refresh(new_task)

        task_with_videos = await db.execute(
            select(Task)
            .options(selectinload(Task.videos))
            .where(Task.task_id == new_task.task_id)
        )
        task_with_videos = task_with_videos.scalar()

        logging.info(f"Task {new_task.task_id} created successfully.")
        return task_with_videos
    except Exception as e:
        logging.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Failed to create task")


@router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Fetch all tasks for a specific lesson, including all linked videos.
    """
    try:
        result = await db.execute(
            select(Task, VideoReference)
            .join(TaskVideo, Task.task_id == TaskVideo.task_id, isouter=True)
            .join(
                VideoReference,
                TaskVideo.video_id == VideoReference.video_id,
                isouter=True,
            )
            .where(Task.lesson_id == lesson_id)
        )

        tasks = {}
        for task, video in result:
            if task.task_id not in tasks:
                # Initialize task details
                tasks[task.task_id] = {
                    "task_id": task.task_id,
                    "task_type": task.task_type,
                    "content": task.content,
                    "correct_answer": task.correct_answer,
                    "lesson_id": task.lesson_id,
                    "version": task.version,
                    "points": task.points,
                    "videos": [],
                }

            if video:
                tasks[task.task_id]["videos"].append(
                    {
                        "video_id": video.video_id,
                        "video_url": video.video_url,
                        "gloss": video.gloss,
                    }
                )

        logging.debug(f"Serialized tasks: {list(tasks.values())}")

        return list(tasks.values())

    except Exception as e:
        logging.error(f"Error fetching tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    updated_task: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Update a task by ID, including its associated videos.
    """
    try:
        task_result = await db.execute(
            select(Task).where(Task.task_id == task_id).options(joinedload(Task.videos))
        )
        task = task_result.scalar()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found.")

        task.task_type = updated_task.task_type or task.task_type
        task.content = updated_task.content or task.content
        task.correct_answer = updated_task.correct_answer or task.correct_answer
        task.version = updated_task.version or task.version
        task.points = updated_task.points or task.points

        if updated_task.video_ids:
            valid_videos = await db.execute(
                select(VideoReference).where(
                    VideoReference.video_id.in_(updated_task.video_ids)
                )
            )
            valid_video_ids = {video.video_id for video in valid_videos.scalars().all()}

            if set(updated_task.video_ids) - valid_video_ids:
                raise HTTPException(
                    status_code=400, detail="Some video IDs are invalid."
                )

            await db.execute(delete(TaskVideo).where(TaskVideo.task_id == task_id))

            for video_id in updated_task.video_ids:
                task_video = TaskVideo(task_id=task_id, video_id=video_id)
                db.add(task_video)

        await db.commit()
        await db.refresh(task)

        return task
    except SQLAlchemyError as e:
        logging.error(f"Database error while updating task: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred.")
    except Exception as e:
        logging.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Failed to update task")


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(Task).where(Task.task_id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    try:
        await db.execute(delete(TaskVideo).where(TaskVideo.task_id == task_id))
        await db.execute(delete(Task).where(Task.task_id == task_id))
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception:
        await db.rollback()
        logging.exception("Error deleting task")
        raise HTTPException(status_code=500, detail="Failed to delete task")


@router.get("/tasks/video/{video_id}", response_model=List[TaskResponse])
async def get_tasks_by_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Fetch all tasks linked to a specific video.
    """
    try:
        result = await db.execute(
            select(Task)
            .join(Task.videos)
            .where(VideoReference.video_id == video_id)
            .options(joinedload(Task.videos))
        )
        tasks = result.scalars().unique().all()
        return tasks
    except Exception as e:
        logging.error(f"Error fetching tasks by video: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks by video")


@router.get("/videos", response_model=List[VideoReferenceResponse])
async def search_videos(
    query: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    term = (query or search or "").strip()
    if not term:
        return []

    result = await db.execute(
        select(VideoReference).where(VideoReference.gloss.ilike(f"%{term}%"))
    )
    return result.scalars().all()


@router.get("/settings", response_model=UserResponse)
async def get_admin_settings(
    current_admin: User = Depends(require_admin),
):
    """
    Retrieve admin's settings (profile information).
    """
    return current_admin


@router.put("/settings", response_model=UserResponse)
async def update_admin_settings(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Update admin's settings (username, email, password).
    """
    result = await db.execute(select(User).where(User.user_id == current_admin.user_id))
    admin = result.scalar()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if user_update.username:
        admin.username = user_update.username
    if user_update.email:
        admin.email = user_update.email
    if user_update.password:
        admin.password = hash_password(user_update.password)

    await db.commit()
    await db.refresh(admin)
    return admin
