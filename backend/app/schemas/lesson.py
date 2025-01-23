from pydantic import BaseModel, Field
from typing import Optional

class LessonBase(BaseModel):
    title: str = Field(..., example="Introduction to Sign Language")  # Required field with an example
    description: Optional[str] = Field(None, example="This is a beginner-level lesson.")  # Optional field with a default value of None
    version: int = Field(..., example=1)  # Required field with an example
    duration: Optional[int] = Field(None, example=30)  # Optional field, in minutes
    difficulty: Optional[str] = Field(None, example="Beginner")  # Optional field

class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    version: int
    duration: Optional[int] = None
    difficulty: Optional[str] = None
    module_id: int


class LessonResponse(LessonBase):
    lesson_id: int = Field(..., example=1)  # Required field for the response
    module_id: int = Field(..., example=1)  # Module ID to which the lesson belongs

    class Config:
        orm_mode = True  # Enable ORM mode to work with SQLAlchemy models
