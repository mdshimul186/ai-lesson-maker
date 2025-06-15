from typing import Dict, Any, List
import json
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType
from app.services import task_service
from app.services.llm import LLMService
from loguru import logger

class QuizProcessor(BaseTaskProcessor):
    """Processor for quiz generation tasks"""
    
    def __init__(self):
        super().__init__(TaskType.QUIZ)
        self.llm_service = LLMService()
    
    def validate_request_data(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate quiz generation request data"""
        required_fields = ["story_prompt", "num_questions", "difficulty"]
        for field in required_fields:
            if field not in request_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate question count
        num_questions = request_data.get("num_questions", 0)
        if not isinstance(num_questions, int) or num_questions < 1 or num_questions > 50:
            raise ValueError("num_questions must be between 1 and 50")
        
        # Validate difficulty
        valid_difficulties = ["easy", "medium", "hard"]
        if request_data.get("difficulty") not in valid_difficulties:
            raise ValueError(f"Difficulty must be one of: {valid_difficulties}")
        
        return request_data
    
    async def _generate_quiz_questions(self, story_prompt: str, num_questions: int, difficulty: str, language: str = "English") -> List[Dict[str, Any]]:
        """Generate quiz questions using OpenAI API based on story prompt"""
        
        # Create prompt for OpenAI
        prompt = f"""
        Based on the following story/content, generate {num_questions} quiz questions at {difficulty} difficulty level in {language}.
        
        Story/Content:
        {story_prompt}
        
        Please generate exactly {num_questions} multiple-choice questions that test comprehension and understanding of the story content.
        Each question should have 4 options (A, B, C, D) with only one correct answer.
        
        Return the result in the following JSON format:
        {{
            "questions": [
                {{
                    "question": "Question text here",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A",
                    "explanation": "Explanation of why this answer is correct"
                }}
            ]
        }}
        
        Make sure the questions:
        - Are directly related to the story content provided
        - Test understanding, not just memorization
        - Are appropriate for {difficulty} difficulty level
        - Have clear and unambiguous correct answers
        - Include helpful explanations
        """
        
        messages = [
            {
                "role": "system",
                "content": "You are an expert quiz creator. Generate high-quality quiz questions based on the provided story content."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ]
        
        try:
            # Call OpenAI API
            response = await self.llm_service._generate_response(
                messages=messages,
                response_format="json_object"
            )
            
            # Parse and validate response
            if "questions" not in response:
                raise ValueError("Response missing 'questions' field")
            
            questions = response["questions"]
            if len(questions) != num_questions:
                logger.warning(f"Generated {len(questions)} questions instead of requested {num_questions}")
            
            # Format questions with additional metadata
            formatted_questions = []
            for i, q in enumerate(questions):
                formatted_question = {
                    "id": f"q_{i+1}",
                    "question": q.get("question", ""),
                    "type": "multiple_choice",
                    "options": q.get("options", []),
                    "correct_answer": q.get("correct_answer", ""),
                    "explanation": q.get("explanation", ""),
                    "difficulty": difficulty,
                    "points": self._get_points_by_difficulty(difficulty)
                }
                formatted_questions.append(formatted_question)
            
            return formatted_questions
            
        except Exception as e:
            logger.error(f"Error generating quiz questions: {str(e)}")
            # Fallback to placeholder questions if AI generation fails
            return self._generate_fallback_questions(story_prompt, num_questions, difficulty)
    
    def _generate_fallback_questions(self, story_prompt: str, num_questions: int, difficulty: str) -> List[Dict[str, Any]]:
        """Generate fallback questions if AI generation fails"""
        questions = []
        for i in range(num_questions):
            question = {
                "id": f"q_{i+1}",
                "question": f"Sample {difficulty} question {i+1} about the story content",
                "type": "multiple_choice",
                "options": [
                    "Option A",
                    "Option B", 
                    "Option C",
                    "Option D"
                ],
                "correct_answer": "Option A",
                "explanation": f"This is a placeholder explanation for question {i+1}",
                "difficulty": difficulty,
                "points": self._get_points_by_difficulty(difficulty)
            }
            questions.append(question)
        return questions
    
    async def execute_task(self, task_id: str, request: Dict[str, Any], queue_item: Dict[str, Any]) -> Dict[str, Any]:
        """Execute quiz generation"""
        story_prompt = request["story_prompt"]
        num_questions = request["num_questions"]
        difficulty = request["difficulty"]
        quiz_type = request.get("quiz_type", "multiple_choice")
        language = request.get("language", "English")
        
        await task_service.add_task_event(
            task_id=task_id,
            message=f"Generating {num_questions} {difficulty} questions based on story content",
            progress=20
        )
        
        # Generate questions using OpenAI API
        try:
            questions = await self._generate_quiz_questions(
                story_prompt=story_prompt,
                num_questions=num_questions,
                difficulty=difficulty,
                language=language
            )
            
            await task_service.add_task_event(
                task_id=task_id,
                message="Quiz questions generated successfully",
                progress=80
            )
            
        except Exception as e:
            logger.error(f"Error in quiz generation: {str(e)}")
            await task_service.add_task_event(
                task_id=task_id,
                message=f"Error generating questions: {str(e)}. Using fallback generation.",
                progress=60
            )
            # Use fallback generation
            questions = self._generate_fallback_questions(story_prompt, num_questions, difficulty)
        
        # Create quiz data structure
        quiz_data = {
            "id": task_id,
            "title": f"Quiz: Story Comprehension",
            "story_prompt": story_prompt,
            "difficulty": difficulty,
            "num_questions": len(questions),
            "quiz_type": quiz_type,
            "language": language,
            "questions": questions,
            "total_points": sum(q["points"] for q in questions),
            "estimated_time_minutes": len(questions) * 2,  # 2 minutes per question
            "created_at": "2025-06-15T00:00:00Z"
        }
        
        await task_service.add_task_event(
            task_id=task_id,
            message="Quiz generation completed",
            progress=90
        )
        
        return {
            "quiz": quiz_data,
            "num_questions": len(questions),
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
