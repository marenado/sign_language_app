from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.routers import users, auth, dictionary, admin, achievements

load_dotenv()

app = FastAPI()


app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# ----- CORS -----
FRONTEND_ORIGINS = [
    "https://signlearn-2nxt.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)

SESSION_SECRET = os.getenv("SESSION_SECRET", "change_me")
IS_PROD = os.getenv("ENV", "dev").lower() in {"prod", "production"}

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="none" if IS_PROD else "lax",
    https_only=True if IS_PROD else False,
)

# ----- Routers -----
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(dictionary.router)
app.include_router(achievements.router)

# ----- Static /media -----
media_directory = "media"
os.makedirs(media_directory, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_directory), name="media")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Sign Language Application!"}
