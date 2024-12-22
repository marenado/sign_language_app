from fastapi import APIRouter, HTTPException, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, SignupRequest
from app.utils.auth import verify_password, create_access_token, hash_password
from sqlalchemy.future import select
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
import os
import json
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv


load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),  # Default to 587 if not specified
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "SignLearn"),
    MAIL_STARTTLS=True if os.getenv("MAIL_STARTTLS", "True") == "True" else False,
    MAIL_SSL_TLS=True if os.getenv("MAIL_SSL_TLS", "False") == "True" else False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

serializer = URLSafeTimedSerializer(os.getenv("SECRET_KEY"))

#serializer = URLSafeTimedSerializer(os.getenv("SECRET_KEY", "secret_key"))

# OAuth Configuration
oauth = OAuth()


# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/auth/google/callback")


oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    access_token_url="https://accounts.google.com/o/oauth2/token",
    redirect_uri=GOOGLE_REDIRECT_URI,
    client_kwargs={"scope": "openid email profile"},
)


def validate_env_variables():
    required_vars = [
        "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM",
        "MAIL_PORT", "MAIL_SERVER", "SECRET_KEY",
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"
    ]
    for var in required_vars:
        if not os.getenv(var):
            raise RuntimeError(f"Environment variable {var} is missing!")

validate_env_variables()

# Google Login
@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)

# OAuth Callback
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
        user = User(email=email, username=name, password="", is_verified=True)  # Mark verified for OAuth
        db.add(user)
        await db.commit()

    token = create_access_token({"sub": email})
    return {"access_token": token, "token_type": "bearer"}

# User registration
@router.post("/signup")
async def create_user(user_data: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    result = await db.execute(select(User).where(User.username == user_data.username))
    existing_username = result.scalar_one_or_none()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

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

# Email verification
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

# Login endpoint
@router.post("/login", response_model=TokenResponse)
async def login_user(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")

    if not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}
