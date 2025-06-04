from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from app.schemas.task import Task as TaskSchema, TaskCreate
from app.services import task_service
from app.services.task_queue_service import task_queue_service  # Updated import
from app.api.users import get_current_active_user  # Import dependency
from app.schemas.user import UserInDB  # Import UserInDB
from app.api.dependencies import get_optional_account_id  # Import account dependency
from app.models.task_types import TaskType

router = APIRouter()

@router.get("/{task_id}", response_model=TaskSchema)
async def get_task_status_api(
    task_id: str, 
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """
    Retrieve the status and details of a specific task.
    Ensures the task belongs to the current user and optionally to the specified account.
    """
    if not task_id or not task_id.strip():
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
    
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")
    
    # Check if user has access to this task
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this task")
    
    # If account_id is provided, also check if task belongs to that account
    if account_id and task.account_id != account_id:
        raise HTTPException(status_code=403, detail="Task does not belong to the specified account")
    
    return task

@router.get("/", response_model=List[TaskSchema])
async def get_all_tasks_api(
    current_user: UserInDB = Depends(get_current_active_user), 
    account_id: Optional[str] = Depends(get_optional_account_id),
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of tasks to return"),
    skip: int = Query(default=0, ge=0, description="Number of tasks to skip for pagination"),
    status: Optional[str] = Query(default=None, description="Filter tasks by status (PENDING, PROCESSING, COMPLETED, FAILED)")
):
    """
    Retrieve all tasks for the current user, optionally filtered by account_id from header and status.
    
    Args:
        current_user: The currently authenticated user.
        account_id: Account ID from X-Account-ID header (optional).
        limit: Maximum number of tasks to return (default 100, max 1000)
        skip: Number of tasks to skip for pagination
        status: Optional filter for task status (e.g. PENDING, PROCESSING, COMPLETED, FAILED)
        
    Returns:
        List of Task objects
    """
    # Validate status if provided
    valid_statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
    if status and status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status '{status}'. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    return await task_service.get_all_tasks(
        user_id=current_user.id, 
        account_id=account_id, 
        limit=limit, 
        skip=skip, 
        status_filter=status
    )

@router.post("/", response_model=TaskSchema, status_code=201)
async def create_new_task_api(
    task_create: TaskCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """
    Create a new task.
    """
    if not task_create.task_id or not task_create.task_id.strip():
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
    
    # Use account_id from header if not provided in request
    final_account_id = task_create.account_id or account_id
    if not final_account_id:
        raise HTTPException(status_code=400, detail="Account ID is required (either in request body or X-Account-ID header)")
    
    task = await task_service.create_task(
        task_id=task_create.task_id,
        user_id=current_user.id,
        account_id=final_account_id,
        initial_status=task_create.initial_status or "PENDING"
    )
    
    return task

@router.delete("/{task_id}", status_code=204)
async def delete_task_api(
    task_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """
    Delete a specific task.
    Only the owner of the task can delete it.
    """
    if not task_id or not task_id.strip():
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
    
    # First check if task exists and user has access
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")
    
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    
    # If account_id is provided, also check if task belongs to that account
    if account_id and task.account_id != account_id:
        raise HTTPException(status_code=403, detail="Task does not belong to the specified account")
    
    # Delete the task
    deleted = await task_service.delete_task(task_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete task")

@router.get("/count/total", response_model=dict)
async def get_task_count_api(
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id),
    status: Optional[str] = Query(default=None, description="Filter count by status")
):
    """
    Get the total count of tasks for the current user with optional filters.
    
    Returns:
        Dictionary with total count
    """
    # Validate status if provided
    valid_statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
    if status and status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status '{status}'. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    count = await task_service.get_task_count(
        user_id=current_user.id,
        account_id=account_id,
        status_filter=status
    )
    
    return {"total": count}

@router.patch("/{task_id}/status", response_model=TaskSchema)
async def update_task_status_api(
    task_id: str,
    status: str,
    progress: Optional[float] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """
    Update the status of a specific task.
    Only the owner of the task can update it.
    """
    if not task_id or not task_id.strip():
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
    
    # Validate status
    valid_statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status '{status}'. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    # Validate progress if provided
    if progress is not None and (progress < 0 or progress > 100):
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
    
    # First check if task exists and user has access
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")
    
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    # If account_id is provided, also check if task belongs to that account
    if account_id and task.account_id != account_id:
        raise HTTPException(status_code=403, detail="Task does not belong to the specified account")
    
    # Update the task status
    updated_task = await task_service.update_task_status(task_id, status, progress)
    if not updated_task:
        raise HTTPException(status_code=500, detail="Failed to update task status")
    
    return updated_task

@router.patch("/{task_id}/progress", response_model=TaskSchema)
async def update_task_progress_api(
    task_id: str,
    progress: float,
    message: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """
    Update the progress of a specific task.
    Only the owner of the task can update it.
    """
    if not task_id or not task_id.strip():
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
    
    # Validate progress
    if progress < 0 or progress > 100:
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
    
    # First check if task exists and user has access
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")
    
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    # If account_id is provided, also check if task belongs to that account
    if account_id and task.account_id != account_id:
        raise HTTPException(status_code=403, detail="Task does not belong to the specified account")
    
    # Update the task progress
    updated_task = await task_service.set_task_progress(task_id, progress, message)
    if not updated_task:
        raise HTTPException(status_code=500, detail="Failed to update task progress")
    
    return updated_task

@router.get("/queue/status")
async def get_queue_status_api(
    task_id: Optional[str] = Query(None, description="Optional task ID to get specific task status"),
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """Get current queue status or specific task status"""
    try:
        status = await task_queue_service.get_queue_status(task_id)
        return {"success": True, "data": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")

@router.get("/queue/list")
async def get_queue_list_api(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of items to return"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: UserInDB = Depends(get_current_active_user),
    account_id: Optional[str] = Depends(get_optional_account_id)
):
    """Get list of tasks in queue with filtering and pagination"""
    try:
        # Validate task_type if provided
        if task_type and not any(task_type == t.value for t in TaskType):
            raise HTTPException(status_code=400, detail=f"Invalid task type: {task_type}")
        
        tasks = await task_queue_service.get_queue_list(
            limit=limit,
            skip=skip,
            task_type=task_type,
            status=status
        )
        
        # Filter tasks by user_id and optionally account_id
        filtered_tasks = []
        for task in tasks:
            if task.get("user_id") == current_user.id:
                if account_id is None or task.get("account_id") == account_id:
                    filtered_tasks.append(task)
        
        return {
            "success": True,
            "data": {
                "tasks": filtered_tasks,
                "total": len(filtered_tasks),
                "limit": limit,
                "skip": skip
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get queue list: {str(e)}")

@router.get("/types")
async def get_supported_task_types():
    """Get list of supported task types and their configurations"""
    from app.services.task_processor_factory import TaskProcessorFactory
    from app.models.task_types import TASK_CONFIGS
    
    supported_types = TaskProcessorFactory.get_supported_task_types()
    
    return {
        "success": True,
        "data": {
            "supported_types": supported_types,
            "configurations": {
                task_type: {
                    "max_attempts": config.max_attempts,
                    "timeout_minutes": config.timeout_minutes,
                    "priority": config.priority.value,
                    "requires_credits": config.requires_credits,
                    "estimated_duration_minutes": config.estimated_duration_minutes
                }
                for task_type, config in TASK_CONFIGS.items()
                if task_type.value in supported_types
            }
        }
    }