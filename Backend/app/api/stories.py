from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..schemas.story import Story, StoryCreate, StoryUpdate
from ..services.story import story_service

router = APIRouter()


@router.get("/", response_model=List[Story])
async def list_stories(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """
    获取故事列表
    """
    return story_service.get_stories(skip=skip, limit=limit)


@router.post("/", response_model=Story)
async def create_story(story: StoryCreate):
    """
    创建新故事
    """
    return story_service.create_story(story)


@router.get("/{story_id}", response_model=Story)
async def get_story(story_id: str):
    """
    获取特定故事的详细信息
    """
    story = story_service.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.put("/{story_id}", response_model=Story)
async def update_story(story_id: str, story: StoryUpdate):
    """
    更新故事信息
    """
    updated_story = story_service.update_story(story_id, story)
    if updated_story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return updated_story


@router.delete("/{story_id}")
async def delete_story(story_id: str):
    """
    删除故事
    """
    if not story_service.delete_story(story_id):
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Story deleted successfully"}
