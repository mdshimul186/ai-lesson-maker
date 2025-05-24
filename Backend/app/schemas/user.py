from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    
class UserCreate(UserBase):
    password: str
    
class UserResponse(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserInDB(UserBase):
    id: str
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    verification_code: Optional[str] = None
    verification_code_expires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class VerifyEmail(BaseModel):
    verification_code: str
    
class ResendVerification(BaseModel):
    email: EmailStr
