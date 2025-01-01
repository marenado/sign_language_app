from app.database import Base

from sqlalchemy import Column, Integer, String, ForeignKey

class Lesson(Base):
    __tablename__ = "lesson"

    lesson_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=False)
    description = Column(String(2000))
    module_id = Column(Integer, ForeignKey("module.module_id"), nullable=False)
    version = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=True)
    difficulty = Column(String(20), nullable=True)
