from app.database import Base
from sqlalchemy import Column, Integer, Boolean, TIMESTAMP, ForeignKey, UniqueConstraint

class Progress(Base):
    __tablename__ = "progress"

    progress_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lesson.lesson_id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    score = Column(Integer, nullable=False)
    completed_at = Column(TIMESTAMP)
    # lives_remaining = Column(Integer, nullable=False)
    time_spent = Column(Integer, nullable=True)
    attempts = Column(Integer, default=1)

    # Add a unique constraint to enforce uniqueness on user_id and lesson_id
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),
    )
