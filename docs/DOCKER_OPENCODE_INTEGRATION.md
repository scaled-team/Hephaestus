# Docker & OpenCode CLI Integration Guide

## Overview

This guide shows how the end-to-end workflow integrates with Docker containers and the OpenCode CLI for agent spawning, ticket management, and memory persistence.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Host Machine                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Docker Compose Network                       │ │
│  │                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐              │ │
│  │  │ Hephaestus MCP   │  │  Qdrant Vector   │              │ │
│  │  │  Server          │  │  Database        │              │ │
│  │  │  (port 8000)     │◄─┤  (port 6333)     │              │ │
│  │  │                  │  │                  │              │ │
│  │  │ ┌──────────────┐ │  └──────────────────┘              │ │
│  │  │ │ Agent Swarm  │ │                                    │ │
│  │  │ │ Management   │ │                                    │ │
│  │  │ └──────────────┘ │                                    │ │
│  │  │                  │                                    │ │
│  │  │ ┌──────────────┐ │                                    │ │
│  │  │ │ Ticket       │ │                                    │ │
│  │  │ │ Tracking     │ │                                    │ │
│  │  │ └──────────────┘ │                                    │ │
│  │  │                  │                                    │ │
│  │  │ ┌──────────────┐ │                                    │ │
│  │  │ │ Memory       │ │                                    │ │
│  │  │ │ Manager      │ │                                    │ │
│  │  │ └──────────────┘ │                                    │ │
│  │  │                  │                                    │ │
│  │  │ ┌──────────────┐ │                                    │ │
│  │  │ │ Monitoring   │ │                                    │ │
│  │  │ │ Loop         │ │                                    │ │
│  │  │ └──────────────┘ │                                    │ │
│  │  └──────────────────┘                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│         ▲                              │                       │
│         │                              │                       │
│  ┌──────┴──────────────────────────────▼────────────────────┐ │
│  │        OpenCode CLI / Python Orchestrator               │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  WorkflowOrchestrator                            │  │ │
│  │  │  ├─ Docker Management                            │  │ │
│  │  │  ├─ Agent Spawning                               │  │ │
│  │  │  ├─ Ticket Creation                              │  │ │
│  │  │  ├─ Memory Persistence                           │  │ │
│  │  │  ├─ Task Orchestration                           │  │ │
│  │  │  └─ Monitoring & Reporting                       │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Container Architecture

### Container 1: Hephaestus MCP Server

**Role**: Central MCP server handling all agent operations

```yaml
Container: hephaestus-server
Image: hephaestus:latest
Port: 8000
Volumes:
  - ./data:/app/data (persistence)
  - ./projects:/app/projects (project workspace)
  - /var/run/docker.sock:/var/run/docker.sock (tmux sessions)

Responsibilities:
  ✓ Agent swarm management
  ✓ Ticket tracking system
  ✓ Memory store operations
  ✓ Task orchestration
  ✓ Health monitoring
```

### Container 2: Qdrant Vector Database

**Role**: Vector storage for embeddings and semantic search

```yaml
Container: hephaestus-qdrant
Image: qdrant/qdrant:latest
Port: 6333
Volumes:
  - qdrant_data:/qdrant/storage (persistent)

Responsibilities:
  ✓ Store embeddings for tickets
  ✓ Store embeddings for memory items
  ✓ Enable semantic search
  ✓ Support task deduplication
  ✓ Provide vector similarity queries
```

### Container 3: Monitoring Service

**Role**: Real-time monitoring and health checks

```yaml
Container: hephaestus-monitor
Image: hephaestus:latest
Command: python run_monitor.py

Responsibilities:
  ✓ Monitor agent health
  ✓ Track task progress
  ✓ Detect stuck agents
  ✓ Trigger automatic recovery
  ✓ Collect performance metrics
```

## OpenCode CLI Integration

### Agent Spawning with OpenCode

Each spawned agent uses OpenCode CLI as the default tool:

