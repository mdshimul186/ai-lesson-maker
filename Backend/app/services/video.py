import os
import time
import json
import subprocess
import shutil
import tempfile
import requests
import logging
from typing import List, Dict, Optional, Tuple
from app.schemas.llm import StoryGenerationRequest
from app.models.const import StoryType, ImageStyle
from app.schemas.video import VideoGenerateRequest, StoryScene
from app.services.llm import llm_service
from app.services.voice import generate_voice
from app.services import task_service
from app.utils import utils
from app.config import get_settings

logger = logging.getLogger(__name__)

# Transforms a public S3 URL to handle different endpoints if needed.
# If the input URL does not match the public S3 endpoint, it's returned unchanged.
def _get_internal_asset_url(public_url: Optional[str]) -> Optional[str]:
    if not public_url:
        return None
    settings = get_settings()
    public_endpoint = settings.s3_origin_endpoint.rstrip('/')
    
    # For S3/DigitalOcean Spaces, we typically use the same endpoint for both public and internal access
    # Just return the original URL since we don't need internal/external transformation for S3
    if public_url.startswith(public_endpoint):
        logger.info(f"S3 URL validated: {public_url}")
        return public_url
    return public_url

# Checks a video file for the presence and properties of video and audio streams using ffprobe.
# Logs detailed information about the streams or warnings if streams are missing or ffprobe encounters issues.
def ffprobe_check_streams(video_path: str, stage_name: str):
    """Checks for video and audio streams using ffprobe and logs detailed findings."""
    if not os.path.exists(video_path):
        logger.warning(f"[{stage_name}] File not found for stream check: {video_path}")
        return

    try:
        # Video Stream
        video_cmd = [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=codec_name,width,height,r_frame_rate,bit_rate",
            "-of", "default=noprint_wrappers=1:nokey=1", video_path
        ]
        video_result = subprocess.run(video_cmd, capture_output=True, text=True, check=False)
        if video_result.returncode == 0 and video_result.stdout.strip():
            details = video_result.stdout.strip().split('\n')
            logger.info(
                f"[{stage_name}] Video stream in {os.path.basename(video_path)}: "
                f"Codec: {details[0] if len(details) > 0 else 'N/A'}, "
                f"Resolution: {details[1]}x{details[2] if len(details) > 2 else 'N/A'}, "
                f"FPS: {details[3] if len(details) > 3 else 'N/A'}, "
                f"Bitrate: {details[4] if len(details) > 4 else 'N/A'}"
            )
        else:
            logger.warning(f"[{stage_name}] No video stream detected or ffprobe error for {os.path.basename(video_path)}. Error: {video_result.stderr.strip() if video_result.stderr else 'No stderr'}")

        # Audio Stream
        audio_cmd = [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=codec_name,sample_rate,bit_rate,channels,channel_layout",
            "-of", "default=noprint_wrappers=1:nokey=1", video_path
        ]
        audio_result = subprocess.run(audio_cmd, capture_output=True, text=True, check=False)
        if audio_result.returncode == 0 and audio_result.stdout.strip():
            details = audio_result.stdout.strip().split('\n')
            logger.info(
                f"[{stage_name}] Audio stream in {os.path.basename(video_path)}: "
                f"Codec: {details[0] if len(details) > 0 else 'N/A'}, "
                f"Sample Rate: {details[1] if len(details) > 1 else 'N/A'}, "
                f"Bitrate: {details[2] if len(details) > 2 else 'N/A'}, "
                f"Channels: {details[3] if len(details) > 3 else 'N/A'}, "
                f"Layout: {details[4] if len(details) > 4 else 'N/A'}"
            )
        else:
            logger.warning(f"[{stage_name}] No audio stream detected or ffprobe error for {os.path.basename(video_path)}. Error: {audio_result.stderr.strip() if audio_result.stderr else 'No stderr'}")

    except FileNotFoundError:
        logger.error(f"[{stage_name}] ffprobe command not found. Ensure FFmpeg (and ffprobe) is installed and in PATH.")
    except Exception as e:
        logger.error(f"[{stage_name}] An unexpected error occurred during ffprobe check for {os.path.basename(video_path)}: {e}")

