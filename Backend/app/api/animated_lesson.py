from fastapi import APIRouter, HTTPException, Depends
import logging
from app.schemas.animated_lesson import AnimatedLessonRequest, AnimatedLessonResponse, AnimatedLessonData
from app.services.video_queue_service import video_queue_service
from app.services import task_service
from app.services.credit_service import deduct_credits_for_video
from app.api.users import get_current_active_user
from app.schemas.user import UserInDB as User
from app.api.dependencies import get_valid_account_id
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/generate", response_model=AnimatedLessonResponse)
async def generate_animated_lesson(
    request: AnimatedLessonRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Generate an animated lesson with browser-based animations"""
    # Credits based on the number of scenes requested
    try:
        lesson_info = request.title
        await deduct_credits_for_video(
            account_id=account_id,
            user_id=current_user.id,
            video_info=lesson_info,
            num_scenes=request.scenes  # Deduct credits based on number of scenes
        )
    except HTTPException as e:
        # If credit deduction fails, return the error immediately
        raise e
    except Exception as e:
        logger.error(f"Credit deduction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deduct credits: {str(e)}")

    # Use client provided task_id or generate a new one
    task_id = request.task_id or str(uuid.uuid4())    # Serialize the request data to store in task
    request_data = request.model_dump()
    
    # Add task type to request data
    request_data["task_type"] = "animated_lesson"  # Distinguish from regular video tasks
    request_data["render_mode"] = request.render_mode  # Ensure render mode is stored

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
        message=f"Animated lesson generation request received. {request.scenes} credits deducted.",
        status="PENDING",
        progress=0
    )

    # Add to processing queue with special animation type flag
    await video_queue_service.add_to_queue(
        task_id=task_id,
        request=request,
        user_id=current_user.id,
        account_id=account_id,
        task_type="animated_lesson"
    )

    # Return immediately with task ID
    response = AnimatedLessonResponse(
        success=True,
        data=AnimatedLessonData(
            task_id=task_id
        )
    )
    
    return response
