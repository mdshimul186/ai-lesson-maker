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

settings = get_settings()


openai_client = None
if settings.openai_api_key:
   openai_client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url or "https://api.openai.com/v1")


class LLMService:
    def __init__(self):
        self.openai_client = openai_client
        # self.text_llm_model = settings.text_llm_model
        # self.image_llm_model = settings.image_llm_model

    async def markdown_to_image(self, markdown_content: str, output_path: str, width: int = 1200, height: int = 800) -> None:
        """
        Convert any markdown content to a PNG image using a headless browser.
        
        Args:
            markdown_content: Markdown content (including tables, mermaid, code).
            output_path: Path to save the PNG image.
            width: Width of the image in pixels.
            height: Height of the image in pixels.
        """
        # HTML template with markdown rendering capabilities
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
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    padding: 40px;
                    background-color: white;
                    color: #333;
                    max-width: 100%;
                    font-size: 1.4em;
                }
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 0.5em;
                    margin-bottom: 0.5em;
                }
                h1 { font-size: 32px; }
                h2 { font-size: 28px; }
                h3 { font-size: 24px; }
                h4 { font-size: 20px; }
                table {
                    border-collapse: collapse;
                    margin: 15px 0;
                    width: 100%;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px 12px;
                    text-align: left;
                }
                th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                code {
                    background-color: #f5f5f5;
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-family: monospace;
                }
                pre {
                    background-color: #2d2d2d;
                    border-radius: 5px;
                    padding: 15px;
                    overflow-x: auto;
                }
                blockquote {
                    border-left: 4px solid #ddd;
                    margin: 0;
                    padding-left: 20px;
                    color: #666;
                }
                .mermaid {
                    text-align: center;
                    margin: 20px 0;
                }
                ul, ol {
                    padding-left: 30px;
                }
                li {
                    margin-bottom: 0.5em;
                }
            </style>
        </head>
        <body>
            <div id="content"></div>
            <script>
                // Initialize markdown-it
                const md = markdownit({ html: true, breaks: true, linkify: true });
                
                // Original markdown content with mermaid fences
                const markdownContent = `{markdown_content}`;
                // Preprocess code fences: convert mermaid blocks to HTML divs
                const processed = markdownContent.replace(/```mermaid([\s\S]*?)```/g, (match, code) => {
                    return `<div class=\"mermaid\">${code.trim()}</div>`;
                });
                // Render HTML from markdown
                const html = md.render(processed);
                // Insert into page
                document.getElementById('content').innerHTML = html;
                
                // Initialize mermaid and render diagrams
                mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
                mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                
                // Apply syntax highlighting
                Prism.highlightAll();
                
                // Signal when rendering is complete
                window.renderingComplete = true;
            </script>
        </body>
        </html>
        """
        
        # Escape the markdown content for JavaScript
        escaped_content = markdown_content.replace('`', '\\`').replace('$', '\\$')
        html_content = html_template.replace('{markdown_content}', escaped_content)
        
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
        elif isinstance(data, list):
            return [self.normalize_keys(item) for item in data]
        else:
            raise TypeError("Input must be a dict or list of dicts")

    async def generate_image(self, *, prompt: str, image_llm_provider: str = None, image_llm_model: str = None, resolution: str = "1280*720") -> str:
        """Generate image from markdown content"""
        image_llm_provider = image_llm_provider or settings.image_provider
        image_llm_model = image_llm_model or settings.image_llm_model

        try:
            if image_llm_provider == "openai":
                # Generate a temporary local file
                object_name = f"{uuid.uuid4()}.png"
                local_file = tempfile.NamedTemporaryFile(suffix=os.path.splitext(object_name)[1], delete=False)
                local_file_path = local_file.name
                local_file.close()

                logger.info(f"Generated temporary file: {local_file_path}")
                width, height = map(int, resolution.split("*"))
                # Use the headless browser markdown renderer
                await self.markdown_to_image(prompt, local_file_path, width, height)

                # logger.info(f"Generated image file: {local_file_path}")
                minio_endpoint = settings.minio_endpoint
                minio_access_key = settings.minio_access_key
                minio_secret_key = settings.minio_secret_key


                # Upload to S3/MinIO
                s3 = boto3.client(
                    's3',
                    endpoint_url=minio_endpoint,
                    aws_access_key_id=minio_access_key,
                    aws_secret_access_key=minio_secret_key,
                    region_name='us-east-1',
                )

                bucket_name = settings.bucket_name

                # Create bucket if not exists
                try:
                    s3.create_bucket(Bucket=bucket_name)
                except s3.exceptions.BucketAlreadyOwnedByYou:
                    pass
                except s3.exceptions.BucketAlreadyExists:
                    pass

                # Upload the image file
                with open(local_file_path, 'rb') as image_file:
                    s3.upload_fileobj(image_file, bucket_name, object_name)
                    # construct URL using configured MinIO endpoint
                    url = f"{minio_endpoint}/{bucket_name}/{object_name}"

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
                    image_llm_model=request.image_llm_model
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
        3. Use appropriate markdown syntax for different visualizations:

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


# Initialize the LLMService instance
llm_service = LLMService()