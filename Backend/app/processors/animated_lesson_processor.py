from typing import Dict, Any
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
from app.schemas.animated_lesson import AnimatedLessonRequest
from app.services.animated_lesson_service import animated_lesson_service

class AnimatedLessonProcessor(BaseTaskProcessor):
    """Processor for animated lesson generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.ANIMATED_LESSON)
    
    def validate_request_data(self, request_data: Dict[str, Any]) -> AnimatedLessonRequest:
        """Validate and parse animated lesson request data"""
        return AnimatedLessonRequest(**request_data)
    
    async def execute_task(self, task_id: str, request: AnimatedLessonRequest, queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Execute animated lesson generation"""
        # Process animated lesson using its service
        result = await animated_lesson_service.process_animated_lesson_task(task_id, request)
        return result
    
    async def post_process(self, task_id: str, result: Dict[str, Any], queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Post-process animated lesson (minimal processing needed)"""
        # Animated lesson service handles its own cleanup and upload
        return result
