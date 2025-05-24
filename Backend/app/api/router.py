from fastapi import APIRouter
from app.api import voice, video, llm, upload, task, users, accounts, payments

router = APIRouter(prefix="/api")
router.include_router(voice.router, prefix="/voice", tags=["voice"])
router.include_router(video.router, prefix="/video", tags=["video"])
router.include_router(llm.router, prefix="/llm", tags=["llm"])
router.include_router(upload.router, prefix="/files", tags=["Upload"])
router.include_router(task.router, prefix="/tasks", tags=["Tasks"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
router.include_router(payments.router, prefix="/payments", tags=["Payments"])
router.include_router(payments.router, prefix="/payments", tags=["Payments"])
