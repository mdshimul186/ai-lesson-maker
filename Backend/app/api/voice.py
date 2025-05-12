from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from app.schemas.voice import VoiceGenerationRequest, VoiceGenerationResponse
from app.schemas.video import VideoGenerateResponse, StoryScene
from app.services.voice import generate_voice, get_all_azure_voices
from app.services.video import create_video_with_scenes
import os
import json
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()


class VoiceRequest(BaseModel):
    area: Optional[List[str]] = None


@router.post("/test_subtitle")
async def test_subtitle_endpoint(task_id: str = Query(..., description="Task ID corresponding to a folder under storage/tasks/")) -> VideoGenerateResponse:
    """Test subtitle addition functionality"""
    try:
        # Build the path to the task directory
        task_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "tasks", task_id)
        if not os.path.exists(task_dir):
            raise HTTPException(status_code=404, detail=f"Task directory not found: {task_id}")
            
        # Read story.json
        story_file = os.path.join(task_dir, "story.json")
        if not os.path.exists(story_file):
            raise HTTPException(status_code=404, detail=f"Story file not found: {story_file}")
            
        with open(story_file, 'r', encoding='utf-8') as f:
            scenes_data = json.load(f)
        
        # Convert loaded data to StoryScene objects
        scenes = [StoryScene(**scene) for scene in scenes_data]
        
        # Generate audio and subtitles for each scene
        voice_name = "zh-CN-XiaoxiaoNeural"
        voice_rate = 0
        for i, scene in enumerate(scenes, 1):
            audio_file = os.path.join(task_dir, f"{i}.mp3")
            subtitle_file = os.path.join(task_dir, f"{i}.srt")
            await generate_voice(scene.text, voice_name, voice_rate, audio_file, subtitle_file)
        
        # Create video from scenes and generated audio
        video_file = await create_video_with_scenes(task_dir, scenes, voice_name, voice_rate)
        
        video_url = "/" + video_file.split("/tasks/")[-1]
        return VideoGenerateResponse(video_url=video_url, scenes=scenes)
    except Exception as e:
        logger.error(f"Failed to test subtitle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate", response_model=VoiceGenerationResponse)
async def generate_voice_api(request: Request) -> VoiceGenerationResponse:
    """
    Generate audio and subtitle files

    Args:
        request: Request containing text content and voice configuration

    Returns:
        URLs for the generated audio and subtitle files
    """
    try:
        # Manually parse the request body
        body = await request.json()
        req = VoiceGenerationRequest(**body)
        
        audio_file, subtitle_file = await generate_voice(
            text=req.text,
            voice_name=req.voice_name,
            voice_rate=req.voice_rate
        )
        
        if not audio_file or not subtitle_file:
            raise HTTPException(status_code=500, detail="Failed to generate voice")
            
        # Convert file paths to URL paths
        audio_url = f"/tasks/{os.path.basename(audio_file)}"
        subtitle_url = f"/tasks/{os.path.basename(subtitle_file)}"
        
        return VoiceGenerationResponse(
            audio_url=audio_url,
            subtitle_url=subtitle_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voices")
async def list_voices(request: VoiceRequest) -> dict:
    """
    Get a list of all supported voices
    """
    all_voices = get_all_azure_voices()  # Get all voices

    
    return {"voices": all_voices}
