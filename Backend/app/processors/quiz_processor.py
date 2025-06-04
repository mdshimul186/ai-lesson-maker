from typing import Dict, Any, List
import json
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
from app.services import task_service

class QuizProcessor(BaseTaskProcessor):
    """Processor for quiz generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.QUIZ)
    
    def validate_request_data(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate quiz generation request data"""
        required_fields = ["topic", "question_count", "difficulty"]
        for field in required_fields:
            if field not in request_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate question count
        question_count = request_data.get("question_count", 0)
        if not isinstance(question_count, int) or question_count < 1 or question_count > 50:
            raise ValueError("Question count must be between 1 and 50")
        
        # Validate difficulty
        valid_difficulties = ["easy", "medium", "hard"]
        if request_data.get("difficulty") not in valid_difficulties:
            raise ValueError(f"Difficulty must be one of: {valid_difficulties}")
        
        return request_data
    
    async def execute_task(self, task_id: str, request: Dict[str, Any], queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Execute quiz generation"""
        topic = request["topic"]
        question_count = request["question_count"]
        difficulty = request["difficulty"]
        quiz_type = request.get("quiz_type", "multiple_choice")
        language = request.get("language", "en")
        
        await task_service.add_task_event(
            task_id=task_id,
            message=f"Generating {question_count} {difficulty} questions about {topic}",
            progress=20
        )
        
        # TODO: Implement AI-based quiz generation
        # This would involve:
        # 1. Use LLM to generate questions based on topic and difficulty
        # 2. Create different question types (multiple choice, true/false, fill-in-blank)
        # 3. Generate appropriate answers and distractors
        # 4. Validate question quality and uniqueness
        
        # Placeholder implementation
        questions = []
        for i in range(question_count):
            question = {
                "id": f"q_{i+1}",
                "question": f"Sample {difficulty} question {i+1} about {topic}",
                "type": quiz_type,
                "options": [
                    "Option A",
                    "Option B", 
                    "Option C",
                    "Option D"
                ] if quiz_type == "multiple_choice" else None,
                "correct_answer": "Option A" if quiz_type == "multiple_choice" else "True",
                "explanation": f"This is the explanation for question {i+1}",
                "difficulty": difficulty,
                "points": self._get_points_by_difficulty(difficulty)
            }
            questions.append(question)
            
            # Update progress
            progress = 20 + (60 * (i + 1) / question_count)
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Generated question {i+1}/{question_count}",
                progress=int(progress)
            )
        
        quiz_data = {
            "id": task_id,
            "title": f"Quiz: {topic}",
            "topic": topic,
            "difficulty": difficulty,
            "question_count": question_count,
            "quiz_type": quiz_type,
            "language": language,
            "questions": questions,
            "total_points": sum(q["points"] for q in questions),
            "estimated_time_minutes": question_count * 2,  # 2 minutes per question
            "created_at": "2025-06-04T00:00:00Z"
        }
        
        await task_service.add_task_event(
            task_id=task_id,
            message="Quiz generation completed",
            progress=90
        )
        
        return {
            "quiz": quiz_data,
            "question_count": len(questions),
            "success": True
        }
    
    def _get_points_by_difficulty(self, difficulty: str) -> int:
        """Get points based on question difficulty"""
        points_map = {
            "easy": 1,
            "medium": 2, 
            "hard": 3
        }
        return points_map.get(difficulty, 1)
    
    async def post_process(self, task_id: str, result: Dict[str, Any], queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Post-process quiz (save to database, generate sharing links)"""
        quiz_data = result["quiz"]
        
        # TODO: Save quiz to database and generate sharing/embedding links
        quiz_url = f"https://quiz.example.com/quiz/{task_id}"
        embed_code = f'<iframe src="{quiz_url}/embed" width="100%" height="600"></iframe>'
        
        await task_service.set_task_completed(
            task_id=task_id,
            result_url=quiz_url,
            task_folder_content=result,
            final_message="Quiz generation and storage complete"
        )
        
        return {
            **result,
            "quiz_url": quiz_url,
            "embed_code": embed_code,
            "api_endpoint": f"/api/quiz/{task_id}"
        }
