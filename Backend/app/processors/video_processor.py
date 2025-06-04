from typing import Dict, Any
import os
import shutil
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
from app.schemas.video import VideoGenerateRequest
from app.services.video import generate_video
from app.services.upload_service import upload_directory_to_s3
from app.services import task_service
from app.config import get_settings

class VideoProcessor(BaseTaskProcessor):
    """Processor for regular video generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.VIDEO)
    
    def validate_request_data(self, request_data: Dict[str, Any]) -> VideoGenerateRequest:
        """Validate and parse video generation request data"""
        return VideoGenerateRequest(**request_data)
    
    async def execute_task(self, task_id: str, request: VideoGenerateRequest, queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Execute video generation"""
        # Generate the video
        video_file_path = await generate_video(request, task_id)
        local_task_dir = os.path.join(".", "tasks", task_id)
        
        if not os.path.isdir(local_task_dir):
            raise FileNotFoundError(f"Local task directory {local_task_dir} not found after video generation")
        
        return {
            "video_file_path": video_file_path,
            "local_task_dir": local_task_dir
        }
    
    async def post_process(self, task_id: str, result: Dict[str, Any], queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Upload video and cleanup local files"""
        local_task_dir = result["local_task_dir"]
          # Upload to S3
        await task_service.add_task_event(
            task_id=task_id,
            message=f"Video generation complete. Starting upload of task folder {local_task_dir} to S3",
            progress=70
        )
        
        s3_bucket_name = get_settings().bucket_name
        s3_task_prefix = f"tasks/{task_id}"
        
        self.logger.info(f"Starting upload of directory {local_task_dir} to S3 bucket '{s3_bucket_name}' under prefix '{s3_task_prefix}'")
        uploaded_files_map = await upload_directory_to_s3(
            directory_path=local_task_dir,
            bucket_name=s3_bucket_name,
            s3_prefix=s3_task_prefix        )
        
        self.logger.info(f"Successfully uploaded {len(uploaded_files_map)} files from {local_task_dir} to S3")
        await task_service.add_task_event(
            task_id=task_id,
            message=f"Successfully uploaded {len(uploaded_files_map)} files to S3",
            progress=90
        )
        
        # Find video URL
        video_object_name_in_s3 = f"{s3_task_prefix}/video.mp4"
        video_url_in_s3 = uploaded_files_map.get(video_object_name_in_s3)
        
        if not video_url_in_s3:
            public_url_base = get_settings().s3_origin_endpoint.rstrip('/')
            video_url_in_s3 = f"{public_url_base}/{video_object_name_in_s3}"
            self.logger.warning(f"Main video URL not found directly in upload map, constructed as: {video_url_in_s3}")
        
        # Clean up local files
        await task_service.add_task_event(
            task_id=task_id,
            message="Local task folder cleanup starting",
            progress=95
        )
        
        # Save the task folder content to the database before deleting
        await task_service.set_task_completed(
            task_id=task_id,
            result_url=video_url_in_s3,
            task_folder_content=uploaded_files_map,
            final_message="Video processing and S3 upload complete"
        )
        
        try:
            shutil.rmtree(local_task_dir)
            self.logger.info(f"Successfully deleted local task directory: {local_task_dir}")
        except Exception as e_clean:
            self.logger.error(f"Failed to delete local task directory {local_task_dir}: {e_clean}")
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Failed to delete local task directory {local_task_dir}: {e_clean}. Manual cleanup may be required",
                status="COMPLETED_WITH_WARNINGS"
            )        
        return {
            "video_url": video_url_in_s3,
            "uploaded_files": uploaded_files_map,
            "local_cleanup": True
        }
