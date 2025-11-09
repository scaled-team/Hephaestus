# OpenCode MCP Configuration for Hephaestus

## Overview

This document explains how OpenCode CLI is configured to use MCP (Model Context Protocol) servers in the Hephaestus Docker environment.

## Configuration File

OpenCode uses `opencode.json` for its configuration, which is mounted into the Docker containers at:
- `/app/opencode.json` (main location)
- `/root/.config/opencode/opencode.json` (user config location)

## MCP Servers Configured

### 1. Qdrant MCP Server
**Purpose**: Vector store for agent memory and RAG (Retrieval-Augmented Generation)

**Configuration**:
```json
{
  "qdrant": {
    "command": "python",
    "args": ["/app/qdrant_mcp_openai.py"],
    "env": {
      "QDRANT_URL": "http://qdrant:6333",
      "COLLECTION_NAME": "hephaestus_agent_memories",
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "EMBEDDING_MODEL": "text-embedding-3-large"
    }
  }
}
```

**Available Tools**:
- `qdrant_find` - Search for relevant memories using semantic search
- `qdrant_store` - Save discoveries and learnings to vector store

### 2. Hephaestus MCP Server
**Purpose**: Task management and workflow coordination

**Configuration**:
```json
{
  "hephaestus": {
    "command": "python",
    "args": ["/app/claude_mcp_client.py"],
    "env": {
      "HEPHAESTUS_URL": "http://localhost:8000"
    }
  }
}
```

**Available Tools**:
- `create_task` - Spawn new tasks for any phase
- `get_tasks` - Query task status and information
- `update_task_status` - Mark tasks as done/failed
- `save_memory` - Store learnings in the knowledge base
- `get_agent_status` - Check other agents' status
- `health_check` - Verify Hephaestus server connectivity

## Docker Networking

The configuration uses Docker service names for networking:
- `http://qdrant:6333` - Qdrant service (not localhost)
- `http://localhost:8000` - Hephaestus server (same container)

This allows containers to communicate with each other using Docker's internal DNS.

## Environment Variables

Environment variables are passed through Docker Compose from the `.env` file:
- `OPENAI_API_KEY` - Required for embeddings
- `ANTHROPIC_API_KEY` - Required for Claude models (if using)
- `OPENROUTER_API_KEY` - Optional for OpenRouter models

## Verification

### 1. Check Configuration is Mounted
```bash
docker exec hephaestus-server cat /app/opencode.json | grep -A 5 "mcpServers"
```

### 2. Verify MCP Server Scripts Exist
```bash
docker exec hephaestus-server ls -la /app/qdrant_mcp_openai.py
docker exec hephaestus-server ls -la /app/claude_mcp_client.py
```

### 3. Test Qdrant Connection
```bash
docker exec hephaestus-server curl http://qdrant:6333/health
```

### 4. Test Hephaestus Server
```bash
docker exec hephaestus-server curl http://localhost:8000/health
```

### 5. Check Agent Logs
When agents spawn, they should show MCP tools being loaded:
```bash
docker logs hephaestus-server | grep -i "mcp"
```

## Applying Configuration Changes

After modifying `opencode.json`, restart the services:

```bash
cd /Users/nova/Sites/bench/Hephaestus
docker-compose restart hephaestus-server hephaestus-monitor
```

Or for a full restart:
```bash
docker-compose down
docker-compose up -d
```

## Troubleshooting

### MCP Tools Not Available to Agents

**Symptom**: Agents can't use `qdrant_find`, `create_task`, etc.

**Solutions**:
1. Verify `opencode.json` has `mcpServers` section:
   ```bash
   cat opencode.json | grep -A 20 "mcpServers"
   ```

2. Check environment variables are set:
   ```bash
   docker exec hephaestus-server env | grep -E "OPENAI_API_KEY|QDRANT_URL"
   ```

3. Restart services to reload configuration:
   ```bash
   docker-compose restart hephaestus-server
   ```

### Qdrant Connection Errors

**Symptom**: `qdrant_find` fails with connection errors

**Solutions**:
1. Verify Qdrant is running:
   ```bash
   docker-compose ps qdrant
   ```

2. Check Qdrant health:
   ```bash
   curl http://localhost:6333/health
   ```

3. Verify Docker networking:
   ```bash
   docker exec hephaestus-server ping -c 3 qdrant
   ```

### Hephaestus Server Connection Errors

**Symptom**: `create_task` fails with connection errors

**Solutions**:
1. Verify Hephaestus server is running:
   ```bash
   docker-compose ps hephaestus-server
   ```

2. Check server health:
   ```bash
   curl http://localhost:8000/health
   ```

3. Check server logs:
   ```bash
   docker logs hephaestus-server --tail 50
   ```

## Key Differences from Claude Code

While the MCP configuration format is similar, there are some differences:

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| Config File | `~/.claude/config.json` | `opencode.json` |
| Setup Command | `claude mcp add` | Edit JSON directly |
| Model Format | `sonnet`, `haiku` | `anthropic/claude-sonnet-4` |
| Config Location | User home directory | Project directory |

## Testing MCP Integration

Create a simple test to verify MCP tools are working:

```bash
# Start a shell in the container
docker exec -it hephaestus-server bash

# Test Qdrant MCP
python3 << 'EOF'
import subprocess
import json

# Test qdrant_find tool
result = subprocess.run(
    ["python", "/app/qdrant_mcp_openai.py"],
    input='{"method": "tools/list"}',
    capture_output=True,
    text=True
)
print("Qdrant MCP Tools:", result.stdout)
EOF

# Test Hephaestus MCP
python3 << 'EOF'
import subprocess

result = subprocess.run(
    ["python", "/app/claude_mcp_client.py"],
    input='{"method": "tools/list"}',
    capture_output=True,
    text=True
)
print("Hephaestus MCP Tools:", result.stdout)
EOF
```

## Summary

✅ **Configured**: `opencode.json` now includes both Qdrant and Hephaestus MCP servers
✅ **Mounted**: Configuration is mounted into Docker containers
✅ **Environment**: All required environment variables are set
✅ **Networking**: Docker service names configured for inter-container communication

Agents running in OpenCode will now have access to:
- Memory/RAG capabilities via Qdrant
- Task management via Hephaestus
- Full workflow coordination tools

