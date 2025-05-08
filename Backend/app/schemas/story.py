from pydantic import BaseModel
from typing import List, Optional


class StoryBase(BaseModel):
    title: str
    description: Optional[str] = None


class StoryCreate(StoryBase):
    pass


class StoryUpdate(StoryBase):
    title: Optional[str] = None


class Story(StoryBase):
    id: str
    
    class Config:
        from_attributes = True
