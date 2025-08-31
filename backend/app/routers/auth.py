from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from fastapi.responses import HTMLResponse, RedirectResponse
from app.models.user import User
from dotenv import load_dotenv
import os
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError
import requests
from sqlalchemy.exc import IntegrityError
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.auth import LoginRequest, SignupRequest
from app.utils.auth import (
    verify_password,
    create_access_token,
    hash_password,
    create_refresh_token,
)
from sqlalchemy.future import select
from app.schemas.auth import EmailValidationRequest
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from authlib.integrations.starlette_client import OAuth
import logging
from app.utils.auth import validate_password

from pydantic import BaseModel


load_dotenv()

logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class TokenRefreshRequest(BaseModel):
    refresh_token: str


MAILBOXLAYER_API_KEY = os.getenv("MAILBOXLAYER_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
FRONTEND_URL = os.getenv("FRONTEND_URL")
GENERIC_MSG = {"message": "If the email exists, we sent a reset link."}


# Environment variable validation
def validate_env_variables():
    required_vars = [
        "MAIL_USERNAME",
        "MAIL_PASSWORD",
        "MAIL_FROM",
        "MAIL_PORT",
        "MAIL_SERVER",
        "SECRET_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
        "FRONTEND_URL",
    ]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logging.error(
            f"Missing required environment variables: {', '.join(missing_vars)}"
        )
        raise RuntimeError(
            "Critical environment variables are missing. Check your .env file."
        )


validate_env_variables()


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

from fastapi import Response

ACCESS_COOKIE_NAME = "sl_access"
REFRESH_COOKIE_NAME = "sl_refresh"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    _set_cookie_partitioned(
        response, ACCESS_COOKIE_NAME, access_token, path="/", max_age=60 * 60
    )  # 1h
    _set_cookie_partitioned(
        response,
        REFRESH_COOKIE_NAME,
        refresh_token,
        path="/auth/refresh",
        max_age=60 * 60 * 24 * 7,
    )


def clear_auth_cookies(response: Response):
    _clear_cookie_partitioned(response, ACCESS_COOKIE_NAME, path="/")
    _clear_cookie_partitioned(response, REFRESH_COOKIE_NAME, path="/auth/refresh")


def _set_cookie_partitioned(
    response, key, value, *, path="/", max_age: int | None = None
):
    value = (value or "").replace("\r", "").replace("\n", "")
    parts = [
        f"{key}={value}",
        f"Path={path}",
        "Secure",
        "HttpOnly",
        "SameSite=None",
        "Partitioned",
    ]
    if max_age is not None:
        parts.append(f"Max-Age={int(max_age)}")
    response.headers.append("Set-Cookie", "; ".join(parts))


def _clear_cookie_partitioned(response, key, *, path="/"):
    parts = [
        f"{key}=deleted",
        f"Path={path}",
        "Secure",
        "HttpOnly",
        "SameSite=None",
        "Partitioned",
        "Max-Age=0",
    ]
    response.headers.append("Set-Cookie", "; ".join(parts))


oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="facebook",
    client_id=os.getenv("FACEBOOK_CLIENT_ID"),
    client_secret=os.getenv("FACEBOOK_CLIENT_SECRET"),
    authorize_url="https://www.facebook.com/v16.0/dialog/oauth",
    access_token_url="https://graph.facebook.com/v16.0/oauth/access_token",
    userinfo_endpoint="https://graph.facebook.com/me",
    redirect_uri=os.getenv("FACEBOOK_REDIRECT_URI"),
    client_kwargs={"scope": "email,public_profile"},
)


@router.get("/facebook/login")
async def facebook_login(request: Request):
    return await oauth.facebook.authorize_redirect(
        request,
        redirect_uri=os.getenv("FACEBOOK_REDIRECT_URI"),
    )


