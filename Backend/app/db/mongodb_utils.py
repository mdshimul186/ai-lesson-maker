from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings
import os

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
    
    # Configure SSL options if CA certificate is provided
    client_kwargs = {}
    
    # Add production-ready connection settings for DNS and timeout issues
    client_kwargs.update({
        'serverSelectionTimeoutMS': 30000,  # 30 second timeout for server selection
        'connectTimeoutMS': 30000,          # 30 second connection timeout
        'socketTimeoutMS': 30000,           # 30 second socket timeout
        'maxPoolSize': 10,                  # Maximum connection pool size
        'retryWrites': True,                # Enable retry writes
        'retryReads': True,                 # Enable retry reads
    })
    
    if settings.db_use_ssl and settings.db_ca_cert_path:
        # Get the absolute path to the CA certificate
        ca_cert_path = settings.db_ca_cert_path
        if not os.path.isabs(ca_cert_path):
            # If path is relative, make it relative to the Backend directory
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            ca_cert_path = os.path.join(backend_dir, ca_cert_path)
        
        if os.path.exists(ca_cert_path):
            # Use MongoDB-specific SSL parameters
            client_kwargs.update({
                'tls': True,
                'tlsCAFile': ca_cert_path,
                'tlsAllowInvalidHostnames': False,
                'tlsAllowInvalidCertificates': False
            })
            print(f"Using CA certificate: {ca_cert_path}")
        else:
            print(f"Warning: CA certificate not found at {ca_cert_path}")
    
    # Create MongoDB client with SSL options if configured
    db.client = AsyncIOMotorClient(settings.db_url, **client_kwargs)
    
    print("Attempting to connect to MongoDB...")
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            # The ismaster command is cheap and does not require auth.
            await db.client.admin.command('ismaster')
            print("MongoDB connection successful.")
            return
        except Exception as e:
            print(f"MongoDB connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                import asyncio
                await asyncio.sleep(retry_delay)
            else:
                print("All MongoDB connection attempts failed.")
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
