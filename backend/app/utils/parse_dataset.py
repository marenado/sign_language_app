import os
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.video_reference import VideoReference

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")

S3_BUCKET_URL = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/videos/"

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def parse_and_populate_reference(file_path: str):
    """
    Parses the dataset JSON file and populates the video_reference table.

    Args:
        file_path (str): Path to the dataset JSON file.
    """
    try:
        with open(file_path, "r") as file:
            data = json.load(file)

        async with SessionLocal() as session:
            for entry in data:
                gloss = entry.get("gloss")
                instances = entry.get("instances", [])

                for instance in instances:
                    video_id = instance.get("video_id")
                    if not video_id:
                        continue

                    video_url = f"{S3_BUCKET_URL}{video_id}.mp4"

                    metadata = {
                        "fps": instance.get("fps"),
                        "frame_start": instance.get("frame_start"),
                        "frame_end": instance.get("frame_end"),
                        "bbox": instance.get("bbox"),
                        "signer_id": instance.get("signer_id"),
                        "source": instance.get("source"),
                        "split": instance.get("split"),
                    }

                    existing_video = await session.get(VideoReference, video_id)
                    if not existing_video:
                        video_reference = VideoReference(
                            video_id=video_id,
                            gloss=gloss,
                            signer_id=instance.get("signer_id"),
                            metadata=metadata,
                            video_url=video_url,
                        )
                        session.add(video_reference)

            await session.commit()
            print("Video references successfully added to the database.")

    except Exception as e:
        print(f"Error parsing and populating reference data: {e}")


if __name__ == "__main__":
    import asyncio

    dataset_file = "D:/aslDataset/WLASL_v0.3.json"

    asyncio.run(parse_and_populate_reference(dataset_file))
