from pydantic import BaseModel
from typing import Optional

class LessonBase(BaseModel):
    title: str
    description: Optional[str]
    version: int
    duration: Optional[int]
    difficulty: Optional[str]

class LessonCreate(LessonBase):
    module_id: int

class LessonResponse(LessonBase):
    lesson_id: int
    module_id: int

    class Config:
        orm_mode = True