```yaml
Agent Configuration:
  cli_tool: opencode
  cli_model: anthropic/claude-haiku-4.5

OpenCode Usage:
  - Code analysis and review
  - Implementation suggestions
  - Refactoring recommendations
  - Test generation
  - Documentation creation
```

### OpenCode CLI Commands Used

```bash
# During agent execution, agents run:

# 1. Ticket Analysis
opencode analyze-file <ticket-context>

# 2. Code Implementation
opencode generate-implementation <spec>

# 3. Testing
opencode generate-tests <implementation>

# 4. Documentation
opencode generate-docs <code>

# 5. Review & Feedback
opencode review-code <implementation>
```

### Agent Communication via OpenCode

```
Coordinator Agent (OpenCode)
         ↓ assigns tasks
Backend Developer Agent (OpenCode)
         ↓ implements API
Code Analyst Agent (OpenCode)
         ↓ reviews quality
QA Engineer Agent (OpenCode)
         ↓ tests implementation
Report Generated
```

## Workflow Integration Steps

### Step 1: Docker Startup

```python
def ensure_docker_running(self) -> bool:
    """Start Docker containers"""
    subprocess.run([
        "docker", "compose", "up", "-d", "--no-build"
    ])
    time.sleep(5)  # Wait for services to stabilize
    return True
```

Containers started:
```
CONTAINER ID   NAMES                         STATUS
abc123         hephaestus-server             Up 4 seconds
def456         hephaestus-qdrant             Up 4 seconds
ghi789         hephaestus-monitor            Up 2 seconds
```

### Step 2: Health Check via MCP

```python
def health_check_mcp_server(self, retries: int = 5) -> bool:
    """Verify MCP server is healthy"""
    response = requests.get("http://localhost:8000/health")
    return response.status_code == 200
```

Request:
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "mcp_server": "operational",
    "qdrant": "connected",
    "memory_store": "ready"
  }
}
```

### Step 3: Swarm Initialization

```python
def initialize_swarm(self) -> bool:
    """Initialize multi-agent swarm"""
    response = requests.post(
        "http://localhost:8000/swarm/initialize",
        json={
            "topology": "hierarchical",
            "max_agents": 6,
            "strategy": "adaptive"
        }
    )
    self.swarm_id = response.json()["swarm_id"]
    return True
```

### Step 4: Agent Spawning with OpenCode

```python
def spawn_agent(self, agent_type: str, name: str, capabilities: List[str]):
    """Spawn agent with OpenCode CLI"""
    response = requests.post(
        "http://localhost:8000/swarm/agents/spawn",
        json={
            "type": agent_type,
            "name": name,
            "swarm_id": self.swarm_id,
            "capabilities": capabilities,
            "config": {
                "llm_model": "anthropic/claude-haiku-4.5",
                "cli_tool": "opencode",  # ← Uses OpenCode
                "max_retries": 3
            }
        }
    )
```

Docker command executed for each agent:
```bash
# Inside container:
opencode --model anthropic/claude-haiku-4.5 \
         --task "agent-task" \
         --swarm-id "<swarm-id>" \
         --agent-id "<agent-id>"
```

### Step 5: Ticket Creation

```python
def create_tickets(self) -> bool:
    """Create tickets via MCP API"""
    response = requests.post(
        "http://localhost:8000/tickets/create",
        json={
            "title": "Project Infrastructure Setup",
            "description": "Initialize Docker and services",
            "priority": "critical",
            "category": "infrastructure"
        }
    )
```

Tickets stored in Qdrant with embeddings:
```
Ticket: "Project Infrastructure Setup"
Embedding: [0.234, 0.567, ..., 0.891]  # 3072 dimensions
Stored in: qdrant/hephaestus_tickets
```

### Step 6: Memory Persistence

```python
def save_workflow_state(self) -> bool:
    """Save state to distributed memory"""
    response = requests.post(
        "http://localhost:8000/memory/save",
        json={
            "key": "workflow_state",
            "value": {
                "agents": self.agents,
                "tickets": self.tickets,
                "timestamp": datetime.now().isoformat()
            },
            "namespace": "hephaestus-workflow"
        }
    )
```

Memory storage flow:
```
Memory Item
    ↓
