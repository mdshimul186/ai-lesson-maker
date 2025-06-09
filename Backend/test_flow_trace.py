#!/usr/bin/env python3
"""
Test script to trace the video generation flow and see if markdown_to_image is called.
"""

import asyncio
import sys
import os
sys.path.append('/Users/hello/Desktop/ai-lesson-maker/Backend')

from app.services.llm import LLMService
from app.schemas.llm import StoryGenerationRequest
import tempfile

async def test_generate_story_with_images():
    """Test the generate_story_with_images flow"""
    
    # Create a simple request
    request = StoryGenerationRequest(
        resolution="1280*720",
        story_prompt="test docker basics",
        language="English",
        segments=1,
        theme="vibrant",
        custom_colors={
            "primary": "#FF0000",
            "background": "#00FF00"
        }
    )
    
    print("🧪 Testing generate_story_with_images flow...")
    print(f"Request theme: {request.theme}")
    print(f"Request custom_colors: {request.custom_colors}")
    
    llm_service = LLMService()
    
    try:
        # This should call generate_story_with_images -> generate_image -> markdown_to_image
        result = await llm_service.generate_story_with_images(request)
        print(f"✅ Result: {len(result)} stories generated")
        
        for i, story in enumerate(result, 1):
            print(f"Story {i}: URL = {story.get('url', 'NO URL')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_markdown_to_image_directly():
    """Test markdown_to_image directly"""
    
    print("\n🧪 Testing markdown_to_image directly...")
    
    markdown_content = """
# Test Docker Diagram

```mermaid
graph LR
    A[Docker] --> B[Container]
    B --> C[Application]
```

| Component | Description |
|-----------|-------------|
| Docker | Platform |
| Container | Runtime |
"""
    
    llm_service = LLMService()
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        output_path = f.name
    
    try:
        await llm_service.markdown_to_image(
            markdown_content=markdown_content,
            output_path=output_path,
            theme="vibrant",
            custom_colors={
                "primary": "#FF0000",
                "background": "#00FF00"
            }
        )
        
        # Check if file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"✅ Image created: {output_path} (size: {file_size} bytes)")
        else:
            print("❌ Image file was not created")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up
        if os.path.exists(output_path):
            os.unlink(output_path)

if __name__ == "__main__":
    print("🚀 Starting flow trace test...")
    asyncio.run(test_generate_story_with_images())
    asyncio.run(test_markdown_to_image_directly())
