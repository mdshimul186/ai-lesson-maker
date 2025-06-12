#!/usr/bin/env python3
"""
Debug script to test if markdown_to_image is being called during video generation.
This will help identify why changes to markdown_to_image don't affect the /video/generate API.
"""

import asyncio
import sys
import os

# Add the Backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.llm import llm_service
from app.schemas.llm import StoryGenerationRequest
from app.config import get_settings

async def debug_video_generation():
    """Test the video generation flow to see if markdown_to_image is called"""
    
    print("🔍 DEBUG: Testing video generation flow...")
    
    # Get current settings
    settings = get_settings()
    print(f"📋 Current settings:")
    print(f"   - Image provider: {settings.image_provider}")
    print(f"   - Text provider: {settings.text_provider}")
    print(f"   - OpenAI API key configured: {'YES' if settings.openai_api_key else 'NO (EMPTY)'}")
    print(f"   - Image LLM model: {settings.image_llm_model}")
    
    # Create a simple test request
    test_request = StoryGenerationRequest(
        story_type="educational",
        image_style="realistic", 
        resolution="1280*720",
        story_prompt="Create a simple lesson about photosynthesis",
        language="English",
        segments=2,
        include_subtitles=True,
        visual_content_in_language=False,
        image_llm_provider="openai",  # Force OpenAI provider
        image_llm_model="dall-e-3",
        theme="modern",
        custom_colors={"primary": "#007bff", "secondary": "#6c757d"}
    )
    
    print(f"\n🧪 Test request:")
    print(f"   - Theme: {test_request.theme}")
    print(f"   - Custom colors: {test_request.custom_colors}")
    print(f"   - Image provider: {test_request.image_llm_provider}")
    
    print(f"\n🚀 Starting video generation test...")
    print(f"💡 Look for the messages '🔥🔥🔥 GENERATE_IMAGE CALLED!' and '🔥🔥🔥 MARKDOWN_TO_IMAGE METHOD CALLED!'")
    
    try:
        # Test the story generation with images
        result = await llm_service.generate_story_with_images(test_request)
        print(f"\n✅ Video generation completed successfully!")
        print(f"📊 Generated {len(result)} scenes")
        
        for i, scene in enumerate(result):
            print(f"   Scene {i+1}: {'✅ Image generated' if scene.get('url') else '❌ No image'}")
            
    except Exception as e:
        print(f"\n❌ Error during video generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🎬 Video Generation Debug Tool")
    print("=" * 50)
    asyncio.run(debug_video_generation())
