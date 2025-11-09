# ═══════════════════════════════════════════════════════════════════════════════
# Hephaestus App (Frontend + Monitor) Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════
#
# Single container for:
# - Frontend development server (port 5173)
# - Monitor process (continuous monitoring and agent control)
#
# Both processes share:
# - Same environment variables
# - Same tmux sessions
# - Same mounted volumes
#

FROM node:20-alpine

WORKDIR /app

# Install Python + tmux for monitor process
RUN apk add --no-cache \
    python3 \
    py3-pip \
    tmux \
    curl \
    git

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ .

# Back to app root
WORKDIR /app

# Copy monitor code
COPY src ./src
COPY run_monitor.py .
COPY requirements.txt .

# Copy the orchestrator script
COPY app/run_app.js .

# Install Python dependencies for monitor
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Expose ports
# 5173 = Frontend dev server
# (Monitor doesn't need external port - communicates via internal APIs)
EXPOSE 5173

# Default command - runs both frontend and monitor
CMD ["node", "run_app.js"]
