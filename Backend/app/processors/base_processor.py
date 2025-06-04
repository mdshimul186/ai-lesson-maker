from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import logging
from app.schemas.task import Task
from app.models.task_types import TaskType, TaskConfig, get_task_config
from app.services import task_service

logger = logging.getLogger(__name__)

class BaseTaskProcessor(ABC):
    """Abstract base class for all task processors"""
    
    def __init__(self, task_type: TaskType):
        self.task_type = task_type
        self.config = get_task_config(task_type)
        self.logger = logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")
    
    async def process_task(self, queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Main processing method with common workflow"""
        task_id = queue_item["task_id"]
        
        try:
            self.logger.info(f"Starting {self.task_type} processing for task {task_id}")
            
            # Update task status to processing
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Starting {self.task_type} generation process",
                status="PROCESSING",
                progress=5
            )
            
            # Validate request data
            request_data = queue_item["request_data"]
            validated_request = self.validate_request_data(request_data)
            
            # Execute the specific task processing
            result = await self.execute_task(task_id, validated_request, queue_item)
            
            # Post-processing (cleanup, upload, etc.)
            final_result = await self.post_process(task_id, result, queue_item)
            
            self.logger.info(f"{self.task_type} task {task_id} completed successfully")
            return final_result
            
        except Exception as e:
            self.logger.error(f"Failed to process {self.task_type} task {task_id}: {e}")
            raise
    
    @abstractmethod
    def validate_request_data(self, request_data: Dict[str, Any]) -> Any:
        """Validate and parse the request data for this task type"""
        pass
    
    @abstractmethod
    async def execute_task(self, task_id: str, request: Any, queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the specific task processing logic"""
        pass
    
    async def post_process(self, task_id: str, result: Dict[str, Any], queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Common post-processing steps (can be overridden by specific processors)"""
        # Default implementation - can be overridden by specific processors
        return result
    
    async def estimate_completion_time(self, request_data: Dict[str, Any]) -> Optional[datetime]:
        """Estimate when this task will be completed"""
        if self.config.estimated_duration_minutes:
            from datetime import timedelta
            return datetime.utcnow() + timedelta(minutes=self.config.estimated_duration_minutes)
        return None
    
    def get_max_attempts(self) -> int:
        """Get maximum retry attempts for this task type"""
        return self.config.max_attempts
    
    def get_timeout_minutes(self) -> int:
        """Get timeout in minutes for this task type"""
        return self.config.timeout_minutes
    
    def requires_credits(self) -> bool:
        """Check if this task type requires credits"""
        return self.config.requires_credits
