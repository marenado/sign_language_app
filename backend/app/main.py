from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware  
from fastapi.staticfiles import StaticFiles  
from dotenv import load_dotenv
load_dotenv()

import os
from app.routers import users, auth

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)




# Session middleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "ya_ebu"))

# Routers
app.include_router(users.router)
app.include_router(auth.router)

# Static file serving for media
media_directory = "media"
if not os.path.exists(media_directory):
    os.makedirs(media_directory)  

app.mount("/media", StaticFiles(directory=media_directory), name="media")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Sign Language Application!"}

