from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, SignupRequest
from app.utils.auth import verify_password, create_access_token, hash_password
from sqlalchemy.future import select
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
import os
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Environment variable validation
def validate_env_variables():
    required_vars = [
        "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM",
        "MAIL_PORT", "MAIL_SERVER", "SECRET_KEY",
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"
    ]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")

validate_env_variables()

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "SignLearn"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

serializer = URLSafeTimedSerializer(os.getenv("SECRET_KEY", "default_secret_key"))

# OAuth Configuration
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    access_token_url="https://accounts.google.com/o/oauth2/token",
    redirect_uri=os.getenv("GOOGLE_REDIRECT_URI"),
    client_kwargs={"scope": "openid email profile"},
)

# Google Login
@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, os.getenv("GOOGLE_REDIRECT_URI"))

@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo") or token.get("id_token")
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user information")

    email = user_info["email"]
    name = user_info.get("name", email.split("@")[0])

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=email, username=name, password="", is_verified=True)
        db.add(user)
        await db.commit()

    token = create_access_token({"sub": email, "is_admin": user.is_admin})
    return {"access_token": token, "token_type": "bearer"}

# User Registration
@router.post("/signup")
async def create_user(user_data: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(user_data.password)
    new_user = User(username=user_data.username, email=user_data.email, password=hashed_password, is_verified=False)
    db.add(new_user)
    await db.commit()

    token = serializer.dumps(user_data.email, salt="email-verification")
    verification_link = f"http://127.0.0.1:8000/auth/verify-email?token={token}"

    message = MessageSchema(
        subject="Verify your email",
        recipients=[user_data.email],
        body=f"Click the link to verify your email: {verification_link}",
        subtype="html",
    )
    fm = FastMail(conf)
    await fm.send_message(message)

    return {"message": "Account created! Please verify your email."}

# Email Verification
@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    try:
        email = serializer.loads(token, salt="email-verification", max_age=3600)
    except SignatureExpired:
        raise HTTPException(status_code=400, detail="Verification link expired")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    await db.commit()

    return {"message": "Email verified successfully"}

# Login
@router.post("/login", response_model=TokenResponse)
async def login_user(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")

    token = create_access_token({"sub": user.email, "is_admin": user.is_admin})
    return {"access_token": token, "token_type": "bearer"}
