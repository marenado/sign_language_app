from app.database import Base

from sqlalchemy import Column, Integer, String


class DictionaryCategory(Base):
    __tablename__ = "dictionary_category"

    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(250), nullable=False)
