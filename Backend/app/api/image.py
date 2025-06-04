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
class ImageGenerationRequest(BaseModel):
    prompt: str
    style: str = "realistic"  # realistic, artistic, cartoon, photographic, etc.
    resolution: str = "1024x1024"  # 512x512, 1024x1024, 1024x1792, etc.
    num_images: int = 1  # Number of images to generate
    quality: str = "standard"  # draft, standard, high
    task_id: Optional[str] = None

class ImageGenerationResponse(BaseModel):
    success: bool
    task_id: str
    message: str = "Image generation started"

@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Generate images based on the provided prompt and parameters"""
    try:
        # Validate request
        if not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        if request.num_images < 1 or request.num_images > 10:
            raise HTTPException(status_code=400, detail="Number of images must be between 1 and 10")
        
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
            message=f"Image generation request received for {request.num_images} image(s)",
            status="PENDING",
            progress=0
        )
        
        # Add to queue
        await task_queue_service.add_to_queue(
            task_id=task_id,
            request_data=request_data,
            user_id=current_user.id,
            account_id=account_id,
            task_type=TaskType.IMAGE_GENERATION.value
        )
        
        return ImageGenerationResponse(
            success=True,
            task_id=task_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start image generation: {str(e)}")
