from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel

class TaskType(str, Enum):
    """Supported task types for processing"""
    VIDEO = "video"
    ANIMATED_LESSON = "animated_lesson"
    COURSE_VIDEO = "course_video"
    DOCUMENTATION = "documentation"
    QUIZ = "quiz"
    STORY_GENERATION = "story_generation"
    IMAGE_GENERATION = "image_generation"
    VOICE_GENERATION = "voice_generation"

class TaskPriority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class TaskConfig(BaseModel):
    """Configuration for task processing"""
    max_attempts: int = 3
    timeout_minutes: int = 30
    priority: TaskPriority = TaskPriority.NORMAL
    requires_credits: bool = True
    estimated_duration_minutes: Optional[int] = None

# Task type configurations
TASK_CONFIGS: Dict[TaskType, TaskConfig] = {
    TaskType.VIDEO: TaskConfig(
        max_attempts=3,
        timeout_minutes=45,
        priority=TaskPriority.NORMAL,
        requires_credits=True,
        estimated_duration_minutes=30
    ),
    TaskType.ANIMATED_LESSON: TaskConfig(
        max_attempts=3,
        timeout_minutes=30,
        priority=TaskPriority.NORMAL,
        requires_credits=True,
        estimated_duration_minutes=20
    ),
    TaskType.COURSE_VIDEO: TaskConfig(
        max_attempts=3,
        timeout_minutes=45,
        priority=TaskPriority.HIGH,
        requires_credits=True,
        estimated_duration_minutes=35
    ),
    TaskType.DOCUMENTATION: TaskConfig(
        max_attempts=2,
        timeout_minutes=15,
        priority=TaskPriority.NORMAL,
        requires_credits=False,
        estimated_duration_minutes=10
    ),
    TaskType.QUIZ: TaskConfig(
        max_attempts=2,
        timeout_minutes=10,
        priority=TaskPriority.NORMAL,
        requires_credits=False,
        estimated_duration_minutes=5
    ),
    TaskType.STORY_GENERATION: TaskConfig(
        max_attempts=2,
        timeout_minutes=10,
        priority=TaskPriority.NORMAL,
        requires_credits=True,
        estimated_duration_minutes=5
    ),
    TaskType.IMAGE_GENERATION: TaskConfig(
        max_attempts=2,
        timeout_minutes=15,
        priority=TaskPriority.NORMAL,
        requires_credits=True,
        estimated_duration_minutes=8
    ),
    TaskType.VOICE_GENERATION: TaskConfig(
        max_attempts=2,
        timeout_minutes=20,
        priority=TaskPriority.NORMAL,
        requires_credits=True,
        estimated_duration_minutes=12
    )
}

def get_task_config(task_type: TaskType) -> TaskConfig:
    """Get configuration for a specific task type"""
    return TASK_CONFIGS.get(task_type, TaskConfig())

def is_valid_task_type(task_type: str) -> bool:
    """Check if task type is valid"""
    try:
        TaskType(task_type)
        return True
    except ValueError:
        return False
