import sys
import asyncio
if sys.platform.startswith("win"):
    policy = asyncio.WindowsProactorEventLoopPolicy()
    asyncio.set_event_loop_policy(policy)
    asyncio.set_event_loop(policy.new_event_loop())

from openai import OpenAI
from app.config import get_settings
from loguru import logger
from typing import List, Dict, Any
import json
from app.models.const import LANGUAGE_NAMES, Language
from app.exceptions import LLMResponseValidationError
from app.schemas.llm import (
    StoryGenerationRequest,
)
import boto3
import subprocess
import tempfile
from app.utils import utils
import uuid
import os
import time
from playwright.sync_api import sync_playwright
from app.services.upload_service import upload_file_to_s3, generate_unique_object_name

settings = get_settings()


openai_client = None
if settings.openai_api_key:
   openai_client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url or "https://api.openai.com/v1")


class LLMService:
    def __init__(self):
        self.openai_client = openai_client
        # self.text_llm_model = settings.text_llm_model
        # self.image_llm_model = settings.image_llm_model

    async def markdown_to_image(self, markdown_content: str, output_path: str, width: int = 1200, height: int = 800, theme: str = "tech", custom_colors: dict = None) -> None:
        """
        Convert any markdown content to a PNG image using a headless browser.
        
        Args:
            markdown_content: Markdown content (including tables, mermaid, code).
            output_path: Path to save the PNG image.
            width: Width of the image in pixels.
            height: Height of the image in pixels.
            theme: Theme name for styling.
            custom_colors: Custom color configuration if theme is "custom".
        """
        # Get theme colors
        theme_colors = self._get_theme_colors(theme, custom_colors)

        logger.info(f"🎨 THEME DEBUG: Generating image with theme '{theme}' and colors: {theme_colors}")
        
        # HTML template with markdown rendering capabilities and theme support
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js"></script>
            <!-- Load Mermaid as a UMD script to define global `mermaid` -->
            <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
            <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.css" rel="stylesheet" />
            <style>
                :root {
                    --primary-color: {primary_color};
                    --secondary-color: {secondary_color};
                    --accent-color: {accent_color};
                    --background-color: {background_color};
                    --text-color: {text_color};
                    --border-color: {border_color};
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    padding: 40px;
                    background-color: var(--background-color);
                    color: var(--text-color);
                    max-width: 100%;
                    font-size: 1.4em;
                }
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 0.5em;
                    margin-bottom: 0.5em;
                    color: var(--primary-color);
                }
                h1 { 
                    font-size: 32px; 
                    border-bottom: 3px solid var(--accent-color);
                    padding-bottom: 10px;
                }
                h2 { 
                    font-size: 28px;
                    border-bottom: 2px solid var(--secondary-color);
                    padding-bottom: 8px;
                }
                h3 { font-size: 24px; }
                h4 { font-size: 20px; }
                table {
                    border-collapse: collapse;
                    margin: 15px 0;
                    width: 100%;
                    border: 2px solid var(--border-color);
                }
                th, td {
                    border: 1px solid var(--border-color);
                    padding: 12px 16px;
                    text-align: left;
                }
                th {
                    background-color: var(--primary-color);
                    color: var(--background-color);
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: var(--secondary-color);
                }
                tr:hover {
                    background-color: {hover_color};
                }
                code {
                    background-color: var(--secondary-color);
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-family: monospace;
                    color: var(--primary-color);
                }
                pre {
                    background-color: var(--primary-color);
                    color: var(--background-color);
                    border-radius: 5px;
                    padding: 15px;
                    overflow-x: auto;
                    border-left: 4px solid var(--accent-color);
                }
                blockquote {
                    border-left: 4px solid var(--accent-color);
                    margin: 0;
                    padding-left: 20px;
                    color: var(--primary-color);
                    background-color: var(--secondary-color);
                    padding: 15px 20px;
                    border-radius: 0 8px 8px 0;
                }
                .mermaid {
                    text-align: center;
                    margin: 20px 0;
                    padding: 20px;
                    background-color: var(--secondary-color);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                ul, ol {
                    padding-left: 30px;
                }
                li {
                    margin-bottom: 0.5em;
                }
                a {
                    color: var(--accent-color);
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                strong {
                    color: var(--primary-color);
                }
                em {
                    color: var(--accent-color);
                    font-style: italic;
                }
                /* Theme-specific patterns */
                .theme-geometric body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 8px;
                    background: linear-gradient(45deg, var(--primary-color) 25%, var(--accent-color) 25%, var(--accent-color) 50%, var(--primary-color) 50%, var(--primary-color) 75%, var(--accent-color) 75%);
                    background-size: 40px 40px;
                    z-index: 1000;
                }
                .theme-cyberpunk {
                    text-shadow: 0 0 5px var(--accent-color);
                }
                .theme-cyberpunk h1, .theme-cyberpunk h2 {
                    text-shadow: 0 0 10px var(--accent-color);
                }
            </style>
        </head>
        <body class="theme-{theme_class}">
            <div id="content"></div>
            <script>
                // Initialize markdown-it
                const md = markdownit({ html: true, breaks: true, linkify: true });
                
                // Original markdown content with mermaid fences
                const markdownContent = `{markdown_content}`;
                // Preprocess code fences: convert mermaid blocks to HTML divs
                const processed = markdownContent.replace(/```mermaid([\\s\\S]*?)```/g, (match, code) => {
                    return `<div class=\"mermaid\">${code.trim()}</div>`;
                });
                // Render HTML from markdown
                const html = md.render(processed);
                // Insert into page
                document.getElementById('content').innerHTML = html;
                
                // Initialize mermaid with theme colors
                const mermaidTheme = '{mermaid_theme}';
                mermaid.initialize({ 
                    startOnLoad: false, 
                    theme: mermaidTheme, 
                    securityLevel: 'loose',
                    themeVariables: {
                        primaryColor: '{primary_color}',
                        secondaryColor: '{secondary_color}',
                        tertiaryColor: '{accent_color}',
                        background: '{background_color}',
                        primaryTextColor: '{text_color}',
                        primaryBorderColor: '{border_color}'
                    }
                });
                mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                
                // Apply syntax highlighting
                Prism.highlightAll();
                
                // Signal when rendering is complete
                window.renderingComplete = true;
            </script>
        </body>
        </html>
        """
        
        # Apply theme colors to the template
        theme_class = theme.replace('_', '-')
        mermaid_theme = self._get_mermaid_theme(theme)
        hover_color = self._lighten_color(theme_colors['secondary'])
        
        html_content = html_template.replace('{primary_color}', theme_colors['primary'])
        html_content = html_content.replace('{secondary_color}', theme_colors['secondary'])
        html_content = html_content.replace('{accent_color}', theme_colors['accent'])
        html_content = html_content.replace('{background_color}', theme_colors['background'])
        html_content = html_content.replace('{text_color}', theme_colors['text'])
        html_content = html_content.replace('{border_color}', theme_colors['border'])
        html_content = html_content.replace('{theme_class}', theme_class)
        html_content = html_content.replace('{mermaid_theme}', mermaid_theme)
        html_content = html_content.replace('{hover_color}', hover_color)
        html_content = html_content.replace('{markdown_content}', markdown_content.replace('`', '\\`').replace('$', '\\$'))
        
        # Create temporary HTML file
        with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f:
            f.write(html_content)
            temp_html_path = f.name
        
        try:
            # Use synchronous Playwright in a thread to render mermaid
            def _render():
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    page = browser.new_page()
                    page.set_viewport_size({"width": width, "height": height})
                    # Navigate and wait until network is idle (all scripts loaded)
                    page.goto(f"file://{temp_html_path}", wait_until="networkidle")
                    # Give extra time for mermaid diagrams and syntax highlighting to complete
                    page.wait_for_timeout(1000)
                    page.screenshot(path=output_path, full_page=True)
                    browser.close()

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _render)
        finally:
            # Clean up temporary HTML file
            os.unlink(temp_html_path)
    
    async def generate_story(self, request: StoryGenerationRequest) -> List[Dict[str, Any]]:
        """Generate story scenes"""
        messages = [
            {"role": "system", "content": "You are a professional teacher, skilled at teaching. Please return content in JSON format only."},
            {"role": "user", "content": await self._get_Teaching_prompt(request.story_prompt, request.language, request.segments, request.visual_content_in_language)}
        ]
        logger.info(f"prompt messages: {json.dumps(messages, indent=4, ensure_ascii=False)}")
        response = await self._generate_response(messages=messages, response_format="json_object")
        response = response["list"]
        response = self.normalize_keys(response)

        logger.info(f"Generated story: {json.dumps(response, indent=4, ensure_ascii=False)}")
        self._validate_story_response(response)
        
        return response
    
    def normalize_keys(self, data):
        """Normalize response keys"""
        if isinstance(data, dict):
            if "text" in data:
                other_keys = [key for key in data.keys() if key != "text"]
                if len(other_keys) == 1:
                    data["image_prompt"] = data.pop(other_keys[0])
                elif len(other_keys) > 1:
                    raise ValueError(f"Unexpected extra keys: {other_keys}. Only one non-'text' key is allowed.")
            return data
        elif isinstance(data, list):            return [self.normalize_keys(item) for item in data]
        else:
            raise TypeError("Input must be a dict or list of dicts")
            
    async def generate_image(self, *, prompt: str, image_llm_provider: str = None, image_llm_model: str = None, resolution: str = "1280*720", theme: str = "modern", custom_colors: dict = None) -> str:
        """Generate image from markdown content"""
        image_llm_provider = image_llm_provider or settings.image_provider
        image_llm_model = image_llm_model or settings.image_llm_model

        try:
            if image_llm_provider == "openai":
                # Generate a temporary local file
                object_name = generate_unique_object_name("image.png")
                local_file = tempfile.NamedTemporaryFile(suffix=os.path.splitext(object_name)[1], delete=False)
                local_file_path = local_file.name
                local_file.close()

                logger.info(f"Generated temporary file: {local_file_path}")
                width, height = map(int, resolution.split("*"))
                # Use the headless browser markdown renderer with theme support
                await self.markdown_to_image(prompt, local_file_path, width, height, theme, custom_colors)

                logger.info(f"Generated image file: {local_file_path}")
                
                # Upload the image file using the upload service
                content_type = "image/png"
                url = await upload_file_to_s3(local_file_path, object_name, content_type)

                return url

        except Exception as e:
            logger.error(f"Failed to generate image: {e}")
            return ""

    async def generate_story_with_images(self, request: StoryGenerationRequest) -> List[Dict[str, Any]]:
        """Generate story and images"""
        # First generate the story
        story_segments = await self.generate_story(request)

        # Generate images for each scene
        for segment in story_segments:
            try:
                image_url = await self.generate_image(
                    prompt=segment["image_prompt"], 
                    resolution=request.resolution, 
                    image_llm_provider=request.image_llm_provider, 
                    image_llm_model=request.image_llm_model,
                    theme=getattr(request, 'theme', 'modern'),
                    custom_colors=getattr(request, 'custom_colors', None)
                )
                segment["url"] = image_url
            except Exception as e:
                logger.error(f"Failed to generate image for segment: {e}")
                segment["url"] = None

        return story_segments
    
    def get_llm_providers(self) -> Dict[str, List[str]]:
        """Get available LLM providers"""
        imgLLMList = []
        textLLMList = []
        if settings.openai_api_key:
            textLLMList.append("openai")
            imgLLMList.append("openai")
        if settings.aliyun_api_key:
            textLLMList.append("aliyun")
            imgLLMList.append("aliyun")
        if settings.deepseek_api_key:
            textLLMList.append("deepseek")
        if settings.ollama_api_key:
            textLLMList.append("ollama")
        if settings.siliconflow_api_key:
            textLLMList.append("siliconflow")
            imgLLMList.append("siliconflow")
        return {"textLLMProviders": textLLMList, "imageLLMProviders": imgLLMList}

    def _validate_story_response(self, response: any) -> None:
        """Validate story generation response"""
        if not isinstance(response, list):
            raise LLMResponseValidationError("Response must be an array")

        for i, scene in enumerate(response):
            if not isinstance(scene, dict):
                raise LLMResponseValidationError(f"story item {i} must be an object")
            if "text" not in scene:
                raise LLMResponseValidationError(f"Scene {i} missing 'text' field")
            if "image_prompt" not in scene:
                raise LLMResponseValidationError(f"Scene {i} missing 'image_prompt' field")
            if not isinstance(scene["text"], str):
                raise LLMResponseValidationError(f"Scene {i} 'text' must be a string")
            if not isinstance(scene["image_prompt"], str):
                raise LLMResponseValidationError(f"Scene {i} 'image_prompt' must be a string")

    async def _generate_response(self, *, messages: List[Dict[str, str]], response_format: str = "json_object") -> any:
        """Generate LLM response"""
        text_llm_provider = "openai"
        
        if text_llm_provider == "openai":
            text_client = self.openai_client
        else:
            raise ValueError(f"Unsupported text LLM provider: {text_llm_provider}")

        text_llm_model = "gpt-4o"

        response = text_client.chat.completions.create(
            model=text_llm_model,
            response_format={"type": response_format},
            messages=messages,
        )
        
        try:
            content = response.choices[0].message.content
            result = json.loads(content)
            return result
        except Exception as e:
            logger.error(f"Failed to parse response: {e}")
            raise e

    async def _get_Teaching_prompt(self, story_prompt: str = None, language: str = "English", segments: int = 3, visual_content_in_language: bool = False) -> str:
        """Generate teaching prompt with unified markdown format"""
       
      

        if visual_content_in_language:
            visual_content_in_language_value = language
        else:
            visual_content_in_language_value = "English"


        if story_prompt:
            base_prompt = f"Prepare a lecture：{story_prompt}"
        else:
            base_prompt = "Prepare a lecture"
        
        return f"""
        {base_prompt}. The lecture needs to be divided into {segments} slides, and each slide must include descriptive text and a visualization in markdown format.

        Please return the result in the following JSON format:

        {{
            "list": [
                {{
                    "text": "Descriptive text for the chapter not less than 140 characters",
                    "image_prompt": "Markdown content for visualization (can be mermaid diagrams, tables, or code blocks)"
                }},
                {{
                    "text": "Another scene description text not less than 140 characters",
                    "image_prompt": "Another markdown visualization"
                }}
            ]
        }}

        **Requirements**:
        1. The root object must contain a key named `list`.
        2. Each object in the `list` array must include:
            - `text`: A descriptive text for the chapter, written in {language}.
            - `image_prompt`: Markdown content for visualization {visual_content_in_language_value}.
        3. Use appropriate markdown syntax for different visualizations.
        4. Following each visualization (code block, diagram, or table), include a bullet point list or a table summarizing the key points of the visualization.

        **Available Visualization Types**:

        **1. Mermaid Diagrams** (for flowcharts, diagrams, etc.):
        ```
        ```mermaid
        flowchart TD
            A[Start] --> B[Process]
            B --> C{{Decision}}
            C -->|Yes| D[Action 1]
            C -->|No| E[Action 2]
            D --> F[End]
            E --> F
        ```
        ```

        **Mermaid Formatting Guidelines**:
        - Begin and end code fences on their own lines: ```mermaid and ```
        - Do not escape backticks within mermaid fences; use raw triple backticks.
        - Ensure the diagram code is enclosed exactly between the fences without extra indentation.

        **2. Tables** (for data comparison):
        ```
        | Feature | Python | JavaScript | Java |
        |---------|---------|------------|------|
        | Syntax | Simple | Flexible | Verbose |
        | Speed | Moderate | Fast | Fast |
        | Use Case | Data Science | Web Development | Enterprise |
        ```

        **3. Code Blocks** (for technical examples):
        ```
        ```javascript
        // Function declaration
        function greet(name) {{
            return `Hello, ${{name}}!`;
        }}

        // Function usage
        const message = greet('World');
        console.log(message);
        ```
        ```

        **4. Mixed Content** (combining multiple types):
        ```
        ## System Architecture Overview

        ```mermaid
        flowchart LR
            A[Frontend] --> B[API Gateway]
            B --> C[Service 1]
            B --> D[Service 2]
            C --> E[Database]
            D --> E
        ```

        ### Key Components:

        | Component | Purpose | Technology |
        |-----------|---------|------------|
        | Frontend | User Interface | React |
        | API Gateway | Request Routing | Node.js |
        | Services | Business Logic | Python |
        | Database | Data Storage | PostgreSQL |

        > **Note:** This architecture ensures scalability and maintainability.
        ```

        **Example outputs**:

        For a conceptual overview:
        {{
            "list": [
                {{
                    "text": "Introduction to programming concepts",
                    "image_prompt": "# Programming Fundamentals\n\n```mermaid\nmindmap\n  root((Programming))\n    Fundamentals\n      Variables\n      Functions\n    Control Flow\n      Loops\n      Conditions\n```\n\n### Key Concepts:\n\n| Concept | Description |\n|---------|-------------|\n| Variables | Store data values |\n| Functions | Reusable code blocks |\n| Loops | Repeat operations |\n| Conditions | Control flow |"
                }}
            ]
        }}

        For technical documentation:
        {{
            "list": [
                {{
                    "text": "Asynchronous programming in JavaScript",
                    "image_prompt": "# Asynchronous JavaScript\n\n## Promise-based Approach\n\n```javascript\nasync function fetchData() {{\n  try {{\n    const response = await fetch('https://api.example.com/data');\n    const data = await response.json();\n    console.log(data);\n  }} catch (error) {{\n    console.error('Error:', error);\n  }}\n}}\n\n// Usage\nfetchData();\n```\n\n### Flow Diagram:\n\n```mermaid\nsequenceDiagram\n    participant App\n    participant API\n    App->>API: fetch request\n    API-->>App: response\n    App->>App: process data\n```"
                }}
            ]
        }}
        """


    def _get_theme_colors(self, theme: str, custom_colors: dict = None) -> dict:
        """Get theme color configuration"""
        # Predefined theme configurations
        themes = {
            "modern": {
                "primary": "#3B82F6",
                "secondary": "#E5E7EB", 
                "accent": "#F59E0B",
                "background": "#FFFFFF",
                "text": "#1F2937",
                "border": "#D1D5DB"
            },
            "professional": {
                "primary": "#1E40AF",
                "secondary": "#F8FAFC",
                "accent": "#059669", 
                "background": "#FFFFFF",
                "text": "#374151",
                "border": "#9CA3AF"
            },
            "creative": {
                "primary": "#7C3AED",
                "secondary": "#FEF3C7",
                "accent": "#F59E0B",
                "background": "#FEFEFE", 
                "text": "#581C87",
                "border": "#A855F7"
            },
            "education": {
                "primary": "#059669",
                "secondary": "#DBEAFE",
                "accent": "#DC2626",
                "background": "#FFFFFF",
                "text": "#047857",
                "border": "#10B981"
            },
            "vibrant": {
                "primary": "#FF6B6B",
                "secondary": "#4ECDC4",
                "accent": "#FFE66D",
                "background": "#FFE66D",
                "text": "#2C3E50",
                "border": "#FF6B6B"
            },
            "tech": {
                "primary": "#6366F1",
                "secondary": "#111827",
                "accent": "#10B981",
                "background": "#000000",
                "text": "#F9FAFB",
                "border": "#4B5563"
            },
            "warm": {
                "primary": "#DC2626",
                "secondary": "#FEF2F2", 
                "accent": "#F59E0B",
                "background": "#FFFBEB",
                "text": "#7F1D1D",
                "border": "#FCA5A5"
            },
            "geometric": {
                "primary": "#2563EB",
                "secondary": "#F1F5F9",
                "accent": "#EF4444",
                "background": "#FFFFFF",
                "text": "#1E40AF",
                "border": "#3B82F6"
            },
            "nature": {
                "primary": "#16A34A",
                "secondary": "#F0FDF4",
                "accent": "#CA8A04",
                "background": "#FEFFFE",
                "text": "#15803D",
                "border": "#22C55E"
            },
            "cyberpunk": {
                "primary": "#FF0080",
                "secondary": "#0A0A0A",
                "accent": "#00FFFF",
                "background": "#000000",
                "text": "#FF0080",
                "border": "#00FFFF"
            },
            "monochrome": {
                "primary": "#000000",
                "secondary": "#F8F9FA",
                "accent": "#6B7280",
                "background": "#FFFFFF",
                "text": "#374151",
                "border": "#9CA3AF"
            },
            "sunset": {
                "primary": "#F97316",
                "secondary": "#FFF7ED",
                "accent": "#DC2626",
                "background": "#FFFBEB",
                "text": "#EA580C",
                "border": "#FB923C"
            },
            "ocean": {
                "primary": "#0EA5E9",
                "secondary": "#F0F9FF",
                "accent": "#06B6D4",
                "background": "#FFFFFF",
                "text": "#0C4A6E",
                "border": "#38BDF8"
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
        # Simple heuristic: if background is light, use dark text, otherwise light text
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
        # Lighten the primary color for border
        return self._lighten_color(primary_color, 0.3)
    
    def _lighten_color(self, hex_color: str, factor: float = 0.2) -> str:
        """Lighten a hex color by a factor"""
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
    
    def _get_mermaid_theme(self, theme: str) -> str:
        """Get appropriate mermaid theme based on our theme"""
        theme_mapping = {
            "modern": "default",
            "professional": "neutral",
            "creative": "base",
            "education": "forest",
            "tech": "dark",
            "warm": "base",
            "geometric": "neutral",
            "nature": "forest",
            "cyberpunk": "dark",
            "monochrome": "neutral",
            "sunset": "base",
            "ocean": "neutral",
            "custom": "neutral"
        }
        return theme_mapping.get(theme, "neutral")

# Instantiate the service
llm_service = LLMService()