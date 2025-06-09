#!/usr/bin/env python3
"""
Test simulating a frontend request to check theme processing
"""

import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test what happens when we simulate the request processing
def test_request_processing():
    print("=== Testing Request Processing for Theme ===")
    
    # Simulate incoming request data (what frontend would send)
    frontend_request_data = {
        "story_prompt": "A test story about themes",
        "segments": 2,
        "language": "English",
        "voice_name": "en-US-JennyNeural",
        "voice_rate": 1.0,
        "resolution": "1280*720",
        "include_subtitles": True,
        "test_mode": False,
        "theme": "vibrant",
        "custom_colors": {
            "primary": "#FF6B6B",
            "secondary": "#4ECDC4",
            "background": "#2C3E50",
            "text": "#FFFFFF"
        }
    }
    
    print(f"Frontend request data: {json.dumps(frontend_request_data, indent=2)}")
    
    # Test creating VideoGenerateRequest from this data
    try:
        from app.schemas.video import VideoGenerateRequest
        print("\n=== Creating VideoGenerateRequest ===")
        request = VideoGenerateRequest(**frontend_request_data)
        print(f"✅ VideoGenerateRequest created successfully")
        print(f"Request theme: {request.theme}")
        print(f"Request custom_colors: {request.custom_colors}")
        print(f"Request custom_colors type: {type(request.custom_colors)}")
        
        if request.custom_colors:
            print(f"Custom colors dict: {request.custom_colors.dict() if hasattr(request.custom_colors, 'dict') else request.custom_colors}")
        
        # Test the extraction logic from generate_video function
        print("\n=== Testing extraction logic ===")
        custom_colors_dict = None
        if hasattr(request, 'custom_colors') and request.custom_colors:
            if hasattr(request.custom_colors, 'dict'):
                custom_colors_dict = request.custom_colors.dict()
            elif isinstance(request.custom_colors, dict):
                custom_colors_dict = request.custom_colors
        
        theme_value = getattr(request, 'theme', 'modern')
        print(f"Extracted theme: {theme_value}")
        print(f"Extracted custom_colors: {custom_colors_dict}")
        
        # Test the theme utility functions with extracted data
        print("\n=== Testing theme utilities with extracted data ===")
        from app.services.video import _get_theme_background_color, _get_theme_subtitle_style
        
        bg_color = _get_theme_background_color(theme_value, custom_colors_dict)
        subtitle_style = _get_theme_subtitle_style(theme_value, custom_colors_dict)
        
        print(f"Background color: {bg_color}")
        print(f"Subtitle style: {subtitle_style}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_request_processing()
