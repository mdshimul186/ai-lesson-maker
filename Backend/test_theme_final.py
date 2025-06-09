#!/usr/bin/env python3
"""
Test theme functions with the exact data format from frontend
"""

# Copy the theme functions directly to avoid import issues
def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return (0, 0, 0)
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (0, 0, 0)

def _get_theme_colors(theme: str, custom_colors=None):
    """Get theme color scheme"""
    if custom_colors:
        return custom_colors
    
    theme_colors = {
        'modern': {
            'primary': '#007AFF',
            'secondary': '#34C759',
            'background': '#F2F2F7',
            'text': '#000000'
        },
        'dark': {
            'primary': '#0A84FF',
            'secondary': '#30D158',
            'background': '#1C1C1E',
            'text': '#FFFFFF'
        },
        'vibrant': {
            'primary': '#FF6B6B',
            'secondary': '#4ECDC4',
            'background': '#FFE66D',
            'text': '#2C3E50'
        },
        'elegant': {
            'primary': '#8E44AD',
            'secondary': '#3498DB',
            'background': '#ECF0F1',
            'text': '#2C3E50'
        },
        'nature': {
            'primary': '#27AE60',
            'secondary': '#F39C12',
            'background': '#E8F8F5',
            'text': '#1B4332'
        }
    }
    
    return theme_colors.get(theme, theme_colors['modern'])

def _get_theme_background_color(theme: str, custom_colors=None) -> str:
    """Get background color for theme"""
    theme_colors = _get_theme_colors(theme, custom_colors)
    return theme_colors.get('background', '#FFFFFF')

def _get_theme_subtitle_style(theme: str, custom_colors=None, font_size: int = 30) -> str:
    """Get subtitle style configuration for FFmpeg"""
    colors = _get_theme_colors(theme, custom_colors)
    
    # Use primary color for text, with appropriate outline/shadow
    primary_color = colors.get("primary", "#FFFFFF")
    background_color = colors.get("background", "#000000")
    
    # Convert hex colors to RGB for FFmpeg
    primary_rgb = _hex_to_rgb(primary_color)
    
    # Determine if we need light or dark outline based on background
    bg_rgb = _hex_to_rgb(background_color)
    bg_brightness = sum(bg_rgb) / 3
    
    # Use dark outline on light backgrounds, light outline on dark backgrounds
    outline_color = "0x000000" if bg_brightness > 127 else "0xFFFFFF"
    
    # Build style string for FFmpeg subtitles filter
    style_parts = [
        f"Fontname=MicrosoftYaHeiBold",
        f"FontSize={font_size}",
        f"PrimaryColour=0x{primary_color[1:]}",  # Remove # and add 0x prefix
        f"OutlineColour={outline_color}",
        f"BorderStyle=3",  # Outline + shadow
        f"Outline=2",      # Outline width
        f"Shadow=1",       # Shadow depth
        f"Alignment=2",    # Bottom center
        f"MarginV=50"      # Vertical margin from bottom
    ]
    
    return ",".join(style_parts)

def test_theme_with_frontend_data():
    print("=== Testing Theme Functions with Frontend Data Format ===")
    
    # This is the exact data that would come from frontend
    theme = "vibrant"
    custom_colors_from_frontend = {
        'primary': '#FF6B6B',
        'secondary': '#4ECDC4',
        'accent': None,
        'background': '#2C3E50',
        'text': '#FFFFFF'
    }
    
    print(f"Theme: {theme}")
    print(f"Custom colors: {custom_colors_from_frontend}")
    
    # Test the theme functions
    bg_color = _get_theme_background_color(theme, custom_colors_from_frontend)
    subtitle_style = _get_theme_subtitle_style(theme, custom_colors_from_frontend, 30)
    
    print(f"\nBackground color: {bg_color}")
    print(f"Subtitle style: {subtitle_style}")
    
    # Generate what the FFmpeg filter should look like
    filter_chain = f"[0:v]scale=1280:720,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color={bg_color}"
    print(f"\nExpected filter chain fragment: {filter_chain}")
    
    # Test RGB conversion
    rgb = _hex_to_rgb(bg_color)
    print(f"Background RGB: {rgb}")
    
    if bg_color == "#2C3E50":
        print("✅ CORRECT: Background should be dark blue-gray (#2C3E50)")
    else:
        print(f"❌ WRONG: Background is {bg_color}, should be #2C3E50")
    
    print("\n" + "="*60)
    print("DIAGNOSIS:")
    
    if bg_color == "#2C3E50":
        print("✅ Theme system is working correctly")
        print("✅ Custom colors are being applied")
        print("✅ Background should be dark blue-gray, not white")
        print("")
        print("🔍 The issue might be:")
        print("1. Frontend not sending theme/custom_colors")
        print("2. FFmpeg command not being executed properly")
        print("3. Generated video not reflecting the filter chain")
        print("4. Test with actual video generation needed")
    else:
        print("❌ Theme system has an issue with color extraction")

if __name__ == "__main__":
    test_theme_with_frontend_data()
