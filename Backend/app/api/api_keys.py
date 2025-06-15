from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.api_key import APIKeyCreate, APIKeyResponse, APIKeyWithToken, APIKeyList
from app.services.api_key_service import APIKeyService
from app.api.dependencies import get_valid_account_id
from loguru import logger

router = APIRouter()

@router.post("/", response_model=APIKeyWithToken, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_data: APIKeyCreate,
    account_id: str = Depends(get_valid_account_id),
    api_key_service: APIKeyService = Depends(APIKeyService)
):
    """Create a new API key for the current account"""
    try:
        api_key = await api_key_service.create_api_key(account_id, api_key_data)
        logger.info(f"API key created for account {account_id}")
        return api_key
    except Exception as e:
        logger.error(f"Error creating API key for account {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )

@router.get("/", response_model=APIKeyList)
async def get_api_keys(
    account_id: str = Depends(get_valid_account_id),
    api_key_service: APIKeyService = Depends(APIKeyService)
):
    """Get all API keys for the current account"""
    try:
        api_keys = await api_key_service.get_api_keys(account_id)
        return APIKeyList(api_keys=api_keys, total=len(api_keys))
    except Exception as e:
        logger.error(f"Error getting API keys for account {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get API keys"
        )

@router.put("/{api_key_id}/revoke", response_model=dict)
async def revoke_api_key(
    api_key_id: str,
    account_id: str = Depends(get_valid_account_id),
    api_key_service: APIKeyService = Depends(APIKeyService)
):
    """Revoke (deactivate) an API key"""
    try:
        success = await api_key_service.revoke_api_key(account_id, api_key_id)
        if success:
            return {"message": "API key revoked successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking API key {api_key_id} for account {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke API key"
        )

@router.delete("/{api_key_id}", response_model=dict)
async def delete_api_key(
    api_key_id: str,
    account_id: str = Depends(get_valid_account_id),
    api_key_service: APIKeyService = Depends(APIKeyService)
):
    """Permanently delete an API key"""
    try:
        success = await api_key_service.delete_api_key(account_id, api_key_id)
        if success:
            return {"message": "API key deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key {api_key_id} for account {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )
