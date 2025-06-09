from fastapi import APIRouter, HTTPException, Query, Depends
import logging
from app.services.task_queue_service import task_queue_service
from app.schemas.video import VideoGenerateRequest, VideoGenerateResponse, VideoGenerateData
from app.services import task_service
from app.services.credit_service import deduct_credits_for_video
from app.api.users import get_current_active_user
from app.schemas.user import UserInDB as User
from app.api.dependencies import get_valid_account_id
from app.models.task_types import TaskType
import uuid
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/generate")
async def generate_video_endpoint(
    request: VideoGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Add video generation task to queue for processing"""
    print(f"🎬🎬🎬 VIDEO API CALLED!")
    print(f"🎬 Full request: {request.model_dump()}")
    print(f"🎬 Theme: {getattr(request, 'theme', 'MISSING')}")
    print(f"🎬 Custom Colors: {getattr(request, 'custom_colors', 'MISSING')}")
    logger.info(f"🎬 VIDEO API CALLED! Theme: {getattr(request, 'theme', 'None')}, Custom Colors: {getattr(request, 'custom_colors', 'None')}")
    # Deduct credits before starting generation
    try:
        video_info = request.story_prompt[:50] + "..." if request.story_prompt else "Untitled Video"
        await deduct_credits_for_video(
            account_id=account_id, 
            user_id=current_user.id, 
            video_info=video_info, 
            num_scenes=request.segments
        )
    except HTTPException as e:
        # If credit deduction fails, return the error immediately
        raise e
    except Exception as e:
        logger.error(f"Credit deduction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deduct credits: {str(e)}")

    client_provided_task_id = getattr(request, 'task_id', None)
    if client_provided_task_id:
        task_id = client_provided_task_id
    else:
        task_id = str(uuid.uuid4())

    # Serialize the request data to store in task
    request_data = request.model_dump()

    # Create task and add to queue
    await task_service.create_task(
        task_id=task_id, 
        user_id=current_user.id, 
        account_id=account_id, 
        initial_status="PENDING",
        request_data=request_data
    )
    
    await task_service.add_task_event(
        task_id=task_id, 
        message=f"Video generation request received. {request.segments} credits deducted (1 per scene).", 
        status="PENDING", 
        progress=0
    )    # Add to processing queue
    await task_queue_service.add_to_queue(
        task_id=task_id,
        request_data=request_data,
        user_id=current_user.id,
        account_id=account_id,
        task_type=TaskType.VIDEO.value
    )

    # Return immediately with task ID
    response = VideoGenerateResponse(
        success=True,
        data=VideoGenerateData(
            task_id=task_id
        )
    )
    
    return response

@router.get("/queue/status")
async def get_queue_status(
    task_id: str = Query(None, description="Optional task ID to get specific task status"),
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Get current queue status or specific task status"""
    try:
        status = await task_queue_service.get_queue_status(task_id)
        return {"success": True, "data": status}
    except Exception as e:
        logger.error(f"Failed to get queue status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")

@router.get("/queue/list")
async def get_queue_list(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of items to return"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Get list of tasks in queue with pagination (admin only for now)"""
    try:
        queue_list = await task_queue_service.get_queue_list(limit=limit, skip=skip, task_type=TaskType.VIDEO.value)
        return {"success": True, "data": queue_list}
    except Exception as e:
        logger.error(f"Failed to get queue list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get queue list: {str(e)}")

@router.post("/queue/start")
async def start_queue_processing(
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Start queue processing (admin only)"""
    try:
        await task_queue_service.start_processing()
        return {"success": True, "message": "Queue processing started"}
    except Exception as e:
        logger.error(f"Failed to start queue processing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start queue processing: {str(e)}")

@router.post("/queue/stop")
async def stop_queue_processing(
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Stop queue processing (admin only)"""
    try:
        await task_queue_service.stop_processing()
        return {"success": True, "message": "Queue processing stopped"}
    except Exception as e:
        logger.error(f"Failed to stop queue processing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop queue processing: {str(e)}")

@router.post("/queue/resume")
async def resume_queue_processing(
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Resume queue processing after restart (admin only)"""
    try:
        await task_queue_service.start_processing()
        return {"success": True, "message": "Queue processing resumed"}
    except Exception as e:
        logger.error(f"Failed to resume queue processing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resume queue processing: {str(e)}")

@router.get("/queue/dashboard")
async def queue_dashboard(
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Get comprehensive queue dashboard information"""
    try:        # Get overall queue status
        status = await task_queue_service.get_queue_status()
        
        # Get recent queue items
        recent_items = await task_queue_service.get_queue_list(limit=20, task_type=TaskType.VIDEO.value)
        
        # Calculate some statistics
        queued_count = sum(1 for item in recent_items if item['status'] == 'QUEUED')
        processing_count = sum(1 for item in recent_items if item['status'] == 'PROCESSING')
        completed_count = sum(1 for item in recent_items if item['status'] == 'COMPLETED')
        failed_count = sum(1 for item in recent_items if item['status'] == 'FAILED')
        
        dashboard_data = {
            "queue_status": status,
            "statistics": {
                "queued": queued_count,
                "processing": processing_count,
                "completed": completed_count,
                "failed": failed_count,
                "total_recent": len(recent_items)
            },
            "recent_tasks": recent_items[:10],  # Show only 10 most recent
            "is_healthy": status.get("is_processing", False) or queued_count == 0
        }
        
        return {"success": True, "data": dashboard_data}
        
    except Exception as e:
        logger.error(f"Failed to get queue dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get queue dashboard: {str(e)}")

@router.get("/queue/health")
async def queue_health_check(
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Get health status of the video queue system"""
    try:
        # Basic health check using queue status
        status = await task_queue_service.get_queue_status()
        health_status = {
            "status": "healthy" if status.get("is_processing") is not None else "unhealthy",
            "is_processing": status.get("is_processing", False),
            "current_task": status.get("current_processing"),
            "supported_types": status.get("supported_task_types", [])
        }
        return {"success": True, "data": health_status}
    except Exception as e:
        logger.error(f"Failed to get queue health: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get queue health: {str(e)}")

@router.post("/queue/cleanup")
async def cleanup_stuck_tasks(
    max_processing_time_minutes: int = Query(30, ge=5, le=120, description="Maximum processing time in minutes before considering a task stuck"),
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Clean up tasks stuck in processing state (admin only)"""
    try:
        result = await task_queue_service.cleanup_stuck_tasks(max_processing_time_minutes)
        return result
    except Exception as e:
        logger.error(f"Failed to cleanup stuck tasks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup stuck tasks: {str(e)}")

@router.get("/task/{task_id}/request")
async def get_task_request_data(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Get the original request data for a specific task"""
    try:
        # Get the task to verify ownership
        task = await task_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if user has access to this task (either owner or same account)
        if task.user_id != current_user.id and task.account_id != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this task")
        
        request_data = await task_service.get_task_request_data(task_id)
        if not request_data:
            raise HTTPException(status_code=404, detail="Request data not found for this task")
        
        return {"success": True, "data": {"task_id": task_id, "request_data": request_data}}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task request data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get task request data: {str(e)}")

@router.post("/task/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Cancel a task that is queued or processing"""
    try:
        # Get the task to verify ownership
        task = await task_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if user has access to this task (either owner or same account)
        if task.user_id != current_user.id and task.account_id != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this task")
        
        # Check if task is already completed or failed
        if task.status in ["COMPLETED", "FAILED", "CANCELLED"]:
            return {
                "success": False,
                "message": f"Cannot cancel task with status {task.status}"
            }        # Attempt to cancel the task
        result = await task_queue_service.cancel_task(task_id)
        return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel task: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel task: {str(e)}")
