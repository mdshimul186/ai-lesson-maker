from fastapi import APIRouter, Depends, HTTPException, status
from app.services import account_service, payment_service
from app.schemas.account import AccountResponse, AccountType
from app.api.users import get_current_active_user

async def deduct_credits_for_video(account_id: str, user_id: str, video_info: str, num_scenes: int) -> AccountResponse:
    """
    Deduct credits for video generation and record the transaction
    
    This function deducts 1 credit per scene for video generation and records the transaction.
    """
    try:
        # Calculate credits needed: 1 credit per scene
        credits_needed = num_scenes
        
        # Correctly call deduct_credits on the instance within the account_service module
        # The account_service.py file creates an instance named 'account_service'.
        # So, we access it via module_name.instance_name.method_name
        updated_account_response = await account_service.account_service.deduct_credits(account_id, user_id, credits_needed)
        
        # Record the transaction
        # Correctly call record_transaction on the instance within the payment_service module
        await payment_service.payment_service.record_transaction(
            account_id=account_id, # Use the input account_id
            user_id=user_id,
            transaction_type="deduction",
            amount=credits_needed, # Ensure this matches the amount deducted
            description=f"Video generation ({num_scenes} scenes): {video_info}"
        )
        
        # Return the AccountResponse obtained from the deduct_credits call
        return updated_account_response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deducting credits: {str(e)}"
        )
