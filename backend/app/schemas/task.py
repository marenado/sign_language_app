from pydantic import BaseModel
from typing import Any

class TaskBase(BaseModel):
    task_type: str
    content: Any
    correct_answer: Any
    version: int
    points: int

class TaskCreate(TaskBase):
    lesson_id: int

class TaskUpdate(TaskBase):
    pass

class TaskResponse(TaskBase):
    task_id: int
    lesson_id: int

    class Config:
        orm_mode = True
