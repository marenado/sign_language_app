import os
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from ..models.video_reference import VideoReference
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Retrieve sensitive data from the .env file
DATABASE_URL = os.getenv("DATABASE_URL")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")

# Construct S3 bucket URL
S3_BUCKET_URL = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/videos/"

# Initialize the database engine and session
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def parse_and_populate_reference(file_path: str):
    """
    Parses the dataset JSON file and populates the video_reference table.

    Args:
        file_path (str): Path to the dataset JSON file.
    """
    try:
        # Load the dataset JSON file
        with open(file_path, "r") as file:
            data = json.load(file)

        async with SessionLocal() as session:
            # Iterate over the dataset entries
            for entry in data:
                gloss = entry.get("gloss")  # The word being signed
                instances = entry.get("instances", [])

                for instance in instances:
                    video_id = instance.get("video_id")
                    if not video_id:
                        continue  # Skip if no video_id is present

                    # Construct the S3 video URL
                    video_url = f"{S3_BUCKET_URL}{video_id}.mp4"

                    # Add metadata if available
                    metadata = {
                        "fps": instance.get("fps"),
                        "frame_start": instance.get("frame_start"),
                        "frame_end": instance.get("frame_end"),
                        "bbox": instance.get("bbox"),
                        "signer_id": instance.get("signer_id"),
                        "source": instance.get("source"),
                        "split": instance.get("split"),
                    }

                    # Check if the video already exists
                    existing_video = await session.get(VideoReference, video_id)
                    if not existing_video:
                        # Insert into the video_reference table
                        video_reference = VideoReference(
                            video_id=video_id,
                            gloss=gloss,
                            signer_id=instance.get("signer_id"),
                            metadata=metadata,
                            video_url=video_url,
                        )
                        session.add(video_reference)

            # Commit the session
            await session.commit()
            print("Video references successfully added to the database.")

    except Exception as e:
        print(f"Error parsing and populating reference data: {e}")


if __name__ == "__main__":
    import asyncio

    # Replace with the correct dataset path
    dataset_file = "D:/aslDataset/WLASL_v0.3.json"

    # Run the script
    asyncio.run(parse_and_populate_reference(dataset_file))
