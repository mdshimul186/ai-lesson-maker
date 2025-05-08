import os
import asyncio
import time
import uuid
import json
import edge_tts
import re
import xml.sax.saxutils
from edge_tts import SubMaker, submaker
from edge_tts.submaker import mktimestamp
from moviepy.video.tools import subtitles
from loguru import logger
from typing import Tuple
from xml.sax.saxutils import unescape
from openai import OpenAI
PUNCTUATIONS = [
    "?",
    ",",
    ".",
    "、",
    ";",
    ":",
    "!",
    "…",
    "？",
    "，",
    "。",
    "、",
    "；",
    "：",
    "！",
    "...",
]

def split_string_by_punctuations(s):
    result = []
    txt = ""

    previous_char = ""
    next_char = ""
    for i in range(len(s)):
        char = s[i]
        if char == "\n":
            if txt.strip():  # Only add when non-empty
                result.append(txt.strip())
            txt = ""
            continue

        if i > 0:
            previous_char = s[i - 1]
        if i < len(s) - 1:
            next_char = s[i + 1]

        if char == "." and previous_char.isdigit() and next_char.isdigit():
            txt += char
            continue

        if char not in PUNCTUATIONS:
            txt += char
        else:
            if txt.strip():  # Only add when non-empty
                result.append(txt.strip())
            txt = ""
    if txt.strip():  # Add the last segment if it's non-empty
        result.append(txt.strip())
    
    # Filter out empty strings and segments containing only punctuation
    def is_valid_segment(segment):
        # Only segments with content remaining after removing all punctuation are valid
        return bool(re.sub(r'[^\w\s]', '', segment).strip())
    
    result = list(filter(is_valid_segment, result))
    return result

def get_all_azure_voices() -> list[dict]:  # Removed filter_locals from parameters
    voices_list = []
    
    # Determine the absolute path to the current script
    current_script_path = os.path.abspath(__file__)
    # Determine the directory of the current script
    current_script_dir = os.path.dirname(current_script_path)
    # Construct the path to the JSON file relative to the current script
    # Script: Backend/app/services/voice.py
    # JSON:   Backend/resource/json/azure_voices.json
    # Relative path from script dir: ../../resource/json/azure_voices.json
    json_file_path = os.path.join(
        current_script_dir, 
        "..", "..", "resource", "json", "azure_voices.json"
    )
    # Normalize the path to resolve ".."
    json_file_path = os.path.normpath(json_file_path)

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            azure_voices_data = json.load(f)
    except FileNotFoundError:
        logger.error(f"Azure voices JSON file not found at {json_file_path}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding Azure voices JSON file at {json_file_path}: {e}")
        return []

    for voice_entry in azure_voices_data:
        voices_list.append(voice_entry)  # Append the whole object without filtering
    
    # Sort by displayName
    voices_list.sort(key=lambda x: x.get("name", ""))
    return voices_list


def parse_voice_name(name: str):
    # zh-CN-XiaoyiNeural-Female
    # zh-CN-YunxiNeural-Male
    # zh-CN-XiaoxiaoMultilingualNeural-V2-Female
    name = name.replace("-Female", "").replace("-Male", "").strip()
    return name


def convert_rate_to_percent(rate: float) -> str:
    if rate == 1.0:
        return "+0%"
    percent = round((rate - 1.0) * 100)
    if percent > 0:
        return f"+{percent}%"
    else:
        return f"{percent}%"


async def generate_voice(text: str, voice_name: str, voice_rate: float = 0, audio_file: str = None, subtitle_file: str = None) -> Tuple[str, str]:
    """Generate audio and subtitles

    Args:
        text (str): Text content to be converted to speech
        voice_name (str): Voice name
        voice_rate (float, optional): Speech rate adjustment. Defaults to 0.
        audio_file (str, optional): Path to output audio file. Defaults to None.
        subtitle_file (str, optional): Path to output subtitle file. Defaults to None.

    Returns:
        Tuple[str, str]: Paths to the generated audio and subtitle files
    """
    if audio_file is None:
        audio_file = f"temp_{uuid.uuid4()}.mp3"
    if subtitle_file is None:
        subtitle_file = f"temp_{uuid.uuid4()}.srt"

    # Generate audio
    sub_maker = await edge_tts_voice(text, voice_name, audio_file, voice_rate)
    # Generate subtitles
    if sub_maker:
        await generate_subtitle(sub_maker, text, subtitle_file)
    else:
        logger.error("Failed to generate sub_maker")
    
    return audio_file, subtitle_file


