# MCP Servers Quick Start Guide

## What Are MCP Servers?

MCP (Model Context Protocol) servers give agents running in Hephaestus access to specialized tools for:
- **Memory & RAG**: Semantic search across agent memories (Qdrant)
- **Task Management**: Create, update, and query tasks (Hephaestus)

## Setup

### 1. Ensure Environment Variables

Add to your `.env` file:
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Start Services

```bash
cd /Users/nova/Sites/bench/Hephaestus
docker-compose up -d
```

### 3. Verify MCP Configuration

The MCP servers are already configured in `opencode.json`:
```bash
cat opencode.json | grep -A 10 "mcpServers"
```

## Verification

### Check Services Are Running

```bash
# Check all services
docker-compose ps

# Should show:
# - hephaestus-server (running)
# - hephaestus-monitor (running)
# - qdrant (running)
```

### Test Qdrant Connectivity

```bash
# From host
curl http://localhost:6333/health

# From inside container
docker exec hephaestus-server python -c "from qdrant_client import QdrantClient; client = QdrantClient(url='http://qdrant:6333'); print('Qdrant OK:', client.get_collections())"
```

### Test Hephaestus Server Connectivity

```bash
# From host
curl http://localhost:8000/health

# From inside container
docker exec hephaestus-server curl http://localhost:8000/health
```

## Agent Usage

When agents run inside Hephaestus (via tmux sessions), they automatically have access to MCP tools.

### Qdrant MCP Tools

**Search memories**:
```python
# Find relevant memories about authentication
results = await qdrant_find(
    query="JWT authentication implementation",
    limit=5
)

for result in results:
    print(f"Memory: {result.text}")
    print(f"Similarity: {result.score}")
```

**Store new memories**:
```python
# Save a learning or discovery
await qdrant_store(
    text="Implemented JWT refresh token rotation for enhanced security",
    metadata={
        "task_id": "task-123",
        "phase": "implementation",
        "timestamp": "2025-01-07T12:00:00Z"
    }
)
```

### Hephaestus MCP Tools

**Create a task**:
```python
# Spawn a new task
task_id = create_task(
    description="Add rate limiting to authentication endpoints",
    priority="high",
    phase_id="implementation-phase"
)
print(f"Created task: {task_id}")
```

**Query tasks**:
```python
# Get all tasks in progress
tasks = get_tasks(status="in_progress")
for task in tasks:
    print(f"{task.id}: {task.description}")
```

**Update task status**:
```python
# Mark task as complete
update_task_status(
    task_id="task-abc-123",
    status="done",
    completion_notes="Successfully implemented rate limiting with Redis"
)
```

**Check server health**:
```python
# Verify connectivity
status = health_check()
print(status)  # "✅ Hephaestus server is healthy and running on port 8000"
```

## Common Workflows

### Workflow 1: Agent Learning & Memory

```python
# 1. Search for existing knowledge
memories = await qdrant_find("how to implement OAuth2")

# 2. Review existing implementations
for memory in memories:
    print(f"Found: {memory.text}")

# 3. Implement solution
# ... agent does work ...

# 4. Store new learning
await qdrant_store(
    text="Implemented OAuth2 with PKCE flow for enhanced mobile security",
    metadata={"task_id": current_task, "success": True}
)
```

### Workflow 2: Task Coordination

```python
# 1. Check current tasks
tasks = get_tasks(status="pending")
print(f"Found {len(tasks)} pending tasks")

# 2. Pick a task to work on
task = tasks[0]

# 3. Update status to in_progress
update_task_status(task.id, "in_progress")

# 4. Do the work
# ... implement solution ...

# 5. Mark as complete
update_task_status(
    task.id,
    "done",
    completion_notes="Feature implemented with tests passing"
)

# 6. Create follow-up task if needed
follow_up = create_task(
    description=f"Add documentation for {task.description}",
    priority="medium"
)
```

### Workflow 3: Memory-Augmented Problem Solving

