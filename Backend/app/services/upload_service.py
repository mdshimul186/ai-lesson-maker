import boto3
import uuid
import os
from app.config import get_settings
from loguru import logger
from typing import Dict

settings = get_settings()

SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif"]
SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-flv", "video/x-matroska"] # Added more common video types

def generate_unique_object_name(original_filename: str) -> str:
    name, extension = os.path.splitext(original_filename)
    # Sanitize filename part if needed, here we just use uuid
    return f"{uuid.uuid4()}{extension}"

async def upload_file_to_minio(file_path: str, object_name: str, content_type: str) -> str:
    if not (content_type.lower() in SUPPORTED_IMAGE_TYPES or content_type.lower() in SUPPORTED_VIDEO_TYPES):
        raise ValueError(f"Unsupported file type: {content_type}")

    minio_endpoint = settings.minio_endpoint
    minio_access_key = settings.minio_access_key
    minio_secret_key = settings.minio_secret_key
    bucket_name = settings.bucket_name

    if not all([minio_endpoint, minio_access_key, minio_secret_key, bucket_name]):
        logger.error("MinIO settings are not fully configured.")
        raise ValueError("MinIO settings are not fully configured.")

    s3 = boto3.client(
        's3',
        endpoint_url=minio_endpoint,
        aws_access_key_id=minio_access_key,
        aws_secret_access_key=minio_secret_key,
        region_name='us-east-1', # Default, consider making this configurable if needed
    )

    try:
        # Check if bucket exists, then create if not.
        # s3.head_bucket(Bucket=bucket_name) would raise ClientError if not found or no access
        # A more robust way is to try to create and catch specific exceptions.
        s3.create_bucket(Bucket=bucket_name)
        logger.info(f"Bucket '{bucket_name}' created or already exists.")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        logger.info(f"Bucket '{bucket_name}' already owned by you.")
        pass
    except s3.exceptions.BucketAlreadyExists: # Generic already exists, could be by another account if permissions allow checking
        logger.info(f"Bucket '{bucket_name}' already exists.")
        pass
    except Exception as e: # Catch other potential errors like access denied if policies are restrictive
        # Check if the exception is due to the bucket already existing under a different context if possible
        # For now, we log and re-raise if it's not a known "already exists" scenario for our user
        if "BucketAlreadyExists" in str(e) or "BucketAlreadyOwnedByYou" in str(e):
             logger.info(f"Bucket '{bucket_name}' already exists (caught by generic exception).")
             pass
        else:
            logger.error(f"Error during bucket creation/check for '{bucket_name}': {e}")
            raise

    try:
        with open(file_path, 'rb') as file_data:
            s3.upload_fileobj(file_data, bucket_name, object_name)
        
        # Use the public endpoint for the returned URL
        public_url_base = settings.minio_public_endpoint.rstrip('/') 
        url = f"{public_url_base}/{bucket_name}/{object_name}"
        logger.info(f"File {object_name} uploaded. Public URL: {url}")
        return url
    except Exception as e:
        logger.error(f"Failed to upload {object_name} to MinIO bucket {bucket_name}: {e}")
        raise

async def upload_directory_to_minio(directory_path: str, bucket_name: str, minio_prefix: str = "") -> Dict[str, str]:
    """Uploads all files in a directory to MinIO, maintaining structure under a prefix."""
    settings = get_settings()
    minio_endpoint = settings.minio_endpoint
    minio_access_key = settings.minio_access_key
    minio_secret_key = settings.minio_secret_key

    if not all([minio_endpoint, minio_access_key, minio_secret_key, bucket_name]):
        logger.error("MinIO settings for directory upload are not fully configured.")
        raise ValueError("MinIO settings for directory upload are not fully configured.")

    s3 = boto3.client(
        's3',
        endpoint_url=minio_endpoint,
        aws_access_key_id=minio_access_key,
        aws_secret_access_key=minio_secret_key,
        region_name='us-east-1', 
    )

    try:
        s3.create_bucket(Bucket=bucket_name)
        logger.info(f"Bucket '{bucket_name}' ensured for directory upload.")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        logger.info(f"Bucket '{bucket_name}' already owned by you (directory upload).")
    except s3.exceptions.BucketAlreadyExists:
        logger.info(f"Bucket '{bucket_name}' already exists (directory upload).")
    except Exception as e:
        if "BucketAlreadyExists" in str(e) or "BucketAlreadyOwnedByYou" in str(e):
             logger.info(f"Bucket '{bucket_name}' already exists (caught by generic exception during directory upload).")
        else:
            logger.error(f"Error during bucket creation/check for '{bucket_name}' (directory upload): {e}")
            raise

    uploaded_files_urls = {}
    public_url_base = settings.minio_public_endpoint.rstrip('/')

    for root, _, files in os.walk(directory_path):
        for filename in files:
            local_file_path = os.path.join(root, filename)
            # Create object name that includes the directory structure relative to the source directory_path
            # and prepends the minio_prefix.
            relative_path = os.path.relpath(local_file_path, directory_path)
            object_name = os.path.join(minio_prefix, relative_path).replace("\\", "/") # Ensure forward slashes for S3
            
            # Determine content type (optional, S3 can often infer)
            # For simplicity, we'll let S3 infer or set a default if needed.
            # content_type = 'application/octet-stream' # Default
            # You might want to use mimetypes library for better detection:
            # import mimetypes
            # content_type, _ = mimetypes.guess_type(local_file_path)
            # if content_type is None:
            #     content_type = 'application/octet-stream'

            try:
                with open(local_file_path, 'rb') as file_data:
                    s3.upload_fileobj(file_data, bucket_name, object_name)
                
                url = f"{public_url_base}/{bucket_name}/{object_name}"
                uploaded_files_urls[object_name] = url
                logger.info(f"Uploaded {local_file_path} to {bucket_name}/{object_name}. Public URL: {url}")
            except Exception as e:
                logger.error(f"Failed to upload {local_file_path} to {bucket_name}/{object_name}: {e}")
                # Decide if you want to raise here or collect errors and continue
                # For now, let's log and continue, returning successfully uploaded files.
    
    return uploaded_files_urls
