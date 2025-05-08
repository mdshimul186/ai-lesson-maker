import os
import time
import json
import subprocess
from typing import List, Dict, Optional
from app.schemas.llm import StoryGenerationRequest
from loguru import logger
from app.models.const import StoryType, ImageStyle
from app.schemas.video import VideoGenerateRequest, StoryScene
from app.services.llm import llm_service
from app.services.voice import generate_voice
from app.utils import utils
import requests
from pydantic import BaseModel
from typing import Optional, List, Dict

class VideoGenerateRequest(BaseModel):
    resolution: str 
    story_prompt: str
    language: str = "en"
    segments: int = 3
    # text_llm_provider: str = "openai"
    # text_llm_model: str = "gpt-4"
    # image_llm_provider: str = "openai"
    # image_llm_model: str = "dall-e-3"
    voice_name: str = "en-US-JennyNeural"
    voice_rate: float = 1.0
    include_subtitles: bool = False
    test_mode: bool = False
    task_id: Optional[str] = None
    scenes: Optional[List[Dict]] = None
    visual_content_in_language: bool = False

def get_target_dimensions(resolution: str) -> tuple[int, int]:
    """Get target width and height from resolution string"""
    try:
        width, height = map(int, resolution.split("*"))
        return width, height
    except:
        # Default resolution if parsing fails
        return 1920, 1080

def calculate_resize_dimensions(orig_width: int, orig_height: int, target_width: int, target_height: int) -> tuple[int, int]:
    """Calculate new dimensions maintaining aspect ratio"""
    orig_aspect = orig_width / orig_height
    target_aspect = target_width / target_height
    
    if orig_aspect > target_aspect:
        # Original is wider than target
        new_width = target_width
        new_height = int(target_width / orig_aspect)
    else:
        # Original is taller than target or same aspect ratio
        new_height = target_height
        new_width = int(target_height * orig_aspect)
    
    return new_width, new_height

async def create_video_with_scenes(task_dir: str, scenes: List[StoryScene], voice_name: str, voice_rate: float, include_subtitles: bool, test_mode: bool = False, resolution: str = "1920x1080") -> str:
    """Create a video by concatenating multiple scenes using FFmpeg"""
    
    # Output paths
    output_file = os.path.join(task_dir, "video.mp4")
    temp_file = os.path.join(task_dir, "video_temp.mp4")
    concat_file = os.path.join(task_dir, "concat.txt")
    
    # Font settings
    font_path = os.path.join(utils.resource_dir(), "fonts", "MicrosoftYaHeiBold.ttc")
    if not os.path.exists(font_path):
        raise FileNotFoundError("Font not found")
    
    # Get target resolution
    target_width, target_height = get_target_dimensions(resolution)
    
    # Generate intermediate video files for each scene
    scene_files = []
    durations: List[float] = []  # store audio durations for transitions
    for i, scene in enumerate(scenes, 1):
        try:
            image_file = os.path.join(task_dir, f"{i}.png")
            audio_file = os.path.join(task_dir, f"{i}.mp3")
            subtitle_file = os.path.join(task_dir, f"{i}.srt")
            scene_output = os.path.join(task_dir, f"scene_{i}.mp4")
            
            if test_mode:
                if not (os.path.exists(image_file) and os.path.exists(audio_file)):
                    logger.warning(f"Test mode: files missing for scene {i}")
                    raise FileNotFoundError
            else:
                audio_file, subtitle_file = await generate_voice(
                    scene.text, voice_name, voice_rate, audio_file, subtitle_file
                )
            
            # Get audio duration
            duration_cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", audio_file
            ]
            duration = float(subprocess.check_output(duration_cmd).decode('utf-8').strip())
            durations.append(duration)
            
            # Get image dimensions
            size_cmd = [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", image_file
            ]
            dimensions = subprocess.check_output(size_cmd).decode('utf-8').strip()
            width, height = map(int, dimensions.split('x'))
            
            # Calculate resize dimensions if needed
            if width != target_width or height != target_height:
                resize_width, resize_height = calculate_resize_dimensions(width, height, target_width, target_height)
            else:
                resize_width, resize_height = width, height
            
            # Calculate font size based on target dimensions
            font_size = 10
            if target_width > 1920:
                font_size = 60
            elif target_width > 1280:
                font_size = 50
            elif target_width > 960:
                font_size = 40
            elif target_width > 640:
                font_size = 30
            elif target_width > 320:
                font_size = 20
            
            # Build video filter chain: scale, pad, and optional subtitles
            # Base chain: scale and pad to target dimensions
            filter_chain = (
                f"[0:v]scale={resize_width}:{resize_height},"
                f"pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:color=white"
            )
            # Add subtitles if needed
            if os.path.exists(subtitle_file) and include_subtitles:
                sub_filename = os.path.basename(subtitle_file)
                filter_chain += f",subtitles={sub_filename}"
            # Label output
            filter_chain += "[v]"
            map_output = "[v]"
            
            # Basic ffmpeg command to create a scene
            command = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", image_file,
                "-i", audio_file,
                "-c:v", "libx264", "-tune", "stillimage",
                "-c:a", "aac", "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-t", str(duration),
                "-filter_complex", filter_chain,
                "-map", map_output,
                "-map", "1:a",
                scene_output
            ]
            
            # Execute ffmpeg command
            # Run ffmpeg in scene directory so subtitles file (1.srt) is found
            subprocess.run(command, check=True, cwd=task_dir)
            scene_files.append(scene_output)
            
        except Exception as e:
            logger.error(f"Scene {i} failed: {e}")
            raise
    
    if not scene_files:
        raise ValueError("No scene files were created")
    # Combine scenes with crossfade transitions
    # Prepare ffmpeg inputs
    inputs: List[str] = []
    for file in scene_files:
        inputs.extend(["-i", file])
    # Transition duration in seconds
    trans_dur = 1.0
    # Build filter_complex for video and audio crossfade
    video_fc = ''
    audio_fc = ''
    cumulative = 0.0
    for idx, dur in enumerate(durations):
        if idx == 0:
            cumulative = dur
            continue
        # offset is when the previous clip ends minus transition duration
        offset = cumulative - trans_dur
        if idx == 1:
            video_fc += f"[0:v][1:v]xfade=transition=fade:duration={trans_dur}:offset={offset}[v1];"
            audio_fc += f"[0:a][1:a]acrossfade=d={trans_dur}[a1];"
        else:
            prev_v = f"v{idx-1}"
            prev_a = f"a{idx-1}"
            video_fc += f"[{prev_v}][{idx}:v]xfade=transition=fade:duration={trans_dur}:offset={offset}[v{idx}];"
            audio_fc += f"[{prev_a}][{idx}:a]acrossfade=d={trans_dur}[a{idx}];"
        cumulative += dur
    # Map the final video and audio streams
    last_v = f"[v{len(durations)-1}]"
    last_a = f"[a{len(durations)-1}]"
    # Combine video and audio filter graphs, trimming trailing semicolons to avoid empty filters
    filter_complex = (video_fc + audio_fc).rstrip(';')
    # Run ffmpeg to produce final video with transitions
    concat_cmd = ["ffmpeg", "-y"] + inputs + [
        "-filter_complex", filter_complex,
        "-map", last_v,
        "-map", last_a,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-b:a", "192k",
        temp_file
    ]
    subprocess.run(concat_cmd, check=True, cwd=task_dir)

    addbgmusic = False

    # Add background music if available
    sound_effect_path = os.path.join(utils.resource_dir(), "sounds", "Broken_promies_thriller.mp3")
    if os.path.exists(sound_effect_path) and addbgmusic:
        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", temp_file,
                "-stream_loop", "-1", "-i", sound_effect_path,
                "-filter_complex",
                "[1:a]volume=0.2[a1];"
                "[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                output_file
            ]
            subprocess.run(cmd, check=True)
            
            # Clean up temp files
            os.remove(temp_file)
            
        except Exception as e:
            logger.error(f"Failed to add background sound effect via ffmpeg: {e}")
            # If adding sound effect fails, use the temp file without bg music
            os.rename(temp_file, output_file)
    else:
        os.rename(temp_file, output_file)
    
    # Clean up scene files and concat file
    for file in scene_files:
        if os.path.exists(file):
            os.remove(file)
    if os.path.exists(concat_file):
        os.remove(concat_file)
    
    return output_file

