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
    task_source_name: Optional[str] = Field(default=None, description="Name of the source that created the task")
    task_source_id: Optional[str] = Field(default=None, description="Identifier of the source that created the task")
    task_source_group_id: Optional[str] = Field(default=None, description="Group identifier for related tasks")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda dt: dt.isoformat()}
    }

class TaskCreate(BaseModel):
    task_id: Optional[str] = Field(default=None, description="Unique identifier for the task. If not provided, will be auto-generated.")
    task_type: Optional[str] = Field(default="video", description="Type of task")
    priority: Optional[str] = Field(default="normal", description="Task priority")
    request_data: Optional[Dict[str, Any]] = None
    task_source_name: Optional[str] = None
    task_source_id: Optional[str] = None
    task_source_group_id: Optional[str] = None

class TaskBulkCreate(BaseModel):
    tasks: List[TaskCreate] = Field(..., description="List of tasks to create")
    # Optional shared settings for video tasks (like /video/generate API)
    logo_url: Optional[str] = Field(default=None, description="Logo URL to apply to all video tasks")
    intro_video_url: Optional[str] = Field(default=None, description="Intro video URL to apply to all video tasks")
    outro_video_url: Optional[str] = Field(default=None, description="Outro video URL to apply to all video tasks")

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

class TaskBulkRegenerate(BaseModel):
    task_ids: List[str] = Field(..., description="List of task IDs to regenerate")
    reset_to_pending: bool = Field(default=True, description="Whether to reset tasks to PENDING status before regenerating")
    force: bool = Field(default=False, description="Force regeneration even if tasks are currently processing")
    # Optional intro/outro/logo overrides for video tasks (like /video/generate API)
    logo_url: Optional[str] = Field(default=None, description="Override logo URL for video tasks")
    intro_video_url: Optional[str] = Field(default=None, description="Override intro video URL for video tasks")
    outro_video_url: Optional[str] = Field(default=None, description="Override outro video URL for video tasks")

class TaskBulkCancel(BaseModel):
    task_ids: List[str] = Field(..., description="List of task IDs to cancel")
    reason: Optional[str] = Field(default="Bulk cancellation requested", description="Reason for cancellation")
