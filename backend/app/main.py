from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
import os
from app.routers import users, auth

app = FastAPI()

# Add SessionMiddleware to enable session handling
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "ya_ebu"))

# Routers
app.include_router(users.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Sign Language Application!"}
