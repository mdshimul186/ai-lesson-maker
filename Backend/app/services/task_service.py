from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from pymongo import ReturnDocument

from app.db.mongodb_utils import get_collection
from app.schemas.task import Task, TaskEvent, TaskCreate

TASKS_COLLECTION = "tasks"

async def create_task(task_id: str, user_id: str, account_id: str, initial_status: str = "PENDING", request_data: Optional[Dict[str, Any]] = None) -> Task:
    """
    Create a new task or return existing one if task_id already exists.
    """
    collection = await get_collection(TASKS_COLLECTION)
    existing_task = await collection.find_one({"task_id": task_id})
    
    if existing_task:
        # Return existing task for idempotency
        return Task(**existing_task)

    task_data = Task(
        task_id=task_id,
        user_id=user_id,
        account_id=account_id,
        status=initial_status,
        progress=0.0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        request_data=request_data,  # Store the complete request body for video generation

        events=[TaskEvent(message=f"Task {initial_status.lower()}")]
    )
    
    try:
        await collection.insert_one(task_data.model_dump(by_alias=True))
        return task_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

async def get_task(task_id: str) -> Optional[Task]:
    """
    Retrieve a task by its ID.
    """
    try:
        collection = await get_collection(TASKS_COLLECTION)
        task_data = await collection.find_one({"task_id": task_id})
        if task_data:
            return Task(**task_data)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve task: {str(e)}")

async def add_task_event(
    task_id: str, 
    message: str, 
    details: Optional[Dict[str, Any]] = None, 
    status: Optional[str] = None, 
    progress: Optional[float] = None
) -> Optional[Task]:
    """
    Add an event to a task and optionally update status and progress.
    """
    try:
        collection = await get_collection(TASKS_COLLECTION)
        
        # Create the event
        event = TaskEvent(message=message, details=details)
        
        update_fields = {
            '$push': {'events': event.model_dump(by_alias=True)},
            '$set': {'updated_at': datetime.utcnow()}
        }
        
        if status:
            update_fields['$set']['status'] = status
        if progress is not None:
            update_fields['$set']['progress'] = progress

        result = await collection.find_one_and_update(
            {'task_id': task_id},
            update_fields,
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            return Task(**result)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add task event: {str(e)}")

async def update_task_status(task_id: str, status: str, progress: Optional[float] = None) -> Optional[Task]:
    """
    Update task status with an event message.
    """
    return await add_task_event(
        task_id=task_id, 
        message=f"Status changed to {status.lower()}", 
        status=status, 
        progress=progress
    )

async def set_task_progress(task_id: str, progress: float, message: Optional[str] = None) -> Optional[Task]:
    """
    Update task progress with an optional custom message.
    """
    event_message = message or f"Progress updated to {progress}%"
    return await add_task_event(task_id=task_id, message=event_message, progress=progress)

async def set_task_completed(
    task_id: str, 
    result_url: str, 
    task_folder_content: Optional[Dict[str, Any]] = None, 
    final_message: str = "Task completed successfully"
) -> Optional[Task]:
    """
    Mark a task as completed with result URL and optional folder content.
    """
    try:
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
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            return Task(**result)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete task: {str(e)}")

async def set_task_failed(
    task_id: str, 
    error_message: str, 
    error_details: Optional[Dict[str, Any]] = None, 
    task_folder_content: Optional[Dict[str, Any]] = None, 
    final_message: Optional[str] = None
) -> Optional[Task]:
    """
    Mark a task as failed with error details and optional folder content.
    """
    try:
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
        
        result = await collection.find_one_and_update(
            {'task_id': task_id},
            update,
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            return Task(**result)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark task as failed: {str(e)}")

async def get_all_tasks(
    user_id: str, 
    account_id: Optional[str] = None, 
    limit: int = 100, 
    skip: int = 0, 
    status_filter: Optional[str] = None
) -> List[Task]:
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
    try:
        collection = await get_collection(TASKS_COLLECTION)
        
        # Build the query based on filters
        query = {"user_id": user_id}  # Always filter by user_id
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tasks: {str(e)}")

async def delete_task(task_id: str, user_id: str) -> bool:
    """
    Delete a task if it belongs to the specified user.
    
    Args:
        task_id: The ID of the task to delete
        user_id: The ID of the user (for authorization)
        
    Returns:
        True if task was deleted, False if not found
    """
    try:
        collection = await get_collection(TASKS_COLLECTION)
        result = await collection.delete_one({"task_id": task_id, "user_id": user_id})
        return result.deleted_count > 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")

async def get_task_count(user_id: str, account_id: Optional[str] = None, status_filter: Optional[str] = None) -> int:
    """
    Get the total count of tasks for a user with optional filters.
    
    Args:
        user_id: The ID of the user whose tasks to count
        account_id: Optional account filter
        status_filter: Optional status filter
        
    Returns:
        Total count of matching tasks
    """
    try:
        collection = await get_collection(TASKS_COLLECTION)
        
        query = {"user_id": user_id}
        if account_id:
            query["account_id"] = account_id
        if status_filter:
            query["status"] = status_filter
            
        return await collection.count_documents(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to count tasks: {str(e)}")


class TaskService:
    """
    Task service class for compatibility with existing imports.
    Wraps the async functions for use in other services.
    """
    @staticmethod
    async def create_task(task_id: str, user_id: str, account_id: str, initial_status: str = "PENDING", request_data: Optional[Dict[str, Any]] = None) -> Task:
        return await create_task(task_id, user_id, account_id, initial_status, request_data)

    @staticmethod
    async def get_task(task_id: str) -> Optional[Task]:
        return await get_task(task_id)
    
    @staticmethod
    async def add_task_event(task_id: str, message: str, details: Optional[Dict[str, Any]] = None, 
                           status: Optional[str] = None, progress: Optional[float] = None) -> Optional[Task]:
        return await add_task_event(task_id, message, details, status, progress)
    
    @staticmethod
    async def update_task_status(task_id: str, status: str, progress: Optional[float] = None) -> Optional[Task]:
        return await update_task_status(task_id, status, progress)
    
    @staticmethod
    async def set_task_progress(task_id: str, progress: float, message: Optional[str] = None) -> Optional[Task]:
        return await set_task_progress(task_id, progress, message)
    
    @staticmethod
    async def set_task_completed(task_id: str, result_url: str, 
                               task_folder_content: Optional[Dict[str, Any]] = None, 
                               final_message: str = "Task completed successfully") -> Optional[Task]:
        return await set_task_completed(task_id, result_url, task_folder_content, final_message)
    
    @staticmethod
    async def set_task_failed(task_id: str, error_message: str, 
                            error_details: Optional[Dict[str, Any]] = None, 
                            task_folder_content: Optional[Dict[str, Any]] = None, 
                            final_message: Optional[str] = None) -> Optional[Task]:
        return await set_task_failed(task_id, error_message, error_details, task_folder_content, final_message)
    
    @staticmethod
    async def get_all_tasks(user_id: str, account_id: Optional[str] = None, 
                          limit: int = 100, skip: int = 0, 
                          status_filter: Optional[str] = None) -> List[Task]:
        return await get_all_tasks(user_id, account_id, limit, skip, status_filter)
    
    @staticmethod
    async def delete_task(task_id: str, user_id: str) -> bool:
        return await delete_task(task_id, user_id)
    
    @staticmethod
    async def get_task_count(user_id: str, account_id: Optional[str] = None, 
                           status_filter: Optional[str] = None) -> int:
        return await get_task_count(user_id, account_id, status_filter)