import asyncio
from sqlalchemy.sql import text
from app.database import get_db


async def test_connection():
    async for session in get_db():
        result = await session.execute(text("SELECT 1"))
        print("Database connected successfully:", result.scalar())


if __name__ == "__main__":
    asyncio.run(test_connection())
