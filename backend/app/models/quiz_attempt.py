from app.database import Base

from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey


class QuizAttempt(Base):
    __tablename__ = "quiz_attempt"

    attempt_id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer, nullable=False)
    attempted_at = Column(TIMESTAMP, nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    task_id = Column(Integer, ForeignKey("task.task_id"), nullable=False)
