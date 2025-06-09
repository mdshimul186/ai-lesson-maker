#!/usr/bin/env python3
"""
Simple test for theme functions without dependencies
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test the theme utility functions directly
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

def _get_theme_subtitle_style(theme: str, custom_colors=None) -> str:
    """Get subtitle style for theme"""
    theme_colors = _get_theme_colors(theme, custom_colors)
    text_color = theme_colors.get('text', '#000000')
    
    # Convert to RGB for FFmpeg
    rgb = _hex_to_rgb(text_color)
    
    # Create FFmpeg subtitle style
    return f"fontcolor={text_color}:fontsize=24:fontfile=/System/Library/Fonts/Arial.ttf"

if __name__ == "__main__":
    print("=== Testing Theme Functions ===")
    
    # Test 1: vibrant theme with custom colors
    theme = 'vibrant'
    custom_colors = {
        'primary': '#FF6B6B',
        'secondary': '#4ECDC4', 
        'background': '#2C3E50',  # Dark blue-gray
        'text': '#FFFFFF'         # White text
    }

    print(f'Theme: {theme}')
    print(f'Custom colors: {custom_colors}')

    theme_colors = _get_theme_colors(theme, custom_colors)
    print(f'Theme colors: {theme_colors}')

    bg_color = _get_theme_background_color(theme, custom_colors)
    print(f'Background color: {bg_color}')

    subtitle_style = _get_theme_subtitle_style(theme, custom_colors)
    print(f'Subtitle style: {subtitle_style}')

    rgb = _hex_to_rgb('#2C3E50')
    print(f'RGB conversion: {rgb}')

    # Test 2: Without custom colors
    print('\n=== Testing without custom colors ===')
    bg_color_default = _get_theme_background_color('vibrant', None)
    print(f'Default vibrant background: {bg_color_default}')

    # Test 3: Unknown theme
    print('\n=== Testing unknown theme ===')
    bg_color_unknown = _get_theme_background_color('unknown_theme', None)
    print(f'Unknown theme background: {bg_color_unknown}')
    
    # Test 4: Expected FFmpeg background filter
    print('\n=== Expected FFmpeg Filter ===')
    rgb_bg = _hex_to_rgb(bg_color)
    print(f'Background RGB: {rgb_bg}')
    print(f'Expected filter should contain: color=c={bg_color}:size=1280x720:rate=1')
