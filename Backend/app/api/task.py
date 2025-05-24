from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.schemas.task import Task as TaskSchema
from app.services import task_service
from app.api.users import get_current_active_user # Import dependency
from app.schemas.user import UserInDB # Import UserInDB

router = APIRouter()

@router.get("/{task_id}", response_model=TaskSchema)
async def get_task_status_api(task_id: str, current_user: UserInDB = Depends(get_current_active_user)):
    """
    Retrieve the status and details of a specific task.
    Ensures the task belongs to the current user.
    """
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found.")
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this task")
    return task

@router.get("/", response_model=List[TaskSchema])
async def get_all_tasks_api(current_user: UserInDB = Depends(get_current_active_user), account_id: Optional[str] = None, limit: int = 100, skip: int = 0, status: Optional[str] = None):
    """
    Retrieve all tasks for the current user, optionally filtered by account_id and status.
    
    Args:
        current_user: The currently authenticated user.
        account_id: Optional filter for account ID.
        limit: Maximum number of tasks to return (default 100)
        skip: Number of tasks to skip for pagination
        status: Optional filter for task status (e.g. PENDING, PROCESSING, COMPLETED, FAILED)
        
    Returns:
        List of Task objects
    """
    return await task_service.get_all_tasks(user_id=current_user.id, account_id=account_id, limit=limit, skip=skip, status_filter=status)

# Example of how you might create a task initially if needed directly via API
# (though in your flow, it's likely created by the video generation process)
# @router.post("/", response_model=TaskSchema, status_code=201)
# async def create_new_task_api(task_create: TaskCreateSchema):
#     """
#     Create a new task.
#     """
#     task = await task_service.create_task(task_id=task_create.task_id)
#     if not task: # Should not happen if create_task raises an error on conflict or handles it
#         raise HTTPException(status_code=500, detail="Failed to create task")
#     return task
