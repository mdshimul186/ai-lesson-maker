from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.services.payment_service import payment_service
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentVerify,
    Transaction,
    CreditPackage
)
from app.api.users import get_current_active_user

router = APIRouter()

@router.get("/packages", response_model=List[CreditPackage])
async def get_credit_packages(current_user = Depends(get_current_active_user)):
    """
    Get available credit packages
    """
    try:
        return await payment_service.get_credit_packages()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving credit packages: {str(e)}"
        )

@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    current_user = Depends(get_current_active_user)
):
    """
    Create a payment
    """
    try:
        return await payment_service.create_paypal_payment(payment_data, current_user.id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payment: {str(e)}"
        )

@router.post("/execute", response_model=PaymentResponse)
async def execute_payment(
    verify_data: PaymentVerify,
    current_user = Depends(get_current_active_user)
):
    """
    Execute a payment after user approval
    """
    try:
        return await payment_service.execute_paypal_payment(verify_data, current_user.id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing payment: {str(e)}"
        )

@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    account_id: str = None,
    current_user = Depends(get_current_active_user)
):
    """
    Get transaction history
    """
    try:
        return await payment_service.get_user_transactions(current_user.id, account_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving transactions: {str(e)}"
        )

@router.get("/verify/{payment_id}", response_model=PaymentResponse)
async def verify_payment_status(
    payment_id: str,
    current_user = Depends(get_current_active_user)
):
    """
    Verify payment status by payment ID
    """
    try:
        return await payment_service.verify_payment_status(payment_id, current_user.id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying payment: {str(e)}"
        )

@router.post("/mark-as-completed")
async def mark_payment_completed(
    payment_data: dict,
    current_user = Depends(get_current_active_user)
):
    """
    Mark a payment as completed when PayPal returns PAYMENT_ALREADY_DONE error
    """
    try:
        payment_id = payment_data.get('payment_id')
        payer_id = payment_data.get('payer_id')
        paypal_error = payment_data.get('paypal_error')
        
        if not payment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="payment_id is required"
            )
        
        return await payment_service.mark_payment_as_completed(
            payment_id, 
            payer_id, 
            paypal_error, 
            current_user.id
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking payment as completed: {str(e)}"
        )