```python
# 1. Search for similar past solutions
similar = await qdrant_find(
    "database connection pooling optimization",
    limit=10
)

# 2. Analyze patterns
patterns = [m.metadata.get("approach") for m in similar]
print(f"Past approaches: {patterns}")

# 3. Apply best practices
# ... implement using learned patterns ...

# 4. Store outcome
await qdrant_store(
    text="Optimized connection pool with dynamic sizing based on load",
    metadata={
        "approach": "dynamic_pooling",
        "improvement": "40% reduction in connection overhead",
        "learned_from": [m.id for m in similar]
    }
)
```

## Troubleshooting

### Problem: MCP Tools Not Available

**Symptom**: Agent cannot find `qdrant_find` or `create_task`

**Solution**:
```bash
# 1. Verify opencode.json is mounted
docker exec hephaestus-server cat /app/opencode.json | grep mcpServers

# 2. Restart services
docker-compose restart hephaestus-server

# 3. Check agent logs
docker-compose logs hephaestus-server | grep -i mcp
```

### Problem: Cannot Connect to Qdrant

**Symptom**: `Connection refused at http://qdrant:6333`

**Solution**:
```bash
# 1. Verify Qdrant is running
docker-compose ps qdrant

# 2. Check Qdrant logs
docker-compose logs qdrant

# 3. Restart Qdrant
docker-compose restart qdrant

# 4. Test connectivity
curl http://localhost:6333/health
```

### Problem: Cannot Connect to Hephaestus Server

**Symptom**: `Connection refused at http://localhost:8000`

**Solution**:
```bash
# 1. Verify server is running
docker-compose ps hephaestus-server

# 2. Check server logs
docker-compose logs hephaestus-server | tail -50

# 3. Restart server
docker-compose restart hephaestus-server

# 4. Verify port mapping
docker-compose port hephaestus-server 8000
```

### Problem: API Key Not Found

**Symptom**: `OPENAI_API_KEY not set`

**Solution**:
```bash
# 1. Check .env file exists
cat .env | grep OPENAI_API_KEY

# 2. Verify environment variable in container
docker exec hephaestus-server printenv OPENAI_API_KEY

# 3. Restart services to reload environment
docker-compose restart
```

## Advanced Configuration

### Custom Collection Name

Edit `opencode.json`:
```json
{
  "mcpServers": {
    "qdrant": {
      "env": {
        "COLLECTION_NAME": "my_custom_collection"
      }
    }
  }
}
```

Then restart:
```bash
docker-compose restart hephaestus-server
```

### Different Embedding Model

Edit `opencode.json`:
```json
{
  "mcpServers": {
    "qdrant": {
      "env": {
        "EMBEDDING_MODEL": "text-embedding-3-small"
      }
    }
  }
}
```

**Note**: Changing the embedding model requires re-indexing all existing memories.

## Best Practices

1. **Store context-rich memories**: Include task ID, phase, and outcome in metadata
2. **Use semantic search**: Query with natural language, not keywords
3. **Update task status frequently**: Keep task tracking current
4. **Search before implementing**: Check if similar work was done before
5. **Store learnings immediately**: Don't wait until task completion
6. **Include metadata**: Makes memories easier to filter and analyze later

## Next Steps

- Read [MCP_SERVERS.md](MCP_SERVERS.md) for detailed architecture
- Review [DOCKER_DEVELOPMENT.md](DOCKER_DEVELOPMENT.md) for development workflows
- Check [claude_mcp_client.py](../claude_mcp_client.py) for all available Hephaestus tools
- Check [qdrant_mcp_openai.py](../qdrant_mcp_openai.py) for Qdrant implementation details

## Summary

✅ **MCP servers are configured** in `opencode.json`
✅ **Qdrant** provides semantic memory search and storage
✅ **Hephaestus** provides task management and coordination
✅ **Agents** automatically have access to all MCP tools
✅ **Docker networking** handles all service connectivity
✅ **No manual setup required** - just start Docker Compose!

Your agents are now equipped with memory and task management superpowers! 🚀