async def edge_tts_voice(text: str, voice_name: str, voice_file: str, voice_rate: float = 0) -> SubMaker:
    """Use Edge TTS to generate speech"""

    logger.info(f"Generating voice, text: {text}, voice_name: {voice_name}, voice_rate: {voice_rate}")
    rate_str = convert_rate_to_percent(voice_rate)
    for i in range(3):
        try:
            logger.info(f"start, voice name: {voice_name}, try: {i + 1}")

            communicate = edge_tts.Communicate(text, voice_name, rate=rate_str)
            sub_maker = edge_tts.SubMaker()
            
            with open(voice_file, "wb") as file:
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        file.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        logger.debug(f"Got word boundary: {chunk}")
                        # Use SubMaker.create_sub to create subtitle entries
                        sub_maker.create_sub((chunk["offset"], chunk["duration"]), chunk["text"])

            if not sub_maker or not sub_maker.subs:
                logger.warning("failed, sub_maker is None or sub_maker.subs is None")
                continue


            # client = OpenAI(
            #     base_url="http://localhost:8880/v1",
            #     api_key="not-needed"
            # )

            # with client.audio.speech.with_streaming_response.create(
            #     model="kokoro",
            #     voice="af_alloy",
            #     input=text
            # ) as response:
            #     response.stream_to_file(voice_file)

            logger.info(f"completed, output file: {voice_file}")
            return sub_maker
        except Exception as e:
            logger.error(f"failed, error: {str(e)}")
            continue
    return None


async def generate_subtitle(sub_maker: edge_tts.SubMaker, text: str, subtitle_file: str):
    """生成字幕文件"""
    try:
        if not sub_maker or not hasattr(sub_maker, "subs") or not sub_maker.subs:
            print("No subtitles to generate: sub_maker is None or sub_maker.subs is empty")
            return

        print(f"Generating subtitles with {len(sub_maker.subs)} items")
        
        # 直接使用创建字幕的函数
        await create_subtitle(sub_maker=sub_maker, text=text, subtitle_file=subtitle_file)
            
    except Exception as e:
        print(f"failed to generate subtitle: {str(e)}")
        import traceback
        print(traceback.format_exc())


def get_audio_duration(sub_maker: edge_tts.SubMaker) -> float:
    """Get audio duration in seconds"""
    if not sub_maker or not hasattr(sub_maker, "subs") or not sub_maker.subs:
        return 0
    last_sub = sub_maker.subs[-1]
    start, duration = last_sub[0]
    return (start + duration) / 10000000  # 转换为秒


def _format_text(text: str) -> str:
    text = text.replace("[", " ")
    text = text.replace("]", " ")
    text = text.replace("(", " ")
    text = text.replace(")", " ")
    text = text.replace("{", " ")
    text = text.replace("}", " ")
    text = text.strip()
    return text




async def create_subtitle(sub_maker: edge_tts.SubMaker, text: str, subtitle_file: str):
    """
    Optimize subtitle file:
    1. Split subtitle text into multiple lines based on punctuation
    2. Match each line with generated subtitle entries
    3. Create a new subtitle file
    """
    text = _format_text(text)

    def formatter(idx: int, start_time: float, end_time: float, sub_text: str) -> str:
        """
        Example subtitle entry:
        1
        00:00:00,000 --> 00:00:02,360
        Running is a simple and accessible exercise
        """
        start_t = mktimestamp(start_time).replace(".", ",")
        end_t = mktimestamp(end_time).replace(".", ",")
        return f"{idx}\n{start_t} --> {end_t}\n{sub_text}\n"

    start_time = -1.0
    sub_items = []
    sub_index = 0

    script_lines = split_string_by_punctuations(text)
    logger.debug(f"Split text into {len(script_lines)} lines: {script_lines}")

    def match_line(_sub_line: str, _sub_index: int):
        if len(script_lines) <= _sub_index:
            return ""

        _line = script_lines[_sub_index]
        if _sub_line == _line:
            return script_lines[_sub_index].strip()

        _sub_line_ = re.sub(r"[^\w\s]", "", _sub_line)
        _line_ = re.sub(r"[^\w\s]", "", _line)
        if _sub_line_ == _line_:
            return _line_.strip()

        _sub_line_ = re.sub(r"\W+", "", _sub_line)
        _line_ = re.sub(r"\W+", "", _line)
        if _sub_line_ == _line_:
            return _line.strip()

        return ""

    sub_line = ""

    try:
        for _, (offset, sub) in enumerate(zip(sub_maker.offset, sub_maker.subs)):
            _start_time, end_time = offset
            if start_time < 0:
                start_time = _start_time

            sub = unescape(sub)
            sub_line += sub
            sub_text = match_line(sub_line, sub_index)
            if sub_text:
                sub_index += 1
                line = formatter(
                    idx=sub_index,
                    start_time=start_time,
                    end_time=end_time,
                    sub_text=sub_text,
                )
                sub_items.append(line)
                start_time = -1.0
                sub_line = ""
        if len(sub_items) == len(script_lines):
            with open(subtitle_file, "w", encoding="utf-8") as file:
                file.write("\n".join(sub_items) + "\n")
            try:
                sbs = subtitles.file_to_subtitles(subtitle_file, encoding="utf-8")
                duration = max([tb for ((ta, tb), txt) in sbs])
                logger.info(
                    f"completed, subtitle file created: {subtitle_file}, duration: {duration}"
                )
            except Exception as e:
                logger.error(f"failed, error: {str(e)}")
                os.remove(subtitle_file)
        else:
            logger.error(
                f"failed, sub_items len: {len(sub_items)}, script_lines len: {len(script_lines)}"
            )

    except Exception as e:
        logger.error(f"failed, error: {str(e)}")
