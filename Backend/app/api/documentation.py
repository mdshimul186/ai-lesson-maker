from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.services.task_queue_service import task_queue_service
from app.services import task_service
from app.api.users import get_current_active_user
from app.schemas.user import UserInDB as User
from app.api.dependencies import get_valid_account_id
from app.models.task_types import TaskType, TASK_CONFIGS
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class DocumentationRequest(BaseModel):
    content: str = Field(..., description="Content to generate documentation from")
    title: Optional[str] = Field(None, description="Title for the documentation")
    format: str = Field(default="markdown", description="Output format (markdown, pdf, html)")
    language: str = Field(default="en", description="Language for the documentation")
    task_id: Optional[str] = None

class DocumentationResponse(BaseModel):
    success: bool
    task_id: str
    message: str

@router.post("/generate", response_model=DocumentationResponse)
async def generate_documentation(
    request: DocumentationRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Generate documentation from provided content"""
    try:
        # Use client provided task_id or generate a new one
        task_id = request.task_id or str(uuid.uuid4())
        
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
            message="Documentation generation request received",
            status="PENDING",
            progress=0
        )
        
        # Add to processing queue
        await task_queue_service.add_to_queue(
            task_id=task_id,
            request_data=request_data,
            user_id=current_user.id,
            account_id=account_id,
            task_type=TaskType.DOCUMENTATION.value
        )
        
        return DocumentationResponse(
            success=True,
            task_id=task_id,
            message="Documentation generation started successfully"
        )
        
    except Exception as e:
        logger.error(f"Documentation generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start documentation generation: {str(e)}")
