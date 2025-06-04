# Task Processors Package
# This package contains task-specific processors for different types of content generation

from .base_processor import BaseTaskProcessor
from .video_processor import VideoProcessor
from .animated_lesson_processor import AnimatedLessonProcessor
from .documentation_processor import DocumentationProcessor
from .quiz_processor import QuizProcessor

__all__ = [
    "BaseTaskProcessor",
    "VideoProcessor", 
    "AnimatedLessonProcessor",
    "DocumentationProcessor",
    "QuizProcessor"
]
