from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class CourseStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class LessonBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=180)
    order: int = Field(..., ge=0)


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=180)
    order: Optional[int] = Field(None, ge=0)


class LessonResponse(LessonBase):
    id: str
    chapter_id: str
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChapterBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    order: int = Field(..., ge=0)


class ChapterCreate(ChapterBase):
    lessons: List[LessonCreate] = Field(..., max_items=20)


class ChapterUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    order: Optional[int] = Field(None, ge=0)


class ChapterResponse(ChapterBase):
    id: str
    course_id: str
    lessons: List[LessonResponse] = []
    created_at: datetime
    updated_at: datetime


class CourseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    prompt: str = Field(..., min_length=10, max_length=2000)
    language: str = Field(..., min_length=2, max_length=10)
    voice_id: str = Field(..., min_length=1)
    target_audience: Optional[str] = None
    difficulty_level: Optional[str] = None


class CourseCreate(CourseBase):
    chapters: List[ChapterCreate] = Field(..., max_items=30)


class CourseGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=500)
    language: str = Field(default="English", description="Course language")
    max_chapters: Optional[int] = Field(10, ge=1, le=20)
    max_lessons_per_chapter: Optional[int] = Field(5, ge=1, le=10)
    target_audience: Optional[str] = Field(None, max_length=100)
    difficulty_level: Optional[str] = Field("intermediate", pattern="^(beginner|intermediate|advanced)$")  # Changed regex to pattern
    voice_id: Optional[str] = Field(None)  # Added based on CourseCreate


class CourseStructureResponse(BaseModel):
    title: str
    description: str
    chapters: List[dict]  # Will contain chapter structure from LLM


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[CourseStatus] = None


class CourseResponse(CourseBase):
    id: str
    user_id: str
    account_id: str
    status: CourseStatus
    chapters: List[ChapterResponse] = []
    total_lessons: int = 0
    estimated_duration_minutes: int = 0
    created_at: datetime
    updated_at: datetime


class CourseListResponse(BaseModel):
    courses: List[CourseResponse]
    total: int
    page: int
    page_size: int


class GenerateLessonsRequest(BaseModel):
    course_id: str
    chapter_ids: Optional[List[str]] = None  # If None, generate for all chapters
