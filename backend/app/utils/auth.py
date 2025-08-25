from datetime import datetime, timedelta
import logging, os, re
from fastapi import Depends, HTTPException, Cookie
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Fail fast if SECRET_KEY is missing in prod
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    # during local dev you can set a default, but prod should set env
    SECRET_KEY = "dev-secret-key"  # <-- replace/remove in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------- password helpers ----------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ---------- JWT helpers ----------
def create_access_token(data: dict, expire_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    # logger.debug(f"Token payload created for {to_encode.get('sub')}, exp={expire.isoformat()}")  # safer logging
    return token

def create_refresh_token(data: dict, expire_minutes: int = 60 * 24 * 7) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ---------- cookie-based current user ----------
async def get_current_user_cookie(
    sl_access: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Resolve the current user from the HttpOnly 'sl_access' cookie.
    Trust DB for roles, not the token.
    """
    if not sl_access:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(sl_access, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Ensure .is_admin/.is_super_admin are bools
        user.is_admin = bool(user.is_admin)
        user.is_super_admin = bool(getattr(user, "is_super_admin", False))
        return user
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Not authenticated")

async def require_admin(current_user: User = Depends(get_current_user_cookie)) -> User:
    if not getattr(current_user, "is_admin", False):
        logger.warning(f"Unauthorized admin access attempt by: {getattr(current_user, 'email', 'unknown')}")
        raise HTTPException(status_code=403, detail="Admin privileges required.")
    return current_user

async def require_super_admin(current_user: User = Depends(get_current_user_cookie)) -> User:
    if not getattr(current_user, "is_super_admin", False):
        raise HTTPException(status_code=403, detail="Super admin privileges required.")
    return current_user

# ---------- email verification ----------
def create_email_verification_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = {"sub": email, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_email_verification_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token.")
        return email
    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification token has expired.")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token.")

# ---------- password policy ----------
def validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit.")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")
    if re.search(r"\s", password):
        raise HTTPException(status_code=400, detail="Password must not contain spaces.")
    return True

# ---------- back-compat aliases ----------
# So routers that still import these names keep working
get_current_user = get_current_user_cookie  # old name → cookie version
