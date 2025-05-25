import json
import uuid
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from loguru import logger

from app.services.llm import LLMService
from app.services.task_service import TaskService
from app.services.credit_service import deduct_credits_for_video
from app.models.const import TaskStatus
from app.schemas.course import (
    CourseCreate, CourseResponse, CourseUpdate, CourseListResponse,
    CourseStructureResponse, ChapterResponse, LessonResponse, CourseStatus
)
from app.schemas.task import TaskCreate
from app.schemas.video import VideoGenerateRequest
from app.db.mongodb_utils import get_database
from app.services.video_queue_service import video_queue_service


class CourseService:
    def __init__(self):
        self.llm_service = LLMService()
        self.task_service = TaskService()
        self.db = None
        self.collection = None
        
    async def _initialize_db(self):
        """Initialize database connection if not already done"""
        if self.db is None:
            self.db = await get_database()
            self.collection = self.db.courses

    async def generate_course_structure(
        self,
        prompt: str,
        language: str,
        max_chapters: int = 10,
        max_lessons_per_chapter: int = 5,
        target_audience: Optional[str] = None,
        difficulty_level: Optional[str] = "intermediate"
    ) -> CourseStructureResponse:
        """Generate course structure using AI"""
        
        # Ensure the database is initialized
        await self._initialize_db()
        
        # Build the course generation prompt
        course_prompt = self._build_course_prompt(
            prompt=prompt,
            language=language,
            max_chapters=max_chapters,
            max_lessons_per_chapter=max_lessons_per_chapter,
            target_audience=target_audience,
            difficulty_level=difficulty_level
        )
        
        messages = [
            {
                "role": "system", 
                "content": "You are an expert educational content creator and curriculum designer. Generate comprehensive course structures with clear learning objectives. Return content in JSON format only."
            },
            {
                "role": "user", 
                "content": course_prompt
            }
        ]
        
        logger.info(f"Course generation prompt: {json.dumps(messages, indent=2, ensure_ascii=False)}")
        
        try:
            response = await self.llm_service._generate_response(
                messages=messages, 
                response_format="json_object"
            )
            
            logger.info(f"Generated course structure: {json.dumps(response, indent=2, ensure_ascii=False)}")
            
            # Validate and normalize the response
            self._validate_course_structure(response)
            
            return CourseStructureResponse(
                title=response["title"],
                description=response["description"],
                chapters=response["chapters"]
            )
            
        except Exception as e:
            logger.error(f"Failed to generate course structure: {e}")
            raise e

    def _build_course_prompt(
        self,
        prompt: str,
        language: str,
        max_chapters: int,
        max_lessons_per_chapter: int,
        target_audience: Optional[str],
        difficulty_level: Optional[str]
    ) -> str:
        """Build the course generation prompt"""
        
        audience_text = f" for {target_audience}" if target_audience else ""
        difficulty_text = f" at {difficulty_level} level" if difficulty_level else ""
        
        return f"""
Create a comprehensive educational course{audience_text}{difficulty_text} on the topic: "{prompt}"

Generate a course structure with the following requirements:

**Course Requirements:**
- Maximum {max_chapters} chapters
- Maximum {max_lessons_per_chapter} lessons per chapter
- Content should be in {language}
- Each lesson should be 5-15 minutes long when converted to video
- Progressive difficulty from basic concepts to advanced applications

**Return Format:**
```json
{{
    "title": "Course title in {language}",
    "description": "Brief course description explaining what students will learn (2-3 sentences)",
    "chapters": [
        {{
            "title": "Chapter title",
            "description": "Chapter description and learning objectives",
            "order": 0,
            "lessons": [
                {{
                    "title": "Lesson title",
                    "content": "Detailed lesson content outline covering key concepts, examples, and learning points (minimum 200 characters)",
                    "duration_minutes": 8,
                    "order": 0
                }}
            ]
        }}
    ]
}}
```

**Content Guidelines:**
1. **Course Title**: Should be clear, concise, and describe the main learning objective
2. **Course Description**: Explain the value proposition and what students will achieve
3. **Chapter Structure**: Organize content logically from foundational to advanced concepts
4. **Lesson Content**: Each lesson should have substantial educational content that can be expanded into a 5-15 minute video lesson
5. **Learning Progression**: Ensure each lesson builds upon previous knowledge
6. **Practical Application**: Include practical examples, use cases, or exercises where appropriate

**Quality Standards:**
- Lesson content should be detailed enough to create engaging video content
- Use clear, educational language appropriate for the target audience
- Ensure content is accurate and up-to-date
- Include variety in lesson types (theory, examples, practice, review)
- Make content engaging and interactive where possible

Generate the course structure now.
"""

    def _validate_course_structure(self, response: Dict[str, Any]) -> None:
        """Validate the AI-generated course structure"""
        required_fields = ["title", "description", "chapters"]
        
        for field in required_fields:
            if field not in response:
                raise ValueError(f"Missing required field: {field}")
        
        if not isinstance(response["chapters"], list):
            raise ValueError("Chapters must be a list")
        
        if len(response["chapters"]) == 0:
            raise ValueError("Course must have at least one chapter")
        
        for i, chapter in enumerate(response["chapters"]):
            chapter_required = ["title", "description", "order", "lessons"]
            for field in chapter_required:
                if field not in chapter:
                    raise ValueError(f"Chapter {i} missing required field: {field}")
            
            if not isinstance(chapter["lessons"], list):
                raise ValueError(f"Chapter {i} lessons must be a list")
            
            if len(chapter["lessons"]) == 0:
                raise ValueError(f"Chapter {i} must have at least one lesson")
            
            for j, lesson in enumerate(chapter["lessons"]):
                lesson_required = ["title", "content", "duration_minutes", "order"]
                for field in lesson_required:
                    if field not in lesson:
                        raise ValueError(f"Chapter {i}, Lesson {j} missing required field: {field}")

    async def create_course(
        self,
        course_data: CourseCreate,
        user_id: str,
        account_id: str
    ) -> CourseResponse:
        """Create a new course with chapters and lessons"""
        
        await self._initialize_db()
        
        course_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Create chapters and lessons
        chapters = []
        total_lessons = 0
        estimated_duration = 0
        
        for chapter_data in course_data.chapters:
            chapter_id = str(uuid.uuid4())
            
            lessons = []
            for lesson_data in chapter_data.lessons:
                lesson_id = str(uuid.uuid4())
                lessons.append({
                    "id": lesson_id,
                    "chapter_id": chapter_id,
                    "title": lesson_data.title,
                    "content": lesson_data.content,
                    "duration_minutes": lesson_data.duration_minutes,
                    "order": lesson_data.order,
                    "status": "PENDING",
                    "video_url": None,
                    "task_id": None,
                    "created_at": now,
                    "updated_at": now
                })
                total_lessons += 1
                estimated_duration += lesson_data.duration_minutes
            
            chapter = {
                "id": chapter_id,
                "course_id": course_id,
                "title": chapter_data.title,
                "description": chapter_data.description,
                "order": chapter_data.order,
                "lessons": lessons,
                "created_at": now,
                "updated_at": now
            }
            chapters.append(chapter)
        
        # Create course document
        course_doc = {
            "id": course_id,
            "user_id": user_id,
            "account_id": account_id,
            "title": course_data.title,
            "description": course_data.description,
            "prompt": course_data.prompt,
            "language": course_data.language,
            "voice_id": course_data.voice_id,
            "target_audience": course_data.target_audience,
            "difficulty_level": course_data.difficulty_level,
            "status": CourseStatus.DRAFT,
            "chapters": chapters,
            "total_lessons": total_lessons,
            "estimated_duration_minutes": estimated_duration,
            "created_at": now,
            "updated_at": now
        }
        
        # Save to database
        await self.collection.insert_one(course_doc)
        
        logger.info(f"Created course {course_id} with {len(chapters)} chapters and {total_lessons} lessons")
        
        return self._doc_to_response(course_doc)

    async def list_courses(
        self,
        account_id: str,
        page: int = 1,
        page_size: int = 10,
        status: Optional[str] = None
    ) -> CourseListResponse:
        """List courses for an account with pagination"""
        
        await self._initialize_db()
        
        # Build query
        query = {"account_id": account_id}
        if status:
            query["status"] = status
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * page_size
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        courses = await cursor.to_list(length=page_size)
        
        course_responses = [self._doc_to_response(doc) for doc in courses]
        
        return CourseListResponse(
            courses=course_responses,
            total=total,
            page=page,
            page_size=page_size
        )

    async def get_course(self, course_id: str, account_id: str) -> Optional[CourseResponse]:
        """Get a specific course by ID"""
        
        await self._initialize_db()
        
        course_doc = await self.collection.find_one({
            "id": course_id,
            "account_id": account_id
        })
        
        if not course_doc:
            return None
        
        return self._doc_to_response(course_doc)

    async def update_course(
        self,
        course_id: str,
        course_update: CourseUpdate,
        account_id: str
    ) -> Optional[CourseResponse]:
        """Update a course"""
        
        await self._initialize_db()
        
        update_data = {}
        if course_update.title is not None:
            update_data["title"] = course_update.title
        if course_update.description is not None:
            update_data["description"] = course_update.description
        if course_update.status is not None:
            update_data["status"] = course_update.status
        
        if not update_data:
            return await self.get_course(course_id, account_id)
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"id": course_id, "account_id": account_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return None
        
        return await self.get_course(course_id, account_id)

    async def delete_course(self, course_id: str, account_id: str) -> bool:
        """Delete a course"""
        
        await self._initialize_db()
        
        result = await self.collection.delete_one({
            "id": course_id,
            "account_id": account_id
        })
        
        return result.deleted_count > 0

    async def generate_course_lessons(
        self,
        course_id: str,
        chapter_ids: Optional[List[str]],
        account_id: str,
        user_id: str
    ) -> List[Any]:
        """Generate video lessons for course chapters"""
        
        await self._initialize_db()
        
        # Get course
        course = await self.get_course(course_id, account_id)
        if not course:
            raise ValueError("Course not found")
        
        # Filter chapters if specified
        chapters_to_process = course.chapters
        if chapter_ids:
            chapters_to_process = [ch for ch in course.chapters if ch.id in chapter_ids]
        
        # Update course status
        await self.update_course(course_id, CourseUpdate(status=CourseStatus.GENERATING), account_id)
          # Create tasks for each lesson
        tasks = []
        for chapter in chapters_to_process:
            for lesson in chapter.lessons:
                # Create a video generation request for the lesson
                video_request = VideoGenerateRequest(
                    title=lesson.title,
                    script=lesson.content,
                    voice_id=course.voice_id,
                    story_prompt=lesson.title  # Using lesson title as the story prompt as a fallback
                )
                
                # Create a task for video generation
                task_id = str(uuid.uuid4())
                task_create_data = TaskCreate( 
                    task_id=task_id,
                    user_id=user_id,
                    account_id=account_id,
                    task_type="video_generation", 
                    request_data=video_request.model_dump() 
                )
                
                try:
                    task = await self.task_service.create_task(
                        task_id=task_id,
                        user_id=user_id,
                        account_id=account_id,
                        initial_status=TaskStatus.PENDING,
                        request_data=task_create_data.model_dump()
                    )

                    await self.task_service.add_task_event(
                        task_id=task_id, 
                        message=f"Video generation request received.", 
                        status="PENDING", 
                        progress=0
                    )
                    
                    # Add to processing queue
                    await video_queue_service.add_to_queue(
                        task_id=task_id,
                        request=video_request,  # Pass the VideoGenerateRequest object directly
                        user_id=user_id,
                        account_id=account_id
                    )
                    
                    if task:
                        # Update the lesson in the database with the task_id
                        await self.collection.update_one(
                            {"id": course_id, "chapters.lessons.id": lesson.id},
                            {"$set": {"chapters.$[].lessons.$[j].task_id": task.task_id}},
                            array_filters=[{"j.id": lesson.id}]
                        )
                        
                        tasks.append(task)
                        logger.info(f"Created task {task.task_id} for lesson {lesson.id}")
                    else:
                        logger.error(f"Failed to create task for lesson {lesson.id}")
                        
                except Exception as e:
                    logger.error(f"Error creating task for lesson {lesson.id}: {e}")

        logger.info(f"Created {len(tasks)} lesson generation tasks for course {course_id}")
        
        # Ensure queue processing is started after creating all tasks
        if tasks:
            try:
                logger.info("Ensuring video queue processing is started...")
                await video_queue_service.start_processing()
                
                # Check queue status for debugging
                queue_status = await video_queue_service.get_queue_status()
                logger.info(f"Queue status after course lesson generation: {queue_status}")
                
            except Exception as e:
                logger.error(f"Error starting queue processing: {e}")
        
        return tasks

    async def get_course_progress(self, course_id: str, account_id: str) -> Dict[str, Any]:
        """Get progress of course lesson generation"""
        
        course = await self.get_course(course_id, account_id)
        if not course:
            raise ValueError("Course not found")
        
        total_lessons = course.total_lessons
        completed_lessons = 0
        in_progress_lessons = 0
        failed_lessons = 0
        
        # Check task status for each lesson
        for chapter in course.chapters:
            for lesson in chapter.lessons:
                if lesson.task_id:
                    task = await self.task_service.get_task(lesson.task_id)
                    if task:
                        if task.status == TaskStatus.COMPLETED:
                            completed_lessons += 1
                        elif task.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]:
                            in_progress_lessons += 1
                        elif task.status == TaskStatus.FAILED:
                            failed_lessons += 1
        
        progress_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        
        # Update course status based on progress
        if completed_lessons == total_lessons:
            await self.update_course(course_id, CourseUpdate(status=CourseStatus.COMPLETED), account_id)
        elif failed_lessons > 0 and in_progress_lessons == 0:
            await self.update_course(course_id, CourseUpdate(status=CourseStatus.FAILED), account_id)
        
        return {
            "course_id": course_id,
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "in_progress_lessons": in_progress_lessons,
            "failed_lessons": failed_lessons,
            "progress_percentage": round(progress_percentage, 2),
            "status": course.status
        }

    def _doc_to_response(self, doc: Dict[str, Any]) -> CourseResponse:
        """Convert database document to response model"""
        
        chapters = []
        for chapter_doc in doc.get("chapters", []):
            lessons = []
            for lesson_doc in chapter_doc.get("lessons", []):
                lessons.append(LessonResponse(
                    id=lesson_doc["id"],
                    chapter_id=lesson_doc["chapter_id"],
                    title=lesson_doc["title"],
                    content=lesson_doc["content"],
                    duration_minutes=lesson_doc["duration_minutes"],
                    order=lesson_doc["order"],
                    status=lesson_doc.get("status", "PENDING"), 
                    video_url=lesson_doc.get("video_url"),
                    task_id=lesson_doc.get("task_id"),
                    created_at=lesson_doc["created_at"],
                    updated_at=lesson_doc["updated_at"]
                ))
            
            chapter = ChapterResponse(
                id=chapter_doc["id"],
                course_id=chapter_doc["course_id"],
                title=chapter_doc["title"],
                description=chapter_doc.get("description"),
                order=chapter_doc["order"],
                lessons=lessons,
                created_at=chapter_doc["created_at"],
                updated_at=chapter_doc["updated_at"]
            )
            chapters.append(chapter)
        
        return CourseResponse(
            id=doc["id"],
            user_id=doc["user_id"],
            account_id=doc["account_id"],
            title=doc["title"],
            description=doc.get("description"),
            prompt=doc["prompt"],
            language=doc["language"],
            voice_id=doc["voice_id"],
            target_audience=doc.get("target_audience"),
            difficulty_level=doc.get("difficulty_level"),
            status=doc["status"],
            chapters=chapters,
            total_lessons=doc.get("total_lessons", 0),
            estimated_duration_minutes=doc.get("estimated_duration_minutes", 0),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )