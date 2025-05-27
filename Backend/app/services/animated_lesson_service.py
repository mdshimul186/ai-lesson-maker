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
        try:            # Create comprehensive system prompt for content generation
            system_prompt = """You are a professional educational content creator specializing in interactive animated lessons.

Create educational content that will be rendered with multiple animated content blocks per slide. Structure your response as JSON with a "sections" array.

Each section should have:
- heading: Clear section title
- content_blocks: Array of content blocks with different animations
- duration: Total section duration in seconds (4-10 seconds)

Each content_block should have:
- content: Content text (markdown supported for text/paragraph types)
- content_type: "text", "paragraph", "list", "code", "mermaid"
- animation_type: "typing", "fade_in", "slide_in", "drawing"
- duration: Individual block duration (2-4 seconds)
- language: (for code blocks) programming language
- mermaid_diagram: (for mermaid blocks) Valid mermaid diagram code

Content Type Guidelines:
- "paragraph": For explanatory text with typing animation
- "list": For bullet points with slide-in animation (one item at a time)  
- "code": For code examples with typing animation
- "mermaid": For diagrams with fade-in animation
- "text": For simple text content

Animation Type Guidelines:
- "typing": Character-by-character reveal (best for paragraphs and code)
- "slide_in": Slide from left (best for lists - items appear one by one)
- "fade_in": Fade in effect (best for mermaid diagrams)
- "drawing": Progressive reveal effect

Example structure:
{
  "sections": [
    {
      "heading": "Introduction to Topic",
      "duration": 8,
      "content_blocks": [
        {
          "content": "Welcome to this lesson about...",
          "content_type": "paragraph", 
          "animation_type": "typing",
          "duration": 3
        },
        {
          "content": "- Key concept 1\n- Key concept 2\n- Key concept 3",
          "content_type": "list",
          "animation_type": "slide_in", 
          "duration": 3
        },
        {
          "content": "graph TD\n    A[Start] --> B[Process]\n    B --> C[End]",
          "content_type": "mermaid",
          "animation_type": "fade_in",
          "duration": 2,
          "mermaid_diagram": "graph TD\n    A[Start] --> B[Process]\n    B --> C[End]"
        }
      ]
    }
  ]
}

Return valid JSON only."""            # Get the number of scenes/sections to generate (default to 5 if not provided)
            num_scenes = getattr(request, 'scenes', 5)
            
            user_prompt = f"""Create educational content for a lesson titled '{request.title}' about '{request.prompt}' in {request.language} language.

The content should be suitable for {request.render_mode} rendering mode.
Theme: {request.theme}

Structure the lesson with exactly {num_scenes} sections that progressively build understanding. Each section should have multiple content blocks with different animations:

1. Start each section with a paragraph explaining the concept (typing animation)
2. Add lists for key points (slide-in animation, one item at a time) 
3. Include code examples where relevant (typing animation)
4. Add mermaid diagrams for visual concepts (fade-in animation)

Make content engaging and educational. Use varied animations to create dynamic lessons."""
            
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
                # Ensure section has content_blocks array
                if "content_blocks" not in section:
                    # Convert old format to new format if needed
                    content_blocks = [{
                        "content": section.get("content", ""),
                        "content_type": section.get("content_type", "text"),
                        "animation_type": section.get("animation_type", "fade_in"),
                        "duration": section.get("duration", 4.0)
                    }]
                    if section.get("mermaid_diagram"):
                        content_blocks[-1]["mermaid_diagram"] = section["mermaid_diagram"]
                    if section.get("content_type") == "code":
                        content_blocks[-1]["language"] = "javascript"  # default language
                    section["content_blocks"] = content_blocks
                
                # Validate and set defaults for content blocks
                for block in section.get("content_blocks", []):
                    block.setdefault("content_type", "text")
                    block.setdefault("animation_type", "fade_in")
                    block.setdefault("duration", 3.0)
                    
                    # Set default language for code blocks
                    if block.get("content_type") == "code" and "language" not in block:
                        block["language"] = "javascript"
                
                # Set section defaults
                section.setdefault("duration", 4.0)
                
                # Calculate total section duration from content blocks
                if section.get("content_blocks"):
                    total_duration = sum(block.get("duration", 3.0) for block in section["content_blocks"])
                    section["duration"] = max(total_duration, 4.0)
            
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
