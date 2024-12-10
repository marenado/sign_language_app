from app.database import Base

from sqlalchemy import Column, Integer, String, ForeignKey

class Module(Base):
    __tablename__ = "module"

    module_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=False)
    description = Column(String(2000))
    created_by = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    version = Column(Integer, nullable=False)
    prerequisite_mod = Column(Integer, ForeignKey("module.module_id"))
