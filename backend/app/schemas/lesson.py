from pydantic import BaseModel, Field
from typing import Optional


class LessonBase(BaseModel):
    title: str = Field(..., max_length=50, example="Introduction to Sign Language")
    description: Optional[str] = Field(
        None, max_length=2000, example="Beginner lesson."
    )
    version: int = Field(..., ge=1, example=1)
    duration: Optional[int] = Field(None, ge=1, example=30)
    difficulty: Optional[str] = Field(None, max_length=20, example="Beginner")


class LessonCreate(BaseModel):
    """
    Schema for creating and updating lessons.
    """

    title: Optional[str] = Field(None, max_length=50, example="Lesson Title")
    description: Optional[str] = Field(
        None, max_length=2000, example="Lesson description"
    )
    module_id: Optional[int] = Field(None, example=1)
    duration: Optional[int] = Field(None, ge=1, example=30)
    difficulty: Optional[str] = Field(None, max_length=20, example="Beginner")
    version: Optional[int] = Field(None)  # Make `version` optional


class LessonResponse(LessonBase):
    lesson_id: int
    module_id: int

    class Config:
        orm_mode = True
