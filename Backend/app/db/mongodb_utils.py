from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

class DataBase:
    client: AsyncIOMotorClient = None

db = DataBase()

async def get_database_client() -> AsyncIOMotorClient:
    return db.client

async def get_database(): # Add this function
    settings = get_settings()
    # This is a simplified way to get the database name from the URL
    # It assumes the database name is the path part of the URL, which is common.
    # Example: mongodb://host:port/dbname
    # If your URL structure is different, this might need adjustment.
    db_name = settings.db_url.split("/")[-1].split("?")[0]
    if not db_name:
        raise ValueError("Database name could not be determined from DB_URL.")
    return db.client[db_name]

async def connect_to_mongo():
    settings = get_settings()
    db.client = AsyncIOMotorClient(settings.db_url)
    # You might want to add a check here to ensure the connection is successful
    # For example, by trying to list collections or getting server info:
    # await db.client.admin.command('ping') 
    # logger.info("Successfully connected to MongoDB.")
    print("Attempting to connect to MongoDB...")
    try:
        # The ismaster command is cheap and does not require auth.
        await db.client.admin.command('ismaster')
        print("MongoDB connection successful.")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        # Depending on your application's needs, you might want to raise an error here
        # or handle it in a way that allows the app to start if MongoDB is optional.

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("MongoDB connection closed.")

async def get_collection(name: str):
    if not db.client:
        # This case should ideally not happen if connect_to_mongo is called at startup
        # and the application waits for it.
        raise Exception("Database client not initialized. Call connect_to_mongo first.")
    # Assuming your database name is part of the db_url or you have a default one
    # For example, if db_url is "mongodb://.../ai-video-maker?authSource=admin"
    # the database name is 'ai-video-maker'. Let's extract it or use a default.
    # This part needs to be robust based on your db_url structure or a fixed db name.
    # For now, let's assume the db name is 'ai-video-maker' as per your config.
    # A more robust way would be to parse it from settings.db_url
    
    # A simple way to get DB name if it's the path part of the URL:
    db_name_from_url = db.client.get_default_database()
    if db_name_from_url is None:
        # Fallback or error if DB name cannot be inferred
        # For your specific URL: "mongodb://devops:mongoDB1%21@96.85.103.130:27017/ai-video-maker?authSource=admin"
        # The default database is 'ai-video-maker'
        # If AsyncIOMotorClient doesn't pick it up automatically, you might need to specify it.
        # client = AsyncIOMotorClient(settings.db_url, io_loop=loop)
        # database = client[settings.db_name] # if you add db_name to Settings
        # For now, let's hardcode based on your example URL's path
        # This is a common pattern, but ensure your Mongo URL always specifies the DB
        db_name = "ai-video-maker" # As seen in your db_url
        return db.client[db_name][name]
    return db_name_from_url[name]
