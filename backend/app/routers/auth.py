from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from fastapi.responses import HTMLResponse, RedirectResponse
from app.models.user import User
from fastapi import APIRouter, HTTPException, Depends
from dotenv import load_dotenv
import os
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError
from fastapi.responses import RedirectResponse
import requests
from sqlalchemy.exc import IntegrityError
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.auth import LoginRequest, TokenResponse, SignupRequest
from app.utils.auth import verify_password, create_access_token, hash_password
from sqlalchemy.future import select
from app.schemas.auth import EmailValidationRequest
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
import os
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
import logging
from app.utils.auth import validate_password
from pydantic import ValidationError
import os

from pydantic import BaseModel






load_dotenv()

logging.basicConfig(level=logging.INFO)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


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
        "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM",
        "MAIL_PORT", "MAIL_SERVER", "SECRET_KEY",
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI", "FRONTEND_URL"
    ]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logging.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        raise RuntimeError("Critical environment variables are missing. Check your .env file.")

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

from fastapi import Response, Request
from datetime import timedelta

ACCESS_COOKIE_NAME = "sl_access"
REFRESH_COOKIE_NAME = "sl_refresh"

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    # Lax works for your current subdomains; switch to "none" if you ever cross domains.
    cookie_kwargs = dict(httponly=True, secure=True, samesite="lax")
    # Access ~1 hour
    response.set_cookie(
        ACCESS_COOKIE_NAME, access_token, max_age=60*60, path="/", **cookie_kwargs
    )
    # Refresh ~7 days (limit path to refresh route so it’s not sent everywhere)
    response.set_cookie(
        REFRESH_COOKIE_NAME, refresh_token, max_age=60*60*24*7, path="/auth/refresh", **cookie_kwargs
    )

def clear_auth_cookies(response: Response):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/auth/refresh")


# OAuth Configuration
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    access_token_url="https://oauth2.googleapis.com/token",
    userinfo_endpoint="https://openidconnect.googleapis.com/v1/userinfo",
    jwks_uri="https://www.googleapis.com/oauth2/v3/certs",
    redirect_uri=os.getenv("GOOGLE_REDIRECT_URI"),
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
            token={"access_token": access_token} 
        )
        user_info = user_info_response.json()

        email = user_info.get("email")
        name = user_info.get("name")

        if not email:
            raise HTTPException(status_code=400, detail="Facebook did not return an email address")

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



# Google Login
@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri=os.getenv("GOOGLE_REDIRECT_URI"),
        scope=["openid", "email", "profile"]
    )



@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)

        # Prefer verified ID token; fall back to userinfo
        try:
            userinfo = await oauth.google.parse_id_token(request, token)
        except Exception as e:
            logging.warning(f"[google_callback] parse_id_token failed: {e}. Falling back to userinfo.")
            resp = await oauth.google.get("https://openidconnect.googleapis.com/v1/userinfo", token=token)
            userinfo = resp.json()

        email = userinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google did not return an email address")

        # Upsert user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            name = userinfo.get("name") or email.split("@")[0]
            user = User(email=email, username=name, password="", is_verified=True)
            db.add(user)
            await db.commit()

        # Issue tokens + set HttpOnly cookies
        access_token  = create_access_token({"sub": email, "is_admin": user.is_admin})
        refresh_token = create_access_token({"sub": email, "is_admin": user.is_admin}, expire_minutes=60*24*7)

        resp = RedirectResponse(f"{FRONTEND_URL}/")  # no token in URL
        set_auth_cookies(resp, access_token, refresh_token)
        return resp

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error in Google Callback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    finally:
        await db.close()



@router.post("/login")
async def login(request: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # If account was created by Google/Facebook, there is no local hash
        if not user.password:
            raise HTTPException(
                status_code=400,
                detail="This account was created with Google. Please sign in with Google or reset your password."
            )

        # Verify password (guard against hash errors)
        try:
            if not verify_password(request.password, user.password):
                raise HTTPException(status_code=401, detail="Invalid credentials")
        except Exception as e:
            logging.warning(f"Password verify error for {request.email}: {e}")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token  = create_access_token({"sub": user.email, "is_admin": user.is_admin})
        refresh_token = create_access_token({"sub": user.email, "is_admin": user.is_admin}, expire_minutes=60*24*7)

        set_auth_cookies(response, access_token, refresh_token)
        return {"ok": True}  # frontend doesn’t need raw tokens

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
        # Check if the email or username already exists
        email_exists = await db.execute(select(User).where(User.email == user_data.email))
        if email_exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already exists")

        username_exists = await db.execute(select(User).where(User.username == user_data.username))
        if username_exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already exists")

        # Hash the password and create the user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            is_verified=False,
        )
        db.add(new_user)
        await db.commit()

        # Generate an email verification token
        token = serializer.dumps(user_data.email, salt="email-verification")
        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")
        verification_link = f"{frontend_url}/verify-email?token={token}"
        # Send the verification email
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
        # Re-raise HTTPExceptions with specific error messages
        raise e
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="An account with this email or username already exists.")
    except Exception as e:
        await db.rollback()
        logging.error(f"Error during user creation: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred during signup.")
    finally:
        await db.close()


