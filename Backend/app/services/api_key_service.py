from datetime import datetime, timedelta
from typing import Optional, List
import uuid
from fastapi import HTTPException, status
from loguru import logger
from app.models.api_key import APIKey
from app.schemas.api_key import APIKeyCreate, APIKeyResponse, APIKeyWithToken
from app.db.mongodb_utils import get_collection

class APIKeyService:
    """Service for managing API keys"""
    
    async def _get_collection(self):
        """Get the API keys collection"""
        return await get_collection("api_keys")
    
    async def create_api_key(self, account_id: str, api_key_data: APIKeyCreate) -> APIKeyWithToken:
        """Create a new API key for an account"""
        try:
            collection = await self._get_collection()
            
            # Generate the actual API key
            api_key = APIKey.generate_key()
            
            # Calculate expiry date
            expires_at = None
            if api_key_data.expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=api_key_data.expires_in_days)
            
            # Create the API key document
            api_key_doc = {
                "_id": str(uuid.uuid4()),
                "account_id": account_id,
                "name": api_key_data.name,
                "key_hash": APIKey.hash_key(api_key),
                "prefix": APIKey.get_prefix(api_key),
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
                "last_used_at": None,
                "is_active": True
            }
            
            # Insert into database
            await collection.insert_one(api_key_doc)
            
            logger.info(f"Created API key {api_key_doc['_id']} for account {account_id}")
            
            return APIKeyWithToken(
                id=api_key_doc["_id"],
                name=api_key_doc["name"],
                prefix=api_key_doc["prefix"],
                created_at=api_key_doc["created_at"],
                expires_at=api_key_doc["expires_at"],
                last_used_at=api_key_doc["last_used_at"],
                is_active=api_key_doc["is_active"],
                key=api_key
            )
            
        except Exception as e:
            logger.error(f"Error creating API key for account {account_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create API key"
            )
    
    async def get_api_keys(self, account_id: str) -> List[APIKeyResponse]:
        """Get all API keys for an account"""
        try:
            collection = await self._get_collection()
            cursor = collection.find(
                {"account_id": account_id},
                {"key_hash": 0}  # Exclude the hash from results
            ).sort("created_at", -1)
            
            api_keys = []
            async for doc in cursor:
                api_keys.append(APIKeyResponse(
                    id=doc["_id"],
                    name=doc["name"],
                    prefix=doc["prefix"],
                    created_at=doc["created_at"],
                    expires_at=doc["expires_at"],
                    last_used_at=doc["last_used_at"],
                    is_active=doc["is_active"]
                ))
            
            return api_keys
            
        except Exception as e:
            logger.error(f"Error getting API keys for account {account_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get API keys"
            )
    
    async def revoke_api_key(self, account_id: str, api_key_id: str) -> bool:
        """Revoke (deactivate) an API key"""
        try:
            collection = await self._get_collection()
            result = await collection.update_one(
                {"_id": api_key_id, "account_id": account_id},
                {"$set": {"is_active": False}}
            )
            
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found"
                )
            
            logger.info(f"Revoked API key {api_key_id} for account {account_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error revoking API key {api_key_id} for account {account_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to revoke API key"
            )
    
    async def validate_api_key(self, api_key: str) -> Optional[str]:
        """Validate an API key and return the account_id if valid"""
        try:
            collection = await self._get_collection()
            key_hash = APIKey.hash_key(api_key)
            
            # Find the API key in the database
            doc = await collection.find_one({"key_hash": key_hash})
            
            if not doc:
                return None
            
            # Check if the key is still valid
            api_key_obj = APIKey(
                id=doc["_id"],
                account_id=doc["account_id"],
                name=doc["name"],
                key_hash=doc["key_hash"],
                prefix=doc["prefix"],
                created_at=doc["created_at"],
                expires_at=doc["expires_at"],
                last_used_at=doc["last_used_at"],
                is_active=doc["is_active"]
            )
            
            if not api_key_obj.is_valid():
                return None
            
            # Update last used timestamp
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"last_used_at": datetime.utcnow()}}
            )
            
            logger.info(f"Valid API key used for account {doc['account_id']}")
            return doc["account_id"]
            
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return None
    
    async def delete_api_key(self, account_id: str, api_key_id: str) -> bool:
        """Permanently delete an API key"""
        try:
            collection = await self._get_collection()
            result = await collection.delete_one(
                {"_id": api_key_id, "account_id": account_id}
            )
            
            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found"
                )
            
            logger.info(f"Deleted API key {api_key_id} for account {account_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting API key {api_key_id} for account {account_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete API key"
            )
