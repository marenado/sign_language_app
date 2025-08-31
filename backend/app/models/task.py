from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from app.database import Base


class Task(Base):
    __tablename__ = "task"

    task_id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(50), nullable=False)
    content = Column(JSON, nullable=False)
    correct_answer = Column(JSON, nullable=False)
    lesson_id = Column(Integer, ForeignKey("lesson.lesson_id"), nullable=False)
    version = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)

    # Define many-to-many relationship with VideoReference
    videos = relationship(
        "VideoReference",
        secondary="task_video",  # Association table
        back_populates="tasks",
    )
