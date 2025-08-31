from app.database import Base

from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey


class UserActivityLog(Base):
    __tablename__ = "user_activity_log"

    log_id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    duration = Column(Integer, nullable=True)
    activity_type = Column(String(20), nullable=True)
