from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware  
from fastapi.staticfiles import StaticFiles  
from app.routers import admin
from dotenv import load_dotenv
load_dotenv()

import os
from app.routers import users, auth, dictionary

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development (change to specific origins in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers (authorization, content-type, etc.)
)




# Session middleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "ya_ebu"))

# Routers
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(dictionary.router)


# Static file serving for media
media_directory = "media"
if not os.path.exists(media_directory):
    os.makedirs(media_directory)  

app.mount("/media", StaticFiles(directory=media_directory), name="media")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Sign Language Application!"}

