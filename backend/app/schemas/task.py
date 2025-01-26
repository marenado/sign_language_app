from pydantic import BaseModel, validator
from app.schemas.video_reference import VideoReferenceResponse
from typing import Any, List, Optional, Dict

class TaskBase(BaseModel):
    task_type: str
    content: Dict = {}  # Ensure `content` is always a dictionary
    correct_answer: Optional[Dict] = None  # Allow None or empty dictionary
    version: int
    points: int

    @validator("content", pre=True, always=True)
    def validate_content(cls, value):
        # Ensure `content` is a valid dictionary
        if not isinstance(value, dict):
            return {}
        return value

    @validator("correct_answer", pre=True, always=True)
    def validate_correct_answer(cls, value):
        # Ensure `correct_answer` is a valid dictionary
        if not isinstance(value, dict):
            return {}
        return value


class TaskCreate(TaskBase):
    lesson_id: int
    video_ids: List[str] = []  # Ensure `video_ids` defaults to an empty list


class TaskUpdate(TaskBase):
    video_ids: List[str] = []  # Optional field for updating associated videos


class TaskResponse(BaseModel):
    task_id: int
    task_type: str
    content: Dict = {}
    correct_answer: Dict = {}
    version: int
    points: int
    videos: List[VideoReferenceResponse] = []

    @validator("content", pre=True, always=True)
    def validate_content(cls, value):
        if not isinstance(value, dict):
            return {}
        # Add specific validation for `matching` task content if needed
        return value

    @validator("correct_answer", pre=True, always=True)
    def validate_correct_answer(cls, value):
        # Ensure `correct_answer` is a valid dictionary
        if not isinstance(value, dict):
            return {}
        return value

    class Config:
        orm_mode = True
