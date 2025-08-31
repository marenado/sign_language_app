from pydantic import BaseModel


class LanguageCreate(BaseModel):
    code: str
    name: str


class LanguageResponse(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        orm_mode = True
