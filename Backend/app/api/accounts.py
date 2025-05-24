from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any
from app.services.account_service import account_service
from app.schemas.account import (
    AccountCreate, 
    AccountResponse, 
    AccountUpdate,
    InviteMemberRequest, # Updated import
    AcceptInvitationRequest, # Updated import
    RemoveMemberRequest # Added import
)
from app.schemas.user import UserInDB as User # Fixed import
from app.api.users import get_current_active_user

router = APIRouter()

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_active_user) # Typed current_user
):
    """
    Create a new account. Personal accounts get 20 free credits.
    Team accounts are created with 0 credits.
    """
    try:
        # The service method now returns AccountResponse directly
        return await account_service.create_account(account_data, current_user)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating account: {str(e)}"
        )

@router.get("", response_model=List[AccountResponse])
async def get_user_accounts(current_user: User = Depends(get_current_active_user)):
    """
    Get all accounts that the current user belongs to (as owner or accepted member).
    Includes detailed member information for team accounts.
    """
    try:
        return await account_service.get_user_accounts(current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving accounts: {str(e)}"
        )

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get account details by ID. User must be an owner or an accepted member.
    Includes detailed member information for team accounts.
    """
    try:
        # Service method now handles authorization and returns AccountResponse
        return await account_service.get_account_by_id(account_id, current_user.id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving account: {str(e)}"
        )

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_data: AccountUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update account details (name, description). Only owner can update.
    """
    try:
        # Service method now returns AccountResponse
        return await account_service.update_account(account_id, current_user.id, account_data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating account: {str(e)}"
        )

# Credits endpoints (add, deduct) can remain similar but ensure they use the updated service methods
# that return AccountResponse and handle user authorization correctly.

@router.post("/{account_id}/credits/add", response_model=AccountResponse) # Changed endpoint for clarity
async def add_credits_to_account(
    account_id: str,
    credits_data: Dict[str, int], # Assuming simple {"credits": value} payload
    current_user: User = Depends(get_current_active_user)
):
    """
    Add credits to an account. User must be an owner or member.
    This is typically called after a successful payment.
    """
    try:
        credits_to_add = credits_data.get("credits")
        if credits_to_add is None or credits_to_add <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credits must be a positive number."
            )
        return await account_service.add_credits(account_id, current_user.id, credits_to_add)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error adding credits: {str(e)}")

# Deduct credits endpoint is implicitly handled by video generation, but a manual one could exist.
# For now, we assume video generation is the primary way credits are deducted.

@router.post("/{account_id}/members/invite", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def invite_member_to_account(
    account_id: str,
    invitation_data: InviteMemberRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Invite a user (by email) to join a team account. Only account owner can invite.
    The invited user must already be registered in the system.
    """
    try:
        return await account_service.invite_member(account_id, invitation_data, current_user)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inviting member: {str(e)}"
        )

@router.post("/invitations/respond", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def respond_to_invitation(
    invitation_response: AcceptInvitationRequest, # Contains invitation_id
    accept: bool = Query(..., description="Set to true to accept, false to reject"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Respond to a pending invitation (accept or reject).
    The user must be logged in and be the recipient of the invitation.
    """
    try:
        return await account_service.respond_to_invitation(
            invitation_id=invitation_response.invitation_id, 
            current_user=current_user, 
            accept=accept
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error responding to invitation: {str(e)}"
        )

@router.delete("/{account_id}/members/{member_user_id}", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def remove_member_from_account(
    account_id: str,
    member_user_id: str, # User ID of the member to remove
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove a member from a team account (owner action) or allow a member to leave an account.
    - Account owner can remove any member (except themselves).
    - A member can remove themselves (leave the team).
    """
    try:
        return await account_service.remove_member(account_id, member_user_id, current_user)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing member: {str(e)}"
        )
