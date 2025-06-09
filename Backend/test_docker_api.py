#!/usr/bin/env python3
"""
Test script to call the Docker API and verify theme is working
"""

import requests
import json

def test_video_generation_api():
    """Test the video generation API with theme"""
    
    url = "http://localhost:8000/api/video/generate"
    
    payload = {
        "story_prompt": "test docker basics",
        "language": "English",
        "segments": 1,
        "resolution": "1280*720",
        "theme": "vibrant",
        "custom_colors": {
            "primary": "#FF0000",
            "background": "#00FF00"
        },
        "include_subtitles": False,
        "visual_content_in_language": True
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("🚀 Testing Docker API endpoint...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Task ID: {data.get('task_id')}")
            print(f"📝 Full Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📝 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_video_generation_api()
