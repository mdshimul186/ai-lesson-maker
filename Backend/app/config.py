from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Settings(BaseSettings):
    app_name: str = "Video Generation API"
    debug: bool = True
    version: str = "1.0.0"
    
    # provider configuration
    text_provider: str = "openai"
    image_provider: str = "openai"

    # base url configuration
    openai_base_url: str = "https://api.openai.com/v1"
    aliyun_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    ollama_base_url: str = "http://localhost:11434/v1"
    siliconflow_base_url: str = "https://api.siliconflow.cn/v1"

    # api key
    openai_api_key: str = ""
    aliyun_api_key: str = ""
    deepseek_api_key: str = ""
    ollama_api_key: str = ""
    siliconflow_api_key: str = ""

    text_llm_model: str = "gpt-4o"
    image_llm_model: str = "dall-e-3"
    
    # S3/Storage Configuration
    s3_access_key_id: str = ""
    s3_secret_key: str = ""
    s3_origin_endpoint: str = ""
    bucket_name: str = "mermaid-images"
    
    db_url: str = ""
    sendgrid_api_key: str= ""
    sendgrid_sender_email: str = ""

    paypal_mode: str = ""
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    secret_key: str = ""
    frontend_base_url: str = "http://localhost:4001" # Add new setting for frontend URL

    class Config:
        env_file = ".env"
        # env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
