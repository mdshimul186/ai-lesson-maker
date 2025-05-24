from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class AccountType(str, Enum):
    PERSONAL = "personal"
    TEAM = "team"

class TeamMember(BaseModel):
    user_id: str # Changed from email to user_id for better linking with User model
    email: str # Keep email for display and invitation purposes
    role: str = "member"  # Could be 'admin', 'member', etc.
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    invitation_status: str = "pending"  # 'pending', 'accepted', 'rejected'
    invitation_id: Optional[str] = None # Added to track invitations

class Account(BaseModel):
    id: str
    name: str
    type: AccountType
    credits: int = 0
    owner_id: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    members: List[TeamMember] = [] # Ensure it's always a list

class AccountCreate(BaseModel):
    name: str
    type: AccountType = AccountType.PERSONAL
    description: Optional[str] = None

class TeamMemberResponse(BaseModel):
    user_id: str
    email: str
    role: str
    joined_at: datetime
    invitation_status: str

class AccountResponse(BaseModel):
    id: str
    name: str
    type: AccountType
    credits: int
    description: Optional[str] = None
    created_at: datetime
    is_owner: bool = False
    owner_id: str # Added owner_id
    members: List[TeamMemberResponse] = [] # Changed to list of TeamMemberResponse

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class InviteMemberRequest(BaseModel): # Renamed from InviteMember for clarity
    email: str
    # account_id will be path parameter
    role: str = "member"

class AcceptInvitationRequest(BaseModel): # Renamed from AcceptInvitation
    invitation_id: str
    # user_id will come from current_user
    # accept field is removed, separate endpoints for accept/reject or use a query param

class RemoveMemberRequest(BaseModel):
    user_id: str # ID of the member to remove
    # account_id will be path parameter
