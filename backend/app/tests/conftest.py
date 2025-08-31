# app/tests/conftest.py
import os
import sys
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import delete

# minimal env for app import
os.environ.setdefault("ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "pass")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_PORT", "587")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://test/auth/google/callback")
os.environ.setdefault("FRONTEND_URL", "http://test")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import get_db as real_get_db
from app.models.user import Base, User
from app.utils.auth import hash_password
from main import app


@pytest.fixture(scope="function")
async def async_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.fixture()
async def db_session(async_engine):
    async_session = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        await session.execute(delete(User))
        session.add_all([
            User(
                username="alice",
                email="alice@example.com",
                password=hash_password("secret123"),
                is_admin=False,
                is_super_admin=False,
                is_verified=True,
            ),
            User(
                username="adminy",
                email="admin@example.com",
                password=hash_password("adminpass"),
                is_admin=True,
                is_super_admin=False,
                is_verified=True,
            ),
            User(
                username="rooty",
                email="root@example.com",
                password=hash_password("rootpass"),
                is_admin=False,
                is_super_admin=True,
                is_verified=True,
            ),
        ])
        await session.commit()
        yield session
        await session.rollback()


@pytest.fixture()
async def client(db_session):
    async def _get_db_override():
        yield db_session

    app.dependency_overrides[real_get_db] = _get_db_override

    # httpx >= 0.28: no 'app=' kwarg to AsyncClient, use ASGITransport.
    # IMPORTANT: use HTTPS base_url so Secure cookies are sent.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as ac:
        yield ac

    app.dependency_overrides.clear()
