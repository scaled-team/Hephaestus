# ═══════════════════════════════════════════════════════════════════════════════
# Hephaestus MCP Server Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════
#
# This Dockerfile builds the Hephaestus MCP server with OpenCode agent support.
#
# IMPORTANT: File Write Restrictions for OpenCode Agents
# ─────────────────────────────────────────────────────────────────────────────
# OpenCode agents running in containers can ONLY write to directories that are
# mounted as volumes in docker-compose.yml:
#
# WRITABLE PATHS:
#   /app/data/    → Database, cache, agent memories, persistent state
#   /app/logs/    → Log files, execution records, debug output
#   /app/docs/    → Documentation, reports, analysis output
#   /app/projects/ → Project workspaces, build artifacts, deliverables
#   /app/src/     → Source code modifications, new modules
#   /app/scripts/ → Utility scripts, automation tools
#
# BLOCKED PATHS (will fail with "Write outside of project scope" error):
#   /root/       → Home directory (NOT mounted)
#   /tmp/        → Temporary files (NOT mounted)
#   /etc/        → System configuration (NOT mounted)
#   Any path outside /app/ → System paths (NOT mounted)
#
# See docker-compose.yml "volumes" section for exact mount configuration.
# See OPENCODE_FILE_WRITE_GUIDE.md and OPENCODE_QUICK_REFERENCE.md for examples.
# ─────────────────────────────────────────────────────────────────────────────

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
# OpenCode agents will execute within this container with specific volume mount restrictions
RUN npm install -g opencode-ai

# Copy application code
COPY . .

# Create directories for data and logs
# These directories MUST be mounted in docker-compose.yml for persistence
RUN mkdir -p \
    /app/data \
    /app/logs \
    /app/docs \
    /app/projects \
    /app/scripts

# Expose MCP server port (communicates with agents and external clients)
EXPOSE 8000

# Default command (can be overridden by docker-compose.yml)
CMD ["python", "run_server.py"]