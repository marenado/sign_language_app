from pydantic import BaseModel
from typing import Optional

class ModuleBase(BaseModel):
    title: str
    description: Optional[str]
    version: int
    prerequisite_mod: Optional[int]

class ModuleCreate(ModuleBase):
    pass

class ModuleResponse(ModuleBase):
    module_id: int
    created_by: int

    class Config:
        orm_mode = True
