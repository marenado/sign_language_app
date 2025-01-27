from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from app.database import Base

class VideoReference(Base):
    __tablename__ = "video_reference"

    video_id = Column(String, primary_key=True, index=True)  # Matches the video file name
    gloss = Column(String, nullable=False)  # The word or gloss being signed
    signer_id = Column(Integer, nullable=True)  # Optional signer ID
    video_metadata = Column(JSON, nullable=True)  # Additional metadata like bbox, fps, etc.
    video_url = Column(String, nullable=False)  # S3 URL of the video
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)  # Foreign key to Language table

    # Relationship to Language table
    language = relationship("Language", back_populates="videos")

    # Define many-to-many relationship with Task
    tasks = relationship(
        "Task",
        secondary="task_video",  
        back_populates="videos"
    )