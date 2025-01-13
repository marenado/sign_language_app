from pydantic import BaseModel, Field
from typing import Optional

class ModuleCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=2000)
    version: Optional[int] = Field(None, ge=1)
    prerequisite_mod: Optional[int] = None

class ModuleCreate(BaseModel):
    pass

class ModuleResponse(BaseModel):
    module_id: int
    created_by: int

    class Config:
        orm_mode = True
