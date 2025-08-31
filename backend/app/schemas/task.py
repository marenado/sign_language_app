from pydantic import BaseModel, validator, field_validator
from app.schemas.video_reference import VideoReferenceResponse
from typing import List, Optional, Dict


class TaskBase(BaseModel):
    task_type: str
    content: Dict = {}
    correct_answer: Optional[Dict] = None
    version: int
    points: int

    @validator("content", pre=True, always=True)
    def validate_content(cls, value):
        return value if isinstance(value, dict) else {}

    @validator("correct_answer", pre=True, always=True)
    def validate_correct_answer(cls, value):
        return value if isinstance(value, dict) else {}


class TaskCreate(TaskBase):
    lesson_id: int
    video_ids: List[str] = []


class TaskUpdate(TaskBase):
    video_ids: List[str] = []


class TaskResponse(BaseModel):
    task_id: int
    task_type: str
    content: dict
    correct_answer: Optional[dict] = None
    version: int
    points: int
    videos: List[VideoReferenceResponse] = []

    @field_validator("videos", mode="before")
    @classmethod
    def convert_videos(cls, value, info):
        task_type = info.data.get("task_type", "")
        if isinstance(value, list):
            return [
                VideoReferenceResponse(
                    video_id=video.video_id
                    if hasattr(video, "video_id")
                    else video.get("video_id"),
                    gloss=video.gloss
                    if hasattr(video, "gloss")
                    else video.get("gloss"),
                    signer_id=video.signer_id
                    if hasattr(video, "signer_id")
                    else video.get("signer_id"),
                    video_metadata=video.video_metadata
                    if hasattr(video, "video_metadata")
                    else video.get("video_metadata"),
                    video_url=video.video_url
                    if hasattr(video, "video_url")
                    else video.get("video_url"),
                )
                for video in value
            ]
        return []

    @validator("content", pre=True, always=True)
    def validate_content(cls, value):
        return value if isinstance(value, dict) else {}

    @validator("correct_answer", pre=True, always=True)
    def validate_correct_answer(cls, value):
        return value if isinstance(value, dict) else {}

    class Config:
        from_attributes = True
