from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import asyncio
import uuid

from app.schemas.task import Task as TaskSchema, TaskCreate, TaskBulkCreate
from app.services import task_service
from app.services.task_queue_service import task_queue_service  # Updated import
from app.api.users import get_current_active_user  # Import dependency
from app.schemas.user import UserInDB  # Import UserInDB
from app.api.dependencies import get_optional_account_id, get_valid_account_id_unified, get_auth_context  # Import account dependency
from app.models.task_types import TaskType

router = APIRouter()

@router.get("/{task_id}", response_model=TaskSchema)
async def get_task_status_api(
    task_id: str, 
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Retrieve the status and details of a specific task.
    Supports both Bearer token + X-Account-ID header and X-API-Key authentication.
    Ensures the task belongs to the specified account.
    """
    if not task_id or not task_id.strip():
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
    
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")
    
    # Extract user info from auth context (for potential future use)
    user, api_key_account_id = auth_context
    
    # Check if task belongs to the account
    if task.account_id != account_id:
        raise HTTPException(status_code=403, detail="Task does not belong to the specified account")
    
    return task

@router.get("/")
async def get_all_tasks_api(
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context),
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of tasks to return"),
    skip: int = Query(default=0, ge=0, description="Number of tasks to skip for pagination"),
    status: Optional[str] = Query(default=None, description="Filter tasks by status (PENDING, PROCESSING, COMPLETED, FAILED)"),
    task_source_group_id: Optional[str] = Query(default=None, description="Filter tasks by group ID"),
    task_source_ids: Optional[str] = Query(default=None, description="Comma-separated list of source IDs to filter tasks by"),
    task_ids: Optional[str] = Query(default=None, description="Comma-separated list of task IDs to retrieve specific tasks")
):
    """
    Retrieve all tasks for the current account with pagination and total count, optionally filtered by status, group ID, source IDs, and specific task IDs.
    Supports both Bearer token + X-Account-ID header and X-API-Key authentication.
    
    Args:
        account_id: Account ID from unified auth (Bearer token header or decoded from API key).
        auth_context: Authentication context containing user and API key account info.
        limit: Maximum number of tasks to return (default 100, max 1000)
        skip: Number of tasks to skip for pagination
        status: Optional filter for task status (e.g. PENDING, PROCESSING, COMPLETED, FAILED)
        task_source_group_id: Optional filter for task group ID
        task_source_ids: Optional comma-separated list of source IDs to filter tasks by
        task_ids: Optional comma-separated list of task IDs to retrieve specific tasks
        
    Returns:
        Object containing tasks list and total count
    """
    # Validate status if provided
    valid_statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
    if status and status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status '{status}'. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    # Parse task_source_ids if provided
    source_ids_list = None
    if task_source_ids:
        # Split comma-separated values and strip whitespace
        source_ids_list = [sid.strip() for sid in task_source_ids.split(',') if sid.strip()]
        if not source_ids_list:
            raise HTTPException(
                status_code=400, 
                detail="task_source_ids parameter cannot be empty if provided"
            )
    
    # Parse task_ids if provided
    task_ids_list = None
    if task_ids:
        # Split comma-separated values and strip whitespace
        task_ids_list = [tid.strip() for tid in task_ids.split(',') if tid.strip()]
        if not task_ids_list:
            raise HTTPException(
                status_code=400, 
                detail="task_ids parameter cannot be empty if provided"
            )
    
    # Get tasks and total count in parallel for better performance
    tasks, total_count = await asyncio.gather(
        task_service.get_all_tasks(
            account_id=account_id, 
            limit=limit, 
            skip=skip, 
            status_filter=status,
            task_source_group_id=task_source_group_id,
            task_source_ids=source_ids_list,
            task_ids=task_ids_list
        ),
        task_service.get_task_count(
            account_id=account_id,
            status_filter=status,
            task_source_group_id=task_source_group_id,
            task_source_ids=source_ids_list,
            task_ids=task_ids_list
        )
    )
    
    return {
        "tasks": tasks,
        "total": total_count,
        "limit": limit,
        "skip": skip
    }

@router.post("/", response_model=TaskSchema, status_code=201)
async def create_new_task_api(
    task_create: TaskCreate,
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Create a new task.
    If task_id is not provided, a UUID will be auto-generated.
    Supports both Bearer token + X-Account-ID header and X-API-Key authentication.    """
    # Auto-generate task ID if not provided
    if not task_create.task_id or not task_create.task_id.strip():
        task_create.task_id = str(uuid.uuid4())
        print(f"🔧 Auto-generated task ID: {task_create.task_id}")
    
    # Extract user info from auth context
    user, api_key_account_id = auth_context
    user_id = user.id if user else None  # For API key auth, user_id might be None
    
    # Use account_id from unified auth
    final_account_id = account_id
    
    # Prepare request_data with any necessary transformations
    request_data = task_create.request_data.copy() if task_create.request_data else None    # No field transformations needed - use original field names
    # Quiz processor will use: story_prompt, num_questions, difficulty
    
    task = await task_service.create_task(
        task_id=task_create.task_id,
        user_id=user_id or f"api_key_user_{final_account_id}",
        account_id=final_account_id,
        initial_status="PENDING",
        request_data=request_data,
        task_type=task_create.task_type or "video",
        priority=task_create.priority or "normal",
        task_source_name=task_create.task_source_name,
        task_source_id=task_create.task_source_id,
        task_source_group_id=task_create.task_source_group_id
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
    status: Optional[str] = Query(default=None, description="Filter count by status"),
    task_source_group_id: Optional[str] = Query(default=None, description="Filter count by group ID")
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
        status_filter=status,
        task_source_group_id=task_source_group_id
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
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Get current queue status or specific task status.
    """
    try:
        status = await task_queue_service.get_queue_status(task_id)
        return {"success": True, "data": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")

@router.post("/queue/start")
async def start_queue_processing_api(
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Manually start queue processing (for debugging).
    """
    try:
        await task_queue_service.start_processing()
        return {"success": True, "message": "Queue processing started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start queue processing: {str(e)}")

@router.get("/queue/list")
async def get_queue_list_api(
    limit: int = Query(50, description="Maximum number of queue items to return"),
    skip: int = Query(0, description="Number of queue items to skip"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Get list of tasks in queue with filtering.
    """
    try:
        queue_items = await task_queue_service.get_queue_list(
            limit=limit,
            skip=skip,
            task_type=task_type,
            status=status
        )
        return {"success": True, "data": queue_items}
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

@router.post("/bulk", response_model=List[TaskSchema], status_code=201)
async def create_bulk_tasks_api(
    bulk_request: TaskBulkCreate,
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Create multiple tasks in bulk.
    Supports both Bearer token + X-Account-ID header and X-API-Key authentication.
    """
    if not bulk_request.tasks or len(bulk_request.tasks) == 0:
        raise HTTPException(status_code=400, detail="At least one task is required")
    
    if len(bulk_request.tasks) > 200:  # Limit bulk operations
        raise HTTPException(status_code=400, detail="Maximum 200 tasks allowed per bulk request")
      # Extract user info from auth context
    user, api_key_account_id = auth_context
    user_id = user.id if user else None  # For API key auth, user_id might be None
    
    # account_id is now guaranteed to be available from unified auth
    final_account_id = account_id
    
    # Auto-generate task IDs for tasks that don't have them
    generated_task_ids = []
    for task in bulk_request.tasks:
        if not task.task_id or not task.task_id.strip():
            # Generate a new UUID-based task ID
            generated_id = str(uuid.uuid4())
            task.task_id = generated_id
            generated_task_ids.append(generated_id)
            print(f"🔧 Auto-generated task ID: {generated_id}")
      # Validate all task IDs are unique after auto-generation
    task_ids = [task.task_id for task in bulk_request.tasks]
    if len(task_ids) != len(set(task_ids)):
        raise HTTPException(status_code=400, detail="Duplicate task IDs found after auto-generation")
    
    # Validate request_data for each task based on task type
    for task in bulk_request.tasks:
        if task.request_data:
            task_type = task.task_type or "video"
            
            # Validate video tasks
            if task_type == "video":
                if "segments" in task.request_data:
                    segments = task.request_data["segments"]
                    # segments can be integer (1-50) or string "maximum"
                    if isinstance(segments, int):
                        if segments < 1 or segments > 50:
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Video task {task.task_id}: segments must be between 1 and 50"
                            )
                    elif isinstance(segments, str):
                        if segments != "maximum":
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Video task {task.task_id}: segments string must be 'maximum'"
                            )
                    else:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Video task {task.task_id}: segments must be integer (1-50) or 'maximum'"
                        )            # Validate quiz tasks
            elif task_type == "quiz":
                required_fields = ["story_prompt", "difficulty"]
                for field in required_fields:
                    if field not in task.request_data:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Quiz task {task.task_id}: missing required field '{field}'"
                        )
                
                # Validate difficulty level
                valid_difficulties = ["easy", "medium", "hard"]
                if task.request_data["difficulty"] not in valid_difficulties:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Quiz task {task.task_id}: difficulty must be one of {valid_difficulties}"
                    )
                
                # Validate number of questions if provided
                if "num_questions" in task.request_data:
                    num_questions = task.request_data["num_questions"]
                    if not isinstance(num_questions, int) or num_questions < 1 or num_questions > 50:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Quiz task {task.task_id}: num_questions must be integer between 1 and 50"
                        )    # Prepare tasks data for bulk creation
    tasks_data = []
    for task in bulk_request.tasks:
        # Prepare request_data with any necessary transformations
        request_data = task.request_data.copy() if task.request_data else None        # No field transformations needed - use original field names
        # Quiz processor will use: story_prompt, num_questions, difficulty
        
        task_data = {
            "task_id": task.task_id,
            "task_type": task.task_type or "video",
            "priority": task.priority or "normal",
            "request_data": request_data,
            "task_source_name": task.task_source_name,
            "task_source_id": task.task_source_id,
            "task_source_group_id": task.task_source_group_id
        }
        tasks_data.append(task_data)# Create tasks in bulk
    created_tasks = await task_service.create_bulk_tasks(
        tasks_data=tasks_data,
        user_id=user_id,
        account_id=final_account_id
    )
    
    # Add each created task to the processing queue
    queue_successes = 0
    queue_failures = 0
    
    for task in created_tasks:
        try:
            # Validate that task has request_data for processing
            if not task.request_data:
                print(f"⚠️ Warning: Task {task.task_id} has no request_data, skipping queue addition")
                await task_service.add_task_event(
                    task_id=task.task_id,
                    message="Task created but not queued - missing request_data",
                    status="PENDING"
                )
                continue
                
            print(f"📋 Adding task {task.task_id} (type: {task.task_type}) to processing queue...")
            await task_queue_service.add_to_queue(
                task_id=task.task_id,
                request_data=task.request_data,
                user_id=user_id or f"api_key_user_{final_account_id}",
                account_id=final_account_id,
                task_type=task.task_type,
                priority=task.priority
            )
            queue_successes += 1
            print(f"✅ Task {task.task_id} successfully added to queue")
            
        except Exception as e:
            queue_failures += 1
            error_msg = f"Failed to add task {task.task_id} to queue: {str(e)}"
            print(f"❌ {error_msg}")
            
            # Update task status to indicate queue failure
            await task_service.add_task_event(
                task_id=task.task_id,
                message=error_msg,
                status="FAILED"
            )
    
    print(f"📊 Bulk task queue summary: {queue_successes} successes, {queue_failures} failures")
    
    return created_tasks