# Standardizes an input video to a common format (H.264 video, AAC audio) suitable for concatenation.
# Ensures the output video has the target resolution and frame rate.
# If the input video lacks an audio stream, a silent audio track is added.
def standardize_video_for_concat(input_path: str, output_path: str, target_width: int, target_height: int, task_dir: str, target_fps: int = 25):
    """
    Standardizes a video to H.264, AAC audio, target resolution, and FPS.
    Adds silent audio if the input has no audio stream.
    """
    logger.info(f"Standardizing {input_path} to {output_path} with resolution {target_width}x{target_height} @{target_fps}fps, ensuring audio.")
    try:
        # Check for audio stream in input
        ffprobe_cmd_audio_check = [
            "ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type",
            "-of", "default=noprint_wrappers=1:nokey=1", input_path
        ]
        audio_check_process = subprocess.run(ffprobe_cmd_audio_check, capture_output=True, text=True, cwd=task_dir, check=False)
        has_audio_stream = bool(audio_check_process.stdout.strip())

        # Get duration of input video
        duration_cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", input_path
        ]
        duration_str = subprocess.check_output(duration_cmd, cwd=task_dir).decode('utf-8').strip()
        video_duration = float(duration_str)

        ffmpeg_cmd_base = [
            "ffmpeg", "-y", "-i", input_path,
        ]
        
        video_filters = f"scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:color=black,fps={target_fps}"
        video_encoding_opts = ["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-r", str(target_fps)]

        if has_audio_stream:
            final_ffmpeg_cmd = ffmpeg_cmd_base + [
                "-vf", video_filters,
            ] + video_encoding_opts + [
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                output_path
            ]
        else:
            logger.warning(f"Video {input_path} has no audio stream. Adding silent AAC track for duration {video_duration}s.")
            final_ffmpeg_cmd = ffmpeg_cmd_base + [
                "-f", "lavfi", "-i", f"anullsrc=channel_layout=stereo:sample_rate=44100:d={video_duration}",
                "-vf", video_filters,
                "-map", "0:v:0",
                "-map", "1:a:0",
            ] + video_encoding_opts + [
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                output_path
            ]
        
        subprocess.run(final_ffmpeg_cmd, check=True, cwd=task_dir, capture_output=True)
        logger.info(f"Successfully standardized {input_path} to {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to standardize video {input_path}. FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during standardization of {input_path}: {str(e)}")
        raise

# Parses a resolution string (e.g., "1920*1080") and returns the width and height as integers.
# Defaults to 1920x1080 if parsing fails.
def get_target_dimensions(resolution: str) -> tuple[int, int]:
    try:
        width, height = map(int, resolution.split("*"))
        return width, height
    except:
        return 1920, 1080

# Calculates the dimensions to resize an original image/video to fit within target dimensions while preserving aspect ratio.
# The output dimensions will be scaled down to fit either the target width or target height, whichever is more restrictive.
def calculate_resize_dimensions(orig_width: int, orig_height: int, target_width: int, target_height: int) -> tuple[int, int]:
    orig_aspect = orig_width / orig_height
    target_aspect = target_width / target_height
    
    if orig_aspect > target_aspect:
        new_width = target_width
        new_height = int(target_width / orig_aspect)
    else:
        new_height = target_height
        new_width = int(target_height * orig_aspect)
    
    return new_width, new_height

