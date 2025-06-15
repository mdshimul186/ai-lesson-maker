from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class APIKeyCreate(BaseModel):
    """Schema for creating a new API key"""
    name: str = Field(..., min_length=1, max_length=100, description="Name for the API key")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Number of days until expiry (optional)")

class APIKeyResponse(BaseModel):
    """Schema for API key response (without the actual key)"""
    id: str
    name: str
    prefix: str
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    is_active: bool

class APIKeyWithToken(APIKeyResponse):
    """Schema for API key response with the actual token (only returned on creation)"""
    key: str

class APIKeyList(BaseModel):
    """Schema for listing API keys"""
    api_keys: list[APIKeyResponse]
    total: int
