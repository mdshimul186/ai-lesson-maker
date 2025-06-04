from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging
import uuid
from app.services.task_queue_service import task_queue_service
from app.services import task_service
from app.api.users import get_current_active_user
from app.schemas.user import UserInDB as User
from app.api.dependencies import get_valid_account_id
from app.models.task_types import TaskType

logger = logging.getLogger(__name__)

router = APIRouter()

# Request/Response models
class StoryGenerationRequest(BaseModel):
    prompt: str
    story_type: str = "adventure"  # adventure, mystery, comedy, educational, etc.
    target_audience: str = "children"  # children, teenagers, adults
    language: str = "en"
    length: str = "medium"  # short, medium, long
    task_id: Optional[str] = None

class StoryGenerationResponse(BaseModel):
    success: bool
    task_id: str
    message: str = "Story generation started"

@router.post("/generate", response_model=StoryGenerationResponse)
async def generate_story(
    request: StoryGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Generate a story based on the provided parameters"""
    try:
        # Generate task ID
        task_id = request.task_id or str(uuid.uuid4())
        
        # Serialize request data
        request_data = request.model_dump()
        
        # Create task
        await task_service.create_task(
            task_id=task_id,
            user_id=current_user.id,
            account_id=account_id,
            initial_status="PENDING",
            request_data=request_data
        )
        
        await task_service.add_task_event(
            task_id=task_id,
            message=f"Story generation request received for {request.story_type} story",
            status="PENDING",
            progress=0
        )
        
        # Add to queue
        await task_queue_service.add_to_queue(
            task_id=task_id,
            request_data=request_data,
            user_id=current_user.id,
            account_id=account_id,
            task_type=TaskType.STORY_GENERATION.value
        )
        
        return StoryGenerationResponse(
            success=True,
            task_id=task_id
        )
        
    except Exception as e:
        logger.error(f"Story generation request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start story generation: {str(e)}")