@router.get("/facebook/callback")
async def facebook_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.facebook.authorize_access_token(request)
        access_token = token["access_token"]

        user_info_response = await oauth.facebook.get(
            "https://graph.facebook.com/me?fields=id,name,email",
            token={"access_token": access_token},
        )
        user_info = user_info_response.json()

        email = user_info.get("email")
        name = user_info.get("name")

        if not email:
            raise HTTPException(
                status_code=400, detail="Facebook did not return an email address"
            )

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(email=email, username=name, password="", is_verified=True)
            db.add(user)
            await db.commit()

        access_token = create_access_token({"sub": email, "is_admin": user.is_admin})

        return RedirectResponse(f"{FRONTEND_URL}/?token={access_token}")

    except HTTPException as http_err:
        logging.error(f"HTTP Exception in Facebook Callback: {str(http_err)}")
        raise http_err
    except Exception as e:
        logging.error(f"Unexpected error in Facebook Callback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    finally:
        await db.close()


GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://signlearn-2nxt.onrender.com")


@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri=GOOGLE_REDIRECT_URI,
        prompt="consent",
        access_type="offline",
    )


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)

        try:
            userinfo = await oauth.google.parse_id_token(request, token)
        except Exception as e:
            logging.warning("parse_id_token failed: %s; falling back to userinfo", e)
            resp_u = await oauth.google.get(
                "https://openidconnect.googleapis.com/v1/userinfo", token=token
            )
            userinfo = resp_u.json()

        email = userinfo.get("email")
        if not email:
            raise HTTPException(
                status_code=400, detail="Google did not return an email"
            )

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            name = userinfo.get("name") or email.split("@")[0]
            user = User(email=email, username=name, password="", is_verified=True)
            db.add(user)
            await db.commit()
            await db.refresh(user)

        is_admin = bool(
            getattr(user, "is_admin", False) or getattr(user, "is_super_admin", False)
        )

        next_param = request.query_params.get("next")
        dest = "/admin/modules" if is_admin else "/dashboard"
        if next_param and next_param.startswith("/"):
            dest = next_param

        resp = RedirectResponse(url=f"{FRONTEND_URL}{dest}", status_code=302)

        access_token = create_access_token({"sub": email, "is_admin": is_admin})
        refresh_token = create_refresh_token({"sub": email, "is_admin": is_admin})
        set_auth_cookies(resp, access_token, refresh_token)

        return resp

    except HTTPException:
        raise
    except Exception:
        logging.exception("Unexpected error in Google callback")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    finally:
        await db.close()


