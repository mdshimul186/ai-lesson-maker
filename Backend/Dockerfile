# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy the project's requirements.txt
COPY requirements.txt /app/

# Install ffmpeg and build tools (gcc for aeneas C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    gcc \
    libespeak-dev \
  && rm -rf /var/lib/apt/lists/*

# Configure pip to use Aliyun mirror, install numpy first (required by aeneas), then other dependencies
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ \
    && pip install --no-cache-dir numpy==1.25.0 \
    && pip install --no-cache-dir -r requirements.txt \
    && playwright install --with-deps

# Copy the entire backend project to the container
COPY . /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Set the default command to start the Uvicorn service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-exclude", "/app/tasks"]