# Orchestrates the creation of a video from a list of scenes.
# This includes generating audio and subtitles for each scene, creating video clips from images and audio,
# concatenating scene clips, applying a logo, adding background music (optional),
# and prepending/appending intro/outro videos (optional).
# Progress is reported via a task service.
async def create_video_with_scenes(
    task_id: str,
    task_dir: str, 
    scenes: List[StoryScene], 
    voice_name: str, 
    voice_rate: float, 
    include_subtitles: bool, 
    test_mode: bool = False, 
    resolution: str = "1920x1080",
    logo_url: Optional[str] = None,
    intro_video_url: Optional[str] = None,
    outro_video_url: Optional[str] = None
) -> str:
    scenes_concatenated_file = os.path.join(task_dir, "scenes_concatenated.mp4")
    main_video_with_logo_file = os.path.join(task_dir, "main_with_logo.mp4")
    main_video_with_bgm_file = os.path.join(task_dir, "main_with_bgm.mp4")
    final_output_file = os.path.join(task_dir, "video.mp4")
    
    files_to_cleanup_later = []

    font_path = os.path.join(utils.resource_dir(), "fonts", "MicrosoftYaHeiBold.ttc")
    if not os.path.exists(font_path):
        raise FileNotFoundError("Font not found")
    
    target_width, target_height = get_target_dimensions(resolution)
    
    scene_files = []
    durations: List[float] = []
    total_scenes = len(scenes)
    
    base_progress_cvws = 10 
    target_progress_scene_processing_end = 60
    progress_per_scene_total = (target_progress_scene_processing_end - base_progress_cvws) / total_scenes if total_scenes > 0 else 0

    for i, scene in enumerate(scenes, 1):
        current_scene_base_progress = base_progress_cvws + ((i - 1) * progress_per_scene_total)
        
        event_message_audio = f"Processing scene {i}/{total_scenes}: Generating audio & subtitles."
        progress_audio = current_scene_base_progress + progress_per_scene_total * 0.3
        await task_service.add_task_event(task_id=task_id, message=event_message_audio, progress=progress_audio)
        try:
            image_file = os.path.join(task_dir, f"{i}.png")
            audio_file = os.path.join(task_dir, f"{i}.mp3")
            subtitle_file = os.path.join(task_dir, f"{i}.srt")
            scene_output = os.path.join(task_dir, f"scene_{i}.mp4")
            
            if test_mode:
                if not (os.path.exists(image_file) and os.path.exists(audio_file)):
                    logger.warning(f"Test mode: files missing for scene {i}")
                    raise FileNotFoundError("Test mode files missing")
            else:
                # audio_file is the path where generate_voice will save the TTS output
                # subtitle_file is also determined here
                audio_file, subtitle_file = await generate_voice(
                    scene.text, voice_name, voice_rate, audio_file, subtitle_file
                )
            
            # audio_file now holds the path to the original speech audio from TTS.
            # Let's rename for clarity before modifying it.
            tts_output_audio_file = audio_file

            # Get duration of the original speech audio
            duration_cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", tts_output_audio_file
            ]
            speech_duration = float(subprocess.check_output(duration_cmd).decode('utf-8').strip())
            
            # Add 2s silence to the beginning of the audio
            silence_duration_s = 2.0
            silence_prefix_tmp_file = os.path.join(task_dir, f"silence_prefix_tmp_{i}.mp3")
            final_audio_for_scene_creation = os.path.join(task_dir, f"audio_final_for_scene_{i}.mp3")

            # Create 2s silence file
            cmd_create_silence = [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", f"anullsrc=channel_layout=stereo:sample_rate=44100:d={silence_duration_s}",
                silence_prefix_tmp_file
            ]
            subprocess.run(cmd_create_silence, check=True, cwd=task_dir, capture_output=True)
            files_to_cleanup_later.append(silence_prefix_tmp_file)

            # Concatenate silence and original speech audio
            cmd_concat_audio = [
                "ffmpeg", "-y",
                "-i", silence_prefix_tmp_file,
                "-i", tts_output_audio_file, # This is the speech audio
                "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[aout]",
                "-map", "[aout]", final_audio_for_scene_creation
            ]
            subprocess.run(cmd_concat_audio, check=True, cwd=task_dir, capture_output=True)
            files_to_cleanup_later.append(final_audio_for_scene_creation)
            
            # The original TTS audio output is now intermediate, add to cleanup
            files_to_cleanup_later.append(tts_output_audio_file)
            
            # This audio file (with silence) will be used for the scene video
            audio_input_for_scene_ffmpeg = final_audio_for_scene_creation
            # The total duration for this scene's video file
            total_scene_video_duration = speech_duration + silence_duration_s
            
            durations.append(total_scene_video_duration) # Append total duration for this scene
            
            size_cmd = [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", image_file
            ]
            dimensions = subprocess.check_output(size_cmd).decode('utf-8').strip()
            width, height = map(int, dimensions.split('x'))
            
            if width != target_width or height != target_height:
                resize_width, resize_height = calculate_resize_dimensions(width, height, target_width, target_height)
            else:
                resize_width, resize_height = width, height
            
            font_size = 10
            if target_width > 1280: font_size = 50
            elif target_width > 640: font_size = 30

            filter_chain = (
                f"[0:v]scale={resize_width}:{resize_height},"
                f"pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:color=white"
            )
            if os.path.exists(subtitle_file) and include_subtitles:
                logger.warning(
                    f"Scene {i}: Added {silence_duration_s}s silence to audio. "
                    f"Subtitles in '{os.path.basename(subtitle_file)}' may be out of sync by {silence_duration_s}s. "
                    "Manual adjustment of SRT timings might be needed if precise synchronization is critical."
                )
                sub_filename = os.path.basename(subtitle_file).replace("'", "\\\\'") 
                filter_chain += f",subtitles='{sub_filename}':force_style='Fontname=MicrosoftYaHeiBold,FontSize={font_size}'"
            filter_chain += "[v]"
            
            command = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", image_file,
                "-i", audio_input_for_scene_ffmpeg, # Use the audio with prefixed silence
                "-c:v", "libx264", "-tune", "stillimage",
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                "-pix_fmt", "yuv420p",
                "-t", str(total_scene_video_duration), # Use the total duration (speech + silence)
                "-filter_complex", filter_chain,
                "-map", "[v]",
                "-map", "1:a",
                scene_output
            ]
            subprocess.run(command, check=True, cwd=task_dir, capture_output=True)
            scene_files.append(scene_output)
            files_to_cleanup_later.append(scene_output)
            
            progress_scene_done = base_progress_cvws + (i * progress_per_scene_total)
            await task_service.add_task_event(task_id=task_id, message=f"Scene {i}/{total_scenes} processed successfully.", progress=progress_scene_done)
        except Exception as e:
            logger.error(f"Scene {i} generation failed: {e}. Image: {image_file}, Audio: {audio_file}")
            error_details_dict = {"scene_number": i, "image_file": image_file, "audio_file": audio_file, "error": str(e)}
            if isinstance(e, subprocess.CalledProcessError) and e.stderr:
                error_details_dict["stderr"] = e.stderr.decode() if isinstance(e.stderr, bytes) else e.stderr
            await task_service.set_task_failed(task_id, f"Scene {i} generation failed: {e}", error_details_dict)
            raise
    if not scene_files: 
        await task_service.set_task_failed(task_id, "No scene files were created.")
        raise ValueError("No scene files were created")
    if not durations: 
        await task_service.set_task_failed(task_id, "Durations list is empty after scene processing.")
        raise ValueError("Durations list is empty")

    progress_after_scenes = target_progress_scene_processing_end
    await task_service.add_task_event(task_id=task_id, message="Concatenating individual scenes.", progress=progress_after_scenes + 2)
    scene_concat_inputs = []
    for file in scene_files: scene_concat_inputs.extend(["-i", file])

    if len(durations) == 1:
        logger.info(f"Single scene. Copying {scene_files[0]} to {scenes_concatenated_file}")
        shutil.copyfile(scene_files[0], scenes_concatenated_file)
    else:
        video_fc_parts, audio_fc_parts = [], []
        acc_v_label, acc_a_label = "[0:v]", "[0:a]"
        duration_of_acc_v = durations[0]
        trans_dur = 1.0

        for i in range(1, len(durations)):
            current_scene_v_label, current_scene_a_label = f"[{i}:v]", f"[{i}:a]"
            video_offset = max(0, duration_of_acc_v - trans_dur)
            fade_output_v_label, fade_output_a_label = f"[v_fade_out{i}]", f"[a_fade_out{i}]"
            
            video_fc_parts.append(f"{acc_v_label}{current_scene_v_label}xfade=transition=fade:duration={trans_dur}:offset={video_offset}{fade_output_v_label};")
            audio_fc_parts.append(f"{acc_a_label}{current_scene_a_label}acrossfade=d={trans_dur}{fade_output_a_label};")
            
            acc_v_label, acc_a_label = fade_output_v_label, fade_output_a_label
            duration_of_acc_v = max(0.01, duration_of_acc_v + durations[i] - trans_dur)

        filter_complex_str = ("".join(video_fc_parts) + "".join(audio_fc_parts)).rstrip(';')
        concat_cmd = ["ffmpeg", "-y"] + scene_concat_inputs + [
            "-filter_complex", filter_complex_str, "-map", acc_v_label, "-map", acc_a_label,
            "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k", scenes_concatenated_file
        ]
        logger.info(f"Running scene concatenation: {' '.join(concat_cmd)}")
        subprocess.run(concat_cmd, check=True, cwd=task_dir, capture_output=True)
    
    files_to_cleanup_later.append(scenes_concatenated_file)
    ffprobe_check_streams(scenes_concatenated_file, "Post-Scene-Concatenation")
    current_main_video = scenes_concatenated_file
    await task_service.add_task_event(task_id=task_id, message="Scene concatenation complete.", progress=progress_after_scenes + 5)

    progress_after_scene_concat = progress_after_scenes + 5

    internal_logo_url = _get_internal_asset_url(logo_url)
    local_logo_path = None
    if internal_logo_url:
        try:
            await task_service.add_task_event(task_id=task_id, message="Downloading logo.", progress=progress_after_scene_concat + 1)
            response = requests.get(internal_logo_url, stream=True)
            response.raise_for_status()
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png", dir=task_dir) as tmp_logo:
                local_logo_path = tmp_logo.name
                for chunk in response.iter_content(chunk_size=8192): tmp_logo.write(chunk)
            logger.info(f"Logo downloaded to {local_logo_path}")
            files_to_cleanup_later.append(local_logo_path)
            await task_service.add_task_event(task_id=task_id, message="Applying logo to video.", progress=progress_after_scene_concat + 2)
            
            cmd_logo = [
                "ffmpeg", "-y", "-i", current_main_video, "-i", local_logo_path,
                "-filter_complex", f"[1:v]scale=-1:h={int(target_height*0.1)}[logo_scaled];[0:v][logo_scaled]overlay=W-w-10:10",
                "-c:a", "copy",
                main_video_with_logo_file
            ]
            logger.info(f"Applying logo: {' '.join(cmd_logo)}")
            subprocess.run(cmd_logo, check=True, cwd=task_dir, capture_output=True)
            current_main_video = main_video_with_logo_file
            files_to_cleanup_later.append(main_video_with_logo_file)
            ffprobe_check_streams(current_main_video, "Post-Logo-Application")
            await task_service.add_task_event(task_id=task_id, message="Logo applied successfully.", progress=progress_after_scene_concat + 3)
        except Exception as e:
            logger.error(f"Failed to download or apply logo from {internal_logo_url}: {e}")
            await task_service.add_task_event(task_id=task_id, message=f"Warning: Failed to apply logo: {e}", details={"url": internal_logo_url, "error": str(e)})
            if local_logo_path and os.path.exists(local_logo_path): os.remove(local_logo_path)

    progress_after_logo = progress_after_scene_concat + 3

    addbgmusic = False
    sound_effect_path = os.path.join(utils.resource_dir(), "sounds", "Broken_promies_thriller.mp3")
    if addbgmusic and os.path.exists(sound_effect_path):
        try:
            cmd_bgm = [
                "ffmpeg", "-y", "-i", current_main_video, "-stream_loop", "-1", "-i", sound_effect_path,
                "-filter_complex", "[1:a]volume=0.2[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                "-map", "0:v", "-map", "[aout]",
                "-c:v", "libx264", "-preset", "medium", "-crf", "23",
                "-c:a", "aac", "-b:a", "192k", "-shortest",
                main_video_with_bgm_file
            ]
            logger.info(f"Adding BGM: {' '.join(cmd_bgm)}")
            subprocess.run(cmd_bgm, check=True, cwd=task_dir, capture_output=True)
            current_main_video = main_video_with_bgm_file
            files_to_cleanup_later.append(main_video_with_bgm_file)
            ffprobe_check_streams(current_main_video, "Post-BGM-Application")
        except Exception as e:
            logger.error(f"Failed to add background music: {e}")
    
    videos_for_final_concat = []
    
    internal_intro_url = _get_internal_asset_url(intro_video_url)
    local_intro_path = None
    standardized_intro_path = None
    if internal_intro_url:
        try:
            await task_service.add_task_event(task_id=task_id, message="Downloading intro video.", progress=progress_after_logo + 0.5)
            response = requests.get(internal_intro_url, stream=True)
            response.raise_for_status()
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=task_dir) as tmp_intro:
                local_intro_path = tmp_intro.name
                for chunk in response.iter_content(chunk_size=8192): tmp_intro.write(chunk)
            logger.info(f"Intro video downloaded to {local_intro_path}")
            files_to_cleanup_later.append(local_intro_path)
            standardized_intro_path = standardize_video_for_concat(local_intro_path, os.path.join(task_dir, "s_intro.mp4"), target_width, target_height, task_dir)
            if standardized_intro_path: 
                videos_for_final_concat.append(standardized_intro_path)
                await task_service.add_task_event(task_id=task_id, message="Intro video processed.")
        except Exception as e:
            logger.error(f"Failed to download or standardize intro video from {internal_intro_url}: {e}")
            await task_service.add_task_event(task_id=task_id, message=f"Warning: Failed to process intro video: {e}", details={"url": internal_intro_url, "error": str(e)})
            if local_intro_path and os.path.exists(local_intro_path): os.remove(local_intro_path)

    videos_for_final_concat.append(current_main_video)

    internal_outro_url = _get_internal_asset_url(outro_video_url)
    local_outro_path = None
    standardized_outro_path = None
    if internal_outro_url:
        try:
            await task_service.add_task_event(task_id=task_id, message="Downloading outro video.")
            response = requests.get(internal_outro_url, stream=True)
            response.raise_for_status()
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=task_dir) as tmp_outro:
                local_outro_path = tmp_outro.name
                for chunk in response.iter_content(chunk_size=8192): tmp_outro.write(chunk)
            logger.info(f"Outro video downloaded to {local_outro_path}")
            files_to_cleanup_later.append(local_outro_path)
            standardized_outro_path = standardize_video_for_concat(local_outro_path, os.path.join(task_dir, "s_outro.mp4"), target_width, target_height, task_dir)
            if standardized_outro_path: 
                videos_for_final_concat.append(standardized_outro_path)
                await task_service.add_task_event(task_id=task_id, message="Outro video processed.")
        except Exception as e:
            logger.error(f"Failed to download or standardize outro video from {internal_outro_url}: {e}")
            await task_service.add_task_event(task_id=task_id, message=f"Warning: Failed to process outro video: {e}", details={"url": internal_outro_url, "error": str(e)})
            if local_outro_path and os.path.exists(local_outro_path): os.remove(local_outro_path)
            
    progress_before_final_concat = progress_after_logo + 1
    if internal_intro_url or internal_outro_url:
        await task_service.add_task_event(task_id=task_id, message="Intro/Outro videos processed (if any).", progress=progress_before_final_concat)

    if standardized_intro_path: files_to_cleanup_later.append(standardized_intro_path)
    if standardized_outro_path: files_to_cleanup_later.append(standardized_outro_path)

    if len(videos_for_final_concat) > 1:
        concat_file_path = os.path.join(task_dir, "final_concat_list.txt")
        with open(concat_file_path, "w", encoding="utf-8") as f:
            for video_file in videos_for_final_concat:
                f.write(f"file '{os.path.basename(video_file)}'\n")
        files_to_cleanup_later.append(concat_file_path)
        await task_service.add_task_event(task_id=task_id, message="Preparing for final video concatenation (intro/main/outro).", progress=progress_before_final_concat + 0.5)

        cmd_final_concat = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file_path,
            "-c:v", "libx264", "-preset", "medium", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
            final_output_file
        ]
        try:
            logger.info(f"Running final concatenation: {' '.join(cmd_final_concat)}")
            subprocess.run(cmd_final_concat, check=True, cwd=task_dir, capture_output=True, text=True)
            logger.info(f"Final video generated: {final_output_file}")
            ffprobe_check_streams(final_output_file, "Post-Final-Concatenation")
            await task_service.add_task_event(task_id=task_id, message="Final video concatenation successful.", progress=progress_before_final_concat + 1)
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed final concatenation. FFmpeg command: {' '.join(cmd_final_concat)}")
            logger.error(f"FFmpeg stderr: {e.stderr}")
            logger.info(f"Falling back: copying {current_main_video} to {final_output_file}")
            shutil.copyfile(current_main_video, final_output_file)
            ffprobe_check_streams(final_output_file, "Post-Fallback-Copy")
            await task_service.add_task_event(task_id=task_id, message="Final concatenation failed, using main content video as final.", details={"error": str(e), "stderr": e.stderr}, progress=progress_before_final_concat + 1)
        except FileNotFoundError:
            logger.error(f"ffmpeg command not found during final concatenation. Ensure FFmpeg is installed and in PATH.")
            logger.info(f"Falling back: copying {current_main_video} to {final_output_file}")
            shutil.copyfile(current_main_video, final_output_file)
            ffprobe_check_streams(final_output_file, "Post-Fallback-Copy")
            await task_service.add_task_event(task_id=task_id, message="Final concatenation failed (ffmpeg not found), using main content video as final.", details={"error": "ffmpeg not found"}, progress=progress_before_final_concat + 1)
    else:
        logger.info(f"No intro/outro to add or only main content. Copying {current_main_video} to {final_output_file}")
        if current_main_video != final_output_file:
             shutil.copyfile(current_main_video, final_output_file)
        ffprobe_check_streams(final_output_file, "Post-MainOnly-Copy")
        await task_service.add_task_event(task_id=task_id, message="Final video prepared (no intro/outro concatenation needed).", progress=progress_before_final_concat + 1)

    old_concat_file_path = os.path.join(task_dir, "concat.txt")
    if os.path.exists(old_concat_file_path):
        files_to_cleanup_later.append(old_concat_file_path)

    for file_path in files_to_cleanup_later:
        if file_path and os.path.exists(file_path) and file_path != final_output_file:
            try:
                os.remove(file_path)
                logger.debug(f"Cleaned up intermediate file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up intermediate file {file_path}: {e}")
    
    if not os.path.exists(final_output_file):
        raise FileNotFoundError(f"Final video file was not created: {final_output_file}")

    return final_output_file

