from pydantic import BaseModel
from datetime import datetime
from typing import Literal

class Trade(BaseModel):
    symbol: str
    price: float
    side: Literal["buy", "sell"]
    timestamp: datetime
    amount: float = 0.0

