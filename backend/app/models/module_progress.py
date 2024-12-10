from app.database import Base

from sqlalchemy import Column, Integer, Boolean, TIMESTAMP, ForeignKey

class ModuleProgress(Base):
    __tablename__ = "module_progress"

    module_progress_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    module_id = Column(Integer, ForeignKey("module.module_id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(TIMESTAMP)
