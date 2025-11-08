# Docker Development Setup

## Overview

This guide explains the Docker Compose configuration for Hephaestus development, including volume mounting strategy and database path management.

## Volume Mounting Strategy

The docker-compose.yml is configured for efficient development with the following volume mount categories:

### 1. Data Persistence
```yaml
- ./data:/app/data           # All persistent data (database, logs, docs, projects, worktrees)
```

**Purpose**: Persist data across container restarts and maintain development state. All data is now organized under the `./data/` directory.

### 2. Source Code (Hot-Reloading)
```yaml
- ./src:/app/src             # Python source code
- ./scripts:/app/scripts     # Utility scripts
```

**Purpose**: Enable live code updates without rebuilding containers. Changes to Python files are immediately reflected in the running container.

### 3. Configuration Files
```yaml
- ./hephaestus_config.yaml:/app/hephaestus_config.yaml
- ./opencode.json:/app/opencode.json
- ./.env:/app/.env
```

**Purpose**: Allow configuration updates without container rebuilds. Modify settings on the host and restart services for changes to take effect.

### 4. Entry Point Scripts
```yaml
- ./run_server.py:/app/run_server.py
- ./run_monitor.py:/app/run_monitor.py
- ./run_prd_workflow.py:/app/run_prd_workflow.py
```

**Purpose**: Enable modification of main entry points during development.

### 5. Docker Socket
```yaml
- /var/run/docker.sock:/var/run/docker.sock
```

**Purpose**: Allow the Hephaestus container to manage tmux sessions for agent execution.

## Database Path Configuration

### Single Database Location

**All database operations reference a single location**: `/Users/nova/Sites/bench/Hephaestus/data/hephaestus.db`

This is achieved through:

1. **Docker Environment Variable** (docker-compose.yml):
   ```yaml
   environment:
     - DATABASE_PATH=/app/data/hephaestus.db
   ```

2. **Volume Mount** (docker-compose.yml):
   ```yaml
   volumes:
     - ./data:/app/data
   ```

3. **Configuration System** (src/core/simple_config.py):
   ```python
   # Environment variable override takes precedence
   if os.getenv("DATABASE_PATH"):
       self.database_path = Path(os.getenv("DATABASE_PATH"))
   ```

### How It Works

1. **Inside Container**: All code references `/app/data/hephaestus.db`
2. **On Host**: This maps to `./data/hephaestus.db` (relative to project root)
3. **Absolute Host Path**: `/Users/nova/Sites/bench/Hephaestus/data/hephaestus.db`

### Updated Scripts

The following scripts now respect the `DATABASE_PATH` environment variable:

- `scripts/init_db.py` - Database initialization
- `scripts/create_test_tickets.py` - Test ticket creation
- `scripts/create_test_tickets_sql.py` - SQL-based test data
- `tests/test_monitoring_live.py` - Live monitoring tests

**Usage Pattern**:
```python
import os
from src.core.database import DatabaseManager

# Respects DATABASE_PATH environment variable
db_path = os.getenv("DATABASE_PATH", "./hephaestus.db")
db_manager = DatabaseManager(db_path)
```

## Development Workflow

### Starting Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart hephaestus-server
```

### Making Code Changes

1. **Edit Python files** in `./src/` or `./scripts/`
2. **Restart the service** for changes to take effect:
   ```bash
   docker-compose restart hephaestus-server
   # or
   docker-compose restart hephaestus-monitor
   ```

**Note**: Python doesn't hot-reload by default. For full hot-reloading, consider using `watchdog` or similar tools.

### Database Operations

All database operations automatically use the correct database path through the `DATABASE_PATH` environment variable.

**Initialize database**:
```bash
docker exec hephaestus-server python scripts/init_db.py
```

**Create test data**:
```bash
docker exec hephaestus-server python scripts/create_test_tickets.py
```

**Access database directly**:
```bash
docker exec -it hephaestus-server sqlite3 /app/data/hephaestus.db
```

**Backup database** (on host):
```bash
cp ./data/hephaestus.db ./data/hephaestus.db.backup
```

### Configuration Updates

1. **Modify configuration files** on the host:
   - `hephaestus_config.yaml` - Main configuration
   - `.env` - Environment variables (API keys, etc.)
   - `opencode.json` - OpenCode CLI configuration

2. **Restart services** for changes to take effect:
   ```bash
   docker-compose restart hephaestus-server hephaestus-monitor
   ```

## Troubleshooting

### Database Not Found

**Symptom**: `database is locked` or `no such table` errors

**Solution**: Verify the database path is correctly mounted:
```bash
# Check if database exists in container
docker exec hephaestus-server ls -lah /app/data/hephaestus.db

# Check if database exists on host
ls -lah ./data/hephaestus.db

# Initialize if missing
docker exec hephaestus-server python scripts/init_db.py
```

### Code Changes Not Reflecting

**Symptom**: Changes to Python files don't take effect

**Solution**: Restart the service:
```bash
docker-compose restart hephaestus-server
```

**Alternative**: Rebuild containers if dependencies changed:
```bash
docker-compose up -d --build
```

### Volume Mount Permissions

**Symptom**: Permission denied errors

**Solution**: Ensure proper permissions on host directories:
```bash
chmod -R 755 ./data ./logs ./docs ./src ./scripts
```

### Port Already in Use

**Symptom**: `port 8000 is already allocated`

**Solution**: Stop conflicting services:
```bash
# Find process using port 8000
lsof -ti :8000

# Kill the process
kill $(lsof -ti :8000)

# Restart Docker Compose
docker-compose up -d
```

## Best Practices

1. **Always use environment variables** for paths (DATABASE_PATH, QDRANT_URL, etc.)
2. **Never hardcode absolute paths** in Python code
3. **Use relative paths** for Docker volume mounts in docker-compose.yml
4. **Back up the database** before major changes or migrations
5. **Test scripts** with DATABASE_PATH set to a test database first
6. **Keep .env file** in `.gitignore` to protect API keys

## Architecture Diagram

```
Host System                          Docker Container
├── ./data/                          /app/data/
│   └── hephaestus.db       ←───────→   hephaestus.db (DATABASE_PATH)
├── ./logs/                          /app/logs/
├── ./docs/                          /app/docs/
├── ./src/                           /app/src/ (live source)
├── ./scripts/                       /app/scripts/ (live scripts)
├── hephaestus_config.yaml  ←───────→ /app/hephaestus_config.yaml
├── .env                    ←───────→ /app/.env
└── run_*.py                ←───────→ /app/run_*.py
```

## Summary

- **Single database location**: `/Users/nova/Sites/bench/Hephaestus/data/hephaestus.db`
- **Environment variable**: `DATABASE_PATH=/app/data/hephaestus.db`
- **Volume mount**: `./data:/app/data`
- **All scripts** respect the `DATABASE_PATH` environment variable
- **Development-friendly**: Source code changes reflected with service restart
- **Configuration updates**: No container rebuild needed

This setup ensures consistency across all database operations while enabling efficient development workflows.