@router.post("/login")
async def login(
    request: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(select(User).where(User.email == request.email))
        user: User | None = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not user.password:
            raise HTTPException(
                status_code=400,
                detail="This account was created with Google/Facebook. Sign in with that provider or reset your password.",
            )

        if not verify_password(request.password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        is_admin = bool(user.is_admin)
        access_token = create_access_token({"sub": user.email, "is_admin": is_admin})
        refresh_token = create_refresh_token({"sub": user.email, "is_admin": is_admin})

        set_auth_cookies(response, access_token, refresh_token)
        return {
            "ok": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "is_admin": is_admin,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"Error during login for {request.email}: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during login.")
    finally:
        await db.close()


@router.post("/signup")
async def create_user(user_data: SignupRequest, db: AsyncSession = Depends(get_db)):
    try:
        email_exists = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if email_exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already exists")

        username_exists = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if username_exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already exists")

        hashed_password = hash_password(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            is_verified=False,
        )
        db.add(new_user)
        await db.commit()

        token = serializer.dumps(user_data.email, salt="email-verification")
        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")
        verification_link = f"{frontend_url}/verify-email?token={token}"

        message = MessageSchema(
            subject="Verify your email",
            recipients=[user_data.email],
            body=f"""
                <html>
                    <body>
                        <p>Hi {user_data.username},</p>
                        <p>Thank you for signing up. Click the link below to verify your email address:</p>
                        <a href="{verification_link}">Verify Email</a>
                        <p>If you did not create this account, you can safely ignore this email.</p>
                    </body>
                </html>
            """,
            subtype="html",
        )
        fm = FastMail(conf)
        await fm.send_message(message)

        return {"message": "Account created! Please verify your email."}
    except HTTPException as e:
        raise e
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="An account with this email or username already exists.",
        )
    except Exception as e:
        await db.rollback()
        logging.error(f"Error during user creation: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred during signup.")
    finally:
        await db.close()


from itsdangerous import URLSafeTimedSerializer
import asyncio
import random


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """
    Always return a generic success message.
    If the user exists, send the email; otherwise do nothing.
    """
    try:
        await asyncio.sleep(random.uniform(0.05, 0.15))

        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()

        if user:
            token = serializer.dumps({"email": user.email}, salt="password-reset")
            frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip(
                "/"
            )
            reset_link = f"{frontend_url}/reset-password?token={token}"

            message = MessageSchema(
                subject="Password Reset Request",
                recipients=[request.email],
                body=f"""
                    <html><body>
                        <p>Hi {user.username or "User"},</p>
                        <p>We received a request to reset your password.</p>
                        <p><a href="{reset_link}">Reset Password</a></p>
                        <p>If you did not request this, you can ignore this email.</p>
                        <p>This link will expire in 1 hour.</p>
                    </body></html>
                """,
                subtype="html",
            )
            try:
                await FastMail(conf).send_message(message)
                logging.info(f"[forgot-password] sent to {request.email}")
            except Exception as e:
                logging.exception(
                    f"[forgot-password] mail send failed for {request.email}: {e}"
                )

        return GENERIC_MSG

    except Exception as e:
        logging.exception(
            f"[forgot-password] unexpected error for {request.email}: {e}"
        )

        return GENERIC_MSG
    finally:
        await db.close()


from itsdangerous import BadSignature


@router.get("/verify-email", response_class=HTMLResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """
    Verify the user's email using the provided token.
    Always show a friendly HTML page; avoid leaking internals.
    """
    try:
        email = serializer.loads(token, salt="email-verification", max_age=3600)

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")

        if not user:
            return HTMLResponse(f"""
                <html><body>
                    <h1>Link invalid or already used</h1>
                    <p>Please try signing up again.</p>
                    <p><a href="{frontend_url}/">Go to Sign In</a></p>
                </body></html>
            """)

        if user.is_verified:
            return HTMLResponse(f"""
                <html><body>
                    <h1>Email already verified</h1>
                    <p>You can sign in now.</p>
                    <p><a href="{frontend_url}/">Go to Sign In</a></p>
                </body></html>
            """)

        user.is_verified = True
        await db.commit()

        return HTMLResponse(f"""
            <html><body>
                <h1>Email verified successfully</h1>
                <p>Your email has been verified. You can sign in now.</p>
                <p><a href="{frontend_url}/">Go to Sign In</a></p>
            </body></html>
        """)

    except SignatureExpired:
        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")
        return HTMLResponse(f"""
            <html><body>
                <h1>Link expired</h1>
                <p>The verification link has expired. Please request a new one.</p>
                <p><a href="{frontend_url}/">Go to Sign In</a></p>
            </body></html>
        """)
    except BadSignature:
        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")
        return HTMLResponse(f"""
            <html><body>
                <h1>Invalid link</h1>
                <p>This verification link is not valid. Please request a new one.</p>
                <p><a href="{frontend_url}/">Go to Sign In</a></p>
            </body></html>
        """)
    except Exception as e:
        logging.exception(f"[verify-email] error: {e}")
        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")
        return HTMLResponse(f"""
            <html><body>
                <h1>Something went wrong</h1>
                <p>Please try again later.</p>
                <p><a href="{frontend_url}/">Go to Sign In</a></p>
            </body></html>
        """)
    finally:
        await db.close()


@router.post("/validate-email")
async def validate_email(request: EmailValidationRequest):
    """
    Validate email with MailboxLayer, but NEVER block signup:
    - short timeout
    - treat provider failures as 'unknown' (do not hard-fail)
    - return useful flags for the UI
    """
    try:
        email = request.email
        base = os.getenv(
            "MAILBOXLAYER_BASE_URL", "https://apilayer.net/api"
        )  # use HTTPS
        key = MAILBOXLAYER_API_KEY

        if not key:
            logging.warning(
                "[validate-email] MAILBOXLAYER_API_KEY missing; allowing email by default"
            )
            return {"valid": True, "source": "no_key"}

        url = f"{base}/check"
        params = {
            "access_key": key,
            "email": email,
            "smtp": 1,
            "format": 1,
        }
        resp = requests.get(url, params=params, timeout=4)

        if resp.status_code != 200:
            logging.warning(
                f"[validate-email] non-200 from validator: {resp.status_code}"
            )
            return {"valid": True, "source": "validator_unavailable"}

        data = resp.json()
        format_ok = bool(data.get("format_valid"))
        smtp_ok = bool(data.get("smtp_check"))
        did_you_mean = data.get("did_you_mean") or ""

        if format_ok and smtp_ok:
            return {"valid": True, "format_valid": True, "smtp_check": True}

        reason = did_you_mean or "Invalid email address."
        return {
            "valid": False,
            "format_valid": format_ok,
            "smtp_check": smtp_ok,
            "reason": reason,
        }

    except requests.Timeout:
        return {"valid": True, "source": "validator_timeout"}
    except Exception as e:
        logging.error(f"[validate-email] error: {e}")

        return {"valid": True, "source": "validator_error"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """
    Reset the user's password using the provided token and new password.
    """
    try:
        decoded_data = serializer.loads(data.token, salt="password-reset", max_age=3600)

        if isinstance(decoded_data, dict) and "email" in decoded_data:
            email = decoded_data["email"]
        elif isinstance(decoded_data, str):
            email = decoded_data
        else:
            raise HTTPException(status_code=400, detail="Invalid token format.")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        try:
            validate_password(data.new_password)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if verify_password(data.new_password, user.password):
            raise HTTPException(
                status_code=400,
                detail="New password cannot be the same as the current password.",
            )

        user.password = hash_password(data.new_password)
        await db.commit()

        return {"message": "Password has been reset successfully."}

    except SignatureExpired:
        raise HTTPException(status_code=400, detail="The reset token has expired.")
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logging.error(f"Unexpected error during password reset: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=500, detail="An error occurred while processing your request."
        )
    finally:
        await db.close()


from pydantic import BaseModel, EmailStr


class CheckEmailRequest(BaseModel):
    email: EmailStr


@router.post("/check-email")
async def check_email(payload: CheckEmailRequest, db: AsyncSession = Depends(get_db)):
    """
    Returns whether the email already exists.
    Accepts JSON: { "email": "user@example.com" }
    """
    try:
        result = await db.execute(select(User).where(User.email == payload.email))
        user = result.scalar_one_or_none()
        return {"exists": user is not None}
    except Exception as e:
        logging.error(f"Error checking email: {e}")
        raise HTTPException(
            status_code=500, detail="An error occurred while checking the email."
        )
    finally:
        await db.close()


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "logged out"}


from fastapi import Cookie

from fastapi import Header


@router.get("/me")
async def me(
    sl_access: str = Cookie(None),
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    token = None
    if sl_access:
        token = sl_access
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        return {
            "email": user.email,
            "username": user.username,
            "is_admin": bool(user.is_admin),
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Not authenticated")
    finally:
        await db.close()


@router.post("/refresh")
async def refresh_access_token_endpoint(
    req: TokenRefreshRequest | None = None,
    response: Response = None,
    sl_refresh: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        token = (req.refresh_token if req else None) or sl_refresh
        if not token:
            raise HTTPException(status_code=401, detail="No refresh token.")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token.")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        new_access = create_access_token({"sub": email, "is_admin": user.is_admin})

        if response:
            set_auth_cookies(response, new_access, token)
        return {"access_token": new_access}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    finally:
        await db.close()
