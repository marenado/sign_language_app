from app.database import Base

from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Text

class Task(Base):
    __tablename__ = "task"

    task_id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(50), nullable=False)
    content = Column(JSON, nullable=False)
    correct_answer = Column(JSON, nullable=False)
    lesson_id = Column(Integer, ForeignKey("lesson.lesson_id"), nullable=False)
    version = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    video_id = Column(String, ForeignKey("video_reference.video_id"), nullable=True)

