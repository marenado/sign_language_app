from pydantic import BaseModel
from app.schemas.video_reference import VideoReferenceResponse
from typing import Any, List

class TaskBase(BaseModel):
    task_type: str
    content: Any
    correct_answer: Any
    version: int
    points: int

class TaskCreate(TaskBase):
    lesson_id: int
    video_ids: List[str]  # New field for multiple video IDs

class TaskUpdate(TaskBase):
    video_ids: List[str] = []  # Optional field for updating associated videos

class TaskResponse(BaseModel):
    task_id: int
    task_type: str
    content: dict
    correct_answer: dict
    version: int
    points: int
    videos: List[VideoReferenceResponse]  # Include associated videos in the response

    class Config:
        orm_mode = True
