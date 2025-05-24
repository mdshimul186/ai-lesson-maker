from datetime import datetime
import os
from typing import Dict, Any, List, Optional
import paypalrestsdk
from fastapi import HTTPException, status
from app.db.mongodb_utils import get_collection
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentStatus,
    PaymentVerify,
    Transaction,
    CreditPackage
)
from app.services.account_service import account_service
import uuid
from loguru import logger
from app.config import get_settings # Import get_settings

# Configure PayPal
paypalrestsdk.configure({
    "mode": os.getenv("PAYPAL_MODE", "sandbox"),  # sandbox or live
    "client_id": os.getenv("PAYPAL_CLIENT_ID", ""),
    "client_secret": os.getenv("PAYPAL_CLIENT_SECRET", "")
})

# Credit packages
CREDIT_PACKAGES = [
    CreditPackage(
        id="pkg_50",
        name="Starter Pack",
        credits=50,
        price=10.00,
        description="50 credits for $10 - Great for getting started"
    ),
    CreditPackage(
        id="pkg_120",
        name="Value Pack",
        credits=120,
        price=20.00,
        description="120 credits for $20 - Our most popular option"
    ),
    CreditPackage(
        id="pkg_600",
        name="Pro Pack",
        credits=600,
        price=50.00,
        description="600 credits for $50 - Best value for professionals"
    )
]

