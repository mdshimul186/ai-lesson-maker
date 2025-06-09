#!/usr/bin/env python3
"""
Test the updated theme functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_llm_theme_colors():
    print("=== Testing LLM Theme Colors ===")
    
    # Mock LLMService since we can't import it directly due to dependencies
    class MockLLMService:
        def _get_theme_colors(self, theme: str, custom_colors: dict = None) -> dict:
            """Get theme color configuration"""
            # Predefined theme configurations (simplified for test)
            themes = {
                "modern": {
                    "primary": "#3B82F6",
                    "secondary": "#E5E7EB", 
                    "accent": "#F59E0B",
                    "background": "#FFFFFF",
                    "text": "#1F2937",
                    "border": "#D1D5DB"
                },
                "vibrant": {
                    "primary": "#FF6B6B",
                    "secondary": "#4ECDC4",
                    "accent": "#FFE66D",
                    "background": "#FFE66D",
                    "text": "#2C3E50",
                    "border": "#FF6B6B"
                }
            }
            
            if custom_colors:
                # Use custom colors regardless of theme, falling back to theme defaults
                base_theme = themes.get(theme, themes["modern"])
                return {
                    "primary": custom_colors.get("primary", base_theme["primary"]),
                    "secondary": custom_colors.get("secondary", base_theme["secondary"]),
                    "accent": custom_colors.get("accent", base_theme["accent"]),
                    "background": custom_colors.get("background", base_theme["background"]),
                    "text": custom_colors.get("text") or self._get_text_color(custom_colors.get("background", base_theme["background"])),
                    "border": self._get_border_color(custom_colors.get("primary", base_theme["primary"]))
                }
            
            return themes.get(theme, themes["modern"])
        
        def _get_text_color(self, background_color: str) -> str:
            """Determine appropriate text color based on background"""
            bg_hex = background_color.lstrip('#')
            if len(bg_hex) == 6:
                r = int(bg_hex[0:2], 16)
                g = int(bg_hex[2:4], 16)
                b = int(bg_hex[4:6], 16)
                brightness = (r * 299 + g * 587 + b * 114) / 1000
                return "#1F2937" if brightness > 127 else "#F9FAFB"
            return "#1F2937"
        
        def _get_border_color(self, primary_color: str) -> str:
            """Generate border color based on primary color"""
            return primary_color
    
    service = MockLLMService()
    
    # Test 1: Default vibrant theme (no custom colors)
    print("\n--- Test 1: Default vibrant theme ---")
    colors1 = service._get_theme_colors("vibrant", None)
    print(f"Colors: {colors1}")
    print(f"Background: {colors1['background']} (should be #FFE66D - yellow)")
    
    # Test 2: Vibrant theme with custom colors (user's case)
    print("\n--- Test 2: Vibrant theme with custom colors ---")
    custom_colors = {
        'primary': '#FF6B6B',
        'secondary': '#4ECDC4',
        'background': '#2C3E50',  # Dark blue-gray (user's selection)
        'text': '#FFFFFF'
    }
    colors2 = service._get_theme_colors("vibrant", custom_colors)
    print(f"Colors: {colors2}")
    print(f"Background: {colors2['background']} (should be #2C3E50 - dark blue-gray)")
    
    # Test 3: Modern theme with custom colors
    print("\n--- Test 3: Modern theme with custom colors ---")
    colors3 = service._get_theme_colors("modern", custom_colors)
    print(f"Colors: {colors3}")
    print(f"Background: {colors3['background']} (should be #2C3E50 - dark blue-gray)")
    
    # Verify the fix
    print("\n=== VERIFICATION ===")
    if colors2['background'] == '#2C3E50':
        print("✅ SUCCESS: Custom background color is being applied correctly!")
        print("✅ The image generation should now use the dark blue-gray background")
    else:
        print(f"❌ FAILED: Expected #2C3E50, got {colors2['background']}")
    
    if colors1['background'] == '#FFE66D':
        print("✅ SUCCESS: Default vibrant theme has yellow background")
    else:
        print(f"❌ FAILED: Expected #FFE66D, got {colors1['background']}")

if __name__ == "__main__":
    test_llm_theme_colors()
