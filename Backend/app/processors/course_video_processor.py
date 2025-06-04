from typing import Dict, Any
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
import logging
from app.services import task_service

logger = logging.getLogger(__name__)

class CourseVideoProcessor(BaseTaskProcessor):
    """Processor for course video generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.COURSE_VIDEO)
    
    async def process_task(self, task_id: str, request_data: Dict[str, Any], user_id: str, account_id: str) -> Dict[str, Any]:
        """
        Process course video generation task
        This is a specialized video processor for course content
        """
        try:
            await task_service.add_task_event(
                task_id=task_id,
                message="Starting course video generation...",
                status="PROCESSING",
                progress=10
            )
            
            # Extract course video specific parameters
            course_id = request_data.get("course_id")
            lesson_id = request_data.get("lesson_id")
            story_prompt = request_data.get("story_prompt", "")
            segments = request_data.get("segments", 3)
            language = request_data.get("language", "en")
            voice_name = request_data.get("voice_name", "en-US-AriaNeural")
            
            logger.info(f"Processing course video for course {course_id}, lesson {lesson_id}")
            
            # For now, use the same video generation logic as regular videos
            # but with course-specific metadata
            from app.processors.video_processor import VideoProcessor
            video_processor = VideoProcessor()
            
            # Add course context to the request
            enhanced_request = request_data.copy()
            enhanced_request["context_type"] = "course_lesson"
            enhanced_request["course_metadata"] = {
                "course_id": course_id,
                "lesson_id": lesson_id
            }
            
            # Process using video processor with course context
            result = await video_processor.process_task(task_id, enhanced_request, user_id, account_id)
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Course video generation completed successfully",
                status="COMPLETED",
                progress=100
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Course video generation failed: {str(e)}"
            logger.error(f"Course video processing failed for task {task_id}: {e}")
            
            await task_service.add_task_event(
                task_id=task_id,
                message=error_msg,
                status="FAILED",
                progress=0
            )
            
            raise Exception(error_msg)
    
    async def estimate_completion_time(self, request_data: Dict[str, Any]) -> int:
        """Estimate completion time for course video generation in minutes"""
        segments = request_data.get("segments", 3)
        # Course videos might take a bit longer due to educational context processing
        return max(10, segments * 4)  # 4 minutes per segment for course videos
