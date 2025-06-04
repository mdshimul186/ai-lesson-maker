from typing import Dict, Any
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
import logging
from app.services import task_service

logger = logging.getLogger(__name__)

class StoryGenerationProcessor(BaseTaskProcessor):
    """Processor for story generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.STORY_GENERATION)
    
    async def process_task(self, task_id: str, request_data: Dict[str, Any], user_id: str, account_id: str) -> Dict[str, Any]:
        """
        Process story generation task
        """
        try:
            await task_service.add_task_event(
                task_id=task_id,
                message="Starting story generation...",
                status="PROCESSING",
                progress=10
            )
            
            # Extract story generation parameters
            prompt = request_data.get("prompt", "")
            story_type = request_data.get("story_type", "adventure")
            target_audience = request_data.get("target_audience", "children")
            language = request_data.get("language", "en")
            length = request_data.get("length", "medium")  # short, medium, long
            
            logger.info(f"Generating {story_type} story for {target_audience} audience")
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Generating story content using AI...",
                status="PROCESSING",
                progress=30
            )
            
            # Use LLM service to generate story
            from app.services.llm import LLMService
            llm_service = LLMService()
            
            # Create story generation prompt
            story_prompt = f"""
            Create a {length} {story_type} story suitable for {target_audience}.
            Base prompt: {prompt}
            Language: {language}
            
            Please structure the story with:
            - A compelling title
            - Clear beginning, middle, and end
            - Age-appropriate content
            - Engaging narrative suitable for the target audience
            
            Format the response as JSON with:
            {{
                "title": "Story Title",
                "story": "Full story text",
                "summary": "Brief summary",
                "characters": ["list of main characters"],
                "moral": "Key lesson or moral (if applicable)"
            }}
            """
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Processing story with AI language model...",
                status="PROCESSING",
                progress=60
            )
            
            # Generate story using LLM
            story_result = await llm_service.generate_text(
                prompt=story_prompt,
                max_tokens=2000,
                temperature=0.8
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Finalizing story generation...",
                status="PROCESSING",
                progress=90
            )
            
            # Parse and structure the result
            try:
                import json
                story_data = json.loads(story_result)
            except:
                # Fallback if JSON parsing fails
                story_data = {
                    "title": "Generated Story",
                    "story": story_result,
                    "summary": "A story generated based on the provided prompt",
                    "characters": [],
                    "moral": ""
                }
            
            # Save story to file system or database as needed
            result = {
                "task_id": task_id,
                "story_data": story_data,
                "metadata": {
                    "story_type": story_type,
                    "target_audience": target_audience,
                    "language": language,
                    "length": length,
                    "word_count": len(story_data.get("story", "").split())
                }
            }
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Story generation completed successfully",
                status="COMPLETED",
                progress=100
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Story generation failed: {str(e)}"
            logger.error(f"Story generation failed for task {task_id}: {e}")
            
            await task_service.add_task_event(
                task_id=task_id,
                message=error_msg,
                status="FAILED",
                progress=0
            )
            
            raise Exception(error_msg)
    
    async def estimate_completion_time(self, request_data: Dict[str, Any]) -> int:
        """Estimate completion time for story generation in minutes"""
        length = request_data.get("length", "medium")
        
        # Estimate based on story length
        time_map = {
            "short": 2,
            "medium": 5,
            "long": 10
        }
        
        return time_map.get(length, 5)
