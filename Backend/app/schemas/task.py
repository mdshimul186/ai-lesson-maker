from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class TaskEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: str
    details: Optional[Dict[str, Any]] = None

    model_config = {
        "json_encoders": {
            datetime: lambda dt: dt.isoformat()
        }
    }

class Task(BaseModel):
    task_id: str = Field(..., description="Unique identifier for the task")
    user_id: str = Field(..., description="Identifier of the user who created the task")
    account_id: str = Field(..., description="Identifier of the account associated with the task")
    task_type: Optional[str] = Field(default="video", description="Type of task (video, animated_lesson, documentation, quiz, etc.)")
    priority: Optional[str] = Field(default="normal", description="Task priority (low, normal, high, urgent)")
    status: str = Field(default="PENDING", description="Current status of the task (e.g., PENDING, PROCESSING, COMPLETED, FAILED)")
    events: List[TaskEvent] = Field(default_factory=list, description="Chronological list of events that occurred during the task execution")
    progress: Optional[float] = Field(default=0.0, ge=0, le=100, description="Overall task progress percentage")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    result_url: Optional[str] = None # e.g., URL to the final video or S3 folder
    task_folder_content: Optional[Dict[str, Any]] = None # Full task folder content stored in DB
    error_message: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    request_data: Optional[Dict[str, Any]] = None # Store the complete request body for video generation
    estimated_completion: Optional[datetime] = None # Estimated completion time

    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda dt: dt.isoformat()}
    }

class TaskCreate(BaseModel):
    task_id: str

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    event_message: Optional[str] = None
    event_details: Optional[Dict[str, Any]] = None
    progress: Optional[float] = None
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class QueueStatus(BaseModel):
    task_id: Optional[str] = None
    status: Optional[str] = None
    position: Optional[int] = None
    created_at: Optional[datetime] = None
    attempts: Optional[int] = None
    current_processing: Optional[str] = None
    total_queued: Optional[int] = None
    total_processing: Optional[int] = None
    is_processing: Optional[bool] = None

class QueueItem(BaseModel):
    task_id: str
    user_id: str
    account_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    attempts: int = 0
    last_error: Optional[str] = None