Generate Embedding (OpenAI text-embedding-3-large)
    ↓
Store in Qdrant (hephaestus_memory collection)
    ↓
Enable Cross-session Retrieval
    ↓
Use for Agent Context
```

### Step 7: Task Orchestration

```python
def orchestrate_workflow_tasks(self) -> bool:
    """Orchestrate tasks with dependencies"""
    response = requests.post(
        "http://localhost:8000/tasks/orchestrate",
        json={
            "name": "hephaestus-project-workflow",
            "strategy": "adaptive",
            "dependencies": [
                {"id": "infrastructure", "requires": []},
                {"id": "backend", "requires": ["infrastructure"]},
                {"id": "frontend", "requires": ["backend"]},
                {"id": "quality", "requires": ["backend", "frontend"]},
                {"id": "testing", "requires": ["quality"]}
            ]
        }
    )
```

Dependency resolution:
```
Infrastructure (no dependencies, can run immediately)
    ↓
Backend + Frontend (both require infrastructure, can run in parallel)
    ↓
Quality (requires both backend and frontend)
    ↓
Testing (final step)
```

### Step 8: Monitoring & Reporting

```python
def monitor_agents_and_tasks(self, duration_seconds: int = 30):
    """Monitor execution and collect metrics"""
    while elapsed < duration_seconds:
        response = requests.get("http://localhost:8000/swarm/status")
        status = response.json()

        # Log metrics
        self.log("INFO", "Status update", {
            "active_agents": status["active_agents"],
            "tasks_completed": status["tasks_completed"],
            "uptime": status["uptime_seconds"]
        })
```

Real-time metrics collected:
```
Metric                  Value
─────────────────────────────────
Active Agents           5/6
Tasks In Progress       3
Tasks Completed         2
Memory Usage            234 MB
API Response Time       125 ms
Qdrant Query Time       85 ms
Overall Success Rate    99.2%
```

## API Endpoints Reference

### Swarm Management

```bash
# Initialize swarm
POST /swarm/initialize
{
  "topology": "hierarchical",
  "max_agents": 6,
  "strategy": "adaptive"
}

# Get swarm status
GET /swarm/status
Response: { "swarm_id", "active_agents", "total_agents", "status" }

# List agents
GET /swarm/agents
Response: [{ "agent_id", "name", "type", "status", "capabilities" }]

# Spawn agent
POST /swarm/agents/spawn
{
  "type": "coder",
  "name": "Backend Developer",
  "swarm_id": "...",
  "capabilities": ["nodejs", "api-design"]
}
```

### Ticket Management

```bash
# Create ticket
POST /tickets/create
{
  "title": "...",
  "description": "...",
  "priority": "high",
  "category": "backend"
}

# List tickets
GET /tickets
Response: [{ "ticket_id", "title", "status", "assignee" }]

# Update ticket
PATCH /tickets/{ticket_id}
{
  "status": "in_progress",
  "progress": 50
}

# Assign ticket
PATCH /tickets/{ticket_id}/assign
{
  "assignee": "Backend Developer"
}
```

### Memory Operations

```bash
# Initialize memory store
POST /memory/initialize
{
  "namespace": "hephaestus-workflow",
  "persistence": "enabled"
}

# Save to memory
POST /memory/save
{
  "key": "workflow_state",
  "value": {...},
  "namespace": "hephaestus-workflow"
}

# Load from memory
GET /memory/get?key=workflow_state
Response: { "key", "value", "timestamp" }

# Search memory
GET /memory/search?query=workflow_state
Response: [{ "key", "value", "score" }]
```

### Task Operations

```bash
# Orchestrate tasks
POST /tasks/orchestrate
{
  "name": "workflow-name",
  "strategy": "adaptive",
  "dependencies": [...]
}

# Get task status
GET /tasks/{task_id}
Response: { "task_id", "status", "progress", "active_agents" }