async def generate_video(request: VideoGenerateRequest, task_id: str):
    task_dir = utils.task_dir(task_id) 
    os.makedirs(task_dir, exist_ok=True)
    await task_service.add_task_event(task_id=task_id, message=f"Task directory created: {task_dir}", progress=6)

    try:
        scenes: List[StoryScene]
        base_progress_cvws = 10

        if request.test_mode:
            await task_service.add_task_event(task_id=task_id, message="Running in test mode. Loading story from story.json.", progress=7)
            sf = os.path.join(task_dir, "story.json")
            if not os.path.exists(sf):
                error_msg = f"story.json not found in {task_dir} for test mode"
                await task_service.set_task_failed(task_id, error_msg)
                raise FileNotFoundError(error_msg)
            with open(sf, "r", encoding="utf-8") as f:
                data = json.load(f)
            request = VideoGenerateRequest(**data)
            request.test_mode = True
            request.include_subtitles = False
            scenes = [StoryScene(**s) for s in data.get("scenes", [])]
            await task_service.add_task_event(task_id=task_id, message="Test mode: Story loaded.", progress=base_progress_cvws)
        else:
            req = StoryGenerationRequest(
                resolution=request.resolution,
                story_prompt=request.story_prompt,
                language=request.language,
                segments=request.segments,
                include_subtitles=request.include_subtitles,
                visual_content_in_language=request.visual_content_in_language,
            )

            await task_service.add_task_event(task_id=task_id, message="Generating story and image prompts via LLM.", progress=7)
            logger.info(f"Generating story with request: {req}")
            story_list = await llm_service.generate_story_with_images(request=req)
            await task_service.add_task_event(task_id=task_id, message="Story and image prompts generated. Downloading images.", progress=8)
            
            scenes = [StoryScene(text=s["text"], image_prompt=s["image_prompt"], url=s["url"]) for s in story_list]
            data = request.model_dump()
            data["scenes"] = [sc.model_dump() for sc in scenes]
            
            for i, sc_data in enumerate(story_list, 1):
                if sc_data.get("url"):
                    path = os.path.join(task_dir, f"{i}.png")
                    resp = requests.get(sc_data["url"])
                    if resp.status_code == 200:
                        with open(path, "wb") as f:
                            f.write(resp.content)
                    else:
                        logger.warning(f"Failed to download image {i} from {sc_data.get('url')}, status: {resp.status_code}")
            
            await task_service.add_task_event(task_id=task_id, message=f"Story and images acquired for {len(scenes)} scenes.", progress=base_progress_cvws)
            
            with open(os.path.join(task_dir, "story.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        if not getattr(request, 'task_id', None):
            request.task_id = task_id

        return await create_video_with_scenes(
            task_id=task_id, 
            task_dir=task_dir, 
            scenes=scenes, 
            voice_name=request.voice_name, 
            voice_rate=request.voice_rate, 
            include_subtitles=request.include_subtitles,
            test_mode=request.test_mode,
            resolution=request.resolution,
            logo_url=request.logo_url,
            intro_video_url=request.intro_video_url,
            outro_video_url=request.outro_video_url
        )
    except Exception as e:
        logger.error(f"Failed to generate video for task {task_id}: {e}")
        error_details_dict = {"error_type": type(e).__name__, "details": str(e)}
        if isinstance(e, subprocess.CalledProcessError) and e.stderr:
            error_details_dict["stderr"] = e.stderr.decode() if isinstance(e.stderr, bytes) else e.stderr
        await task_service.set_task_failed(task_id, f"Video generation failed: {str(e)}", error_details=error_details_dict)
        raise e