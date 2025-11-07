# Docker Compose Setup Guide

Complete Docker containerization for Hephaestus with all services running in containers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Docker Compose Services                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Frontend   │  │  Hephaestus  │  │   Qdrant    │  │
│  │ (Vite)       │  │   (FastAPI)  │  │  (Vector    │  │
│  │ Port 5173    │  │  Port 8000   │  │   Store)    │  │
│  │              │  │              │  │ Port 6333   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┘  │
│         │                 │                            │
│         │ HTTP/WS         │ MCP                        │
│         └────────┬────────┘                            │
│                  │                                     │
│         ┌────────▼────────┐                            │
│         │  Hephaestus     │                            │
│         │  Monitor        │                            │
│         │  (Guardian)     │                            │
│         └─────────────────┘                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Services Configuration

### 1. **Frontend Service** (Node.js + Vite)

**Image**: `node:20-alpine`
**Port**: `5173:5173`
**Command**: `npm run dev`

**Volume Mounts** (Development-optimized):
```yaml
# Source code - hot reload enabled
- ./frontend/src:/app/src
- ./frontend/public:/app/public
- ./frontend/index.html:/app/index.html
- ./frontend/vite.config.ts:/app/vite.config.ts
- ./frontend/tsconfig.json:/app/tsconfig.json
- ./frontend/tailwind.config.js:/app/tailwind.config.js
- ./frontend/postcss.config.js:/app/postcss.config.js

# Persistent node_modules volume
- frontend_node_modules:/app/node_modules
```

**Environment Variables**:
```env
BACKEND_URL=http://hephaestus-server:8000
BACKEND_WS_URL=ws://hephaestus-server:8000
NODE_ENV=development
```

**Features**:
- ✅ Hot module reload (HMR) via Vite
- ✅ Source code volumes for instant changes
- ✅ Persistent node_modules volume
- ✅ Health check configured
- ✅ Docker network DNS resolution to backend

### 2. **Hephaestus Server** (Python + FastAPI)

**Image**: `python:3.11-slim`
**Port**: `8000:8000`
**Command**: `python run_server.py`

**Key Volumes**:
- Source code mounts for development
- Data persistence
- Configuration files
- Docker socket for tmux management

### 3. **Hephaestus Monitor** (Guardian Monitoring)

**Image**: `python:3.11-slim`
**Command**: `python run_monitor.py`

Runs Guardian monitoring loop for agent management.

### 4. **Qdrant** (Vector Store)

**Image**: `qdrant/qdrant:latest`
**Port**: `6333:6333`

Vector database for RAG and memory management.

## Quick Start

### Build All Services

```bash
cd /Users/nova/Sites/bench/Hephaestus

# Build all services
docker-compose build

# Or build with no cache
docker-compose build --no-cache
```

### Start All Services

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f hephaestus-server
```

### Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend UI | http://localhost:5173 | Workflow visualization |
| API | http://localhost:8000 | Hephaestus API |
| API Docs | http://localhost:8000/docs | FastAPI Swagger docs |
| Qdrant | http://localhost:6333 | Vector store API |

### Stop All Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Stop and remove all images
docker-compose down --rmi all
```

## Development Workflow

### Hot Reload Development

Both frontend and backend support hot reload:

**Frontend**:
1. Edit `./frontend/src/**` files
2. Changes instantly reflect in browser (Vite HMR)
3. No container restart needed

**Backend**:
1. Edit `./src/**` files
2. FastAPI auto-reloads on file changes
3. No container restart needed

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f hephaestus-server
docker-compose logs -f hephaestus-monitor
docker-compose logs -f qdrant

# Last 100 lines
docker-compose logs --tail 100 frontend
```

### Accessing Container Shell

```bash
# Frontend shell
docker-compose exec frontend sh

# Backend shell
docker-compose exec hephaestus-server bash

# Run npm commands
docker-compose exec frontend npm list
docker-compose exec frontend npm install axios  # Add new package

# Run Python commands
docker-compose exec hephaestus-server python --version
```

### Rebuilding Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build frontend
docker-compose build hephaestus-server

# Restart services after rebuild
docker-compose up -d
```

## Docker Networking

Services communicate through Docker's internal DNS:

