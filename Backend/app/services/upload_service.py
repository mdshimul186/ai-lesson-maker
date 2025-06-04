import boto3
import uuid
import os
import json
from app.config import get_settings
from loguru import logger
from typing import Dict

settings = get_settings()

SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif"]
SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-flv", "video/x-matroska"]

def generate_unique_object_name(original_filename: str) -> str:
    name, extension = os.path.splitext(original_filename)
    return f"{uuid.uuid4()}{extension}"

async def ensure_bucket_public_policy(s3_client, bucket_name: str):
    """Ensure the bucket has a policy that allows public read access."""
    public_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*"
            }
        ]
    }
    
    try:
        s3_client.put_bucket_policy(
            Bucket=bucket_name,
            Policy=json.dumps(public_policy)
        )
        logger.info(f"Public read policy applied to bucket '{bucket_name}'")
    except Exception as e:
        logger.warning(f"Failed to apply public policy to bucket '{bucket_name}': {e}")
        # This might fail if bucket policies are not supported or user doesn't have permission
        # but we continue as ACL should still work

async def upload_file_to_s3(file_path: str, object_name: str, content_type: str) -> str:
    """Upload a file to S3 and return the public URL."""
    if not (content_type.lower() in SUPPORTED_IMAGE_TYPES or content_type.lower() in SUPPORTED_VIDEO_TYPES):
        raise ValueError(f"Unsupported file type: {content_type}")

    s3_access_key_id = settings.s3_access_key_id
    s3_secret_key = settings.s3_secret_key
    s3_endpoint = settings.s3_origin_endpoint
    bucket_name = settings.bucket_name

    if not all([s3_access_key_id, s3_secret_key, s3_endpoint, bucket_name]):
        logger.error("S3 settings are not fully configured.")
        raise ValueError("S3 settings are not fully configured.")

    s3 = boto3.client(
        's3',
        endpoint_url=s3_endpoint,
        aws_access_key_id=s3_access_key_id,
        aws_secret_access_key=s3_secret_key,        region_name='nyc3',  # DigitalOcean Spaces region
    )

    try:
        # Check if bucket exists, create if not
        s3.create_bucket(Bucket=bucket_name)
        logger.info(f"Bucket '{bucket_name}' created or already exists.")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        logger.info(f"Bucket '{bucket_name}' already owned by you.")
        pass
    except s3.exceptions.BucketAlreadyExists:
        logger.info(f"Bucket '{bucket_name}' already exists.")
        pass
    except Exception as e:
        if "BucketAlreadyExists" in str(e) or "BucketAlreadyOwnedByYou" in str(e):
            logger.info(f"Bucket '{bucket_name}' already exists (caught by generic exception).")
        else:
            logger.error(f"Error during bucket creation/check for '{bucket_name}': {e}")
            raise

    # Ensure bucket has public read policy
    await ensure_bucket_public_policy(s3, bucket_name)

    try:
        with open(file_path, 'rb') as file_data:
            # Upload with explicit public access and content type
            extra_args = {
                'ACL': 'public-read',
                'ContentType': content_type
            }
            
            s3.upload_fileobj(
                file_data, 
                bucket_name, 
                object_name,
                ExtraArgs=extra_args
            )
        
        # Verify the file is publicly accessible by attempting to set ACL explicitly
        try:
            s3.put_object_acl(
                Bucket=bucket_name,
                Key=object_name,
                ACL='public-read'
            )
            logger.info(f"ACL set to public-read for {object_name}")
        except Exception as acl_error:
            logger.warning(f"Failed to set ACL for {object_name}: {acl_error}")
        
        # Generate the public URL for DigitalOcean Spaces
        url = f"https://{bucket_name}.nyc3.digitaloceanspaces.com/{object_name}"
        logger.info(f"File {object_name} uploaded. Public URL: {url}")
        
        # Additional debugging: check the uploaded object's ACL
        try:
            obj_acl = s3.get_object_acl(Bucket=bucket_name, Key=object_name)
            logger.info(f"Object ACL for {object_name}:")
            for grant in obj_acl.get('Grants', []):
                grantee = grant.get('Grantee', {})
                permission = grant.get('Permission')
                grantee_type = grantee.get('Type')
                if grantee_type == 'Group' and 'AllUsers' in grantee.get('URI', ''):
                    logger.info(f"  ✅ PUBLIC ACCESS: {permission}")
                else:
                    logger.info(f"  🔒 {grantee_type}: {permission}")
        except Exception as debug_error:
            logger.warning(f"Could not check ACL for debugging: {debug_error}")
        
        return url
    except Exception as e:
        logger.error(f"Failed to upload {object_name} to S3 bucket {bucket_name}: {e}")
        raise

