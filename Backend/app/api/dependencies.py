from fastapi import Header, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated, Optional, Union
from app.services.account_service import AccountService
from app.services.api_key_service import APIKeyService
from app.schemas.user import UserInDB
from app.schemas.account import AccountResponse
from app.api.users import get_current_active_user
from loguru import logger

# Security scheme for Bearer token
security = HTTPBearer(auto_error=False)

async def get_account_from_api_key(
    api_key: str,
    api_key_service: APIKeyService = Depends(APIKeyService)
) -> Optional[str]:
    """Get account_id from API key if valid"""
    return await api_key_service.validate_api_key(api_key)

async def get_auth_context(
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
    api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    api_key_service: APIKeyService = Depends(APIKeyService)
) -> tuple[Optional[UserInDB], Optional[str]]:
    """
    Get authentication context from either Bearer token or API key.
    Returns (user, account_id) tuple.
    - If Bearer token is provided: returns (user, None) - account_id comes from X-Account-ID header
    - If API key is provided: returns (None, account_id) - account_id is decoded from API key
    """
    # Check API key first
    if api_key:
        account_id = await get_account_from_api_key(api_key, api_key_service)
        if account_id:
            logger.info(f"Authenticated via API key for account {account_id}")
            return None, account_id
        else:
            logger.warning("Invalid API key provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
      # Check Bearer token
    if authorization:
        try:
            from app.services import user_service
            from jose import JWTError, jwt
            
            # Extract token and validate manually (since we can't use the oauth2_scheme dependency here)
            token = authorization.credentials
            credentials_exception = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
            try:
                payload = jwt.decode(token, user_service.SECRET_KEY, algorithms=[user_service.ALGORITHM])
                email: str = payload.get("sub")
                if email is None:
                    raise credentials_exception
            except JWTError:
                raise credentials_exception
            
            user = await user_service.get_user(email)
            if user is None:
                raise credentials_exception
            
            if not user.is_active:
                raise HTTPException(status_code=400, detail="Inactive user")
            
            logger.info(f"Authenticated via Bearer token for user {user.id}")
            return user, None
        except Exception as e:
            logger.warning(f"Invalid Bearer token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # No authentication provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide either Bearer token or X-API-Key header"
    )

async def get_current_account_unified(
    x_account_id: Annotated[str | None, Header(alias="X-Account-ID")] = None,
    auth_context: tuple[Optional[UserInDB], Optional[str]] = Depends(get_auth_context),
    account_service: AccountService = Depends(AccountService)
) -> AccountResponse:
    """
    Get the current account supporting both Bearer token and API key authentication.
    For Bearer token: requires X-Account-ID header and validates user access
    For API key: account_id is decoded from the API key itself
    """
    user, api_key_account_id = auth_context
    
    # API key authentication - account_id comes from the key
    if api_key_account_id:
        try:
            # For API key auth, we don't have a user_id to check access
            # The API key itself validates account access
            account = await account_service.get_account_by_id_direct(account_id=api_key_account_id)
            logger.info(f"API key accessed account {api_key_account_id}")
            return account
        except Exception as e:
            logger.error(f"Error getting account {api_key_account_id} via API key: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to account"
            )
    
    # Bearer token authentication - requires X-Account-ID header
    if user:
        if not x_account_id:
            logger.warning(f"X-Account-ID header is missing for user {user.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="X-Account-ID header is required when using Bearer token"
            )
        
        try:
            account = await account_service.get_account_by_id(account_id=x_account_id, current_user_id=user.id)
            logger.info(f"User {user.id} accessed account {x_account_id}")
            return account
        except HTTPException as e:
            logger.warning(f"Access denied or account not found for user {user.id} and account {x_account_id}: {e.detail}")
            raise e
        except Exception as e:
            logger.error(f"Error getting account {x_account_id} for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error getting account"
            )

async def get_valid_account_id_unified(
    x_account_id: Annotated[str | None, Header(alias="X-Account-ID")] = None,
    auth_context: tuple[Optional[UserInDB], Optional[str]] = Depends(get_auth_context),
    account_service: AccountService = Depends(AccountService)
) -> str:
    """
    Get valid account ID supporting both Bearer token and API key authentication.
    """
    user, api_key_account_id = auth_context
    
    # API key authentication
    if api_key_account_id:
        try:
            # Validate the account exists and is accessible
            account = await account_service.get_account_by_id_direct(account_id=api_key_account_id)
            if not account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
            logger.info(f"API key validated account {api_key_account_id}")
            return api_key_account_id
        except HTTPException as e:
            logger.warning(f"API key account validation failed for {api_key_account_id}: {e.detail}")
            raise e
        except Exception as e:
            logger.error(f"Error validating API key account ID {api_key_account_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error validating account ID"
            )
    
    # Bearer token authentication
    if user:
        if not x_account_id:
            logger.warning(f"X-Account-ID header is missing for user {user.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="X-Account-ID header is required when using Bearer token"
            )
        
        try:
            account = await account_service.get_account_by_id(account_id=x_account_id, current_user_id=user.id)
            if not account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
            logger.info(f"User {user.id} validated account {x_account_id}")
            return x_account_id
        except HTTPException as e:
            logger.warning(f"Access denied or account not found for user {user.id} and account {x_account_id}: {e.detail}")
            raise e
        except Exception as e:
            logger.error(f"Error validating account ID {x_account_id} for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error validating account ID"
            )

async def get_current_account(
    x_account_id: Annotated[str | None, Header(alias="X-Account-ID")] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    account_service: AccountService = Depends(AccountService)
) -> AccountResponse:
    """Get the current account from X-Account-ID header, ensuring user has access"""
    if not x_account_id:
        logger.warning(f"X-Account-ID header is missing for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Account-ID header is required."
        )
    
    try:
        account = await account_service.get_account_by_id(account_id=x_account_id, current_user_id=current_user.id)
        logger.info(f"User {current_user.id} accessed account {x_account_id}")
        return account
    except HTTPException as e:
        logger.warning(f"Access denied or account not found for user {current_user.id} and account {x_account_id}: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Error getting account {x_account_id} for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting account."
        )

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
