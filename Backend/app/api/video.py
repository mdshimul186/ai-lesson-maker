from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from loguru import logger
from app.services.video import generate_video
from app.services.upload_service import upload_directory_to_minio
from app.schemas.video import VideoGenerateRequest, VideoGenerateResponse, StoryScene, VideoGenerateData
import os
import json
import shutil
from app.utils.utils import extract_id
from app.config import get_settings
from app.services import task_service
import uuid

router = APIRouter()

@router.post("/generate")
async def generate_video_endpoint(
    request: VideoGenerateRequest,
    background_tasks: BackgroundTasks
):
    """Generate video and upload the entire task folder to MinIO"""
    client_provided_task_id = getattr(request, 'task_id', None)
    if client_provided_task_id:
        task_id = client_provided_task_id
    else:
        task_id = str(uuid.uuid4())

    await task_service.create_task(task_id=task_id, initial_status="PENDING")
    await task_service.add_task_event(task_id=task_id, message="Video generation request received.", status="PENDING", progress=0)

    # Return immediately with task ID
    response = VideoGenerateResponse(
        success=True,
        data=VideoGenerateData(
            task_id=task_id
        )
    )

    # Define the background task for video generation
    async def process_video_generation():
        try:
            # Update task status to PROCESSING
            await task_service.add_task_event(task_id=task_id, message="Starting video generation process.", status="PROCESSING", progress=5)
            
            # Generate the video
            video_file_path = await generate_video(request, task_id)
            local_task_dir = os.path.join(".", "tasks", task_id)

            if not os.path.isdir(local_task_dir):
                logger.error(f"Local task directory not found: {local_task_dir}")
                await task_service.set_task_failed(task_id, f"Local task directory {local_task_dir} not found after video generation.")
                return

            # Upload to MinIO
            await task_service.add_task_event(task_id=task_id, message=f"Video generation complete. Starting upload of task folder {local_task_dir} to MinIO.", progress=70)

            minio_bucket_name = get_settings().bucket_name
            minio_task_prefix = f"tasks/{task_id}"

            logger.info(f"Starting upload of directory {local_task_dir} to MinIO bucket '{minio_bucket_name}' under prefix '{minio_task_prefix}'.")
            uploaded_files_map = await upload_directory_to_minio(
                directory_path=local_task_dir,
                bucket_name=minio_bucket_name,
                minio_prefix=minio_task_prefix
            )
            logger.info(f"Successfully uploaded {len(uploaded_files_map)} files from {local_task_dir} to MinIO.")
            await task_service.add_task_event(task_id=task_id, message=f"Successfully uploaded {len(uploaded_files_map)} files to MinIO.", progress=90)

            # Find video URL
            video_object_name_in_minio = f"{minio_task_prefix}/video.mp4"
            video_url_in_minio = uploaded_files_map.get(video_object_name_in_minio)

            if not video_url_in_minio:
                public_url_base = get_settings().minio_public_endpoint.rstrip('/')
                video_url_in_minio = f"{public_url_base}/{minio_bucket_name}/{video_object_name_in_minio}"
                logger.warning(f"Main video URL not found directly in upload map, constructed as: {video_url_in_minio}")

            # Process story JSON if available
            scenes_list = None
            local_story_json_path = os.path.join(local_task_dir, "story.json")
            if os.path.exists(local_story_json_path):
                try:
                    with open(local_story_json_path, "r", encoding="utf-8") as f:
                        story_file_content = json.load(f)
                    if isinstance(story_file_content, dict):
                        scenes_list = story_file_content.get("scenes")
                        if scenes_list is not None and not isinstance(scenes_list, list):
                            logger.warning(f"'scenes' field in story.json is not a list. Type: {type(scenes_list)}.")
                            scenes_list = None
                    else:
                        logger.warning(f"story.json content is not a dict. Type: {type(story_file_content)}.")
                        scenes_list = None
                except Exception as e_story:
                    logger.error(f"Failed to read or process local story.json at {local_story_json_path}: {e_story}")
                    scenes_list = None
            else:
                logger.warning(f"Local story.json not found at {local_story_json_path}.")
                scenes_list = None            # Clean up local files
            await task_service.add_task_event(task_id=task_id, message="Local task folder cleanup starting.", progress=95)
            
            # Save the task folder content to the database before deleting
            await task_service.set_task_completed(
                task_id=task_id,
                result_url=video_url_in_minio,
                task_folder_content=uploaded_files_map,
                final_message="Video processing and MinIO upload complete."
            )
            
            try:
                shutil.rmtree(local_task_dir)
                logger.info(f"Successfully deleted local task directory: {local_task_dir}")
            except Exception as e_clean:
                logger.error(f"Failed to delete local task directory {local_task_dir}: {e_clean}. Please clean up manually.")
                await task_service.add_task_event(task_id=task_id, message=f"Failed to delete local task directory {local_task_dir}: {e_clean}. Manual cleanup may be required.", status="COMPLETED_WITH_WARNINGS")

        except Exception as e:
            logger.error(f"Failed to generate video and upload task folder: {str(e)}")
              # Update task status to FAILED
            error_details = {"error_type": type(e).__name__, "details": str(e)}
            
            # Clean up local directory if it exists
            local_task_dir_on_error = os.path.join(".", "tasks", task_id)
            if os.path.isdir(local_task_dir_on_error):
                # Try to save any partial task folder content to MinIO before cleaning up
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
                            error_message=f"Failed to generate video or upload: {str(e)}", 
                            error_details=error_details,
                            task_folder_content=partial_files_map
                        )
                    else:
                        await task_service.set_task_failed(
                            task_id=task_id, 
                            error_message=f"Failed to generate video or upload: {str(e)}", 
                            error_details=error_details
                        )
                except Exception as e_upload_error:
                    logger.error(f"Failed to upload partial results to MinIO: {e_upload_error}")
                    await task_service.set_task_failed(
                        task_id=task_id, 
                        error_message=f"Failed to generate video or upload: {str(e)}", 
                        error_details=error_details
                    )
                
                # Now clean up the local directory
                try:
                    shutil.rmtree(local_task_dir_on_error)
                    logger.info(f"Cleaned up local task directory {local_task_dir_on_error} after error.")
                except Exception as e_clean_error:
                    logger.error(f"Failed to clean up local task directory {local_task_dir_on_error} after error: {e_clean_error}")
            else:
                # No local directory to clean up, just update task status
                await task_service.set_task_failed(
                    task_id=task_id, 
                    error_message=f"Failed to generate video or upload: {str(e)}", 
                    error_details=error_details
                )

    # Add the video generation function to background tasks
    background_tasks.add_task(process_video_generation)
    
    # Return the response immediately with the task_id
    return response


