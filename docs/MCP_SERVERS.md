# MCP Servers Configuration

## Overview

Hephaestus uses Model Context Protocol (MCP) servers to give agents access to specialized tools and services. The MCP servers are configured in `opencode.json` and run inside Docker containers.

## Available MCP Servers

### 1. Qdrant MCP Server

**Purpose**: Vector store access for agent memory and RAG (Retrieval-Augmented Generation)

**Location**: `/app/qdrant_mcp_openai.py` (inside container)

**Capabilities**:
- `qdrant_find` - Search for relevant memories using semantic search
- `qdrant_store` - Save discoveries and learnings to vector store

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

**Environment Variables**:
- `QDRANT_URL` - Qdrant service URL (uses Docker service name `qdrant`)
- `COLLECTION_NAME` - Qdrant collection name for memories
- `OPENAI_API_KEY` - API key for OpenAI embeddings (from `.env`)
- `EMBEDDING_MODEL` - OpenAI embedding model (3072-dimensional)

### 2. Hephaestus MCP Server

**Purpose**: Task management and workflow coordination

**Location**: `/app/claude_mcp_client.py` (inside container)

**Capabilities**:
- `create_task` - Spawn new tasks for any phase
- `get_tasks` - Query task status and information
- `update_task_status` - Mark tasks as done/failed
- `save_memory` - Store learnings in the knowledge base
- `get_agent_status` - Check other agents' status
- `health_check` - Verify Hephaestus server connectivity

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

**Environment Variables**:
- `HEPHAESTUS_URL` - Hephaestus MCP server URL (localhost because MCP client runs in same container)

## Docker Integration

### Container Networking

The MCP servers leverage Docker's internal networking:

1. **Qdrant Connection**: Uses Docker service name `http://qdrant:6333`
   - Docker Compose automatically creates a network where services can find each other by name
   - No need for localhost or IP addresses

2. **Hephaestus Connection**: Uses `http://localhost:8000`
   - MCP client runs inside the same container as the Hephaestus server
   - Both share the same network namespace

### File Paths

All MCP server scripts are located at the container root (`/app/`) because:
- Scripts are copied during Docker build: `COPY *.py /app/`
- Volume mounts also map to `/app/` directory structure
- Consistent paths across container restarts

### Environment Variables

Environment variables are injected through multiple layers:

1. **Docker Compose** (docker-compose.yml):
   ```yaml
   environment:
     - OPENAI_API_KEY=${OPENAI_API_KEY}
   ```

2. **OpenCode Configuration** (opencode.json):
   ```json
   "env": {
     "OPENAI_API_KEY": "${OPENAI_API_KEY}"
   }
   ```

3. **Host .env File**: Values loaded from `.env` on host system

## Agent Usage

Agents running inside Docker containers automatically have access to these MCP servers through the OpenCode CLI.

### Example: Using Qdrant MCP

```python
# Inside an agent tmux session
# Agent can search memories
result = await qdrant_find(query="authentication implementation", limit=5)

# Agent can store learnings
await qdrant_store(
    text="Implemented JWT authentication with refresh tokens",
    metadata={"task_id": "task-123", "phase": "implementation"}
)
```

### Example: Using Hephaestus MCP

```python
# Inside an agent tmux session
# Check server health
status = health_check()

# Create a new task
task_id = create_task(
    description="Add input validation to login endpoint",
    priority="high",
    phase_id="implementation"
)

# Update task status
update_task_status(task_id=task_id, status="done")

# Query tasks
tasks = get_tasks(status="in_progress")
```

## Configuration Updates

### Modifying MCP Servers

1. **Edit opencode.json** on the host:
   ```bash
   nano /Users/nova/Sites/bench/Hephaestus/opencode.json
   ```

2. **Restart services** for changes to take effect:
   ```bash
   docker-compose restart hephaestus-server hephaestus-monitor
   ```

### Adding New MCP Servers

To add a new MCP server:

