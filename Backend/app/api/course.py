from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.course import (
    CourseGenerateRequest, CourseStructureResponse, CourseCreate, 
    CourseResponse, CourseUpdate, CourseListResponse, GenerateLessonsRequest,
    GenerateLessonVideoResponse
)
from app.services.course_service import CourseService
from app.api.dependencies import get_current_account
from app.api.users import get_current_active_user
from app.schemas.user import UserInDB
from app.schemas.account import AccountResponse

router = APIRouter()


@router.post("/generate-structure", response_model=CourseStructureResponse)
async def generate_course_structure(
    request: CourseGenerateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Generate course structure using AI based on prompt and requirements."""
    try:
        course_service = CourseService()
        structure = await course_service.generate_course_structure(
            prompt=request.prompt,
            language=request.language,
            max_chapters=request.max_chapters,
            max_lessons_per_chapter=request.max_lessons_per_chapter,
            target_audience=request.target_audience,
            difficulty_level=request.difficulty_level
        )
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate course structure: {str(e)}")


@router.post("/", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Create a new course with chapters and lessons."""
    try:
        course_service = CourseService()
        course = await course_service.create_course(
            course_data=course_data,
            user_id=current_user.id,
            account_id=current_account.id
        )
        return course
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create course: {str(e)}")


@router.get("/", response_model=CourseListResponse)
async def list_courses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None),
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """List courses for the current account with pagination."""
    try:
        course_service = CourseService()
        courses = await course_service.list_courses(
            account_id=current_account.id,
            page=page,
            page_size=page_size,
            status=status
        )
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list courses: {str(e)}")


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Get a specific course by ID."""
    try:
        course_service = CourseService()
        course = await course_service.get_course(
            course_id=course_id,
            account_id=current_account.id
        )
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        return course
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get course: {str(e)}")


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    course_update: CourseUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Update a course."""
    try:
        course_service = CourseService()
        course = await course_service.update_course(
            course_id=course_id,
            course_update=course_update,
            account_id=current_account.id
        )
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        return course
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update course: {str(e)}")


@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Delete a course."""
    try:
        course_service = CourseService()
        success = await course_service.delete_course(
            course_id=course_id,
            account_id=current_account.id
        )
        if not success:
            raise HTTPException(status_code=404, detail="Course not found")
        return {"message": "Course deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete course: {str(e)}")


@router.post("/{course_id}/generate-lessons")
async def generate_course_lessons(
    course_id: str,
    request: GenerateLessonsRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Generate video lessons for course chapters."""
    try:
        course_service = CourseService()
        tasks = await course_service.generate_course_lessons(
            course_id=course_id,
            chapter_ids=request.chapter_ids,
            account_id=current_account.id,
            user_id=current_user.id
        )   
        return {
            "message": "Lesson generation started",
            "course_id": course_id,
            "tasks_created": len(tasks),
            "task_ids": [task.task_id for task in tasks]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate lessons: {str(e)}")


@router.post("/{course_id}/lessons/{lesson_id}/generate-video")
async def generate_lesson_video(
    course_id: str,
    lesson_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Generate video for a specific lesson."""
    try:
        course_service = CourseService()
        task_id = await course_service.generate_lesson_video(
            course_id=course_id,
            lesson_id=lesson_id,
            account_id=current_account.id,
            user_id=current_user.id
        )
        return GenerateLessonVideoResponse(
            task_id=task_id,
            message="Video generation started successfully",
            lesson_id=lesson_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate lesson video: {str(e)}")


@router.get("/{course_id}/progress")
async def get_course_progress(
    course_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    current_account: AccountResponse = Depends(get_current_account)
):
    """Get progress of course lesson generation."""
    try:
        course_service = CourseService()
        progress = await course_service.get_course_progress(
            course_id=course_id,
            account_id=current_account.id
        )
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get course progress: {str(e)}")
