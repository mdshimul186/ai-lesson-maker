#!/usr/bin/env python3
"""
Test script to verify S3 uploads are public.
This script uploads a test file and then attempts to access it via the public URL.
"""

import asyncio
import tempfile
import os
import sys
import requests
from app.services.upload_service import upload_file_to_s3, generate_unique_object_name

async def test_public_upload():
    """Test that uploaded files are publicly accessible."""
    print("Testing S3 public upload...")
    
    # Create a temporary test file
    test_content = b"This is a test file for S3 public upload verification."
    
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.txt', delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Generate unique object name
        object_name = generate_unique_object_name("test_upload.txt")
        content_type = "text/plain"
        
        print(f"Uploading test file: {object_name}")
        
        # Upload the file
        public_url = await upload_file_to_s3(temp_file_path, object_name, content_type)
        print(f"Upload completed. Public URL: {public_url}")
        
        # Test if the file is publicly accessible
        print("Testing public access...")
        response = requests.get(public_url, timeout=10)
        
        if response.status_code == 200:
            if response.content == test_content:
                print("✅ SUCCESS: File is publicly accessible and content matches!")
            else:
                print("❌ FAIL: File is accessible but content doesn't match")
                print(f"Expected: {test_content}")
                print(f"Got: {response.content}")
        else:
            print(f"❌ FAIL: File is not publicly accessible. Status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    try:
        asyncio.run(test_public_upload())
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed with error: {e}")
        sys.exit(1)