# Get task results
GET /tasks/{task_id}/results
Response: { "task_id", "output", "metrics", "quality_score" }
```

## Docker Volumes & Persistence

### Data Persistence

```yaml
Volumes:
  qdrant_data:
    Path: /qdrant/storage
    Contents:
      - Vector embeddings
      - Memory items
      - Ticket data
      - Task history

  ./data:
    Path: /app/data
    Contents:
      - hephaestus.db (SQLite)
      - Execution logs
      - Reports

  ./projects:
    Path: /app/projects
    Contents:
      - Project files
      - Agent outputs
      - Git repositories
```

### Volume Mounts

```bash
# View volumes
docker volume ls | grep hephaestus

# Inspect volume
docker volume inspect hephaestus_qdrant_data

# Backup volume
docker run --rm -v hephaestus_qdrant_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/qdrant_backup.tar.gz /data

# Restore volume
docker run --rm -v hephaestus_qdrant_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/qdrant_backup.tar.gz -C /
```

## Environment Configuration

### Docker Environment Variables

```bash
# In docker-compose.yml:
environment:
  - LLM_PROVIDER=openrouter
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
  - DATABASE_PATH=/app/data/hephaestus.db
  - QDRANT_URL=http://qdrant:6333
  - MCP_HOST=0.0.0.0
  - MCP_PORT=8000
  - DEFAULT_CLI_TOOL=opencode
  - CLI_MODEL=anthropic/claude-haiku-4.5
```

### Agent Configuration

```yaml
# From hephaestus_config.yaml:
agents:
  default_cli_tool: opencode
  cli_model: anthropic/claude-haiku-4.5
  tmux_session_prefix: agent
  health_check_interval: 60
  max_health_failures: 3
```

## Common Docker Commands

```bash
# Container management
docker-compose ps                    # View all containers
docker-compose logs -f               # Follow all logs
docker-compose logs -f hephaestus-server  # Follow specific container
docker-compose restart hephaestus-server  # Restart container
docker-compose down                  # Stop all containers
docker-compose down -v               # Stop and remove volumes

# Network debugging
docker network ls                    # View Docker networks
docker inspect hephaestus_default    # View network details
docker exec -it hephaestus-server bash  # Shell into container

# Data management
docker volume ls                     # List volumes
docker volume inspect <volume>       # Inspect volume
docker volume rm <volume>            # Remove volume

# Performance monitoring
docker stats                         # View CPU/memory usage
docker events                        # View Docker events
docker system df                     # Disk usage summary
```

## Troubleshooting Docker Integration

### Container won't start

```bash
# Check logs
docker-compose logs hephaestus-server

# Common issue: Port already in use
lsof -i :8000  # Check port 8000
lsof -i :6333  # Check port 6333

# Solution: Stop conflicting process or change port in docker-compose.yml
```

### Memory/Performance issues

```bash
# Monitor resource usage
docker stats hephaestus-server

# Adjust container limits in docker-compose.yml
services:
  hephaestus-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Network connectivity

```bash
# Test connectivity from host to container
curl http://localhost:8000/health

# Test connectivity between containers
docker exec hephaestus-server \
  curl http://qdrant:6333/health
```

## Monitoring Docker Resources

```bash
# Real-time monitoring
watch -n 1 'docker stats --no-stream'

# Detailed metrics
docker inspect hephaestus-server | grep -i memory

# Log aggregation
docker-compose logs --tail 100 -f

# Event monitoring
docker events --filter type=container \
             --filter name=hephaestus
```

## Production Deployment Considerations

1. **Resource Limits**: Set appropriate CPU and memory limits
2. **Restart Policy**: Use `unless-stopped` for automatic recovery
3. **Health Checks**: Implement container health checks
4. **Logging**: Configure centralized logging (ELK, Splunk)
5. **Backup**: Automate volume backups
6. **Networking**: Use Docker networks instead of host networking
7. **Security**: Use secrets management for API keys
8. **Monitoring**: Implement container and application monitoring

## See Also

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [OpenCode CLI Guide](../opencode.json)
- [MCP Server Configuration](../hephaestus_config.yaml)
- [Workflow Guide](./E2E_WORKFLOW_GUIDE.md)
- [Quick Start](./QUICKSTART.md)