async def upload_directory_to_s3(directory_path: str, bucket_name: str, s3_prefix: str = "") -> Dict[str, str]:
    """Uploads all files in a directory to S3, maintaining structure under a prefix."""
    settings = get_settings()
    s3_access_key_id = settings.s3_access_key_id
    s3_secret_key = settings.s3_secret_key
    s3_endpoint = settings.s3_origin_endpoint

    if not all([s3_access_key_id, s3_secret_key, s3_endpoint, bucket_name]):
        logger.error("S3 settings for directory upload are not fully configured.")
        raise ValueError("S3 settings for directory upload are not fully configured.")

    s3 = boto3.client(
        's3',
        endpoint_url=s3_endpoint,
        aws_access_key_id=s3_access_key_id,
        aws_secret_access_key=s3_secret_key,        region_name='nyc3',  # DigitalOcean Spaces region
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

    # Ensure bucket has public read policy
    await ensure_bucket_public_policy(s3, bucket_name)

    uploaded_files_urls = {}

    for root, _, files in os.walk(directory_path):
        for filename in files:
            local_file_path = os.path.join(root, filename)
            # Create object name that includes the directory structure relative to the source directory_path
            # and prepends the s3_prefix.
            relative_path = os.path.relpath(local_file_path, directory_path)
            object_name = os.path.join(s3_prefix, relative_path).replace("\\", "/") # Ensure forward slashes for S3
            
            # Determine content type based on file extension
            _, ext = os.path.splitext(filename)
            content_type = "application/octet-stream"  # Default
            if ext.lower() in ['.png', '.jpg', '.jpeg']:
                content_type = f"image/{ext[1:]}"
            elif ext.lower() == '.gif':
                content_type = "image/gif"
            elif ext.lower() == '.mp4':
                content_type = "video/mp4"
            elif ext.lower() == '.webm':
                content_type = "video/webm"
            
            try:
                with open(local_file_path, 'rb') as file_data:
                    # Upload with explicit public access and content type
                    extra_args = {
                        'ACL': 'public-read',
                        'ContentType': content_type
                    }
                    
                    s3.upload_fileobj(
                        file_data, 
                        bucket_name, 
                        object_name,
                        ExtraArgs=extra_args
                    )
                
                # Verify the file is publicly accessible by attempting to set ACL explicitly
                try:
                    s3.put_object_acl(
                        Bucket=bucket_name,
                        Key=object_name,
                        ACL='public-read'
                    )
                    logger.info(f"ACL set to public-read for {object_name}")
                except Exception as acl_error:
                    logger.warning(f"Failed to set ACL for {object_name}: {acl_error}")
                
                # Generate the public URL for DigitalOcean Spaces
                url = f"https://{bucket_name}.nyc3.digitaloceanspaces.com/{object_name}"
                uploaded_files_urls[object_name] = url
                logger.info(f"Uploaded {local_file_path} to {bucket_name}/{object_name}. Public URL: {url}")
            except Exception as e:
                logger.error(f"Failed to upload {local_file_path} to {bucket_name}/{object_name}: {e}")
                # Continue uploading other files even if one fails
    
    return uploaded_files_urls