class PaymentService:
    async def get_credit_packages(self) -> List[CreditPackage]:
        """Get available credit packages"""
        return CREDIT_PACKAGES
    
    async def get_package_by_id(self, package_id: str) -> Optional[CreditPackage]:
        """Get a credit package by ID"""
        for package in CREDIT_PACKAGES:
            if package.id == package_id:
                return package
        return None
    
    async def create_paypal_payment(self, payment_data: PaymentCreate, user_id: str) -> PaymentResponse:
        """Create a PayPal payment"""
        # Verify account exists and user has access
        try:
            # Pass the user_id as current_user_id to check account access
            account = await account_service.get_account_by_id(payment_data.account_id, user_id)
            
            # Check if user is owner or member - This check might be redundant if get_account_by_id already handles it
            # However, keeping it for explicitness or if get_account_by_id's behavior changes.
            is_owner = account.owner_id == user_id
            # The user_id for checking membership should be the one performing the action (user_id from token)
            is_member = any(member.user_id == user_id and member.invitation_status == "accepted" for member in account.members)
            
            if not (is_owner or is_member):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to purchase credits for this account"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error verifying account: {str(e)}"
            )
        
        # Get package details
        package = await self.get_package_by_id(payment_data.package_id)
        if not package:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid package ID"
            )
        
        # Set up return URLs
        settings = get_settings() # Get settings instance
        base_url = settings.frontend_base_url # Use frontend_base_url from settings
        return_url = payment_data.return_url or f"{base_url}/payment/success"
        cancel_url = payment_data.cancel_url or f"{base_url}/payment/cancel"
        
        # Create PayPal payment
        payment = paypalrestsdk.Payment({
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": return_url,
                "cancel_url": cancel_url
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": package.name,
                        "sku": package.id,
                        "price": str(package.price),
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "total": str(package.price),
                    "currency": "USD"
                },
                "description": f"Purchase of {package.credits} credits for AI Lesson Maker"
            }]
        })
        
        # Create payment in PayPal
        try:
            if payment.create():
                # Get redirect URL
                redirect_url = None
                for link in payment.links:
                    if link.rel == "approval_url":
                        redirect_url = link.href
                
                # Store payment info in database
                payment_id = payment.id
                payments_collection = await get_collection("payments")
                
                payment_record = {
                    "payment_id": payment_id,
                    "user_id": user_id,
                    "account_id": payment_data.account_id,
                    "package_id": package.id,
                    "amount": package.price,
                    "credits": package.credits,
                    "status": PaymentStatus.PENDING.value,
                    "provider": payment_data.provider,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await payments_collection.insert_one(payment_record)
                
                return PaymentResponse(
                    payment_id=payment_id,
                    status=PaymentStatus.PENDING,
                    redirect_url=redirect_url
                )
            else:                return PaymentResponse(
                    payment_id="",
                    status=PaymentStatus.FAILED,
                    error_message=str(payment.error)  # Convert to string
                )
        except Exception as e:
            logger.error(f"PayPal payment creation error: {str(e)}")
            return PaymentResponse(
                payment_id="",
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )
    
    async def execute_paypal_payment(self, verify_data: PaymentVerify, user_id: str) -> PaymentResponse:
        """Execute a PayPal payment after user approval"""
        # Get payment from database
        payments_collection = await get_collection("payments")
        payment_record = await payments_collection.find_one({"payment_id": verify_data.payment_id})
        
        if not payment_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Check if payment is already completed
        if payment_record.get("status") == PaymentStatus.COMPLETED.value:
            logger.info(f"Payment {verify_data.payment_id} is already completed in database")
            return PaymentResponse(
                payment_id=verify_data.payment_id,
                status=PaymentStatus.COMPLETED
            )
        
        # Execute PayPal payment
        try:
            payment = paypalrestsdk.Payment.find(verify_data.payment_id)

            logger.info(payment)
            
            if payment.execute({"payer_id": verify_data.payer_id}):
                # Update payment status in database
                await payments_collection.update_one(
                    {"payment_id": verify_data.payment_id},
                    {
                        "$set": {
                            "status": PaymentStatus.COMPLETED.value,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Add credits to account
                account_id = payment_record["account_id"]
                credits = payment_record["credits"]
                
                await account_service.add_credits(account_id, user_id, credits)
                
                # Record transaction
                await self.record_transaction(
                    account_id=account_id,
                    user_id=user_id,
                    transaction_type="purchase",
                    amount=credits,
                    description=f"Purchase of {credits} credits",
                    payment_id=verify_data.payment_id,
                    payment_provider="paypal",
                    payment_status=PaymentStatus.COMPLETED.value
                )
                
                return PaymentResponse(
                    payment_id=verify_data.payment_id,
                    status=PaymentStatus.COMPLETED
                )
            else:
                # Update payment status in database
                await payments_collection.update_one(
                    {"payment_id": verify_data.payment_id},
                    {                        "$set": {
                            "status": PaymentStatus.FAILED.value,
                            "updated_at": datetime.utcnow(),
                            "error": payment.error
                        }
                    }
                )
                
                return PaymentResponse(
                    payment_id=verify_data.payment_id,
                    status=PaymentStatus.FAILED,
                    error_message=str(payment.error)  # Convert to string
                )
        except Exception as e:
            error_message = str(e)
            logger.error(f"PayPal payment execution error: {error_message}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error attributes: {dir(e)}")
            
            # Additional detailed logging for debugging
            logger.info(f"Checking error message for PAYMENT_ALREADY_DONE patterns:")
            logger.info(f"  - 'PAYMENT_ALREADY_DONE' in error_message: {'PAYMENT_ALREADY_DONE' in error_message}")
            logger.info(f"  - 'Payment has been done already' in error_message: {'Payment has been done already for this cart' in error_message}")
            
            # Check if this is the specific PayPal "PAYMENT_ALREADY_DONE" error
            # The error might be in different formats depending on how PayPal SDK reports it
            is_payment_already_done = (
                "PAYMENT_ALREADY_DONE" in error_message or
                "Payment has been done already for this cart" in error_message or
                "'name': 'PAYMENT_ALREADY_DONE'" in error_message or
                '"name": "PAYMENT_ALREADY_DONE"' in error_message or
                (hasattr(e, 'response') and 'PAYMENT_ALREADY_DONE' in str(e.response)) or
                (hasattr(e, 'args') and any('PAYMENT_ALREADY_DONE' in str(arg) for arg in e.args)) or
                # Handle dictionary string representation
                ("'name':" in error_message and "'PAYMENT_ALREADY_DONE'" in error_message) or
                ('"name":' in error_message and '"PAYMENT_ALREADY_DONE"' in error_message)
            )
            
            logger.info(f"is_payment_already_done result: {is_payment_already_done}")
            if is_payment_already_done:
                logger.info(f"PayPal indicates payment {verify_data.payment_id} was already completed")
                
                # Mark payment as completed instead of failed
                await payments_collection.update_one(
                    {"payment_id": verify_data.payment_id},
                    {
                        "$set": {
                            "status": PaymentStatus.COMPLETED.value,
                            "updated_at": datetime.utcnow(),
                            "paypal_already_done_error": error_message
                        }
                    }
                )
                
                # Add credits to account if not already done
                account_id = payment_record["account_id"]
                credits = payment_record["credits"]
                
                # Check if credits were already added
                transactions_collection = await get_collection("transactions")
                existing_transaction = await transactions_collection.find_one({
                    "payment_id": verify_data.payment_id,
                    "type": "purchase",
                    "account_id": account_id
                })
                
                if not existing_transaction:
                    # Add credits to account
                    await account_service.add_credits(account_id, user_id, credits)
                    
                    # Record transaction
                    await self.record_transaction(
                        account_id=account_id,
                        user_id=user_id,
                        transaction_type="purchase",
                        amount=credits,
                        description=f"Purchase of {credits} credits (PayPal already done)",
                        payment_id=verify_data.payment_id,
                        payment_provider="paypal",
                        payment_status=PaymentStatus.COMPLETED.value
                    )
                
                return PaymentResponse(
                    payment_id=verify_data.payment_id,
                    status=PaymentStatus.COMPLETED
                )
            else:
                # Update payment status in database as failed for other errors
                await payments_collection.update_one(
                    {"payment_id": verify_data.payment_id},
                    {
                        "$set": {
                            "status": PaymentStatus.FAILED.value,
                            "updated_at": datetime.utcnow(),
                            "error": error_message
                        }
                    }
                )
                
                return PaymentResponse(
                    payment_id=verify_data.payment_id,
                    status=PaymentStatus.FAILED,
                    error_message=error_message
                )
    
    async def get_user_transactions(self, user_id: str, account_id: Optional[str] = None) -> List[Transaction]:
        """Get transaction history for a user"""
        transactions_collection = await get_collection("transactions")
        
        # Build query
        query = {"user_id": user_id}
        if account_id:
            query["account_id"] = account_id
        
        # Get transactions
        cursor = transactions_collection.find(query).sort("created_at", -1)
        transactions = []
        
        async for doc in cursor:
            transactions.append(Transaction(**doc))
        
        return transactions
    
    async def record_transaction(
        self,
        account_id: str,
        user_id: str,
        transaction_type: str,
        amount: int,
        description: str,
        payment_id: Optional[str] = None,
        payment_provider: Optional[str] = None,
        payment_status: Optional[str] = None
    ) -> Transaction:
        """Record a transaction"""
        transactions_collection = await get_collection("transactions")
        
        transaction = Transaction(
            id=str(uuid.uuid4()),
            account_id=account_id,
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            description=description,
            created_at=datetime.utcnow(),
            payment_id=payment_id,
            payment_provider=payment_provider,
            payment_status=payment_status
        )
        
        await transactions_collection.insert_one(transaction.dict())
        
        return transaction
    
    async def verify_payment_status(self, payment_id: str, user_id: str) -> PaymentResponse:
        """Verify payment status by checking the database and PayPal"""
        # Get payment from database
        payments_collection = await get_collection("payments")
        payment_record = await payments_collection.find_one({"payment_id": payment_id})
        
        if not payment_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Return the current status from database
        return PaymentResponse(
            payment_id=payment_id,
            status=payment_record.get("status", PaymentStatus.PENDING.value),
            error_message=payment_record.get("error", None)
        )
    
    async def mark_payment_as_completed(self, payment_id: str, payer_id: str, paypal_error: dict, user_id: str) -> dict:
        """Mark a payment as completed when PayPal indicates it was already processed"""
        # Get payment from database
        payments_collection = await get_collection("payments")
        payment_record = await payments_collection.find_one({"payment_id": payment_id})
        
        if not payment_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Check if payment is already completed
        if payment_record.get("status") == PaymentStatus.COMPLETED.value:
            return {"message": "Payment already marked as completed", "status": "completed"}
        
        try:
            # Update payment status in database
            await payments_collection.update_one(
                {"payment_id": payment_id},
                {
                    "$set": {
                        "status": PaymentStatus.COMPLETED.value,
                        "updated_at": datetime.utcnow(),
                        "paypal_already_done_error": paypal_error,
                        "payer_id": payer_id
                    }
                }
            )
            
            # Add credits to account if not already done
            account_id = payment_record["account_id"]
            credits = payment_record["credits"]
            
            # Check if credits were already added by looking for existing transaction
            transactions_collection = await get_collection("transactions")
            existing_transaction = await transactions_collection.find_one({
                "payment_id": payment_id,
                "type": "purchase",
                "account_id": account_id
            })
            
            if not existing_transaction:
                # Add credits to account
                await account_service.add_credits(account_id, user_id, credits)
                
                # Record transaction
                await self.record_transaction(
                    account_id=account_id,
                    user_id=user_id,
                    transaction_type="purchase",
                    amount=credits,
                    description=f"Purchase of {credits} credits (corrected from PayPal already done error)",
                    payment_id=payment_id,
                    payment_provider="paypal",
                    payment_status=PaymentStatus.COMPLETED.value
                )
                
                logger.info(f"Successfully corrected payment {payment_id} and added {credits} credits to account {account_id}")
            else:
                logger.info(f"Credits for payment {payment_id} were already added to account {account_id}")
            
            return {"message": "Payment marked as completed and credits added", "status": "completed"}
            
        except Exception as e:
            logger.error(f"Error marking payment as completed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating payment status: {str(e)}"
            )

# Create global service instance
payment_service = PaymentService()
