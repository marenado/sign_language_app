from app.database import Base

from sqlalchemy import Column, Integer, String

class Achievement(Base):
    __tablename__ = "achievement"

    achievement_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(100))