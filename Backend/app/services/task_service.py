from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException

from app.db.mongodb_utils import get_collection
from app.schemas.task import Task, TaskEvent, TaskCreate

TASKS_COLLECTION = "tasks"

async def create_task(task_id: str, user_id: str, account_id: str, initial_status: str = "PENDING") -> Task:
    collection = await get_collection(TASKS_COLLECTION)
    existing_task = await collection.find_one({"task_id": task_id})
    if existing_task:
        # Decide if this should be an error or if we should return the existing task
        # For now, let's assume task_id should be unique for new creations initiated via API
        # However, video generation might re-use task_id if it's passed in request.
        # Let's opt for an update/upsert approach or clear error.
        # For simplicity now, if it exists, we'll just fetch and return it, assuming it might be a retry.
        # A more robust system might differentiate between a client-provided task_id (for idempotency)
        # and a server-generated one.
        return Task(**existing_task)


    task_data = Task(
        task_id=task_id,
        user_id=user_id,
        account_id=account_id,
        status=initial_status,
        events=[TaskEvent(message=f"Task {initial_status.lower()}")]
    )
    await collection.insert_one(task_data.model_dump(by_alias=True))
    return task_data

async def get_task(task_id: str) -> Optional[Task]:
    collection = await get_collection(TASKS_COLLECTION)
    task_data = await collection.find_one({"task_id": task_id})
    if task_data:
        return Task(**task_data)
    return None

async def add_task_event(task_id: str, message: str, details: Optional[Dict[str, Any]] = None, status: Optional[str] = None, progress: Optional[float] = None) -> Optional[Task]:
    collection = await get_collection(TASKS_COLLECTION)
    
    update_fields = {
        '$push': {'events': TaskEvent(message=message, details=details).model_dump(by_alias=True)},
        '$set': {'updated_at': datetime.utcnow()}
    }
    if status:
        update_fields['$set']['status'] = status
    if progress is not None:
        update_fields['$set']['progress'] = progress

    result = await collection.find_one_and_update(
        {'task_id': task_id},
        update_fields,
        return_document=True # Use pymongo.ReturnDocument.AFTER
    )
    if result:
        return Task(**result)
    return None

async def update_task_status(task_id: str, status: str, progress: Optional[float] = None) -> Optional[Task]:
    return await add_task_event(task_id=task_id, message=f"Status changed to {status.lower()}", status=status, progress=progress)

async def set_task_progress(task_id: str, progress: float, message: Optional[str] = None) -> Optional[Task]:
    event_message = message or f"Progress updated to {progress}%"
    return await add_task_event(task_id=task_id, message=event_message, progress=progress)


async def set_task_completed(task_id: str, result_url: str, task_folder_content: Optional[Dict[str, Any]] = None, final_message: str = "Task completed successfully") -> Optional[Task]:
    collection = await get_collection(TASKS_COLLECTION)
    event = TaskEvent(message=final_message)
    update = {
        '$set': {
            'status': "COMPLETED",
            'progress': 100.0,
            'result_url': result_url,
            'updated_at': datetime.utcnow(),
            'error_message': None,
            'error_details': None
        },
        '$push': {'events': event.model_dump(by_alias=True)}
    }
    
    # Add task_folder_content to update if provided
    if task_folder_content:
        update['$set']['task_folder_content'] = task_folder_content
        
    result = await collection.find_one_and_update(
        {'task_id': task_id},
        update,
        return_document=True
    )
    if result:
        return Task(**result)
    return None

async def set_task_failed(task_id: str, error_message: str, error_details: Optional[Dict[str, Any]] = None, task_folder_content: Optional[Dict[str, Any]] = None, final_message: Optional[str] = None) -> Optional[Task]:
    collection = await get_collection(TASKS_COLLECTION)
    if not final_message:
        final_message = f"Task failed: {error_message}"
    event = TaskEvent(message=final_message, details=error_details)
    update = {
        '$set': {
            'status': "FAILED",
            'error_message': error_message,
            'error_details': error_details,
            'updated_at': datetime.utcnow()
        },
        '$push': {'events': event.model_dump(by_alias=True)}
    }
    
    # Add task_folder_content to update if provided
    if task_folder_content:
        update['$set']['task_folder_content'] = task_folder_content
    
    # If progress was 100 but it failed at a final step, keep it 100, otherwise it might be less.
    # For now, we don't explicitly set progress on failure unless it was already part of an event.
    
    result = await collection.find_one_and_update(
        {'task_id': task_id},
        update,
        return_document=True
    )
    if result:
        return Task(**result)
    return None

async def get_all_tasks(user_id: str, account_id: Optional[str] = None, limit: int = 100, skip: int = 0, status_filter: Optional[str] = None) -> List[Task]:
    """
    Retrieve all tasks for a given user and optionally account, with pagination and status filtering.
    
    Args:
        user_id: The ID of the user whose tasks to retrieve.
        account_id: Optional. The ID of the account whose tasks to retrieve.
        limit: Maximum number of tasks to return
        skip: Number of tasks to skip (for pagination)
        status_filter: Optional filter to only return tasks with a specific status
        
    Returns:
        List of Task objects
    """
    collection = await get_collection(TASKS_COLLECTION)
    
    # Build the query based on filters
    query = {"user_id": user_id} # Always filter by user_id
    if account_id:
        query["account_id"] = account_id
    if status_filter:
        query["status"] = status_filter
    
    # Execute the query with pagination
    cursor = collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    
    # Convert MongoDB results to Task objects
    tasks = []
    async for task_data in cursor:
        tasks.append(Task(**task_data))
    
    return tasks

