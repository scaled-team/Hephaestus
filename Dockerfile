FROM python:3.11-slim

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y \
    tmux \
    git \
    curl \
    unzip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install opencode CLI via npm
RUN npm install -g opencode-ai

# Copy application code
COPY . .

# Create directories for data
RUN mkdir -p /app/data /app/logs /app/docs

# Expose MCP server port
EXPOSE 8000

# Default command (can be overridden)
CMD ["python", "run_server.py"]