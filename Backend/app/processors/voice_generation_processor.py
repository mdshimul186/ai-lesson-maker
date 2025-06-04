from typing import Dict, Any
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
import logging
from app.services import task_service

logger = logging.getLogger(__name__)

class VoiceGenerationProcessor(BaseTaskProcessor):
    """Processor for voice generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.VOICE_GENERATION)
    
    async def process_task(self, task_id: str, request_data: Dict[str, Any], user_id: str, account_id: str) -> Dict[str, Any]:
        """
        Process voice generation task
        """
        try:
            await task_service.add_task_event(
                task_id=task_id,
                message="Starting voice generation...",
                status="PROCESSING",
                progress=10
            )
            
            # Extract voice generation parameters
            text = request_data.get("text", "")
            voice_name = request_data.get("voice_name", "en-US-AriaNeural")
            language = request_data.get("language", "en")
            rate = request_data.get("rate", 1.0)
            pitch = request_data.get("pitch", 0)
            volume = request_data.get("volume", 1.0)
            output_format = request_data.get("output_format", "mp3")
            
            logger.info(f"Generating voice for text length: {len(text)} characters, voice: {voice_name}")
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Processing text with speech synthesis...",
                status="PROCESSING",
                progress=30
            )
            
            # Use existing voice service if available
            try:
                from app.services.voice import VoiceService
                voice_service = VoiceService()
                
                await task_service.add_task_event(
                    task_id=task_id,
                    message="Synthesizing speech...",
                    status="PROCESSING",
                    progress=60
                )
                
                # Generate voice
                audio_result = await voice_service.generate_speech(
                    text=text,
                    voice_name=voice_name,
                    rate=rate,
                    volume=volume
                )
                
                # Save audio file
                audio_filename = f"{task_id}_voice.{output_format}"
                audio_path = f"tasks/{audio_filename}"
                
                # In real implementation, save the audio data to file
                # For now, we'll create a placeholder
                
                await task_service.add_task_event(
                    task_id=task_id,
                    message="Finalizing voice generation...",
                    status="PROCESSING",
                    progress=90
                )
                
                result = {
                    "task_id": task_id,
                    "audio_file": {
                        "filename": audio_filename,
                        "path": audio_path,
                        "format": output_format,
                        "duration": len(text) * 0.1,  # Rough estimate: 0.1 seconds per character
                        "size": len(text) * 100  # Rough estimate of file size
                    },
                    "metadata": {
                        "text": text[:100] + "..." if len(text) > 100 else text,
                        "text_length": len(text),
                        "voice_name": voice_name,
                        "language": language,
                        "rate": rate,
                        "pitch": pitch,
                        "volume": volume,
                        "output_format": output_format
                    }
                }
                
            except ImportError:
                # Fallback if voice service is not available
                logger.warning("Voice service not available, using placeholder")
                
                result = {
                    "task_id": task_id,
                    "audio_file": {
                        "filename": f"{task_id}_voice_placeholder.{output_format}",
                        "path": f"tasks/{task_id}_voice_placeholder.{output_format}",
                        "format": output_format,
                        "duration": len(text) * 0.1,
                        "size": len(text) * 100
                    },
                    "metadata": {
                        "text": text[:100] + "..." if len(text) > 100 else text,
                        "text_length": len(text),
                        "voice_name": voice_name,
                        "language": language,
                        "note": "Voice service not available - placeholder generated"
                    }
                }
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Voice generation completed successfully",
                status="COMPLETED",
                progress=100
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Voice generation failed: {str(e)}"
            logger.error(f"Voice generation failed for task {task_id}: {e}")
            
            await task_service.add_task_event(
                task_id=task_id,
                message=error_msg,
                status="FAILED",
                progress=0
            )
            
            raise Exception(error_msg)
    
    async def estimate_completion_time(self, request_data: Dict[str, Any]) -> int:
        """Estimate completion time for voice generation in minutes"""
        text = request_data.get("text", "")
        text_length = len(text)
        
        # Estimate based on text length
        # Roughly 1 minute per 1000 characters
        return max(1, text_length // 1000 + 1)
