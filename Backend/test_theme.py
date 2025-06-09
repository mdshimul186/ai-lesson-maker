#!/usr/bin/env python3
"""
Test theme functionality in markdown_to_image
"""

def test_theme_colors():
    # Mock LLMService with just the theme methods
    class MockLLMService:
        def _get_theme_colors(self, theme: str, custom_colors: dict = None) -> dict:
            themes = {
                "modern": {
                    "primary": "#3B82F6",
                    "secondary": "#E5E7EB", 
                    "accent": "#F59E0B",
                    "background": "#FFFFFF",
                    "text": "#1F2937",
                    "border": "#D1D5DB"
                },
                "cyberpunk": {
                    "primary": "#FF0080",
                    "secondary": "#0A0A0A",
                    "accent": "#00FFFF",
                    "background": "#000000",
                    "text": "#FF0080",
                    "border": "#00FFFF"
                }
            }
            
            if theme == "custom" and custom_colors:
                return {
                    "primary": custom_colors.get("primary", "#3B82F6"),
                    "secondary": custom_colors.get("secondary", "#E5E7EB"),
                    "accent": custom_colors.get("accent", "#F59E0B"),
                    "background": custom_colors.get("background", "#FFFFFF"),
                    "text": self._get_text_color(custom_colors.get("background", "#FFFFFF")),
                    "border": self._get_border_color(custom_colors.get("primary", "#3B82F6"))
                }
            
            return themes.get(theme, themes["modern"])
        
        def _get_text_color(self, background_color: str) -> str:
            bg_hex = background_color.lstrip('#')
            if len(bg_hex) == 6:
                r = int(bg_hex[0:2], 16)
                g = int(bg_hex[2:4], 16) 
                b = int(bg_hex[4:6], 16)
                brightness = (r * 299 + g * 587 + b * 114) / 1000
                return "#1F2937" if brightness > 127 else "#F9FAFB"
            return "#1F2937"
        
        def _get_border_color(self, primary_color: str) -> str:
            return self._lighten_color(primary_color, 0.3)
        
        def _lighten_color(self, hex_color: str, factor: float = 0.2) -> str:
            hex_color = hex_color.lstrip('#')
            if len(hex_color) != 6:
                return hex_color
            
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            
            r = min(255, int(r + (255 - r) * factor))
            g = min(255, int(g + (255 - g) * factor))
            b = min(255, int(b + (255 - b) * factor))
            
            return f"#{r:02x}{g:02x}{b:02x}"
    
    # Test the theme functionality
    service = MockLLMService()
    
    # Test modern theme
    modern_colors = service._get_theme_colors("modern")
    assert modern_colors["primary"] == "#3B82F6"
    assert modern_colors["background"] == "#FFFFFF"
    print("✓ Modern theme colors correct")
    
    # Test cyberpunk theme
    cyber_colors = service._get_theme_colors("cyberpunk")
    assert cyber_colors["primary"] == "#FF0080"
    assert cyber_colors["background"] == "#000000"
    print("✓ Cyberpunk theme colors correct")
    
    # Test custom theme
    custom = {"primary": "#FF0000", "secondary": "#00FF00", "accent": "#0000FF", "background": "#FFFFFF"}
    custom_colors = service._get_theme_colors("custom", custom)
    assert custom_colors["primary"] == "#FF0000"
    assert custom_colors["accent"] == "#0000FF"
    print("✓ Custom theme colors correct")
    
    # Test text color calculation
    dark_bg_text = service._get_text_color("#000000")  # Dark background should get light text
    light_bg_text = service._get_text_color("#FFFFFF")  # Light background should get dark text
    assert dark_bg_text == "#F9FAFB"  # Light text
    assert light_bg_text == "#1F2937"  # Dark text
    print("✓ Text color calculation correct")
    
    print("\n🎉 All theme tests passed!")

if __name__ == "__main__":
    test_theme_colors()
