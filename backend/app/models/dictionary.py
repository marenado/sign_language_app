from app.database import Base

from sqlalchemy import Column, Integer, String, ForeignKey

class Dictionary(Base):
    __tablename__ = "dictionary"

    sign_id = Column(Integer, primary_key=True, index=True)
    word = Column(String(255), nullable=False)
    video_file = Column(String(255), nullable=False)
    description = Column(String(2000))
    category_id = Column(Integer, ForeignKey("dictionary_category.category_id"), nullable=False)
