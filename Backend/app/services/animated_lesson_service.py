import logging
import json
from typing import Dict, Any, List, Optional
from app.schemas.animated_lesson import AnimatedLessonRequest
from app.services.llm import llm_service
from app.services import task_service

logger = logging.getLogger(__name__)

class AnimatedLessonService:
    """Service for generating animated lessons with browser-based animations"""

    async def generate_content(self, request: AnimatedLessonRequest) -> List[Dict[str, Any]]:
        """Generate lesson content based on the prompt"""
        try:
            # Create comprehensive system prompt for content generation
            system_prompt = """You are a professional educational content creator specializing in interactive animated lessons.

Create educational content that will be rendered on a canvas with markdown formatting and animations. Structure your response as JSON with a "sections" array.

Each section should have:
- heading: Clear section title
- content: Content using markdown formatting (headers, lists, bold, italic, code blocks)
- content_type: "text", "diagram", "mermaid", "example", "summary", "code", or "mixed"
- animation_type: Choose from "typing", "drawing", "fade_in", "slide_in", "zoom_in" based on content type
- render_mode: "markdown", "mermaid", or "mixed"
- mermaid_diagram: (if applicable) Valid mermaid diagram code
- duration: Animation duration in seconds (2-8 seconds)

Guidelines for animation selection:
- "typing": Best for text explanations, definitions
- "drawing": Best for diagrams, visual concepts, mermaid charts
- "fade_in": Best for examples, summaries
- "slide_in": Best for lists, step-by-step processes
- "zoom_in": Best for highlighting important concepts

For diagrams, include both markdown content AND mermaid diagram code.
Use mermaid for flowcharts, graphs, mind maps, timelines, etc.

Example mermaid syntax:
```
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```

Return valid JSON only."""

            user_prompt = f"""Create educational content for a lesson titled '{request.title}' about '{request.prompt}' in {request.language} language.

The content should be suitable for {request.render_mode} rendering mode.
Theme: {request.theme}

Structure the lesson with 4-8 sections that progressively build understanding. Include visual diagrams where helpful using mermaid syntax."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # Log the request
            logger.info(f"Generating animated lesson content for prompt: {request.prompt}")
            
            # Get response from LLM
            response = await llm_service._generate_response(messages=messages, response_format="json_object")
            
            # Check if response has the expected structure
            if not response.get("sections"):
                logger.error(f"Invalid content generation response: {response}")
                raise ValueError("LLM did not return properly structured content")
                
            # Ensure each section has required fields with defaults
            for section in response["sections"]:
                if "animation_type" not in section:
                    # AI decides animation based on content type
                    content_type = section.get("content_type", "text")
                    if content_type in ["diagram", "mermaid"]:
                        section["animation_type"] = "drawing"
                    elif content_type in ["example", "summary"]:
                        section["animation_type"] = "fade_in"
                    elif content_type == "code":
                        section["animation_type"] = "typing"
                    else:
                        section["animation_type"] = "slide_in"
                
                # Set default values
                section.setdefault("render_mode", request.render_mode)
                section.setdefault("duration", 4.0)
                section.setdefault("content_type", "text")
            
            logger.info(f"Successfully generated content with {len(response['sections'])} sections")
            return response["sections"]
            
        except Exception as e:
            logger.error(f"Error generating animated lesson content: {str(e)}")
            raise

    async def process_animated_lesson_task(self, task_id: str, request: AnimatedLessonRequest) -> Dict[str, Any]:
        """Process an animated lesson generation task"""
        try:
            # Update task status to PROCESSING
            await task_service.update_task_status(task_id, "PROCESSING")
            await task_service.add_task_event(
                task_id=task_id,
                message="Generating lesson content...",
                status="PROCESSING",
                progress=10
            )
            
            # Generate the lesson content
            content = await self.generate_content(request)
            
            # Update task with progress
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Content generated with {len(content)} sections",
                status="PROCESSING",
                progress=50,
                details={"section_count": len(content)}
            )
              # Store the content in the task result
            task_result = {
                "content": content,
                "render_mode": request.render_mode,
                "voice": request.voice_name,
                "voice_rate": request.voice_rate,
                "include_subtitles": request.include_subtitles,
                "theme": request.theme,
                "font_family": request.font_family,
                "background_color": request.background_color,
                "text_color": request.text_color
            }# Mark task as completed with result
            await task_service.set_task_completed(
                task_id=task_id,
                result_url="animated_lesson_generated",
                task_folder_content=task_result,
                final_message="Animated lesson generation completed successfully"
            )
            
            return task_result
            
        except Exception as e:
            logger.error(f"Error processing animated lesson task {task_id}: {str(e)}")
            
            # Mark task as failed
            await task_service.set_task_failed(
                task_id=task_id,
                error_message=f"Animated lesson generation failed: {str(e)}",
                error_details={"error": str(e)},
                final_message=f"Animated lesson generation failed: {str(e)}"
            )
            
            raise

# Instantiate the service
animated_lesson_service = AnimatedLessonService()
