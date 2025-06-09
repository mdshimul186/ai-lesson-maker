#!/usr/bin/env python3
"""
Test script to verify theme application in video generation
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.video import VideoService
from app.schemas.video import VideoGenerateRequest, VideoScene
from app.schemas.llm import StoryGenerationRequest

async def test_theme_video():
    print("Testing video generation with theme...")
    
    # Create a test request with theme
    request = VideoGenerateRequest(
        story_text="This is a test story for theme verification. The background should not be white.",
        title="Theme Test Video",
        theme="vibrant",
        custom_colors={
            "primary": "#FF6B6B",
            "secondary": "#4ECDC4", 
            "background": "#2C3E50",
            "text": "#FFFFFF"
        },
        voice_id="default",
        use_ai_voices=False
    )
    
    print(f"Request theme: {request.theme}")
    print(f"Request custom_colors: {request.custom_colors}")
    
    video_service = VideoService()
    
    # Test theme utility functions first
    print("\n=== Testing theme utility functions ===")
    theme_colors = video_service._get_theme_colors(request.theme, request.custom_colors)
    print(f"Theme colors: {theme_colors}")
    
    bg_color = video_service._get_theme_background_color(request.theme, request.custom_colors)
    print(f"Background color: {bg_color}")
    
    subtitle_style = video_service._get_theme_subtitle_style(request.theme, request.custom_colors)
    print(f"Subtitle style: {subtitle_style}")
    
    # Test hex to RGB conversion
    if request.custom_colors and "background" in request.custom_colors:
        rgb = video_service._hex_to_rgb(request.custom_colors["background"])
        print(f"Background RGB: {rgb}")
    
    print("\n=== Testing actual video generation ===")
    
    try:
        # Try to generate a short video
        result = await video_service.generate_video(request)
        print(f"Video generation result: {result}")
        
        if result.get("status") == "success":
            video_path = result.get("video_path")
            if video_path and os.path.exists(video_path):
                print(f"✅ Video created at: {video_path}")
                
                # Check file size
                size = os.path.getsize(video_path)
                print(f"Video file size: {size} bytes")
                
                # Try to extract a frame to verify colors
                frame_path = video_path.replace('.mp4', '_frame.jpg')
                extract_cmd = f"ffmpeg -i {video_path} -vframes 1 -y {frame_path}"
                print(f"Extracting frame: {extract_cmd}")
                
                import subprocess
                try:
                    subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)
                    if os.path.exists(frame_path):
                        print(f"✅ Frame extracted to: {frame_path}")
                        print("You can check this image to verify the background color")
                    else:
                        print("❌ Frame extraction failed")
                except subprocess.CalledProcessError as e:
                    print(f"❌ FFmpeg frame extraction error: {e}")
                    
            else:
                print(f"❌ Video file not found at: {video_path}")
        else:
            print(f"❌ Video generation failed: {result}")
            
    except Exception as e:
        print(f"❌ Error during video generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_theme_video())
