from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from app.services.video import generate_video, create_video_with_scenes, generate_voice
from app.schemas.video import VideoGenerateRequest, VideoGenerateResponse, StoryScene
import os
import json
from app.utils.utils import extract_id

router = APIRouter()

@router.post("/generate")
async def generate_video_endpoint(
    request: VideoGenerateRequest
):
    """生成视频"""
    try:
        video_file = await generate_video(request)
        task_id = extract_id(video_file)
        # 转换为相对路径
        video_url = "http://127.0.0.1:8000/tasks/" + task_id + "/video.mp4"
        # Read story.json content
        story_path = f"./tasks/{task_id}/story.json"  # Adjust path if needed
        with open(story_path, "r", encoding="utf-8") as f:
            story_data = json.load(f)


        return VideoGenerateResponse(
            success=True,
            data={
                "video_url": video_url,
                 "story": story_data,  # send the JSON content, not the URL
            },
        )
    except Exception as e:
        logger.error(f"Failed to generate video: {str(e)}")
        return VideoGenerateResponse(
            success=False,
            message=str(e)
        )


