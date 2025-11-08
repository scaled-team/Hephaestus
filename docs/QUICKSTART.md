# Quick Start: Running the End-to-End Workflow

## Prerequisites

- Docker Desktop running
- Python 3.9+
- Access to Hephaestus project directory
- MCP servers configured in `hephaestus_config.yaml`

## 5-Minute Quick Start

### Step 1: Verify Docker

```bash
# Check Docker status
docker ps

# If no containers, start Docker Desktop or run:
# On macOS: open -a Docker
# On Linux: sudo systemctl start docker
```

### Step 2: Start Infrastructure

```bash
# Navigate to Hephaestus directory
cd /Users/nova/Sites/bench/Hephaestus

# Start all containers
docker-compose up -d

# Wait 10 seconds for services to stabilize
sleep 10

# Verify containers running
docker ps | grep hephaestus
```

Expected output:
```
CONTAINER ID   IMAGE              STATUS
abc123...      hephaestus-server  Up 8 seconds
def456...      qdrant:latest      Up 8 seconds
ghi789...      hephaestus-monitor Up 5 seconds
```

### Step 3: Run Workflow

```bash
# Navigate to demo directory
cd /Users/nova/Sites/bench

# Run the end-to-end workflow
python demo_e2e_workflow.py

# Watch the output for real-time progress
```

Expected output:
```
======================================================================
🚀 HEPHAESTUS END-TO-END WORKFLOW DEMONSTRATION
======================================================================

[2024-11-07T...] INFO         | 🐳 Verifying Docker setup...
[2024-11-07T...] SUCCESS      | ✅ All Docker containers running: hephaestus-server, hephaestus-qdrant
[2024-11-07T...] INFO         | 🏥 Performing MCP server health check...
[2024-11-07T...] SUCCESS      | ✅ MCP server healthy (attempt 1/5)

... [Phase 2-6 execution] ...

[2024-11-07T...] SUCCESS      | ✅ Report saved
======================================================================
✅ WORKFLOW COMPLETED SUCCESSFULLY
======================================================================
```

### Step 4: View Results

```bash
# Find the latest report
ls -lt execution_reports/workflow_*.json | head -1

# View the report
cat execution_reports/workflow_LATEST.json | jq '.'
```

## What Happens During Execution

### Phase 1: Docker & Infrastructure (30 seconds)
- ✅ Verifies Docker containers running
- ✅ Performs MCP server health checks
- ✅ Confirms Qdrant vector database operational

### Phase 2: Agent Spawning (20 seconds)
- ✅ Initializes hierarchical swarm topology
- ✅ Spawns 5 specialized agents
  - Project Coordinator
  - Frontend Developer
  - Backend Developer
  - Code Analyst
  - QA Engineer

### Phase 3: Ticket Creation (15 seconds)
- ✅ Creates 5 project tickets
- ✅ Assigns tickets to agents
- ✅ Establishes ticket dependencies

### Phase 4: Memory Management (10 seconds)
- ✅ Initializes distributed memory store
- ✅ Saves workflow state
- ✅ Configures persistence policies

### Phase 5: Task Orchestration (20 seconds)
- ✅ Orchestrates 5 task groups
- ✅ Establishes task dependencies
- ✅ Assigns tasks to agents

### Phase 6: Monitoring (15 seconds)
- ✅ Monitors agent execution
- ✅ Tracks task completion
- ✅ Collects performance metrics

### Phase 7: Reporting (5 seconds)
- ✅ Generates comprehensive report
- ✅ Saves to `execution_reports/`
- ✅ Displays execution summary

**Total Time: ~2 minutes**

## Key Output Files

After successful execution, check these files:

### Execution Report
```bash
# Latest report
cat execution_reports/workflow_YYYYMMDD_HHMMSS.json
```

Structure:
```json
{
  "workflow_summary": {
    "execution_time_seconds": 120,
    "status": "completed"
  },
  "agents": {
    "total_spawned": 5,
    "types": ["coordinator", "coder", "analyst", "tester"]
  },
  "tickets": {
    "total_created": 5,
    "categories": ["infrastructure", "backend", "frontend", "quality", "testing"]
  },
  "execution_log": {
    "total_events": 45,
    "success_count": 45,
    "error_count": 0
  }
}
```

## Monitoring in Real-Time

While the workflow runs, you can monitor from another terminal:

```bash
# Watch Docker containers
watch -n 2 'docker ps | grep hephaestus'

# Monitor MCP server logs
docker-compose -f Hephaestus/docker-compose.yml logs -f hephaestus-server

# Check Qdrant vector database
curl http://localhost:6333/health | jq '.'

# Monitor agent status (when server is running)
curl http://localhost:8000/swarm/status | jq '.'
```

## Troubleshooting

### Docker containers won't start