**Frontend → Backend**:
```
Frontend: http://hephaestus-server:8000  (internal)
Browser:  http://localhost:8000          (external via host)
```

**Backend → Qdrant**:
```
http://qdrant:6333 (internal Docker DNS)
```

## Volume Management

### Persistent Volumes

```yaml
volumes:
  qdrant_data:          # Qdrant storage
  frontend_node_modules: # Node modules cache
```

### View Volume Details

```bash
# List all volumes
docker volume ls | grep hephaestus

# Inspect volume
docker volume inspect hephaestus_qdrant_data
docker volume inspect hephaestus_frontend_node_modules

# Cleanup unused volumes
docker volume prune
```

## Troubleshooting

### Frontend Won't Load

```bash
# Check frontend logs
docker-compose logs frontend

# Verify container is running
docker ps | grep hephaestus-frontend

# Check if port 5173 is accessible
curl http://localhost:5173

# Restart frontend
docker-compose restart frontend
```

### Backend Connection Issues

```bash
# Check if backend is running
docker ps | grep hephaestus-server

# Test API
curl http://localhost:8000/health

# Check backend logs
docker-compose logs hephaestus-server

# Verify Docker networking
docker-compose exec frontend curl http://hephaestus-server:8000
```

### Qdrant Connection Issues

```bash
# Verify Qdrant is running
docker ps | grep qdrant

# Test connection
curl http://localhost:6333/health

# Restart Qdrant
docker-compose restart qdrant
```

### Node Modules Issues

```bash
# Rebuild frontend with fresh node_modules
docker-compose exec frontend npm ci --no-audit

# Clear and rebuild
docker-compose down
docker volume rm hephaestus_frontend_node_modules
docker-compose up -d frontend
```

## Performance Optimization

### Frontend Performance

1. **HMR for Fast Development**
   - Edit code → see changes instantly
   - No full rebuild needed

2. **Vite Optimizations**
   - Native ES modules in dev
   - On-demand compilation
   - Lightning-fast startup

3. **Volume Optimization**
   - node_modules in separate volume
   - Only source code mounted (smaller bind mount)
   - Faster file sync

### Backend Performance

1. **Source Code Volumes**
   - Direct file access for dev reload
   - No copy overhead

2. **Data Persistence**
   - Data volumes preserved across restarts
   - No re-initialization

## Deployment Configuration

For production deployment:

1. **Update docker-compose.yml**:
   - Change `NODE_ENV=development` → `NODE_ENV=production`
   - Add resource limits
   - Configure restart policies

2. **Environment Variables**:
   - Use production API keys
   - Set appropriate timeouts
   - Configure logging levels

3. **Health Checks**:
   - All services have health checks
   - Docker will restart unhealthy services

## Docker Compose Commands Reference

```bash
# Build
docker-compose build                    # Build all services
docker-compose build --no-cache         # Fresh build
docker-compose build frontend           # Build specific service

# Run
docker-compose up -d                    # Start in background
docker-compose up                       # Start in foreground
docker-compose up --scale service=3     # Scale service

# Status
docker-compose ps                       # Show running services
docker-compose logs                     # View logs
docker-compose logs -f service          # Follow logs
docker-compose exec service bash        # Run command in container

# Stop
docker-compose down                     # Stop and remove containers
docker-compose down -v                  # Also remove volumes
docker-compose pause                    # Pause services
docker-compose unpause                  # Resume services

# Cleanup
docker-compose down --rmi all           # Remove images
docker image prune                      # Clean unused images
docker volume prune                     # Clean unused volumes
```

## Environment Variables

Configure in `.env` file:

```bash
# LLM Configuration
LLM_PROVIDER=openrouter
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# Frontend
FRONTEND_PORT=5173

# Backend
BACKEND_PORT=8000
BACKEND_URL=http://hephaestus-server:8000

# Database
DATABASE_PATH=/app/data/hephaestus.db
QDRANT_URL=http://qdrant:6333

# Monitoring
MONITORING_INTERVAL_SECONDS=60
```

---

**Status**: ✅ Production-Ready
**Last Updated**: 2025-11-07
**Python Version**: 3.11
**Node Version**: 20-alpine
