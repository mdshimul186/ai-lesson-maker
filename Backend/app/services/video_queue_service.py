import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from app.db.mongodb_utils import get_collection
from app.schemas.video import VideoGenerateRequest
from app.services.video import generate_video
from app.services.upload_service import upload_directory_to_minio
from app.services import task_service
from app.config import get_settings
import os
import json
import shutil

logger = logging.getLogger(__name__)

VIDEO_QUEUE_COLLECTION = "video_queue"

class VideoQueueService:
    def __init__(self):
        self._processing = False
        self._current_task_id: Optional[str] = None
        self._queue_task: Optional[asyncio.Task] = None
        
    async def add_to_queue(self, task_id: str, request: VideoGenerateRequest, user_id: str, account_id: str) -> None:
        """Add a video generation task to the queue"""
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
        queue_item = {
            "task_id": task_id,
            "user_id": user_id,
            "account_id": account_id,
            "request_data": request.model_dump(),
            "status": "QUEUED",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "attempts": 0,
            "max_attempts": 3
        }
        
        await collection.insert_one(queue_item)
        logger.info(f"Added task {task_id} to video processing queue")
        
        # Update task status to queued
        await task_service.add_task_event(
            task_id=task_id, 
            message="Task added to video processing queue", 
            status="QUEUED", 
            progress=1
        )
        
        # Start processing if not already processing
        if not self._processing:
            await self.start_processing()
    
    async def get_queue_status(self, task_id: Optional[str] = None) -> Dict[str, Any]:
        """Get current queue status"""
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
        if task_id:
            # Get specific task status
            queue_item = await collection.find_one({"task_id": task_id})
            if queue_item:
                return {
                    "task_id": task_id,
                    "status": queue_item.get("status"),
                    "position": await self._get_queue_position(task_id),
                    "created_at": queue_item.get("created_at"),
                    "attempts": queue_item.get("attempts", 0)
                }
            return {"task_id": task_id, "status": "NOT_FOUND"}
        
        # Get overall queue status
        total_queued = await collection.count_documents({"status": "QUEUED"})
        total_processing = await collection.count_documents({"status": "PROCESSING"})
        
        return {
            "current_processing": self._current_task_id,
            "total_queued": total_queued,
            "total_processing": total_processing,
            "is_processing": self._processing
        }
    
    async def _get_queue_position(self, task_id: str) -> int:
        """Get position of task in queue (1-based)"""
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
        # Count tasks that are queued and created before this task
        task = await collection.find_one({"task_id": task_id})
        if not task or task.get("status") != "QUEUED":
            return 0
        
        position = await collection.count_documents({
            "status": "QUEUED",
            "created_at": {"$lt": task["created_at"]}
        })
        
        return position + 1
    
    async def start_processing(self) -> None:
        """Start the queue processing loop"""
        if self._processing:
            logger.info("Queue processing already running")
            return
        
        logger.info("Starting video queue processing")
        self._processing = True
        
        # Start the processing loop as a background task
        self._queue_task = asyncio.create_task(self._process_queue_loop())
    
    async def stop_processing(self) -> None:
        """Stop the queue processing loop"""
        logger.info("Stopping video queue processing")
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
                    # Get next task from queue
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
        """Get the next task from the queue"""
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
        # Find the oldest queued task
        task = await collection.find_one_and_update(
            {"status": "QUEUED"},
            {
                "$set": {
                    "status": "PROCESSING",
                    "updated_at": datetime.utcnow(),
                    "processing_started_at": datetime.utcnow()
                }
            },
            sort=[("created_at", 1)],  # Oldest first
            return_document=True
        )
        
        return task
    
    async def _process_task(self, queue_item: Dict[str, Any]) -> None:
        """Process a single video generation task"""
        task_id = queue_item["task_id"]
        self._current_task_id = task_id
        
        try:
            logger.info(f"Starting video processing for task {task_id}")
            
            # Update task status to processing
            await task_service.add_task_event(
                task_id=task_id,
                message="Starting video generation process",
                status="PROCESSING",
                progress=5
            )
            
            # Reconstruct the request object
            request_data = queue_item["request_data"]
            request = VideoGenerateRequest(**request_data)
            
            # Generate the video
            video_file_path = await generate_video(request, task_id)
            local_task_dir = os.path.join(".", "tasks", task_id)

            if not os.path.isdir(local_task_dir):
                raise FileNotFoundError(f"Local task directory {local_task_dir} not found after video generation")

            # Upload to MinIO
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Video generation complete. Starting upload of task folder {local_task_dir} to MinIO",
                progress=70
            )

            minio_bucket_name = get_settings().bucket_name
            minio_task_prefix = f"tasks/{task_id}"

            logger.info(f"Starting upload of directory {local_task_dir} to MinIO bucket '{minio_bucket_name}' under prefix '{minio_task_prefix}'")
            uploaded_files_map = await upload_directory_to_minio(
                directory_path=local_task_dir,
                bucket_name=minio_bucket_name,
                minio_prefix=minio_task_prefix
            )
            
            logger.info(f"Successfully uploaded {len(uploaded_files_map)} files from {local_task_dir} to MinIO")
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Successfully uploaded {len(uploaded_files_map)} files to MinIO",
                progress=90
            )

            # Find video URL
            video_object_name_in_minio = f"{minio_task_prefix}/video.mp4"
            video_url_in_minio = uploaded_files_map.get(video_object_name_in_minio)

            if not video_url_in_minio:
                public_url_base = get_settings().minio_public_endpoint.rstrip('/')
                video_url_in_minio = f"{public_url_base}/{minio_bucket_name}/{video_object_name_in_minio}"
                logger.warning(f"Main video URL not found directly in upload map, constructed as: {video_url_in_minio}")

            # Clean up local files
            await task_service.add_task_event(
                task_id=task_id,
                message="Local task folder cleanup starting",
                progress=95
            )
            
            # Save the task folder content to the database before deleting
            await task_service.set_task_completed(
                task_id=task_id,
                result_url=video_url_in_minio,
                task_folder_content=uploaded_files_map,
                final_message="Video processing and MinIO upload complete"
            )
            
            try:
                shutil.rmtree(local_task_dir)
                logger.info(f"Successfully deleted local task directory: {local_task_dir}")
            except Exception as e_clean:
                logger.error(f"Failed to delete local task directory {local_task_dir}: {e_clean}")
                await task_service.add_task_event(
                    task_id=task_id,
                    message=f"Failed to delete local task directory {local_task_dir}: {e_clean}. Manual cleanup may be required",
                    status="COMPLETED_WITH_WARNINGS"
                )
            
            # Mark queue item as completed
            await self._mark_queue_item_completed(task_id)
            logger.info(f"Successfully completed video processing for task {task_id}")
            
        except Exception as e:
            logger.error(f"Failed to process video task {task_id}: {e}")
            await self._handle_task_failure(queue_item, str(e))
        finally:
            self._current_task_id = None
    
    async def _mark_queue_item_completed(self, task_id: str) -> None:
        """Mark a queue item as completed"""
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
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
        attempts = queue_item.get("attempts", 0) + 1
        max_attempts = queue_item.get("max_attempts", 3)
        
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
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
            error_details = {"error_type": "VideoProcessingError", "details": error_message, "attempts": attempts}
            
            # Try to save any partial results to MinIO
            local_task_dir_on_error = os.path.join(".", "tasks", task_id)
            if os.path.isdir(local_task_dir_on_error):
                try:
                    minio_bucket_name = get_settings().bucket_name
                    minio_task_prefix = f"tasks/{task_id}"
                    
                    partial_files_map = await upload_directory_to_minio(
                        directory_path=local_task_dir_on_error,
                        bucket_name=minio_bucket_name,
                        minio_prefix=minio_task_prefix
                    )
                    
                    if partial_files_map:
                        logger.info(f"Saved {len(partial_files_map)} partial files from failed task to MinIO")
                        await task_service.set_task_failed(
                            task_id=task_id,
                            error_message=f"Failed to generate video after {attempts} attempts: {error_message}",
                            error_details=error_details,
                            task_folder_content=partial_files_map
                        )
                    else:
                        await task_service.set_task_failed(
                            task_id=task_id,
                            error_message=f"Failed to generate video after {attempts} attempts: {error_message}",
                            error_details=error_details
                        )
                except Exception as e_upload_error:
                    logger.error(f"Failed to upload partial results to MinIO: {e_upload_error}")
                    await task_service.set_task_failed(
                        task_id=task_id,
                        error_message=f"Failed to generate video after {attempts} attempts: {error_message}",
                        error_details=error_details
                    )
                
                # Clean up the local directory
                try:
                    shutil.rmtree(local_task_dir_on_error)
                    logger.info(f"Cleaned up local task directory {local_task_dir_on_error} after failure")
                except Exception as e_clean_error:
                    logger.error(f"Failed to clean up local task directory {local_task_dir_on_error} after failure: {e_clean_error}")
            else:
                await task_service.set_task_failed(
                    task_id=task_id,
                    error_message=f"Failed to generate video after {attempts} attempts: {error_message}",
                    error_details=error_details
                )
            
            logger.error(f"Task {task_id} failed permanently after {attempts} attempts")
        else:
            # Retry the task
            await collection.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": "QUEUED",
                        "updated_at": datetime.utcnow(),
                        "attempts": attempts,
                        "last_error": error_message
                    }
                }
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Task failed (attempt {attempts}/{max_attempts}), retrying: {error_message}",
                status="QUEUED",
                progress=0
            )
            
            logger.warning(f"Task {task_id} failed (attempt {attempts}/{max_attempts}), will retry: {error_message}")
    
    async def resume_processing_on_startup(self) -> None:
        """Resume processing on server startup - mark stuck processing tasks as failed and restart queue"""
        logger.info("Resuming video queue processing after server restart")
        
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
        # Find tasks that were processing when server stopped
        stuck_tasks = []
        async for task in collection.find({"status": "PROCESSING"}):
            stuck_tasks.append(task)
        
        # Mark stuck processing tasks as failed and reset them to queued for retry
        for task in stuck_tasks:
            task_id = task["task_id"]
            attempts = task.get("attempts", 0)
            max_attempts = task.get("max_attempts", 3)
            
            if attempts >= max_attempts:
                # Max attempts reached, mark as permanently failed
                await collection.update_one(
                    {"task_id": task_id},
                    {
                        "$set": {
                            "status": "FAILED",
                            "updated_at": datetime.utcnow(),
                            "failed_at": datetime.utcnow(),
                            "last_error": "Server restart during processing - max attempts reached"
                        }
                    }
                )
                
                await task_service.set_task_failed(
                    task_id=task_id,
                    error_message=f"Task interrupted by server restart after {attempts} attempts",
                    error_details={"error_type": "ServerRestart", "attempts": attempts}
                )
                
                logger.warning(f"Marked stuck task {task_id} as permanently failed (max attempts reached)")
            else:
                # Reset to queued for retry
                await collection.update_one(
                    {"task_id": task_id},
                    {
                        "$set": {
                            "status": "QUEUED",
                            "updated_at": datetime.utcnow(),
                            "attempts": attempts + 1,
                            "last_error": "Server restart during processing"
                        }
                    }
                )
                
                await task_service.add_task_event(
                    task_id=task_id,
                    message=f"Task interrupted by server restart, requeued for retry (attempt {attempts + 1}/{max_attempts})",
                    status="QUEUED",
                    progress=0
                )
                
                logger.info(f"Reset stuck task {task_id} to queued for retry")
        
        if stuck_tasks:
            logger.info(f"Processed {len(stuck_tasks)} stuck tasks from server restart")
        
        # Start processing queue
        await self.start_processing()
    
    async def get_queue_list(self, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """Get list of tasks in queue with pagination"""
        collection = await get_collection(VIDEO_QUEUE_COLLECTION)
        
        queue_items = []
        async for item in collection.find().sort("created_at", 1).skip(skip).limit(limit):
            queue_items.append({
                "task_id": item["task_id"],
                "user_id": item["user_id"],
                "account_id": item["account_id"],
                "status": item["status"],
                "created_at": item["created_at"],
                "updated_at": item["updated_at"],
                "attempts": item.get("attempts", 0),
                "last_error": item.get("last_error")
            })
        
        return queue_items
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on the queue system"""
        try:
            collection = await get_collection(VIDEO_QUEUE_COLLECTION)
            
            # Check if we can connect to the database
            total_items = await collection.count_documents({})
            
            # Check processing status
            processing_items = await collection.count_documents({"status": "PROCESSING"})
            queued_items = await collection.count_documents({"status": "QUEUED"})
            
            # Check for stuck items (processing for too long)
            stuck_threshold = datetime.utcnow().timestamp() - (30 * 60)  # 30 minutes
            stuck_items = await collection.count_documents({
                "status": "PROCESSING",
                "processing_started_at": {"$lt": datetime.fromtimestamp(stuck_threshold)}
            })
            
            health_status = {
                "healthy": True,
                "database_connected": True,
                "queue_processing": self._processing,
                "current_task": self._current_task_id,
                "total_items": total_items,
                "queued_items": queued_items,
                "processing_items": processing_items,
                "stuck_items": stuck_items,
                "warnings": []
            }
            
            # Add warnings for potential issues
            if stuck_items > 0:
                health_status["warnings"].append(f"{stuck_items} items stuck in processing")
                health_status["healthy"] = False
            
            if not self._processing and queued_items > 0:
                health_status["warnings"].append("Queue processing is stopped but items are queued")
                health_status["healthy"] = False
            
            return health_status
            
        except Exception as e:
            return {
                "healthy": False,
                "database_connected": False,
                "error": str(e),
                "warnings": ["Health check failed"]
            }
    
    async def cleanup_stuck_tasks(self, max_processing_time_minutes: int = 30) -> int:
        """Clean up tasks that have been stuck in processing state for too long"""
        try:
            collection = await get_collection(VIDEO_QUEUE_COLLECTION)
            
            # Find tasks stuck in processing
            stuck_threshold = datetime.utcnow() - timedelta(minutes=max_processing_time_minutes)
            
            stuck_tasks = []
            async for task in collection.find({
                "status": "PROCESSING",
                "processing_started_at": {"$lt": stuck_threshold}
            }):
                stuck_tasks.append(task)
            
            cleaned_count = 0
            for task in stuck_tasks:
                task_id = task["task_id"]
                attempts = task.get("attempts", 0)
                max_attempts = task.get("max_attempts", 3)
                
                if attempts >= max_attempts:
                    # Mark as permanently failed
                    await collection.update_one(
                        {"task_id": task_id},
                        {
                            "$set": {
                                "status": "FAILED",
                                "updated_at": datetime.utcnow(),
                                "failed_at": datetime.utcnow(),
                                "last_error": f"Task stuck in processing for {max_processing_time_minutes} minutes"
                            }
                        }
                    )
                    
                    await task_service.set_task_failed(
                        task_id=task_id,
                        error_message=f"Task stuck in processing for {max_processing_time_minutes} minutes",
                        error_details={"error_type": "StuckProcessing", "attempts": attempts}
                    )
                else:
                    # Reset to queued for retry
                    await collection.update_one(
                        {"task_id": task_id},
                        {
                            "$set": {
                                "status": "QUEUED",
                                "updated_at": datetime.utcnow(),
                                "attempts": attempts + 1,
                                "last_error": f"Task stuck in processing, retrying"
                            }
                        }
                    )
                    
                    await task_service.add_task_event(
                        task_id=task_id,
                        message=f"Task was stuck in processing, requeued for retry (attempt {attempts + 1}/{max_attempts})",
                        status="QUEUED",
                        progress=0
                    )
                
                cleaned_count += 1
                logger.warning(f"Cleaned up stuck task {task_id}")
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} stuck tasks")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup stuck tasks: {e}")
            return 0

    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a task in the queue
        
        Args:
            task_id: The ID of the task to cancel
            
        Returns:
            bool: True if the task was successfully cancelled, False otherwise
        """
        logger.info(f"Attempting to cancel task {task_id}")
        
        try:
            # First check if the task is still in the queue (QUEUED status)
            queue_collection = self.db[self.QUEUE_COLLECTION]
            
            # Try to find and remove from queue
            queue_result = await queue_collection.find_one_and_delete({"task_id": task_id, "status": "QUEUED"})
            
            if queue_result:
                # Successfully removed from queue, update task status
                logger.info(f"Task {task_id} successfully removed from queue")
                await task_service.set_task_status(
                    task_id=task_id, 
                    status="CANCELLED", 
                    progress=0
                )
                
                await task_service.add_task_event(
                    task_id=task_id,
                    message="Task was cancelled by user",
                    status="CANCELLED"
                )
                
                return True
            
            # If not in queue, check if it's currently processing
            currently_processing = await queue_collection.find_one({"task_id": task_id, "status": "PROCESSING"})
            
            if currently_processing:
                logger.info(f"Task {task_id} is currently processing, marking for cancellation")
                # We can't immediately cancel a processing task, but we can mark it
                # The processing loop will check for this flag
                await queue_collection.update_one(
                    {"task_id": task_id},
                    {"$set": {"cancel_requested": True}}
                )
                
                await task_service.add_task_event(
                    task_id=task_id,
                    message="Cancellation requested. Task will be cancelled when processing reaches a safe point.",
                    status="PROCESSING"
                )
                
                return True
            
            # Task not found in queue or processing
            logger.warning(f"Cannot cancel task {task_id} - not found in queue or already completed/failed")
            return False
            
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {str(e)}")
            return False
        

# Global instance
video_queue_service = VideoQueueService()
