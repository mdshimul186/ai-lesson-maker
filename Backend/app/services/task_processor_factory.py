from typing import Dict, Type
from app.processors.base_processor import BaseTaskProcessor
from app.processors.video_processor import VideoProcessor
from app.processors.animated_lesson_processor import AnimatedLessonProcessor
from app.processors.documentation_processor import DocumentationProcessor
from app.processors.quiz_processor import QuizProcessor
from app.processors.course_video_processor import CourseVideoProcessor
from app.processors.story_generation_processor import StoryGenerationProcessor
from app.processors.image_generation_processor import ImageGenerationProcessor
from app.processors.voice_generation_processor import VoiceGenerationProcessor
from app.models.task_types import TaskType

class TaskProcessorFactory:
    """Factory class to create appropriate task processors"""
    
    _processors: Dict[TaskType, Type[BaseTaskProcessor]] = {
        TaskType.VIDEO: VideoProcessor,
        TaskType.ANIMATED_LESSON: AnimatedLessonProcessor,
        TaskType.DOCUMENTATION: DocumentationProcessor,
        TaskType.QUIZ: QuizProcessor,
        TaskType.COURSE_VIDEO: CourseVideoProcessor,
        TaskType.STORY_GENERATION: StoryGenerationProcessor,
        TaskType.IMAGE_GENERATION: ImageGenerationProcessor,
        TaskType.VOICE_GENERATION: VoiceGenerationProcessor,
    }
    
    @classmethod
    def create_processor(cls, task_type: str) -> BaseTaskProcessor:
        """Create a processor instance for the given task type"""
        try:
            task_type_enum = TaskType(task_type)
        except ValueError:
            raise ValueError(f"Unsupported task type: {task_type}")
        
        processor_class = cls._processors.get(task_type_enum)
        if not processor_class:
            raise NotImplementedError(f"Processor not implemented for task type: {task_type}")
        
        return processor_class()
    
    @classmethod
    def get_supported_task_types(cls) -> list[str]:
        """Get list of supported task types"""
        return [task_type.value for task_type in cls._processors.keys()]
    
    @classmethod
    def register_processor(cls, task_type: TaskType, processor_class: Type[BaseTaskProcessor]):
        """Register a new processor for a task type"""
        cls._processors[task_type] = processor_class
    
    @classmethod
    def is_task_type_supported(cls, task_type: str) -> bool:
        """Check if a task type is supported"""
        try:
            task_type_enum = TaskType(task_type)
            return task_type_enum in cls._processors
        except ValueError:
            return False
