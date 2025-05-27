from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from enum import Enum


class RenderMode(str, Enum):
    MARKDOWN = "markdown"
    MERMAID = "mermaid"
    MIXED = "mixed"


class ContentBlock(BaseModel):
    """Individual content block with animation"""
    content: str = Field(..., description="Content text")
    content_type: str = Field(..., description="Content type: text, paragraph, list, code, mermaid")
    animation_type: str = Field(..., description="Animation type: typing, fade_in, slide_in, drawing")
    duration: float = Field(default=3.0, description="Animation duration in seconds")
    language: Optional[str] = Field(default=None, description="Programming language for code blocks")
    mermaid_diagram: Optional[str] = Field(default=None, description="Mermaid diagram code")


class AnimatedSection(BaseModel):
    """Section with multiple content blocks"""
    heading: str = Field(..., description="Section heading")
    content_blocks: List[ContentBlock] = Field(..., description="Array of content blocks")
    duration: float = Field(default=4.0, description="Total section duration")


class AnimatedLessonRequest(BaseModel):
    """Animated Lesson Generation Request"""
    task_id: Optional[str] = None  # For task tracking
    title: str = Field(..., description="Lesson title")
    description: Optional[str] = Field(default=None, description="Lesson description")
    prompt: str = Field(..., description="Content generation prompt")
    scenes: int = Field(default=5, ge=1, le=25, description="Number of scenes/sections to generate")
    language: str = Field(default="English", description="Lesson language")
    render_mode: RenderMode = Field(default=RenderMode.MIXED, description="Content rendering mode")
    voice_name: str = Field(..., description="Voice name for narration")
    voice_rate: float = Field(default=1.0, description="Voice rate")
    include_subtitles: bool = Field(default=True, description="Whether to include subtitles")
    theme: Optional[str] = Field(default="light", description="Visual theme (light/dark)")
    font_family: Optional[str] = Field(default=None, description="Font family")
    background_color: Optional[str] = Field(default=None, description="Background color")
    text_color: Optional[str] = Field(default=None, description="Text color")


class AnimatedLessonData(BaseModel):
    task_id: str
    content: Optional[List[Dict[str, Any]]] = None
    video_url: Optional[str] = None
    task_folder_content: Optional[Dict[str, Any]] = None


class AnimatedLessonResponse(BaseModel):
    """Animated Lesson Generation Response"""
    success: bool
    data: Optional[AnimatedLessonData] = None
    message: Optional[str] = None
