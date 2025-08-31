from pydantic import BaseModel
from typing import List, Optional, Dict


class VideoReferenceResponse(BaseModel):
    video_id: str
    gloss: Optional[str] = None
    signer_id: Optional[int] = None
    video_metadata: Optional[Dict] = None
    video_url: Optional[str] = ""

    class Config:
        orm_mode = True


class TaskResponse(BaseModel):
    task_id: int
    task_type: str
    content: Dict = {}
    correct_answer: Dict = {}
    version: int
    points: int
    videos: List[VideoReferenceResponse] = []

    @staticmethod
    def process_videos(videos):
        return [
            VideoReferenceResponse(
                video_id=video.video_id,
                gloss=video.gloss,
                signer_id=video.signer_id,
                video_metadata=video.video_metadata,
                video_url=video.video_url or "",
            )
            for video in videos
        ]

    class Config:
        orm_mode = True
