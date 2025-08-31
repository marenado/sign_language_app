from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import os

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "SignLearn"),
    USE_CREDENTIALS=True,
)


async def send_verification_email(email: str, token: str) -> bool:
    verification_url = f"https://signlearn.onrender.com/verify-email?token={token}"
    html_content = f"""
    <html>
    <body>
        <h2>Email Verification</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="{verification_url}">Verify Email</a>
        <p>If you did not request this verification, please ignore this email.</p>
    </body>
    </html>
    """
    message = MessageSchema(
        subject="Email Verification",
        recipients=[email],
        body=html_content,
        subtype="html",
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    return True
