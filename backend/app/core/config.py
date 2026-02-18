"""
Application configuration settings.
"""
import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Upload settings
    MAX_UPLOAD_SIZE_MB: int = 100
    TEMP_DIR: Path = Path("/tmp")
    
    # API settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Logging
    LOG_LEVEL: str = "info"
    
    # CORS (for local development only)
    ENABLE_CORS: bool = False
    
    # Application metadata
    APP_NAME: str = "OpenStack Admin Assistant Portal"
    APP_VERSION: str = "0.1.0"
    
    # Data mode: "demo", "prometheus", or "auto"
    DATA_MODE: str = "auto"
    
    # Prometheus settings
    PROMETHEUS_BASE_URL: str = "http://prometheus:9090"
    PROMETHEUS_TIMEOUT_SECONDS: int = 3
    
    # Cluster identification
    CLUSTER_NAME: str = "k8s-openstack"
    
    # JWT Authentication settings
    SECRET_KEY: str = "your-secret-key-change-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields like NGINX_PORT


# Global settings instance
settings = Settings()
