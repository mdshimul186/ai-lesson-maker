from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from app.services.task_queue_service import task_queue_service
from app.services import task_service
from app.api.users import get_current_active_user
from app.schemas.user import UserInDB as User
from app.api.dependencies import get_valid_account_id
from app.models.task_types import TaskType
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class QuizRequest(BaseModel):
    topic: str = Field(..., description="Topic for the quiz")
    question_count: int = Field(..., ge=1, le=50, description="Number of questions (1-50)")
    difficulty: str = Field(..., description="Difficulty level (easy, medium, hard)")
    quiz_type: str = Field(default="multiple_choice", description="Type of quiz questions")
    language: str = Field(default="en", description="Language for the quiz")
    task_id: Optional[str] = None
    
    @validator('difficulty')
    def validate_difficulty(cls, v):
        allowed_difficulties = ['easy', 'medium', 'hard']
        if v not in allowed_difficulties:
            raise ValueError(f'Difficulty must be one of: {allowed_difficulties}')
        return v
    
    @validator('quiz_type')
    def validate_quiz_type(cls, v):
        allowed_types = ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer']
        if v not in allowed_types:
            raise ValueError(f'Quiz type must be one of: {allowed_types}')
        return v

class QuizResponse(BaseModel):
    success: bool
    task_id: str
    message: str
    estimated_questions: int

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    request: QuizRequest,
    current_user: User = Depends(get_current_active_user),
    account_id: str = Depends(get_valid_account_id)
):
    """Generate a quiz based on the provided topic and requirements"""
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
            message=f"Quiz generation request received for {request.question_count} {request.difficulty} questions about {request.topic}",
            status="PENDING",
            progress=0
        )
        
        # Add to processing queue
        await task_queue_service.add_to_queue(
            task_id=task_id,
            request_data=request_data,
            user_id=current_user.id,
            account_id=account_id,
            task_type=TaskType.QUIZ.value
        )
        
        return QuizResponse(
            success=True,
            task_id=task_id,
            message="Quiz generation started successfully",
            estimated_questions=request.question_count
        )
        
    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start quiz generation: {str(e)}")

@router.get("/types")
async def get_quiz_types():
    """Get available quiz types and difficulties"""
    return {
        "quiz_types": [
            {"value": "multiple_choice", "label": "Multiple Choice"},
            {"value": "true_false", "label": "True/False"},
            {"value": "fill_in_blank", "label": "Fill in the Blank"},
            {"value": "short_answer", "label": "Short Answer"}
        ],
        "difficulties": [
            {"value": "easy", "label": "Easy"},
            {"value": "medium", "label": "Medium"},
            {"value": "hard", "label": "Hard"}
        ],
        "languages": [
            {"value": "en", "label": "English"},
            {"value": "es", "label": "Spanish"},
            {"value": "fr", "label": "French"},
            {"value": "de", "label": "German"},
            {"value": "zh", "label": "Chinese"}
        ]
    }
