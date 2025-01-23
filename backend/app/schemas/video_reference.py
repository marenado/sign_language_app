from pydantic import BaseModel
from typing import Optional, Dict

class VideoReferenceBase(BaseModel):
    video_id: str
    gloss: str
    signer_id: Optional[int] = None
    video_metadata: Optional[Dict] = None
    video_url: str

class VideoReferenceCreate(VideoReferenceBase):
    pass

class VideoReferenceUpdate(BaseModel):
    gloss: Optional[str] = None
    signer_id: Optional[int] = None
    video_metadata: Optional[Dict] = None
    video_url: Optional[str] = None

class VideoReferenceResponse(VideoReferenceBase):
    class Config:
        orm_mode = True
