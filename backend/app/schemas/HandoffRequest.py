from pydantic import BaseModel

class HandoffRequest(BaseModel):
    code: str
