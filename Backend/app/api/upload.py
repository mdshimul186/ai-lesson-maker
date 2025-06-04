from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
import shutil
import os
import tempfile
from app.services.upload_service import upload_file_to_s3, generate_unique_object_name, SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES
from app.config import get_settings
from loguru import logger

router = APIRouter()
settings = get_settings()

@router.post("/upload/", tags=["Upload"])
async def upload_file(file: UploadFile = File(...) ):
    if not file.content_type:
        raise HTTPException(status_code=400, detail="File content type is missing.")

    if not (file.content_type.lower() in SUPPORTED_IMAGE_TYPES or file.content_type.lower() in SUPPORTED_VIDEO_TYPES):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Supported types are images (PNG, JPEG, GIF) and videos (MP4, WebM, QuickTime, AVI, FLV, MKV).")

    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename if file.filename else "default_filename")

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Temporary file saved at: {temp_file_path}")        # Generate a unique object name for S3 to prevent overwrites and organize files
        # The original filename's extension is preserved.
        object_name = generate_unique_object_name(file.filename if file.filename else "default_filename")
        
        file_url = await upload_file_to_s3(file_path=temp_file_path, object_name=object_name, content_type=file.content_type)
        
        return JSONResponse(content={"message": "File uploaded successfully", "url": file_url, "filename": file.filename, "object_name": object_name, "content_type": file.content_type}, status_code=200)
    except ValueError as ve:
        logger.error(f"ValueError during file upload: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"An unexpected error occurred during file upload: {e}")
        # Log the full traceback for debugging
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        # Ensure the temporary file and directory are cleaned up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            logger.info(f"Temporary file {temp_file_path} deleted.")
        if os.path.exists(temp_dir):
            try:
                os.rmdir(temp_dir) # rmdir only works if the directory is empty
                logger.info(f"Temporary directory {temp_dir} deleted.")
            except OSError as oe:
                 logger.error(f"Error removing temporary directory {temp_dir}: {oe}")
