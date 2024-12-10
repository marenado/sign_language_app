from app.database import Base

from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP

class UserAchievement(Base):
    __tablename__ = "user_achievement"

    user_achievement_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievement.achievement_id"), nullable=False)
    awarded_at = Column(TIMESTAMP, nullable=False)
