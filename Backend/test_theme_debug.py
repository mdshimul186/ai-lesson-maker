#!/usr/bin/env python3
"""
Debug theme issues by testing the complete pipeline
"""
import json
import os
import sys
import tempfile
from typing import Dict, Any

# Add the project root to the path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.schemas.video import VideoGenerateRequest, CustomColors

def test_request_serialization():
    """Test that theme and custom_colors survive JSON serialization"""
    print("=== Testing Request Serialization ===")
    
    # Create a request with theme and custom colors
    custom_colors = CustomColors(
        primary="#FF6B6B",
        secondary="#4ECDC4", 
        accent="#F59E0B",
        background="#2C3E50",
        text="#FFFFFF"
    )
    
    request = VideoGenerateRequest(
        story_prompt="Test story",
        segments=3,
        language="English",
        theme="custom",
        custom_colors=custom_colors,
        test_mode=True
    )
    
    print(f"Original request theme: {request.theme}")
    print(f"Original request custom_colors: {request.custom_colors}")
    
    # Serialize to JSON (like what happens in the API)
    request_data = request.model_dump()
    print(f"Serialized data: {json.dumps(request_data, indent=2)}")
    
    # Deserialize back (like what happens in the task processor)
    reconstructed_request = VideoGenerateRequest(**request_data)
    print(f"Reconstructed theme: {reconstructed_request.theme}")
    print(f"Reconstructed custom_colors: {reconstructed_request.custom_colors}")
    
    # Test custom colors extraction like in the service
    custom_colors_dict = None
    if hasattr(reconstructed_request, 'custom_colors') and reconstructed_request.custom_colors:
        if isinstance(reconstructed_request.custom_colors, dict):
            custom_colors_dict = reconstructed_request.custom_colors
        elif hasattr(reconstructed_request.custom_colors, 'model_dump'):
            custom_colors_dict = reconstructed_request.custom_colors.model_dump()
        elif hasattr(reconstructed_request.custom_colors, 'dict'):
            custom_colors_dict = reconstructed_request.custom_colors.dict()
    
    print(f"Extracted custom_colors_dict: {custom_colors_dict}")
    
    # Filter out None values
    if custom_colors_dict:
        custom_colors_dict = {k: v for k, v in custom_colors_dict.items() if v is not None}
        print(f"Filtered custom_colors_dict: {custom_colors_dict}")
    
    return reconstructed_request, custom_colors_dict

def test_story_json_persistence():
    """Test that theme survives the story.json save/load cycle"""
    print("\n=== Testing Story JSON Persistence ===")
    
    request, custom_colors_dict = test_request_serialization()
    
    # Create a temporary directory and story.json file
    with tempfile.TemporaryDirectory() as temp_dir:
        story_file = os.path.join(temp_dir, "story.json")
        
        # Simulate saving the story.json (like in generate_video function)
        data = request.model_dump()
        data["scenes"] = [
            {"text": "Scene 1 text", "image_prompt": "Scene 1 prompt", "url": "http://example.com/1.jpg"},
            {"text": "Scene 2 text", "image_prompt": "Scene 2 prompt", "url": "http://example.com/2.jpg"}
        ]
        
        with open(story_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Saved to story.json with theme: {data.get('theme')}")
        print(f"Saved custom_colors: {data.get('custom_colors')}")
        
        # Simulate loading in test mode (like in generate_video function)
        with open(story_file, "r", encoding="utf-8") as f:
            loaded_data = json.load(f)
        
        # Reconstruct request from loaded data
        loaded_request = VideoGenerateRequest(**loaded_data)
        loaded_request.test_mode = True
        loaded_request.include_subtitles = False
        
        print(f"Loaded request theme: {loaded_request.theme}")
        print(f"Loaded request custom_colors: {loaded_request.custom_colors}")
        
        # Test the theme functions with loaded data
        from app.services.video import _get_theme_colors, _get_theme_background_color
        
        # Extract custom colors from loaded request
        loaded_custom_colors_dict = None
        if hasattr(loaded_request, 'custom_colors') and loaded_request.custom_colors:
            if isinstance(loaded_request.custom_colors, dict):
                loaded_custom_colors_dict = loaded_request.custom_colors
            elif hasattr(loaded_request.custom_colors, 'model_dump'):
                loaded_custom_colors_dict = loaded_request.custom_colors.model_dump()
            elif hasattr(loaded_request.custom_colors, 'dict'):
                loaded_custom_colors_dict = loaded_request.custom_colors.dict()
        
        if loaded_custom_colors_dict:
            loaded_custom_colors_dict = {k: v for k, v in loaded_custom_colors_dict.items() if v is not None}
        
        print(f"Loaded custom_colors_dict: {loaded_custom_colors_dict}")
        
        # Test theme functions
        theme_colors = _get_theme_colors(loaded_request.theme, loaded_custom_colors_dict)
        background_color = _get_theme_background_color(loaded_request.theme, loaded_custom_colors_dict)
        
        print(f"Final theme colors: {theme_colors}")
        print(f"Final background color: {background_color}")
        
        # Verify the background color is correct
        expected_bg = "#2C3E50"
        if background_color == expected_bg:
            print("✅ SUCCESS: Theme persisted correctly through story.json")
        else:
            print(f"❌ FAILED: Expected {expected_bg}, got {background_color}")
            
        return background_color == expected_bg

def test_edge_cases():
    """Test various edge cases that might cause theme issues"""
    print("\n=== Testing Edge Cases ===")
    
    # Test case 1: None custom colors
    print("Test 1: None custom colors")
    from app.services.video import _get_theme_colors, _get_theme_background_color
    
    result = _get_theme_background_color("modern", None)
    print(f"Modern theme with None custom_colors: {result}")
    
    # Test case 2: Empty custom colors dict
    print("Test 2: Empty custom colors dict")
    result = _get_theme_background_color("custom", {})
    print(f"Custom theme with empty dict: {result}")
    
    # Test case 3: Partial custom colors
    print("Test 3: Partial custom colors")
    partial_colors = {"background": "#123456"}
    result = _get_theme_background_color("custom", partial_colors)
    print(f"Custom theme with partial colors: {result}")
    
    # Test case 4: Invalid theme name
    print("Test 4: Invalid theme name")
    result = _get_theme_background_color("nonexistent_theme", None)
    print(f"Invalid theme name: {result}")
    
    # Test case 5: Custom colors with None values
    print("Test 5: Custom colors with None values")
    colors_with_none = {"primary": "#FF0000", "background": None, "secondary": "#00FF00"}
    filtered = {k: v for k, v in colors_with_none.items() if v is not None}
    result = _get_theme_background_color("custom", filtered)
    print(f"Custom colors with None values (filtered): {result}")

if __name__ == "__main__":
    try:
        # Run all tests
        success = True
        
        # Test serialization
        test_request_serialization()
        
        # Test story.json persistence
        if not test_story_json_persistence():
            success = False
        
        # Test edge cases
        test_edge_cases()
        
        print(f"\n{'='*60}")
        if success:
            print("🎉 ALL TESTS PASSED - Theme system should work correctly")
        else:
            print("❌ SOME TESTS FAILED - Theme issues detected")
            
    except Exception as e:
        print(f"\n❌ ERROR during testing: {e}")
        import traceback
        traceback.print_exc()
