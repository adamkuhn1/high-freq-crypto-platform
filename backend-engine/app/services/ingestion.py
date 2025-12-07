import redis.asyncio as aioredis
from typing import Optional
import asyncio
import random
from datetime import datetime
import os
import json
from app.models import Trade

class DataIngestion:
    def __init__(self, redis_host: str = "localhost", redis_port: int = 6379):
        self.redis_client: Optional[aioredis.Redis] = None
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.stream_name = "trades:stream"
        self.is_running = False
        self.symbols = ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "ADA/USD"]
        self.base_prices = {
            "BTC/USD": 45000.0,
            "ETH/USD": 2500.0,
            "SOL/USD": 100.0,
            "BNB/USD": 300.0,
            "ADA/USD": 0.5
        }
        self.current_prices = self.base_prices.copy()
    
    async def connect(self):
        self.redis_client = await aioredis.from_url(
            f"redis://{self.redis_host}:{self.redis_port}",
            encoding="utf-8",
            decode_responses=True
        )
        await self.redis_client.ping()
    
    async def disconnect(self):
        if self.redis_client:
            await self.redis_client.close()
    
    async def _mock_exchange_connection(self):
        await asyncio.sleep(0.1)
        return True
    
    async def _generate_trade(self) -> Trade:
        symbol = random.choice(self.symbols)
        current_price = self.current_prices[symbol]
        
        volatility_factor = random.uniform(-0.0005, 0.0005)
        new_price = current_price * (1 + volatility_factor)
        
        self.current_prices[symbol] = new_price
        
        side = random.choice(["buy", "sell"])
        amount = random.uniform(0.001, 10.0)
        
        return Trade(
            symbol=symbol,
            price=round(new_price, 2),
            side=side,
            timestamp=datetime.utcnow(),
            amount=round(amount, 6)
        )
    
    async def ingest_market_data(self, symbol: str, data: dict):
        if not self.redis_client:
            await self.connect()
        
        trade_data = {
            "symbol": data.get("symbol", symbol),
            "price": str(data.get("price", 0.0)),
            "side": data.get("side", "buy"),
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
            "amount": str(data.get("amount", 0.0))
        }
        
        await self.redis_client.xadd(
            self.stream_name,
            trade_data,
            maxlen=10000
        )
    
    async def start_ingestion(self):
        await self._mock_exchange_connection()
        self.is_running = True
        
        events_per_hour = 100000
        events_per_second = events_per_hour / 3600
        delay_between_events = 1.0 / events_per_second
        
        while self.is_running:
            trade = await self._generate_trade()
            trade_dict = trade.model_dump()
            trade_dict["timestamp"] = trade_dict["timestamp"].isoformat()
            
            await self.ingest_market_data(trade.symbol, trade_dict)
            await asyncio.sleep(delay_between_events)
    
    async def stop_ingestion(self):
        self.is_running = False
    
    async def get_latest_price(self, symbol: str) -> Optional[float]:
        if not self.redis_client:
            await self.connect()
        
        try:
            messages = await self.redis_client.xrevrange(
                self.stream_name,
                count=100
            )
            
            for msg_id, fields in messages:
                if fields.get("symbol") == symbol:
                    return float(fields.get("price", 0.0))
        except Exception:
            pass
        
        return None
