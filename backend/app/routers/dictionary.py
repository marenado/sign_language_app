from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql.expression import func
from app.database import get_db
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
async def get_dictionary(db: AsyncSession = Depends(get_db)):
    """
    Fetch one video per gloss in alphabetical order.
    """
    try:
        result = await db.execute(
            select(VideoReference.gloss, func.min(VideoReference.video_url).label("video_url"))
            .group_by(VideoReference.gloss)
            .order_by(VideoReference.gloss.asc())
        )
        items = result.all()

        if not items:
            raise HTTPException(status_code=404, detail="No items found in the dictionary.")

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

