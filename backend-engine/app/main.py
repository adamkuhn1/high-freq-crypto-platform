from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
import logging
from contextlib import asynccontextmanager
from app.services.ingestion import DataIngestion
import redis.asyncio as aioredis
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ingestion_service: DataIngestion = None
ingestion_task: asyncio.Task = None
event_counter = 0
counter_lock = asyncio.Lock()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ingestion_service, ingestion_task
    
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    
    ingestion_service = DataIngestion(redis_host=redis_host, redis_port=redis_port)
    await ingestion_service.connect()
    
    ingestion_task = asyncio.create_task(ingestion_service.start_ingestion())
    
    metrics_task = asyncio.create_task(log_metrics())
    
    logger.info("High-Frequency Trading Platform started")
    logger.info("Ingestion service running at ~100k events/hour")
    
    yield
    
    ingestion_service.is_running = False
    if ingestion_task:
        ingestion_task.cancel()
    if metrics_task:
        metrics_task.cancel()
    await ingestion_service.disconnect()
    logger.info("Shutting down ingestion service")

app = FastAPI(
    title="High-Frequency Crypto Trading Platform",
    description="Backend engine for crypto trading platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def log_metrics():
    global event_counter, counter_lock
    
    while True:
        await asyncio.sleep(60)
        async with counter_lock:
            count = event_counter
            event_counter = 0
        logger.info(f"METRIC: Processed {count} events in last minute")

async def read_redis_stream(redis_client: aioredis.Redis, stream_name: str, last_id: str = "0"):
    global event_counter, counter_lock
    
    while True:
        try:
            messages = await redis_client.xread(
                {stream_name: last_id},
                count=100,
                block=1000
            )
            
            for stream, stream_messages in messages:
                for msg_id, fields in stream_messages:
                    async with counter_lock:
                        event_counter += 1
                    
                    yield {
                        "id": msg_id,
                        "data": fields
                    }
                    last_id = msg_id
        except Exception as e:
            logger.error(f"Error reading Redis stream: {e}")
            await asyncio.sleep(1)

@app.get("/")
async def root():
    return {"message": "High-Frequency Crypto Trading Platform API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")
    
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    
    redis_client = await aioredis.from_url(
        f"redis://{redis_host}:{redis_port}",
        encoding="utf-8",
        decode_responses=True
    )
    
    stream_name = "trades:stream"
    last_id = "$"
    
    try:
        async for trade_message in read_redis_stream(redis_client, stream_name, last_id):
            await websocket.send_json(trade_message)
            last_id = trade_message["id"]
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await redis_client.close()
