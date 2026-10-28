from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TransactionIn(BaseModel):
    id: str
    account_id: str
    amount: float
    net_amount: float
    type: str  # INCOME | EXPENSE
    status: str
    category_name: Optional[str] = None
    date: datetime


class CashFlowRequest(BaseModel):
    transactions: List[TransactionIn]


class CategoryRequest(BaseModel):
    transactions: List[TransactionIn]