1. **Create the MCP server script** (e.g., `new_mcp_server.py`)

2. **Add to opencode.json**:
   ```json
   {
     "mcpServers": {
       "my-server": {
         "command": "python",
         "args": ["/app/new_mcp_server.py"],
         "env": {
           "MY_VAR": "value"
         },
         "description": "My custom MCP server",
         "capabilities": [
           "my_tool - Description of what it does"
         ]
       }
     }
   }
   ```

3. **Restart services**:
   ```bash
   docker-compose restart hephaestus-server
   ```

## Verification

### Check MCP Server Availability

**From inside container**:
```bash
# Access container
docker exec -it hephaestus-server bash

# Test Qdrant connectivity
python -c "from qdrant_client import QdrantClient; client = QdrantClient(url='http://qdrant:6333'); print(client.get_collections())"

# Test Hephaestus connectivity
curl http://localhost:8000/health
```

**From agent tmux session**:
```bash
# Agents automatically have access to MCP tools
# Check available tools with OpenCode CLI
opencode mcp list
```

## Troubleshooting

### MCP Server Not Available

**Symptom**: Agent cannot access MCP server tools

**Solutions**:
1. Verify opencode.json is properly mounted:
   ```bash
   docker exec hephaestus-server cat /app/opencode.json
   ```

2. Check environment variables:
   ```bash
   docker exec hephaestus-server printenv | grep -E "QDRANT|OPENAI|HEPHAESTUS"
   ```

3. Restart services:
   ```bash
   docker-compose restart hephaestus-server
   ```

### Qdrant Connection Failed

**Symptom**: `Cannot connect to Qdrant at http://qdrant:6333`

**Solutions**:
1. Verify Qdrant is running:
   ```bash
   docker-compose ps qdrant
   ```

2. Check Qdrant health:
   ```bash
   curl http://localhost:6333/health
   ```

3. Verify Docker network:
   ```bash
   docker network inspect hephaestus_default
   ```

### Hephaestus Server Unreachable

**Symptom**: `Cannot connect to Hephaestus server`

**Solutions**:
1. Verify server is running:
   ```bash
   docker-compose ps hephaestus-server
   ```

2. Check server logs:
   ```bash
   docker-compose logs hephaestus-server
   ```

3. Test connectivity:
   ```bash
   docker exec hephaestus-server curl http://localhost:8000/health
   ```

## Best Practices

1. **Use Docker service names** for inter-container communication (e.g., `http://qdrant:6333`)
2. **Use localhost** for intra-container communication (e.g., `http://localhost:8000`)
3. **Store sensitive values** (API keys) in `.env` file, never hardcode
4. **Test MCP connectivity** before running workflows
5. **Monitor MCP server logs** for debugging issues
6. **Update documentation** when adding new MCP servers

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Docker Host                                             │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ hephaestus-server container                       │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Agent (tmux session)                        │ │ │
│  │  │                                             │ │ │
│  │  │  Uses MCP Servers:                          │ │ │
│  │  │  ├─ qdrant (http://qdrant:6333)             │ │ │
│  │  │  └─ hephaestus (http://localhost:8000)      │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Hephaestus MCP Server                       │ │ │
│  │  │ Port: 8000                                  │ │ │
│  │  │ Tools: create_task, get_tasks, etc.         │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ qdrant container                                  │ │
│  │ Port: 6333                                        │ │
│  │ Service: Vector database                          │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘

MCP Configuration: opencode.json (mounted to containers)
Environment Variables: .env (loaded by Docker Compose)
```

## Summary

- **MCP servers** give agents access to specialized tools (Qdrant, Hephaestus)
- **Docker networking** allows services to communicate by name
- **opencode.json** configures MCP servers with Docker-aware paths
- **Environment variables** are injected through Docker Compose and .env
- **Agent access** is automatic through OpenCode CLI integration
- **Updates require** service restart to take effect

All MCP functionality is containerized and configured for seamless Docker deployment!
