from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql.expression import func
from app.database import get_db
from app.models.language import Language
from app.models.video_reference import VideoReference  # Adjust import if needed
from pydantic import BaseModel

router = APIRouter(
    prefix="/dictionary",
    tags=["Dictionary"]
)

# Pydantic model for dictionary items
class DictionaryItem(BaseModel):
    gloss: str
    video_url: str

@router.get("/", response_model=list[DictionaryItem])
async def get_dictionary(language: str, db: AsyncSession = Depends(get_db)):
    """
    Fetch one video per gloss in alphabetical order for the selected language.
    """
    try:
        # Join VideoReference and Language to filter by the selected language
        result = await db.execute(
            select(VideoReference.gloss, func.min(VideoReference.video_url).label("video_url"))
            .join(Language, VideoReference.language_id == Language.id)
            .where(Language.name == language)
            .group_by(VideoReference.gloss)
            .order_by(VideoReference.gloss.asc())
        )
        items = result.fetchall()

        if not items:
            return []  # Return an empty list if no items are found

        dictionary = []
        for item in items:
            # Ensure correct bucket name in the URL
            corrected_url = item.video_url.replace(
                "singlearnavatarstorage", "asl-video-dataset"
            )
            dictionary.append({"gloss": item.gloss, "video_url": corrected_url})

        return dictionary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dictionary: {str(e)}")



@router.get("/languages", response_model=list[str])
async def get_languages(db: AsyncSession = Depends(get_db)):
    """
    Fetch the list of all available languages.
    """
    try:
        # Fetch all languages from the languages table
        result = await db.execute(
            select(Language.name)
            .order_by(Language.name.asc())
        )
        languages = [row[0] for row in result.fetchall()]  # Extract language names
        return languages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch languages: {str(e)}")
