from app.database import Base

from sqlalchemy import Column, Integer, Boolean, TIMESTAMP, ForeignKey

class Progress(Base):
    __tablename__ = "progress"

    progress_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lesson.lesson_id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    score = Column(Integer, nullable=False)
    completed_at = Column(TIMESTAMP)
    lives_remaining = Column(Integer, nullable=False)
    time_spent = Column(Integer, nullable=True)
    attempts = Column(Integer, default=1)
