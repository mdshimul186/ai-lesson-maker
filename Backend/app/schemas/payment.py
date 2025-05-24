from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class PaymentProvider(str, Enum):
    PAYPAL = "paypal"
    STRIPE = "stripe"  # For future implementation

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class CreditPackage(BaseModel):
    id: str
    name: str
    credits: int
    price: float
    description: Optional[str] = None

class PaymentCreate(BaseModel):
    package_id: str
    account_id: str
    provider: PaymentProvider = PaymentProvider.PAYPAL
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None

class PaymentResponse(BaseModel):
    payment_id: str
    status: PaymentStatus
    redirect_url: Optional[str] = None
    error_message: Optional[str] = None

class PaymentVerify(BaseModel):
    payment_id: str
    payer_id: Optional[str] = None
    token: Optional[str] = None

class Transaction(BaseModel):
    id: str
    account_id: str
    user_id: str
    transaction_type: str  # "purchase", "deduction", etc.
    amount: int  # Credits amount
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    payment_id: Optional[str] = None
    payment_provider: Optional[str] = None
    payment_status: Optional[str] = None
