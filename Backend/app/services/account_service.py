from datetime import datetime
from typing import List, Optional, Dict, Any
from app.db.mongodb_utils import get_collection
from app.schemas.account import (
    Account, 
    AccountCreate, 
    AccountType, 
    AccountResponse, 
    AccountUpdate,
    TeamMember,
    InviteMemberRequest, # Updated import
    TeamMemberResponse,
    AcceptInvitationRequest # Added import
)
from app.schemas.user import UserInDB as User # Changed User to UserInDB and aliased
from fastapi import HTTPException, status
import uuid
from loguru import logger
from sendgrid import SendGridAPIClient # Added
from sendgrid.helpers.mail import Mail # Added
from app.config import get_settings # Added

class AccountService:
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        users_collection = await get_collection("users")
        user_doc = await users_collection.find_one({"email": email})
        return User(**user_doc) if user_doc else None

    async def _map_account_doc_to_response(self, account_doc: Dict[str, Any], current_user_id: str) -> AccountResponse:
        account = Account(**account_doc)
        members_response = []
        if account.members:
            for member_data in account.members:
                # Ensure member_data is a dictionary if it's coming from DB as TeamMember model instance
                member_dict = member_data if isinstance(member_data, dict) else member_data.dict()
                members_response.append(TeamMemberResponse(**member_dict))
        
        return AccountResponse(
            id=account.id,
            name=account.name,
            type=account.type,
            credits=account.credits,
            description=account.description,
            created_at=account.created_at,
            is_owner=account.owner_id == current_user_id,
            owner_id=account.owner_id,
            members=members_response
        )

    async def create_account(self, account_data: AccountCreate, user: User) -> AccountResponse:
        """Create a new account"""
        accounts_collection = await get_collection("accounts")
        
        # If creating a personal account, check if the user already has one
        if account_data.type == AccountType.PERSONAL:
            # Query for personal accounts where the user is the owner
            existing_personal_account = await accounts_collection.find_one({
                "owner_id": user.id,
                "type": AccountType.PERSONAL
            })
            
            if existing_personal_account:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User already has a personal account. Each user can have only one personal account."
                )
        
        account_id = str(uuid.uuid4())
        account = Account(
            id=account_id,
            name=account_data.name,
            type=account_data.type,
            credits=20 if account_data.type == AccountType.PERSONAL else 0,
            owner_id=user.id,
            description=account_data.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            members=[]
        )
        
        account_dict = account.dict()
        await accounts_collection.insert_one(account_dict)
        
        return await self._map_account_doc_to_response(account_dict, user.id)
    
    async def create_personal_account_for_user(self, user: User) -> AccountResponse:
        """Create a personal account for a new user"""
        account_data = AccountCreate(
            name=f"{user.first_name}'s Personal Account", # Changed user.username to user.first_name
            type=AccountType.PERSONAL,
            description="Personal account"
        )
        return await self.create_account(account_data, user)
    
    async def get_account_by_id(self, account_id: str, current_user_id: str) -> AccountResponse:
        """Get account by ID"""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})
        
        if not account_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        
        # Check if user has access (owner or accepted member)
        account_internal = Account(**account_doc)
        if account_internal.owner_id != current_user_id and \
           not any(m.user_id == current_user_id and m.invitation_status == "accepted" for m in account_internal.members):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this account")

        return await self._map_account_doc_to_response(account_doc, current_user_id)
    
    async def get_account_by_id_direct(self, account_id: str) -> Optional[AccountResponse]:
        """Get account by ID without user access validation (for API key auth)"""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})
        
        if not account_doc:
            return None
        
        # For API key auth, we create a response without user-specific access checks
        account = Account(**account_doc)
        members_response = []
        if account.members:
            for member_data in account.members:
                member_dict = member_data if isinstance(member_data, dict) else member_data.dict()
                members_response.append(TeamMemberResponse(**member_dict))
        
        return AccountResponse(
            id=account.id,
            name=account.name,
            type=account.type,
            credits=account.credits,
            description=account.description,
            created_at=account.created_at,
            is_owner=False,  # API key doesn't have owner context
            owner_id=account.owner_id,
            members=members_response
        )

    async def get_user_accounts(self, user_id: str) -> List[AccountResponse]:
        """Get all accounts a user belongs to (owner or accepted member)"""
        accounts_collection = await get_collection("accounts")
        user_accounts_response = []
        
        # Query for accounts where user is owner OR an accepted member
        query = {
            "$or": [
                {"owner_id": user_id},
                {"members": {"$elemMatch": {"user_id": user_id, "invitation_status": "accepted"}}}
            ]
        }
        
        cursor = accounts_collection.find(query)
        async for account_doc in cursor:
            user_accounts_response.append(await self._map_account_doc_to_response(account_doc, user_id))
        
        # If user has no accounts, create a personal account automatically
        if not user_accounts_response:
            # First check if the user exists
            users_collection = await get_collection("users")
            user_doc = await users_collection.find_one({"id": user_id})
            
            if user_doc:
                user = User(**user_doc)
                # Create a personal account for the user
                personal_account = await self.create_personal_account_for_user(user)
                user_accounts_response.append(personal_account)
                logger.info(f"Created a personal account automatically for user {user_id}")
        
        return user_accounts_response
    
    async def update_account(self, account_id: str, user_id: str, account_data: AccountUpdate) -> AccountResponse:
        """Update account details"""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})

        if not account_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        
        account = Account(**account_doc)
        if account.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the account owner can update account details"
            )
        
        update_payload = account_data.dict(exclude_unset=True)
        if not update_payload:
            return await self._map_account_doc_to_response(account_doc, user_id)
        
        update_payload["updated_at"] = datetime.utcnow()
        
        result = await accounts_collection.update_one(
            {"id": account_id},
            {"$set": update_payload}
        )
        
        if result.modified_count == 0 and not update_payload.items() <= account_doc.items(): # check if it was a real update
             logger.warning(f"Account update for {account_id} resulted in no DB modification, but payload was {update_payload}")
        
        updated_account_doc = await accounts_collection.find_one({"id": account_id})
        return await self._map_account_doc_to_response(updated_account_doc, user_id)

    async def add_credits(self, account_id: str, user_id: str, credits: int) -> AccountResponse:
        """Add credits to an account"""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})
        if not account_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        account = Account(**account_doc)
        is_owner = account.owner_id == user_id
        is_member = any(m.user_id == user_id and m.invitation_status == "accepted" for m in account.members)
        
        if not (is_owner or is_member):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add credits to this account"
            )
        
        result = await accounts_collection.update_one(
            {"id": account_id},
            {
                "$inc": {"credits": credits},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            # This might happen if credits is 0, which is fine.
            # If credits > 0 and no modification, it's an issue.
            if credits != 0:
                logger.error(f"Failed to add {credits} credits to account {account_id}. No document modified.")
                # Potentially raise, or just log and return current state
        
        updated_account_doc = await accounts_collection.find_one({"id": account_id})
        return await self._map_account_doc_to_response(updated_account_doc, user_id)

    async def deduct_credits(self, account_id: str, user_id: str, credits_to_deduct: int) -> AccountResponse:
        """Deduct credits from an account"""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})
        if not account_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        account = Account(**account_doc)
        is_owner = account.owner_id == user_id
        # For credit deduction, any active member or owner can trigger it.
        # The user_id passed here is the ID of the user performing the action that requires credits.
        # We need to ensure this user_id is part of the account (either owner or accepted member).
        actor_is_member_or_owner = account.owner_id == user_id or \
                                 any(m.user_id == user_id and m.invitation_status == "accepted" for m in account.members)

        if not actor_is_member_or_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized to use credits from this account"
            )
        
        if account.credits < credits_to_deduct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient credits"
            )
        
        result = await accounts_collection.update_one(
            {"id": account_id},
            {
                "$inc": {"credits": -credits_to_deduct},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            logger.error(f"Failed to deduct {credits_to_deduct} credits from account {account_id}. No document modified.")
            # This is a critical failure if credits_to_deduct > 0
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to deduct credits. Please try again."
            )
        
        updated_account_doc = await accounts_collection.find_one({"id": account_id})
        return await self._map_account_doc_to_response(updated_account_doc, user_id)

    async def invite_member(self, account_id: str, invitation_data: InviteMemberRequest, inviter: User) -> Dict[str, Any]:
        """Invite a member to an account"""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})
        if not account_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        account = Account(**account_doc)
        if account.owner_id != inviter.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the account owner can invite members"
            )
        
        if account.type != AccountType.TEAM:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only team accounts can have members"
            )
        
        invited_user = await self._get_user_by_email(invitation_data.email)
        if not invited_user:
            # For now, assume invited user must exist in the system.
            # TODO: Consider a flow for inviting users not yet registered.
            # This might involve creating a temporary user record or sending a different kind of email.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with email {invitation_data.email} not found. Please ensure they are registered.")

        if invited_user.id == inviter.id:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot invite yourself.")

        if any(member.user_id == invited_user.id for member in account.members):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member or has a pending invitation to this account."
            )
        
        invitation_id = str(uuid.uuid4())
        new_member = TeamMember(
            user_id=invited_user.id,
            email=invited_user.email, 
            role=invitation_data.role,
            joined_at=None, # Set to None initially, will be updated upon acceptance
            invitation_status="pending",
            invitation_id=invitation_id
        )
        
        result = await accounts_collection.update_one(
            {"id": account_id},
            {
                "$push": {"members": new_member.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add member invitation"
            )
        
        # Send invitation email
        settings = get_settings()
        if not settings.sendgrid_api_key or not settings.sendgrid_sender_email:
            logger.error("SendGrid API key or sender email not configured. Skipping invitation email.")
            # Depending on policy, you might want to raise an error here or just log
            # For now, we'll allow the invitation to be created but log the email failure.
        else:
            # TODO: Replace YOUR_FRONTEND_URL with the actual URL
            # The frontend should have a page to handle this, e.g., /invitations/respond?invitation_id=...&accept=true
            # For now, the link will just carry the invitation_id. The user will need to go to the app and respond.
            # A more user-friendly link would directly allow accepting/rejecting.
            # For simplicity, we'll just notify them and they can use the app's UI.
            
            # A more robust solution would involve a frontend URL that can process the invitation directly.
            # Example: frontend_url = f"{settings.frontend_base_url}/accept-invitation?invitation_id={invitation_id}"
            # For now, we will just inform them they have been invited.
            
            subject = f"You've been invited to join the team '{account.name}'"
            html_content = f"""
            <p>Hello {invited_user.first_name},</p>
            <p>You have been invited by {inviter.username} ({inviter.email}) to join the team account '<strong>{account.name}</strong>' as a {invitation_data.role}.</p>
            <p>To accept or reject this invitation, please log in to your account and go to the account management section.</p>
            <p>Your Invitation ID is: {invitation_id}</p>
            <p>If you did not expect this invitation, you can ignore this email.</p>
            <p>Thanks,<br>The {settings.app_name} Team</p>
            """
            message = Mail(
                from_email=settings.sendgrid_sender_email,
                to_emails=invited_user.email,
                subject=subject,
                html_content=html_content
            )
            try:
                sg = SendGridAPIClient(settings.sendgrid_api_key)
                response = await sg.send(message) # Use await for async sendgrid client if available, or run in executor
                logger.info(f"Invitation email sent to {invited_user.email} for account {account.name}. Status: {response.status_code}")
                if response.status_code >= 300:
                     logger.error(f"SendGrid error: {response.body}")
            except Exception as e:
                logger.error(f"Failed to send invitation email to {invited_user.email}: {e}")
                # Decide if this failure should prevent the invitation from being created or just logged.
                # For now, the invitation is created, and email failure is logged.

        logger.info(f"Invitation created for {invited_user.email} for account {account.name} (ID: {account_id}). Invitation ID: {invitation_id}")
        
        return {
            "message": "Invitation sent successfully. User will be notified by email if configured.",
            "invitation_id": invitation_id,
            "invited_user_id": invited_user.id
        }
    
    async def respond_to_invitation(self, invitation_id: str, current_user: User, accept: bool) -> Dict[str, Any]:
        """Accept or reject an invitation. User must be logged in."""
        accounts_collection = await get_collection("accounts")
        
        # Find account with the specific invitation for the current user
        query = {
            "members": {
                "$elemMatch": {
                    "invitation_id": invitation_id,
                    "user_id": current_user.id,
                    "invitation_status": "pending" # Only pending invitations can be actioned
                }
            }
        }
        account_doc = await accounts_collection.find_one(query)
        
        if not account_doc:
            # Check if already accepted/rejected or invalid ID for this user
            existing_inv_check = await accounts_collection.find_one({"members.invitation_id": invitation_id, "members.user_id": current_user.id})
            if existing_inv_check:
                member_data = next((m for m in existing_inv_check.get("members", []) if m.get("invitation_id") == invitation_id), None)
                if member_data and member_data.get("invitation_status") != "pending":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invitation already {member_data.get('invitation_status')}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending invitation not found for this user.")
        
        account = Account(**account_doc)
        new_status = "accepted" if accept else "rejected"
        update_fields = {"members.$.invitation_status": new_status}
        if accept:
            update_fields["members.$.joined_at"] = datetime.utcnow()
        
        result = await accounts_collection.update_one(
            {
                "id": account.id,
                "members.invitation_id": invitation_id,
                "members.user_id": current_user.id
            },
            {
                "$set": {
                    **update_fields,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            logger.error(f"Failed to update invitation status for inv_id {invitation_id}, user {current_user.id}, account {account.id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update invitation status. Please try again."
            )
        
        message = f"Invitation {new_status} successfully."
        logger.info(f"User {current_user.email} {new_status} invitation {invitation_id} for account {account.name}")
        return {"message": message, "account_id": account.id, "user_id": current_user.id, "status": new_status}

    async def remove_member(self, account_id: str, member_user_id_to_remove: str, current_user: User) -> Dict[str, Any]:
        """Remove a member from an account (owner action) or allow a member to leave an account."""
        accounts_collection = await get_collection("accounts")
        account_doc = await accounts_collection.find_one({"id": account_id})
        if not account_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        account = Account(**account_doc)

        # Check if the member to remove exists
        member_to_remove = next((m for m in account.members if m.user_id == member_user_id_to_remove), None)
        if not member_to_remove:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this account.")

        is_owner_action = account.owner_id == current_user.id
        is_self_removal = member_user_id_to_remove == current_user.id

        if not (is_owner_action or is_self_removal):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to remove this member. Only account owner or the member themselves can perform this action."
            )
        
        if account.owner_id == member_user_id_to_remove:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account owner cannot be removed. Transfer ownership first.")

        result = await accounts_collection.update_one(
            {"id": account_id},
            {
                "$pull": {"members": {"user_id": member_user_id_to_remove}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            logger.error(f"Failed to remove member {member_user_id_to_remove} from account {account_id}. No document modified.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove member. Please try again."
            )
        
        action_type = "removed" if is_owner_action and not is_self_removal else "left"
        logger.info(f"Member {member_to_remove.email} (ID: {member_user_id_to_remove}) has {action_type} account {account.name} (ID: {account_id}). Action by: {current_user.email}")
        return {"message": f"Member {action_type} successfully."}

account_service = AccountService()