```bash
# Check Docker Desktop is running
docker ps

# If not, restart Docker
# macOS: open -a Docker

# Check logs for errors
docker-compose -f Hephaestus/docker-compose.yml logs

# Clean start (removes all containers)
docker-compose -f Hephaestus/docker-compose.yml down -v
docker-compose -f Hephaestus/docker-compose.yml up -d
```

### MCP server not responding

```bash
# Check server logs
docker-compose -f Hephaestus/docker-compose.yml logs hephaestus-server

# Check if port 8000 is in use
lsof -i :8000

# Wait longer for startup
sleep 30

# Restart server container
docker-compose -f Hephaestus/docker-compose.yml restart hephaestus-server
```

### Script exits with errors

```bash
# Run with verbose output
python -u demo_e2e_workflow.py

# Check for network connectivity
ping localhost:8000

# Verify Qdrant is running
curl http://localhost:6333/health
```

## Customizing the Workflow

### Change agent count

Edit `demo_e2e_workflow.py` line ~200:

```python
agents_to_spawn = [
    # Add or remove agents here
    ("coordinator", "Project Coordinator", ["planning", "delegation", "monitoring"]),
    ("coder", "Frontend Developer", ["react", "typescript", "ui-design"]),
    # ... more agents
]
```

### Change ticket types

Edit line ~250:

```python
tickets_to_create = [
    {
        "title": "Your Custom Ticket",
        "description": "Your description",
        "priority": "high",
        "category": "custom",
    },
    # ... more tickets
]
```

### Adjust monitoring duration

Edit line ~400:

```python
lambda: self.monitor_agents_and_tasks(60),  # Change 60 to your desired seconds
```

## Integration with SuperClaude

This workflow integrates with SuperClaude's features:

### TodoWrite Integration

```python
# Tasks are tracked in TodoWrite
TodoWrite({
    todos: [
        {"content": "Phase 1: Docker Setup", "status": "in_progress"},
        {"content": "Phase 2: Agent Spawning", "status": "pending"},
        # ... more tasks
    ]
})
```

### MCP Server Usage

- **Context7**: Loads framework documentation
- **Sequential**: Analyzes workflow complexity
- **Memory**: Persists agent state
- **Claude Flow**: Orchestrates agents

## Advanced Features

### Checkpoint & Resume

```python
# Load previous session
orchestrator = WorkflowOrchestrator()
orchestrator.load_memory("workflow_state")

# Resume from where it left off
orchestrator.resume_from_checkpoint()
```

### Custom Metrics

```python
# Add custom monitoring
orchestrator.memories["custom_metric"] = {
    "name": "custom_metric",
    "value": 42,
    "unit": "percentage"
}
```

### Memory Queries

```bash
# Query memory store
curl "http://localhost:8000/memory/search?query=workflow_state" | jq '.'

# Get specific memory key
curl "http://localhost:8000/memory/get?key=workflow_state" | jq '.'
```

## Next Steps

1. **Run the workflow**: `python demo_e2e_workflow.py`
2. **Review the report**: Check `execution_reports/workflow_*.json`
3. **Customize agents**: Edit `demo_e2e_workflow.py` to add your agents
4. **Extend functionality**: Add custom phases or monitoring
5. **Integrate with your project**: Use the orchestrator as a foundation

## Performance Metrics

Typical execution metrics:

```
Phase                          Duration    Status
─────────────────────────────────────────────────
Docker Setup                   ~5s         ✅
MCP Health Check              ~2s         ✅
Swarm Initialization          ~3s         ✅
Agent Spawning (5 agents)      ~8s         ✅
Ticket Creation (5 tickets)    ~6s         ✅
Memory Initialization          ~2s         ✅
Task Orchestration            ~4s         ✅
Monitoring (15 seconds)        ~15s        ✅
State Persistence             ~2s         ✅
Report Generation             ~3s         ✅
─────────────────────────────────────────────────
TOTAL                          ~50s        ✅
```

## Support

If you encounter issues:

1. Check Docker is running: `docker ps`
2. Verify ports available: `lsof -i :8000` and `lsof -i :6333`
3. Check logs: `docker-compose logs -f`
4. Read the detailed guide: `E2E_WORKFLOW_GUIDE.md`
5. Review configuration: `Hephaestus/hephaestus_config.yaml`

## Success Indicators

You'll know it's working when you see:

- ✅ "All Docker containers running"
- ✅ "MCP server healthy"
- ✅ "Swarm initialized"
- ✅ "Agent spawned" (5 times)
- ✅ "Ticket created" (5 times)
- ✅ "Memory store initialized"
- ✅ "Tasks orchestrated"
- ✅ "Report saved"
- ✅ "WORKFLOW COMPLETED SUCCESSFULLY"

---

**Ready to run?** Execute: `python demo_e2e_workflow.py`