async def generate_video(request: VideoGenerateRequest):
    try:
        if request.test_mode:
            task_id = request.task_id or str(int(time.time()))
            td = utils.task_dir(task_id)
            sf = os.path.join(td, "story.json")
            with open(sf, "r", encoding="utf-8") as f:
                data = json.load(f)
            request = VideoGenerateRequest(**data)
            request.test_mode = True
            request.include_subtitles = False
            scenes = [StoryScene(**s) for s in data.get("scenes", [])]
            task_dir = td
        else:
            req = StoryGenerationRequest(
                resolution=request.resolution,
                story_prompt=request.story_prompt,
                language=request.language,
                segments=request.segments,
                include_subtitles=request.include_subtitles,
                visual_content_in_language=request.visual_content_in_language,
                # text_llm_provider=request.text_llm_provider,
                # text_llm_model=request.text_llm_model,
                # image_llm_provider=request.image_llm_provider,
                # image_llm_model=request.image_llm_model
            )

            logger.info(f"Generating story with request: {req}")
            story_list = await llm_service.generate_story_with_images(request=req)
            scenes = [StoryScene(text=s["text"], image_prompt=s["image_prompt"], url=s["url"]) for s in story_list]
            data = request.model_dump()
            data["scenes"] = [sc.model_dump() for sc in scenes]
            task_dir = utils.task_dir(str(int(time.time())))
            os.makedirs(task_dir, exist_ok=True)
            for i, sc in enumerate(story_list, 1):
                if sc.get("url"):
                    path = os.path.join(task_dir, f"{i}.png")
                    resp = requests.get(sc["url"])
                    if resp.status_code == 200:
                        with open(path, "wb") as f:
                            f.write(resp.content)
            with open(os.path.join(task_dir, "story.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        return await create_video_with_scenes(
            task_dir, 
            scenes, 
            request.voice_name, 
            request.voice_rate, 
            include_subtitles=request.include_subtitles,
            test_mode=request.test_mode,
            resolution=request.resolution  # Pass resolution parameter
        )
    except Exception as e:
        logger.error(f"Failed to generate video: {e}")
        raise e