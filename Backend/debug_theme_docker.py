#!/usr/bin/env python3
"""
Docker-compatible debug script for theme issues in /generate API
"""
import os
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_recent_tasks():
    """Check recent task directories for theme-related data"""
    print("=== Checking Recent Tasks ===\n")
    
    tasks_dir = "./tasks"
    if not os.path.exists(tasks_dir):
        print(f"❌ Tasks directory not found: {tasks_dir}")
        return []
    
    # Get all task directories
    task_dirs = []
    for item in os.listdir(tasks_dir):
        task_path = os.path.join(tasks_dir, item)
        if os.path.isdir(task_path):
            task_dirs.append((item, task_path))
    
    # Sort by modification time (most recent first)
    task_dirs.sort(key=lambda x: os.path.getmtime(x[1]), reverse=True)
    
    print(f"Found {len(task_dirs)} task directories")
    
    recent_tasks = []
    for i, (task_id, task_path) in enumerate(task_dirs[:5]):  # Check last 5 tasks
        print(f"\n--- Task {i+1}: {task_id} ---")
        
        # Check for story.json
        story_file = os.path.join(task_path, "story.json")
        if os.path.exists(story_file):
            try:
                with open(story_file, 'r', encoding='utf-8') as f:
                    story_data = json.load(f)
                
                theme = story_data.get('theme', 'NOT_SET')
                custom_colors = story_data.get('custom_colors', 'NOT_SET')
                
                print(f"  Theme: {theme}")
                print(f"  Custom Colors: {custom_colors}")
                
                recent_tasks.append({
                    'task_id': task_id,
                    'theme': theme,
                    'custom_colors': custom_colors,
                    'story_data': story_data
                })
                
                # Check if video was generated
                video_file = os.path.join(task_path, "video.mp4")
                if os.path.exists(video_file):
                    print(f"  ✅ Video generated: {os.path.getsize(video_file)} bytes")
                else:
                    print(f"  ❌ No video file found")
                    
            except Exception as e:
                print(f"  ❌ Error reading story.json: {e}")
        else:
            print(f"  ❌ No story.json found")
    
    return recent_tasks

def analyze_ffmpeg_logs():
    """Look for FFmpeg command logs that might show theme application"""
    print("\n=== Analyzing FFmpeg Usage ===\n")
    
    # Check if there are any log files or recent terminal output
    tasks_dir = "./tasks"
    if not os.path.exists(tasks_dir):
        return
    
    # Look for any files that might contain FFmpeg commands
    for task_dir in os.listdir(tasks_dir):
        task_path = os.path.join(tasks_dir, task_dir)
        if not os.path.isdir(task_path):
            continue
            
        print(f"Checking task: {task_dir}")
        
        # Look for any log files or debug output
        for file in os.listdir(task_path):
            if file.endswith(('.log', '.txt')) or 'debug' in file.lower():
                file_path = os.path.join(task_path, file)
                print(f"  Found log file: {file}")
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'color=' in content or 'pad=' in content:
                            print(f"    📹 FFmpeg color usage found:")
                            lines = content.split('\n')
                            for line in lines:
                                if 'color=' in line or 'pad=' in line:
                                    print(f"      {line.strip()}")
                except Exception as e:
                    print(f"    ❌ Error reading {file}: {e}")

def create_test_request():
    """Create a test request to verify the theme system"""
    print("\n=== Creating Test Request ===\n")
    
    test_request = {
        "story_prompt": "A test story about debugging themes",
        "segments": 2,
        "language": "English",
        "theme": "tech",  # Use a predefined theme first
        "custom_colors": None,
        "test_mode": False,
        "include_subtitles": True,
        "resolution": "1280*720"
    }
    
    print("Test request (predefined theme):")
    print(json.dumps(test_request, indent=2))
    
    # Also create a custom theme test
    custom_test_request = {
        "story_prompt": "A test story with custom colors",
        "segments": 2,
        "language": "English", 
        "theme": "custom",
        "custom_colors": {
            "primary": "#FF6B6B",
            "secondary": "#4ECDC4",
            "accent": "#F59E0B",
            "background": "#2C3E50",
            "text": "#FFFFFF"
        },
        "test_mode": False,
        "include_subtitles": True,
        "resolution": "1280*720"
    }
    
    print("\nTest request (custom theme):")
    print(json.dumps(custom_test_request, indent=2))
    
    return test_request, custom_test_request

def check_docker_environment():
    """Check Docker environment for potential issues"""
    print("\n=== Docker Environment Check ===\n")
    
    # Check if we're in Docker
    if os.path.exists('/.dockerenv'):
        print("✅ Running in Docker container")
    else:
        print("❓ May not be running in Docker")
    
    # Check Python packages
    try:
        import fastapi
        print(f"✅ FastAPI version: {fastapi.__version__}")
    except ImportError:
        print("❌ FastAPI not available")
    
    try:
        import pydantic
        print(f"✅ Pydantic version: {pydantic.__version__}")
    except ImportError:
        print("❌ Pydantic not available")
    
    # Check if FFmpeg is available
    import subprocess
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ FFmpeg available")
            # Extract version
            lines = result.stdout.split('\n')
            if lines:
                print(f"   {lines[0]}")
        else:
            print("❌ FFmpeg not working")
    except Exception as e:
        print(f"❌ FFmpeg check failed: {e}")
    
    # Check working directory and permissions
    cwd = os.getcwd()
    print(f"📁 Working directory: {cwd}")
    
    # Check if tasks directory is writable
    tasks_dir = "./tasks"
    if os.path.exists(tasks_dir):
        print(f"✅ Tasks directory exists: {tasks_dir}")
        if os.access(tasks_dir, os.W_OK):
            print("✅ Tasks directory is writable")
        else:
            print("❌ Tasks directory is not writable")
    else:
        print(f"❌ Tasks directory does not exist: {tasks_dir}")

def main():
    print("🐳 Docker Theme Debug Tool")
    print(f"⏰ Run time: {datetime.now()}")
    print("="*60)
    
    # Check Docker environment
    check_docker_environment()
    
    # Check recent tasks
    recent_tasks = check_recent_tasks()
    
    # Analyze logs
    analyze_ffmpeg_logs()
    
    # Create test requests
    create_test_request()
    
    print("\n" + "="*60)
    print("🔍 DEBUGGING RECOMMENDATIONS:")
    print()
    
    if not recent_tasks:
        print("1. ❌ No recent tasks found - API might not be receiving requests")
        print("   💡 Try making a video generation request first")
    else:
        # Analyze the theme data in recent tasks
        theme_issues = []
        for task in recent_tasks:
            if task['theme'] == 'NOT_SET':
                theme_issues.append(f"Task {task['task_id']}: Missing theme")
            elif task['theme'] == 'modern' and task['custom_colors'] != 'NOT_SET':
                theme_issues.append(f"Task {task['task_id']}: Theme reset to modern despite custom colors")
        
        if theme_issues:
            print("2. ❌ Theme issues found:")
            for issue in theme_issues:
                print(f"   - {issue}")
        else:
            print("2. ✅ Theme data looks correct in recent tasks")
    
    print()
    print("3. 🧪 To test the theme system:")
    print("   - Make a POST request to /api/video/generate")
    print("   - Use the test requests shown above")
    print("   - Check the generated story.json for theme data")
    print("   - Look for FFmpeg commands in logs with 'color=' parameter")
    print()
    print("4. 🔍 If theme still not working:")
    print("   - Check if frontend is sending theme/custom_colors")
    print("   - Verify task processor is using correct request data")
    print("   - Check FFmpeg command generation in video service")

if __name__ == "__main__":
    main()
