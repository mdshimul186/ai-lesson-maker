from typing import List, Optional
from app.schemas.story import Story, StoryCreate, StoryUpdate
import uuid


class StoryService:
    def __init__(self):
        # 使用内存存储示例数据
        self._stories = {}

    def get_stories(self, skip: int = 0, limit: int = 10) -> List[Story]:
        stories = list(self._stories.values())
        return stories[skip : skip + limit]

    def get_story(self, story_id: str) -> Optional[Story]:
        return self._stories.get(story_id)

    def create_story(self, story: StoryCreate) -> Story:
        story_id = str(uuid.uuid4())
        story_data = Story(
            id=story_id,
            title=story.title,
            description=story.description,
        )
        self._stories[story_id] = story_data
        return story_data

    def update_story(self, story_id: str, story: StoryUpdate) -> Optional[Story]:
        if story_id not in self._stories:
            return None
        
        stored_story = self._stories[story_id]
        update_data = story.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(stored_story, field, value)
            
        self._stories[story_id] = stored_story
        return stored_story

    def delete_story(self, story_id: str) -> bool:
        if story_id not in self._stories:
            return False
        del self._stories[story_id]
        return True


# 创建一个全局的服务实例
story_service = StoryService()
