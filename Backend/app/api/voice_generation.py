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
class VoiceGenerationRequest(BaseModel):
    text: str
    voice_name: str = "en-US-AriaNeural"
    language: str = "en"
    rate: float = 1.0  # Speech rate (0.5 to 2.0)
    pitch: float = 0.0  # Pitch adjustment (-50 to +50)
    volume: float = 1.0  # Volume (0.0 to 1.0)
    output_format: str = "mp3"  # mp3, wav, ogg
    task_id: Optional[str] = None

class VoiceGenerationResponse(BaseModel):
    success: bool
    task_id: str
    message: str = "Voice generation started"

@router.post("/generate", response_model=VoiceGenerationResponse)
async def generate_voice(
    request: VoiceGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Generate voice audio from text using text-to-speech"""
    try:
        # Validate request
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(request.text) > 10000:
            raise HTTPException(status_code=400, detail="Text is too long (maximum 10,000 characters)")
        
        if request.rate < 0.5 or request.rate > 2.0:
            raise HTTPException(status_code=400, detail="Rate must be between 0.5 and 2.0")
        
        if request.volume < 0.0 or request.volume > 1.0:
            raise HTTPException(status_code=400, detail="Volume must be between 0.0 and 1.0")
        
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
            message=f"Voice generation request received for {len(request.text)} characters",
            status="PENDING",
            progress=0
        )
        
        # Add to queue
        await task_queue_service.add_to_queue(
            task_id=task_id,
            request_data=request_data,
            user_id=current_user.id,
            account_id=account_id,
            task_type=TaskType.VOICE_GENERATION.value
        )
        
        return VoiceGenerationResponse(
            success=True,
            task_id=task_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice generation request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start voice generation: {str(e)}")
