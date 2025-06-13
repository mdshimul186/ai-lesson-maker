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
from app.services.task_queue_service import task_queue_service
import os

app = FastAPI(
    title="AI Lesson Backend API",
    description="Backend API for AI Lesson application",
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
    print("🚀🚀🚀 STARTUP EVENT CALLED!")
    await connect_to_mongo()
    
    # Create database indexes for better performance
    from app.db.create_indexes import create_indexes
    await create_indexes()
    
    # Resume task queue processing after server restart
    print("🚀 Starting task queue processing...")
    await task_queue_service.start_processing()
    print("🚀 Task queue processing started!")

@app.on_event("shutdown")
async def shutdown_event():
    # Stop task queue processing gracefully
    await task_queue_service.stop_processing()
    await close_mongo_connection()

if not os.path.exists('tasks'):
    os.makedirs('tasks')

app.mount("/tasks", StaticFiles(directory=os.path.abspath("tasks")), name="tasks",)
# Include API router
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "app_name": "AI Lesson Backend API",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
