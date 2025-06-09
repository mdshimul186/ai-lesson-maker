from pydantic import BaseModel, Field
from typing import List, Dict, Any

from typing import Optional

class StoryGenerationRequest(BaseModel):
    resolution: Optional[str] = Field(default="1024*1024", description="分辨率")
    text_llm_provider: Optional[str] = Field(default=None, description="Text LLM provider")
    text_llm_model: Optional[str] = Field(default=None, description="Text LLM model")
    image_llm_provider: Optional[str] = Field(default=None, description="Image LLM provider")
    image_llm_model: Optional[str] = Field(default=None, description="Image LLM model")
    segments: int = Field(..., ge=1, le=50, description="Number of story segments to generate")
    story_prompt: str = Field(..., min_length=1, max_length=4000, description="Theme or topic of the story")
    language: str = Field(default="English", description="Story language")
    visual_content_in_language: Optional[bool] = Field(default=False, description="Whether to generate visual content in the specified language")
    include_subtitles: Optional[bool] = Field(default=False, description="Whether to include subtitles")
    theme: Optional[str] = Field(default="modern", description="Visual theme")
    custom_colors: Optional[Dict[str, str]] = Field(default=None, description="Custom theme colors (only used when theme is 'custom')")


class StorySegment(BaseModel):
    text: str = Field(..., description="Story text")
    image_prompt: str = Field(..., description="Image generation prompt")
    url: str = Field(None, description="Generated image URL")


class StoryGenerationResponse(BaseModel):
    segments: List[StorySegment] = Field(..., description="Generated story segments")


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000, description="Description of the image to generate")
    image_llm_provider: Optional[str] = Field(default=None, description="Image LLM provider")
    image_llm_model: Optional[str] = Field(default=None, description="Image LLM model")
    resolution: Optional[str] = Field(default="1024*1024", description="Image resolution")
    theme: Optional[str] = Field(default="modern", description="Visual theme")
    custom_colors: Optional[Dict[str, str]] = Field(default=None, description="Custom theme colors (only used when theme is 'custom')")


class ImageGenerationResponse(BaseModel):
    image_url: str = Field(..., description="Generated image URL")
