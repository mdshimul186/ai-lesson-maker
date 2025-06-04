"""
Test script to verify the video queue system is working correctly.
This can be run independently to test the queue functionality.
"""
import asyncio
import sys
import os

# Add the Backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_queue_system():
    """Test the task queue system functionality"""
    try:
        from app.services.task_queue_service import task_queue_service
        from app.schemas.video import VideoGenerateRequest
        from app.models.task_types import TaskType
        
        print("Testing task queue system...")
        
        # Test getting queue status
        print("\n1. Getting initial queue status...")
        status = await task_queue_service.get_queue_status()
        print(f"Queue status: {status}")
        
        # Test creating a sample request (don't actually process it)
        print("\n2. Creating sample video request...")
        sample_request = VideoGenerateRequest(
            story_prompt="Test story for queue system",
            segments=3,
            language="en",
            voice_name="en-US-AriaNeural",
            voice_rate=1.0,
            resolution="1080p",
            include_subtitles=False,
            visual_content_in_language=True,
            test_mode=True
        )
        
        print(f"Sample request created: {sample_request.story_prompt}")
        
        # Test getting queue list
        print("\n3. Getting queue list...")
        queue_list = await task_queue_service.get_queue_list(limit=10, task_type=TaskType.VIDEO.value)
        print(f"Current queue items: {len(queue_list)}")
        
        print("\n✅ Task queue system test completed successfully!")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed and the database is running.")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Run the test
    asyncio.run(test_queue_system())
