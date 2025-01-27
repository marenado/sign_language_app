from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.database import get_db
import os
import logging
import re


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load sensitive data from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Dependency for OAuth2 token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Hash a password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Verify a plain password against a hashed password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Create a JWT access token
# def create_access_token(data: dict) -> str:
#     """
#     Create a JWT token with custom claims for user roles.
#     """
#     to_encode = data.copy()
#     expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire})
#     token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     logger.info(f"Token created with payload: {to_encode}")
#     return token


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"Token created with payload: {to_encode}")
    return token

from fastapi.responses import JSONResponse

def refresh_access_token(token: str) -> str:
    """
    Refresh the access token's expiration if close to expiring.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        remaining_time = exp - datetime.utcnow().timestamp()

        # Refresh if less than 5 minutes remaining
        if remaining_time < 5 * 60:
            payload.pop("exp", None)  # Remove old expiration
            return create_access_token(payload)  # Issue a new token

        return token
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")



# Get the current authenticated user
async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get the current authenticated user and refresh the token if necessary.
    """
    try:
        # Decode and verify the JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload.")

        # Fetch user from database
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Attach role from token
        user.is_admin = is_admin

        # Refresh token
        new_token = refresh_access_token(token)

        return {"user": user, "token": new_token}

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")



# Require admin privileges
async def require_admin(current_user: User = Depends(get_current_user)):
    """
    Ensures the current user has admin privileges.
    """
    if not current_user.is_admin:
        logger.warning(f"Unauthorized admin access attempt by user: {current_user.email}")
        raise HTTPException(status_code=403, detail="Admin privileges required.")
    logger.info(f"Admin access granted for user: {current_user.email}")
    return current_user

# Require super admin privileges
async def require_super_admin(current_user: User = Depends(get_current_user)):
    """
    Ensures the current user has super-admin privileges.
    """
    if not current_user.is_super_admin:
        logger.warning(f"Unauthorized super admin access attempt by user: {current_user.email}")
        raise HTTPException(status_code=403, detail="Super admin privileges required.")
    logger.info(f"Super admin access granted for user: {current_user.email}")
    return current_user

# Generate an email verification token
def create_email_verification_token(email: str) -> str:
    """
    Generates a JWT token for email verification.
    """
    expire = datetime.utcnow() + timedelta(hours=24)  # Token valid for 24 hours
    to_encode = {"sub": email, "exp": expire}
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"Email verification token created for email: {email}")
    return token

# Verify the email verification token
def verify_email_verification_token(token: str) -> str:
    """
    Decodes and verifies the email verification token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Invalid email verification token payload.")
            raise HTTPException(status_code=400, detail="Invalid token.")
        logger.info(f"Email verification successful for email: {email}")
        return email
    except ExpiredSignatureError:
        logger.warning("Email verification token has expired.")
        raise HTTPException(status_code=400, detail="Verification token has expired.")
    except JWTError:
        logger.error("Invalid or expired email verification token.")
        raise HTTPException(status_code=400, detail="Invalid or expired token.")



def validate_password(password: str):
    """
    Validate the password strength.
    """
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not re.search(r'\d', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit.")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")
    if re.search(r'\s', password):
        raise HTTPException(status_code=400, detail="Password must not contain spaces.")
    return True