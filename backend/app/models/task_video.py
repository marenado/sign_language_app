from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base


class TaskVideo(Base):
    __tablename__ = "task_video"

    task_id = Column(
        Integer, ForeignKey("task.task_id", ondelete="CASCADE"), primary_key=True
    )
    video_id = Column(
        String,
        ForeignKey("video_reference.video_id", ondelete="CASCADE"),
        primary_key=True,
    )