from itsdangerous import URLSafeTimedSerializer
import asyncio, random

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
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
            frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")
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
                # Don’t leak to client; just log
                logging.exception(f"[forgot-password] mail send failed for {request.email}: {e}")

        # Always return the same message to avoid enumeration
        return GENERIC_MSG

    except Exception as e:
        logging.exception(f"[forgot-password] unexpected error for {request.email}: {e}")
        # Still return generic message to the client
        return GENERIC_MSG
    finally:
        await db.close()



from fastapi import HTTPException
from itsdangerous import SignatureExpired, BadSignature


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
            # Token is valid but the account is gone (or data mismatch)
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
        base = os.getenv("MAILBOXLAYER_BASE_URL", "https://apilayer.net/api")  # use HTTPS
        key = MAILBOXLAYER_API_KEY

        # If the key is missing, don't block users
        if not key:
            logging.warning("[validate-email] MAILBOXLAYER_API_KEY missing; allowing email by default")
            return {"valid": True, "source": "no_key"}

        # Ask for format + SMTP check; keep timeout short so UI never hangs
        url = f"{base}/check"
        params = {
            "access_key": key,
            "email": email,
            "smtp": 1,
            "format": 1,
        }
        resp = requests.get(url, params=params, timeout=4)

        if resp.status_code != 200:
            logging.warning(f"[validate-email] non-200 from validator: {resp.status_code}")
            return {"valid": True, "source": "validator_unavailable"}

        data = resp.json()
        format_ok = bool(data.get("format_valid"))
        smtp_ok = bool(data.get("smtp_check"))
        did_you_mean = data.get("did_you_mean") or ""

        if format_ok and smtp_ok:
            return {"valid": True, "format_valid": True, "smtp_check": True}

        # Not valid: include reason so UI can show a friendly hint
        reason = did_you_mean or "Invalid email address."
        return {
            "valid": False,
            "format_valid": format_ok,
            "smtp_check": smtp_ok,
            "reason": reason,
        }

    except requests.Timeout:
        # Don’t block on timeouts
        return {"valid": True, "source": "validator_timeout"}
    except Exception as e:
        logging.error(f"[validate-email] error: {e}")
        # Do NOT 500; just allow so UX isn't blocked by a third-party hiccup
        return {"valid": True, "source": "validator_error"}



@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Reset the user's password using the provided token and new password.
    """
    try:
        # Validate and decode the token to extract the email
        decoded_data = serializer.loads(data.token, salt="password-reset", max_age=3600)

        # Ensure the decoded_data is a string (email)
        if isinstance(decoded_data, dict) and "email" in decoded_data:
            email = decoded_data["email"]
        elif isinstance(decoded_data, str):
            email = decoded_data
        else:
            raise HTTPException(status_code=400, detail="Invalid token format.")

        # Fetch the user from the database using the decoded email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Validate the new password strength
        try:
            validate_password(data.new_password)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Check if the new password is different from the current one
        if verify_password(data.new_password, user.password):
            raise HTTPException(
                status_code=400,
                detail="New password cannot be the same as the current password."
            )

        # Hash and update the password
        user.password = hash_password(data.new_password)
        await db.commit()

        return {"message": "Password has been reset successfully."}

    except SignatureExpired:
        raise HTTPException(status_code=400, detail="The reset token has expired.")
    except HTTPException as http_ex:
        raise http_ex  # Re-raise known HTTPExceptions
    except Exception as e:
        # Log unexpected errors
        logging.error(f"Unexpected error during password reset: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="An error occurred while processing your request.")
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
        raise HTTPException(status_code=500, detail="An error occurred while checking the email.")
    finally:
        await db.close()

@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "logged out"}

from fastapi import Cookie

@router.get("/me")
async def me(sl_access: str = Cookie(None), db: AsyncSession = Depends(get_db)):
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

        return {
            "email": user.email,
            "username": user.username,
            "is_admin": user.is_admin,
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
        # set new access cookie to keep session rolling
        if response:
            set_auth_cookies(response, new_access, token)
        return {"access_token": new_access}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    finally:
        await db.close()



    