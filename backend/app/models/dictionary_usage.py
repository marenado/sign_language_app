from app.database import Base

from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey

class DictionaryUsage(Base):
    __tablename__ = "dictionary_usage"

    dictionary_usage_id = Column(Integer, primary_key=True, index=True)
    accessed_at = Column(TIMESTAMP, nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    sign_id = Column(Integer, ForeignKey("dictionary.sign_id"), nullable=False)
