"""
Create MongoDB indexes for the application.
Run this script during application startup to ensure all necessary indexes exist.
"""
import logging

logger = logging.getLogger(__name__)
from app.db.mongodb_utils import get_database

async def create_indexes():
    """Create all necessary indexes for the MongoDB collections"""
    db = await get_database()
    
    # Courses collection indexes
    logger.info("Creating indexes for courses collection...")
    await db.courses.create_index([("account_id", 1), ("created_at", -1)])
    await db.courses.create_index([("account_id", 1), ("status", 1), ("created_at", -1)])
    await db.courses.create_index([("user_id", 1)])
    
    # Tasks collection indexes
    logger.info("Creating indexes for tasks collection...")
    await db.tasks.create_index("task_id", unique=True)
    await db.tasks.create_index([("account_id", 1), ("status", 1)])
    await db.tasks.create_index([("user_id", 1), ("status", 1)])
    
    logger.info("All indexes created successfully.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(create_indexes())
