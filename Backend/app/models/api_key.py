from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib
from dataclasses import dataclass

@dataclass
class APIKey:
    """API Key model for authentication"""
    id: str
    account_id: str
    name: str
    key_hash: str  # Hashed version of the actual key
    prefix: str    # First 8 characters for identification
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    is_active: bool
    
    @staticmethod
    def generate_key() -> str:
        """Generate a secure API key"""
        return f"sk-{secrets.token_urlsafe(32)}"
    
    @staticmethod
    def hash_key(key: str) -> str:
        """Hash an API key for secure storage"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    @staticmethod
    def get_prefix(key: str) -> str:
        """Get the prefix of an API key for identification"""
        return key[:12] if len(key) >= 12 else key
    
    def is_expired(self) -> bool:
        """Check if the API key has expired"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if the API key is valid (active and not expired)"""
        return self.is_active and not self.is_expired()
