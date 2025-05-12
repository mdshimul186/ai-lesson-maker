from pydantic import BaseModel, Field
from typing import Dict, Any


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall health status of the application")
    version: str = Field(..., description="Application version")
