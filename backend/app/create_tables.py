from sqlalchemy.ext.asyncio import create_async_engine
from app.database import DATABASE_URL, Base 
from models import * 

engine = create_async_engine(DATABASE_URL, echo=True)

async def create_all_tables():
    async with engine.begin() as conn:
        print("Generating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(create_all_tables())