@router.post("/requeue-pending")
async def requeue_pending_tasks_api(
    account_id: str = Depends(get_valid_account_id_unified),
    auth_context: tuple = Depends(get_auth_context)
):
    """
    Find pending tasks and add them to the processing queue.
    Useful for fixing tasks that were created before the queue fix.
    """
    try:
        # Get all pending tasks
        pending_tasks = await task_service.get_all_tasks(
            account_id=account_id,
            status_filter="PENDING",
            limit=1000
        )
        
        if not pending_tasks:
            return {
                "success": True, 
                "message": "No pending tasks found",
                "requeued_count": 0
            }
        
        requeued_count = 0
        failed_count = 0
        
        for task in pending_tasks:
            try:
                # Skip tasks without request_data
                if not task.request_data:
                    print(f"⚠️ Skipping task {task.task_id} - no request_data")
                    continue
                
                # Check if already in queue
                queue_status = await task_queue_service.get_queue_status(task.task_id)
                if queue_status.get("status") != "NOT_FOUND":
                    print(f"⚠️ Task {task.task_id} already in queue with status: {queue_status.get('status')}")
                    continue
                
                # Add to queue
                print(f"📋 Re-queueing task {task.task_id}...")
                await task_queue_service.add_to_queue(
                    task_id=task.task_id,
                    request_data=task.request_data,
                    user_id=task.user_id,
                    account_id=task.account_id,
                    task_type=task.task_type,
                    priority=task.priority
                )
                
                requeued_count += 1
                print(f"✅ Task {task.task_id} requeued successfully")
                
            except Exception as e:
                failed_count += 1
                print(f"❌ Failed to requeue task {task.task_id}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Requeued {requeued_count} pending tasks, {failed_count} failures",
            "requeued_count": requeued_count,
            "failed_count": failed_count,
            "total_pending": len(pending_tasks)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to requeue pending tasks: {str(e)}")