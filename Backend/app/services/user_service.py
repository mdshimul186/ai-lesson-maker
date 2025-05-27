from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.db.mongodb_utils import get_collection
from app.schemas.user import UserInDB, UserCreate
from app.config import get_settings
from fastapi import HTTPException, status
import uuid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from loguru import logger
import os
from app.services.account_service import account_service

import random
import string

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey12345")  # In production, use a secure secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
VERIFICATION_CODE_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_user(email: str):
    """Get user from database by email"""
    users_collection = await get_collection("users")
    user = await users_collection.find_one({"email": email})
    if user:
        return UserInDB(**user)
    return None

async def get_user_by_verification_code(code: str):
    """Get user by verification code"""
    users_collection = await get_collection("users")
    user = await users_collection.find_one({
        "verification_code": code,
        "verification_code_expires": {"$gt": datetime.utcnow()}
    })
    if user:
        return UserInDB(**user)
    return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Create password hash"""
    return pwd_context.hash(password)

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def authenticate_user(email: str, password: str):
    """Authenticate user with email and password"""
    user = await get_user(email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

async def create_user(user_data: UserCreate) -> UserInDB:
    """Create a new user in the database"""
    users_collection = await get_collection("users")
    
    # Check if user already exists
    existing_user = await get_user(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate verification code
    verification_code = generate_verification_code()
    expiration_time = datetime.utcnow() + timedelta(hours=VERIFICATION_CODE_EXPIRE_HOURS)
    
    # Create user in database
    user_in_db = UserInDB(
        id=str(uuid.uuid4()),
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=get_password_hash(user_data.password),
        is_active=True,
        is_verified=False,
        verification_code=verification_code,
        verification_code_expires=expiration_time,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
      # Insert new user
    user_dict = user_in_db.dict()
    await users_collection.insert_one(user_dict)
    
    # Send verification email
    await send_verification_email(user_in_db.email, verification_code)
    
    # Create a personal account for the user
    try:
        user_name = f"{user_data.first_name} {user_data.last_name}"
        await account_service.create_personal_account_for_user(user_in_db.id, user_name)
    except Exception as e:
        logger.error(f"Error creating personal account for user: {e}")
        # Continue with user creation even if account creation fails
    
    return user_in_db

async def verify_email(code: str) -> bool:
    """Verify user email with verification code"""
    user = await get_user_by_verification_code(code)
    if not user:
        return False
    
    users_collection = await get_collection("users")
    result = await users_collection.update_one(
        {"email": user.email},
        {
            "$set": {
                "is_verified": True,
                "verification_code": None,
                "verification_code_expires": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    return result.modified_count > 0

async def resend_verification_email(email: str) -> bool:
    """Resend verification email to user"""
    user = await get_user(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate new verification code
    verification_code = generate_verification_code()
    expiration_time = datetime.utcnow() + timedelta(hours=VERIFICATION_CODE_EXPIRE_HOURS)
    
    # Update user with new verification code
    users_collection = await get_collection("users")
    result = await users_collection.update_one(
        {"email": user.email},
        {
            "$set": {
                "verification_code": verification_code,
                "verification_code_expires": expiration_time,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        # Send verification email
        await send_verification_email(user.email, verification_code)
        return True
    return False

async def send_verification_email(email: str, verification_code: str) -> bool:
    """Send verification email using SendGrid"""
    settings = get_settings()
    
    if not settings.sendgrid_api_key or not settings.sendgrid_sender_email:
        logger.error("SendGrid API key or sender email not configured")
        return False
    
    message = Mail(
        from_email=settings.sendgrid_sender_email,
        to_emails=email,
        subject='Verify Your Email Address',
        html_content=f'''
        <html>
            <body>
                <h2>Welcome to AI Lesson Maker!</h2>
                <p>Thank you for registering. Please use the verification code below to verify your email address:</p>
                <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #f7f7f7; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                    {verification_code}
                </div>
                <p>If you didn't sign up for this account, please ignore this email.</p>
                <p>This code will expire in 24 hours.</p>
            </body>
        </html>
        '''
    )
    
    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)
        if response.status_code == 202:
            logger.info(f"Verification email sent to {email}")
            return True
        else:
            logger.error(f"Failed to send verification email: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error sending verification email: {e}")
        return False
