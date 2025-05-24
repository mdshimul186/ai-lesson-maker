from fastapi import Header, HTTPException, Depends, status
from typing import Annotated
from app.services.account_service import AccountService
from app.schemas.user import UserInDB
from app.api.users import get_current_active_user
from loguru import logger

async def get_valid_account_id(
    x_account_id: Annotated[str | None, Header(alias="X-Account-ID")] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    account_service: AccountService = Depends(AccountService) 
) -> str:
    if not x_account_id:
        logger.warning(f"X-Account-ID header is missing for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Account-ID header is required."
        )
    
    try:
        # The get_account_by_id service method already checks if the user has access
        # and raises HTTPException if not found or not authorized.
        account = await account_service.get_account_by_id(account_id=x_account_id, current_user_id=current_user.id)
        if not account: # Should be caught by get_account_by_id, but as a safeguard
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied.")
        logger.info(f"User {current_user.id} accessed account {x_account_id}")
        return x_account_id
    except HTTPException as e:
        logger.warning(f"Access denied or account not found for user {current_user.id} and account {x_account_id}: {e.detail}")
        raise e # Re-raise the exception from the service
    except Exception as e:
        logger.error(f"Error validating account ID {x_account_id} for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating account ID."
        )

async def get_optional_account_id(
    x_account_id: Annotated[str | None, Header(alias="X-Account-ID")] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    account_service: AccountService = Depends(AccountService)
) -> str | None:
    if not x_account_id:
        return None
    try:
        account = await account_service.get_account_by_id(account_id=x_account_id, current_user_id=current_user.id)
        if not account:
             # This case should ideally be handled by get_account_by_id raising an error
            logger.warning(f"Optional X-Account-ID {x_account_id} provided by user {current_user.id} but account not found or no access.")
            return None # Or raise an error if an invalid ID is provided but shouldn't be used
        return x_account_id
    except HTTPException:
        # If get_account_by_id raises an HTTPException (e.g., 403 Forbidden, 404 Not Found),
        # we treat it as if the account_id is not validly provided for optional use.
        logger.warning(f"Optional X-Account-ID {x_account_id} provided by user {current_user.id} was invalid or access denied.")
        return None
    except Exception as e:
        logger.error(f"Error validating optional account ID {x_account_id} for user {current_user.id}: {str(e)}")
        # Depending on policy, you might want to raise an error here or just return None
        return None
