import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
from app.db.mongodb_utils import get_collection
from app.services.task_processor_factory import TaskProcessorFactory
from app.services import task_service
from app.models.task_types import TaskType, get_task_config, is_valid_task_type
from app.config import get_settings
import os
import json
import shutil

logger = logging.getLogger(__name__)

TASK_QUEUE_COLLECTION = "task_queue"

class TaskQueueService:
    """Generic task queue service that can handle multiple task types"""
    
    def __init__(self):
        self._processing = False
        self._current_task_id: Optional[str] = None
        self._queue_task: Optional[asyncio.Task] = None
        
    async def add_to_queue(
        self, 
        task_id: str, 
        request_data: Dict[str, Any], 
        user_id: str, 
        account_id: str, 
        task_type: str,
        priority: str = "normal"
    ) -> None:
        """Add a task to the processing queue"""
        
        # Validate task type
        if not is_valid_task_type(task_type):
            raise ValueError(f"Unsupported task type: {task_type}")
        
        # Check if processor exists for this task type
        if not TaskProcessorFactory.is_task_type_supported(task_type):
            raise NotImplementedError(f"Processor not implemented for task type: {task_type}")
        
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        task_config = get_task_config(TaskType(task_type))
        
        queue_item = {
            "task_id": task_id,
            "user_id": user_id,
            "account_id": account_id,
            "request_data": request_data,
            "task_type": task_type,
            "priority": priority,
            "status": "QUEUED",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "attempts": 0,
            "max_attempts": task_config.max_attempts,
            "timeout_minutes": task_config.timeout_minutes,
            "estimated_completion": None  # Will be set by processor
        }
        
        await collection.insert_one(queue_item)
        logger.info(f"Added {task_type} task {task_id} to processing queue with priority {priority}")
        
        # Update task status to queued
        await task_service.add_task_event(
            task_id=task_id, 
            message=f"Task added to {task_type} processing queue", 
            status="QUEUED", 
            progress=1
        )
        
        # Start processing if not already processing
        if not self._processing:
            await self.start_processing()
    
    async def get_queue_status(self, task_id: Optional[str] = None) -> Dict[str, Any]:
        """Get current queue status"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        if task_id:
            # Get specific task status
            queue_item = await collection.find_one({"task_id": task_id})
            if queue_item:
                return {
                    "task_id": task_id,
                    "task_type": queue_item.get("task_type"),
                    "status": queue_item.get("status"),
                    "priority": queue_item.get("priority"),
                    "position": await self._get_queue_position(task_id),
                    "created_at": queue_item.get("created_at"),
                    "attempts": queue_item.get("attempts", 0),
                    "estimated_completion": queue_item.get("estimated_completion")
                }
            return {"task_id": task_id, "status": "NOT_FOUND"}
        
        # Get overall queue status
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        status_counts = {doc["_id"]: doc["count"] async for doc in collection.aggregate(pipeline)}
        
        # Get queue by task type
        type_pipeline = [
            {"$match": {"status": "QUEUED"}},
            {"$group": {
                "_id": "$task_type", 
                "count": {"$sum": 1}
            }}
        ]
        type_counts = {doc["_id"]: doc["count"] async for doc in collection.aggregate(type_pipeline)}
        
        return {
            "current_processing": self._current_task_id,
            "status_counts": status_counts,
            "queued_by_type": type_counts,
            "is_processing": self._processing,
            "supported_task_types": TaskProcessorFactory.get_supported_task_types()
        }
    
    async def get_queue_list(
        self, 
        limit: int = 50, 
        skip: int = 0, 
        task_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get list of tasks in queue with filtering"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        # Build filter
        filter_dict = {}
        if task_type:
            filter_dict["task_type"] = task_type
        if status:
            filter_dict["status"] = status
        
        # Get tasks with pagination
        cursor = collection.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
        tasks = []
        async for task in cursor:
            # Remove sensitive data
            task.pop("request_data", None)
            tasks.append(task)
        
        return tasks
    
    async def _get_queue_position(self, task_id: str) -> int:
        """Get position of task in queue (1-based)"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        # Count tasks that are queued and created before this task
        task = await collection.find_one({"task_id": task_id})
        if not task or task.get("status") != "QUEUED":
            return 0
        
        # Priority-based positioning
        priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
        task_priority = priority_order.get(task.get("priority", "normal"), 2)
        
        position = await collection.count_documents({
            "status": "QUEUED",
            "$or": [
                {"priority": {"$in": list(dict(filter(lambda x: x[1] < task_priority, priority_order.items())).keys())}},
                {
                    "priority": task.get("priority", "normal"),
                    "created_at": {"$lt": task["created_at"]}
                }
            ]
        })
        
        return position + 1
    
    async def start_processing(self) -> None:
        """Start the queue processing loop"""
        if self._processing:
            logger.info("Queue processing already running")
            return
        
        logger.info("Starting task queue processing")
        self._processing = True
        
        # Start the processing loop as a background task
        self._queue_task = asyncio.create_task(self._process_queue_loop())
    
    async def stop_processing(self) -> None:
        """Stop the queue processing loop"""
        logger.info("Stopping task queue processing")
        self._processing = False
        
        if self._queue_task:
            self._queue_task.cancel()
            try:
                await self._queue_task
            except asyncio.CancelledError:
                pass
            self._queue_task = None
    
    async def _process_queue_loop(self) -> None:
        """Main queue processing loop"""
        try:
            while self._processing:
                try:
                    # Get next task from queue (priority-based)
                    next_task = await self._get_next_task()
                    
                    if next_task:
                        await self._process_task(next_task)
                    else:
                        # No tasks in queue, wait before checking again
                        await asyncio.sleep(5)
                        
                except Exception as e:
                    logger.error(f"Error in queue processing loop: {e}")
                    await asyncio.sleep(10)  # Wait longer on error
                    
        except asyncio.CancelledError:
            logger.info("Queue processing loop cancelled")
        except Exception as e:
            logger.error(f"Queue processing loop stopped with error: {e}")
        finally:
            self._processing = False
            self._current_task_id = None
    
    async def _get_next_task(self) -> Optional[Dict[str, Any]]:
        """Get the next task from the queue (priority-based)"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        # Priority order: urgent > high > normal > low, then by creation time
        priority_order = ["urgent", "high", "normal", "low"]
        
        for priority in priority_order:
            task = await collection.find_one_and_update(
                {"status": "QUEUED", "priority": priority},
                {
                    "$set": {
                        "status": "PROCESSING",
                        "updated_at": datetime.utcnow(),
                        "processing_started_at": datetime.utcnow()
                    }
                },
                sort=[("created_at", 1)],  # Oldest first within same priority
                return_document=True
            )
            
            if task:
                return task
        
        return None
    
    async def _process_task(self, queue_item: Dict[str, Any]) -> None:
        """Process a single task from the queue using appropriate processor"""
        task_id = queue_item["task_id"]
        task_type = queue_item["task_type"]
        self._current_task_id = task_id
        
        try:
            logger.info(f"Starting {task_type} processing for task {task_id}")
            
            # Create appropriate processor
            processor = TaskProcessorFactory.create_processor(task_type)
            
            # Set estimated completion time
            estimated_completion = await processor.estimate_completion_time(queue_item["request_data"])
            if estimated_completion:
                await self._update_queue_item(task_id, {"estimated_completion": estimated_completion})
            
            # Process the task using the specific processor
            result = await processor.process_task(queue_item)
            
            # Mark as completed
            await self._mark_queue_item_completed(task_id)
            
            logger.info(f"{task_type} task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to process {task_type} task {task_id}: {e}")
            await self._handle_task_failure(queue_item, str(e))
        finally:
            self._current_task_id = None
    
    async def _update_queue_item(self, task_id: str, update_data: Dict[str, Any]) -> None:
        """Update queue item with additional data"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        await collection.update_one(
            {"task_id": task_id},
            {"$set": {**update_data, "updated_at": datetime.utcnow()}}
        )
    
    async def _mark_queue_item_completed(self, task_id: str) -> None:
        """Mark a queue item as completed"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        await collection.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "status": "COMPLETED",
                    "updated_at": datetime.utcnow(),
                    "completed_at": datetime.utcnow()
                }
            }
        )
    
    async def _handle_task_failure(self, queue_item: Dict[str, Any], error_message: str) -> None:
        """Handle task failure with retry logic"""
        task_id = queue_item["task_id"]
        task_type = queue_item["task_type"]
        attempts = queue_item.get("attempts", 0) + 1
        max_attempts = queue_item.get("max_attempts", 3)
        
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        if attempts >= max_attempts:
            # Max attempts reached, mark as failed
            await collection.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": "FAILED",
                        "updated_at": datetime.utcnow(),
                        "failed_at": datetime.utcnow(),
                        "attempts": attempts,
                        "last_error": error_message
                    }
                }
            )
            
            # Update task status to failed
            error_details = {
                "error_type": f"{task_type.title()}ProcessingError", 
                "details": error_message, 
                "attempts": attempts
            }
            
            await task_service.set_task_failed(
                task_id=task_id,
                error_message=f"Failed to generate {task_type} after {attempts} attempts: {error_message}",
                error_details=error_details
            )
            
            logger.error(f"Task {task_id} failed permanently after {attempts} attempts")
        else:
            # Retry the task
            await collection.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": "QUEUED",  # Put back in queue
                        "updated_at": datetime.utcnow(),
                        "attempts": attempts,
                        "last_error": error_message,
                        "retry_after": datetime.utcnow() + timedelta(minutes=5 * attempts)  # Exponential backoff
                    }
                }
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Task failed (attempt {attempts}/{max_attempts}), retrying in {5 * attempts} minutes: {error_message}",
                status="RETRY_SCHEDULED"
            )
            
            logger.warning(f"Task {task_id} failed (attempt {attempts}/{max_attempts}), scheduling retry")
    
    async def cancel_task(self, task_id: str) -> Dict[str, Any]:
        """Cancel a task that is queued or processing"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        # Get the task
        queue_item = await collection.find_one({"task_id": task_id})
        if not queue_item:
            return {"success": False, "message": "Task not found in queue"}
        
        current_status = queue_item.get("status")
        
        # Check if task can be cancelled
        if current_status in ["COMPLETED", "FAILED", "CANCELLED"]:
            return {
                "success": False,
                "message": f"Cannot cancel task with status {current_status}"
            }
        
        # If task is currently processing, we can't cancel it mid-processing
        # But we can mark it for cancellation
        if current_status == "PROCESSING" and self._current_task_id == task_id:
            # Mark for cancellation - the processor should check this periodically
            await collection.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": "CANCELLING",
                        "updated_at": datetime.utcnow(),
                        "cancel_requested_at": datetime.utcnow()
                    }
                }
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Task cancellation requested - will be cancelled when safe to do so",
                status="CANCELLING"
            )
            
            return {
                "success": True,
                "message": "Task marked for cancellation"
            }
        else:
            # Task is queued or not currently processing - can cancel immediately
            await collection.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": "CANCELLED",
                        "updated_at": datetime.utcnow(),
                        "cancelled_at": datetime.utcnow()
                    }
                }
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Task cancelled by user request",
                status="CANCELLED"
            )
            
            return {
                "success": True,
                "message": "Task cancelled successfully"
            }
    
    async def cleanup_stuck_tasks(self, max_processing_time_minutes: int = 30) -> Dict[str, Any]:
        """Clean up tasks stuck in processing state"""
        collection = await get_collection(TASK_QUEUE_COLLECTION)
        
        # Find tasks that have been processing for too long
        cutoff_time = datetime.utcnow() - timedelta(minutes=max_processing_time_minutes)
        
        stuck_tasks = []
        async for task in collection.find({
            "status": "PROCESSING",
            "updated_at": {"$lt": cutoff_time}
        }):
            stuck_tasks.append(task)
        
        cleanup_count = 0
        for task in stuck_tasks:
            task_id = task["task_id"]
            logger.warning(f"Cleaning up stuck task {task_id} (processing for over {max_processing_time_minutes} minutes)")
            
            # Mark as failed
            await collection.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": "FAILED",
                        "updated_at": datetime.utcnow(),
                        "failed_at": datetime.utcnow(),
                        "last_error": f"Task stuck in processing state for over {max_processing_time_minutes} minutes"
                    }
                }
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Task marked as failed due to being stuck in processing for over {max_processing_time_minutes} minutes",
                status="FAILED"
            )
            
            cleanup_count += 1
        
        return {
            "success": True,
            "message": f"Cleaned up {cleanup_count} stuck tasks",
            "cleaned_count": cleanup_count,
            "cleaned_task_ids": [task["task_id"] for task in stuck_tasks]
        }

# Global instance
task_queue_service = TaskQueueService()
