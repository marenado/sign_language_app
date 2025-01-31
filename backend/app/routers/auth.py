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

    try:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email=email, username=name, password="", is_verified=True)
            db.add(user)
            await db.commit()

        token = create_access_token({"sub": email, "is_admin": user.is_admin})
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        await db.rollback()
        logging.error(f"Error during Google callback: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred")
    

@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate the user and issue access and refresh tokens.
    """
    try:
        # Fetch user from database by email
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()

        # Verify user credentials
        if not user or not verify_password(request.password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate access and refresh tokens
        access_token = create_access_token({"sub": user.email, "is_admin": user.is_admin})
        refresh_token = create_access_token(
            {"sub": user.email, "is_admin": user.is_admin},
            expire_minutes=1440,  # Refresh token valid for 24 hours
        )

        # Return tokens
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    except Exception as e:
        logging.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred during login.")


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
        verification_link = f"http://127.0.0.1:8000/auth/verify-email?token={token}"

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


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate and send a password reset link to the user's email.
    """
    try:
        # Check if user exists with the provided email
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User with this email does not exist.")

        # Generate a secure token with expiration (1 hour)
        token = serializer.dumps({"email": user.email}, salt="password-reset")
        reset_link = f"{os.getenv('FRONTEND_URL', 'http://127.0.0.1:3000')}/reset-password?token={token}"

        # Send password reset email
        message = MessageSchema(
            subject="Password Reset Request",
            recipients=[request.email],
            body=f"""
                <html>
                    <body>
                        <p>Hi {user.username},</p>
                        <p>We received a request to reset your password. Click the link below to reset your password:</p>
                        <a href="{reset_link}">Reset Password</a>
                        <p>If you did not request a password reset, you can safely ignore this email.</p>
                        <p>This link will expire in 1 hour.</p>
                    </body>
                </html>
            """,
            subtype="html",
        )
        fm = FastMail(conf)
        await fm.send_message(message)

        logging.info(f"Password reset link sent to {request.email}")
        return {"message": "Password reset link has been sent to your email."}

    except Exception as e:
        logging.error(f"Error during forgot password: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while processing your request.")


from fastapi import HTTPException


@router.get("/verify-email", response_class=HTMLResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """
    Verify the user's email using the provided token.
    """
    try:
        # Decode the token to get the email
        email = serializer.loads(token, salt="email-verification", max_age=3600)

        # Check if the user exists in the database
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Mark the user as verified if not already verified
        if user.is_verified:
            return HTMLResponse("""
                <html>
                    <body>
                        <h1>Email Already Verified</h1>
                        <p>Your email has already been verified. <a href="http://127.0.0.1:3000/">Login here</a>.</p>
                    </body>
                </html>
            """)

        user.is_verified = True
        await db.commit()

        # Return an HTML confirmation page
        return HTMLResponse("""
            <html>
                <body>
                    <h1>Email Verified Successfully</h1>
                    <p>Your email has been verified. <a href="http://127.0.0.1:3000/">Click here to login</a>.</p>
                </body>
            </html>
        """)

    except SignatureExpired:
        raise HTTPException(status_code=400, detail="The verification link has expired.")
    except Exception as e:
        logging.error(f"Error during email verification: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred during email verification.")




@router.post("/validate-email")
async def validate_email(request: EmailValidationRequest):
    """
    Validate the email address using the MailboxLayer API.
    """
    try:
        email = request.email  # Extract the email from the JSON body
        url = f"http://apilayer.net/api/check?access_key={MAILBOXLAYER_API_KEY}&email={email}"
        response = requests.get(url)
        data = response.json()

        if data.get("format_valid") and data.get("smtp_check"):
            return {"valid": True}
        else:
            return {"valid": False, "reason": data.get("did_you_mean", "Invalid email address.")}

    except Exception as e:
        logging.error(f"Error during email validation: {str(e)}")
        raise HTTPException(status_code=500, detail="Error occurred during email validation.")


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
    

    

@router.post("/check-email")
async def check_email(email: str, db: AsyncSession = Depends(get_db)):
    """
    Check if the email is already registered in the database.
    """
    try:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        return {"exists": user is not None}
    except Exception as e:
        logging.error(f"Error checking email: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while checking the email.")
    

@router.post("/refresh")
async def refresh_access_token_endpoint(
    request: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        # Decode refresh token
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token.")

        # Fetch user from database
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Generate new access token
        access_token = create_access_token({"sub": email, "is_admin": user.is_admin})

        return {"access_token": access_token}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    


    