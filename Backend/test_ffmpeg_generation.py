#!/usr/bin/env python3
"""
Test the actual FFmpeg command generation with theme
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Copy the theme functions and FFmpeg generation logic
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

def test_ffmpeg_command_generation():
    print("=== Testing FFmpeg Command Generation ===")
    
    # Test scenario 1: Custom dark theme
    theme = "vibrant"
    custom_colors = {
        'primary': '#FF6B6B',
        'secondary': '#4ECDC4', 
        'background': '#2C3E50',  # Dark blue-gray
        'text': '#FFFFFF'         # White text
    }
    
    print(f"Theme: {theme}")
    print(f"Custom colors: {custom_colors}")
    
    background_color = _get_theme_background_color(theme, custom_colors)
    subtitle_style = _get_theme_subtitle_style(theme, custom_colors, 30)
    
    print(f"Background color: {background_color}")
    print(f"Subtitle style: {subtitle_style}")
    
    # Simulate the filter chain construction
    target_width, target_height = 1920, 1080
    resize_width, resize_height = 1920, 1080
    
    filter_chain = (
        f"[0:v]scale={resize_width}:{resize_height},"
        f"pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:color={background_color}"
    )
    
    # Simulate subtitle addition
    subtitle_file = "test.srt"
    sub_filename = os.path.basename(subtitle_file)
    filter_chain += f",subtitles='{sub_filename}':force_style='{subtitle_style}'"
    filter_chain += "[v]"
    
    print(f"\nFilter chain: {filter_chain}")
    
    # Simulate full FFmpeg command
    command = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", "image.png",
        "-i", "audio.mp3",
        "-c:v", "libx264", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
        "-pix_fmt", "yuv420p",
        "-t", "10.0",
        "-filter_complex", filter_chain,
        "-map", "[v]",
        "-map", "1:a",
        "output.mp4"
    ]
    
    print(f"\nFull FFmpeg command:")
    print(" ".join(command))
    
    # Test RGB conversion
    rgb = _hex_to_rgb(background_color)
    print(f"\nBackground RGB: {rgb}")
    print(f"This should give you RGB({rgb[0]}, {rgb[1]}, {rgb[2]}) = Dark blue-gray")
    
    # Test scenario 2: Default vibrant theme (should be yellow background)
    print("\n" + "="*60)
    print("=== Testing Default Vibrant Theme (No Custom Colors) ===")
    
    bg_default = _get_theme_background_color("vibrant", None)
    print(f"Default vibrant background: {bg_default}")
    rgb_default = _hex_to_rgb(bg_default)
    print(f"Default vibrant RGB: {rgb_default}")
    print(f"This should be RGB({rgb_default[0]}, {rgb_default[1]}, {rgb_default[2]}) = Yellow")

if __name__ == "__main__":
    test_ffmpeg_command_generation()
