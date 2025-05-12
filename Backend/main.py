import sys
import asyncio
if sys.platform.startswith("win"):
    policy = asyncio.WindowsProactorEventLoopPolicy()
    asyncio.set_event_loop_policy(policy)
    asyncio.set_event_loop(policy.new_event_loop())

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles

from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
from app.db.mongodb_utils import connect_to_mongo, close_mongo_connection
import os

app = FastAPI(
    title="StoryFlicks Backend API",
    description="Backend API for StoryFlicks application",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

if not os.path.exists('tasks'):
    os.makedirs('tasks')

app.mount("/tasks", StaticFiles(directory=os.path.abspath("tasks")), name="tasks",)
# Include API router
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "app_name": "StoryFlicks Backend API",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
