#!/usr/bin/env python3
"""
Isolated theme function test for Docker environment
"""
import json
from typing import Dict, Optional, Tuple

def _hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def _get_theme_colors(theme: str, custom_colors: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    """Get theme color configuration - isolated version"""
    print(f"_get_theme_colors called with theme: {theme}, custom_colors: {custom_colors}")
    
    # Predefined theme configurations
    themes = {
        "modern": {
            "primary": "#3B82F6",
            "secondary": "#E5E7EB", 
            "accent": "#F59E0B",
            "background": "#FFFFFF"
        },
        "professional": {
            "primary": "#1E40AF",
            "secondary": "#F8FAFC",
            "accent": "#059669", 
            "background": "#FFFFFF"
        },
        "tech": {
            "primary": "#6366F1",
            "secondary": "#111827",
            "accent": "#10B981",
            "background": "#000000"
        },
        "cyberpunk": {
            "primary": "#FF0080",
            "secondary": "#0A0A0A",
            "accent": "#00FFFF",
            "background": "#000000"
        }
    }
    
    # Handle custom theme
    if theme == "custom" and custom_colors:
        result = {
            "primary": custom_colors.get("primary", "#3B82F6"),
            "secondary": custom_colors.get("secondary", "#E5E7EB"),
            "accent": custom_colors.get("accent", "#F59E0B"),
            "background": custom_colors.get("background", "#FFFFFF")
        }
        print(f"Using custom theme colors: {result}")
        return result
    
    # Use predefined theme
    if theme in themes:
        result = themes[theme]
        print(f"Using predefined theme '{theme}': {result}")
        return result
    
    # Fallback to modern theme
    print(f"Unknown theme '{theme}', falling back to 'modern'")
    result = themes["modern"]
    print(f"Fallback theme colors: {result}")
    return result

def _get_theme_background_color(theme: str, custom_colors: Optional[Dict[str, str]] = None) -> str:
    """Get background color for theme"""
    colors = _get_theme_colors(theme, custom_colors)
    background = colors.get("background", "#FFFFFF")
    
    print(f"Theme background color for '{theme}': {background}")
    return background

def test_docker_theme_scenarios():
    """Test common theme scenarios that might fail in Docker"""
    print("=== Docker Theme Test Scenarios ===\n")
    
    # Scenario 1: Modern theme (default)
    print("Scenario 1: Modern theme")
    bg = _get_theme_background_color("modern", None)
    print(f"Result: {bg}")
    print(f"Expected: #FFFFFF")
    print(f"✅ Pass" if bg == "#FFFFFF" else f"❌ Fail")
    print()
    
    # Scenario 2: Tech theme (dark background)
    print("Scenario 2: Tech theme")
    bg = _get_theme_background_color("tech", None)
    print(f"Result: {bg}")
    print(f"Expected: #000000")
    print(f"✅ Pass" if bg == "#000000" else f"❌ Fail")
    print()
    
    # Scenario 3: Custom theme with full colors
    print("Scenario 3: Custom theme with all colors")
    custom_colors = {
        "primary": "#FF6B6B",
        "secondary": "#4ECDC4",
        "accent": "#F59E0B",
        "background": "#2C3E50",
        "text": "#FFFFFF"
    }
    bg = _get_theme_background_color("custom", custom_colors)
    print(f"Result: {bg}")
    print(f"Expected: #2C3E50")
    print(f"✅ Pass" if bg == "#2C3E50" else f"❌ Fail")
    print()
    
    # Scenario 4: Custom theme with None values (common issue)
    print("Scenario 4: Custom theme with None values")
    custom_colors_with_none = {
        "primary": "#FF6B6B",
        "secondary": "#4ECDC4",
        "accent": None,  # This is often the issue!
        "background": "#2C3E50",
        "text": "#FFFFFF"
    }
    # Filter None values like in the actual service
    filtered_colors = {k: v for k, v in custom_colors_with_none.items() if v is not None}
    print(f"Original colors: {custom_colors_with_none}")
    print(f"Filtered colors: {filtered_colors}")
    bg = _get_theme_background_color("custom", filtered_colors)
    print(f"Result: {bg}")
    print(f"Expected: #2C3E50")
    print(f"✅ Pass" if bg == "#2C3E50" else f"❌ Fail")
    print()
    
    # Scenario 5: Invalid theme name
    print("Scenario 5: Invalid theme name")
    bg = _get_theme_background_color("nonexistent", None)
    print(f"Result: {bg}")
    print(f"Expected: #FFFFFF (modern fallback)")
    print(f"✅ Pass" if bg == "#FFFFFF" else f"❌ Fail")
    print()
    
    # Scenario 6: Empty custom colors
    print("Scenario 6: Custom theme with empty colors")
    bg = _get_theme_background_color("custom", {})
    print(f"Result: {bg}")
    print(f"Expected: #FFFFFF (default)")
    print(f"✅ Pass" if bg == "#FFFFFF" else f"❌ Fail")
    print()

def test_request_data_simulation():
    """Simulate how request data might be processed in Docker"""
    print("=== Request Data Processing Simulation ===\n")
    
    # Simulate request data as it would come from the API
    request_data = {
        "theme": "custom",
        "custom_colors": {
            "primary": "#FF6B6B",
            "secondary": "#4ECDC4", 
            "accent": None,  # Common issue - frontend sends null
            "background": "#2C3E50",
            "text": "#FFFFFF"
        },
        "story_prompt": "Test story",
        "segments": 3
    }
    
    print("Original request data:")
    print(json.dumps(request_data, indent=2))
    
    # Simulate the processing in generate_video function
    theme = request_data.get("theme", "modern")
    custom_colors_raw = request_data.get("custom_colors")
    
    print(f"\nExtracted theme: {theme}")
    print(f"Extracted custom_colors: {custom_colors_raw}")
    
    # Process custom colors like in the service
    custom_colors_dict = None
    if custom_colors_raw:
        if isinstance(custom_colors_raw, dict):
            custom_colors_dict = custom_colors_raw
            # Filter out None values
            custom_colors_dict = {k: v for k, v in custom_colors_dict.items() if v is not None}
            print(f"Processed custom_colors: {custom_colors_dict}")
    
    # Test theme application
    bg_color = _get_theme_background_color(theme, custom_colors_dict)
    print(f"\nFinal background color: {bg_color}")
    
    # This should be #2C3E50 if everything works correctly
    if bg_color == "#2C3E50":
        print("✅ SUCCESS: Theme processing works correctly")
        return True
    else:
        print(f"❌ FAILED: Expected #2C3E50, got {bg_color}")
        return False

def test_ffmpeg_color_format():
    """Test that colors are in the right format for FFmpeg"""
    print("=== FFmpeg Color Format Test ===\n")
    
    # Test various color formats
    test_colors = ["#FF0000", "#00FF00", "#0000FF", "#2C3E50", "#FFFFFF", "#000000"]
    
    for color in test_colors:
        print(f"Testing color: {color}")
        
        # Test that it's a valid hex color
        try:
            rgb = _hex_to_rgb(color)
            print(f"  RGB: {rgb}")
            
            # Test that FFmpeg can use this format (it expects #RRGGBB)
            if color.startswith('#') and len(color) == 7:
                print(f"  ✅ Valid FFmpeg format: {color}")
            else:
                print(f"  ❌ Invalid FFmpeg format: {color}")
                
        except Exception as e:
            print(f"  ❌ Error processing color: {e}")
        print()

if __name__ == "__main__":
    print("🐳 Docker Theme Debug Test\n")
    
    try:
        # Run all tests
        test_docker_theme_scenarios()
        
        print("\n" + "="*60 + "\n")
        
        success = test_request_data_simulation()
        
        print("\n" + "="*60 + "\n")
        
        test_ffmpeg_color_format()
        
        print("\n" + "="*60)
        if success:
            print("🎉 THEME SYSTEM WORKING - Issue might be elsewhere in pipeline")
        else:
            print("❌ THEME SYSTEM HAS ISSUES - Needs debugging")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
