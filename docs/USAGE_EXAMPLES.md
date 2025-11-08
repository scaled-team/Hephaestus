# Usage Examples: End-to-End Workflow Demonstrations

## Example 1: Basic Workflow Execution

### Command
```bash
python demo_e2e_workflow.py
```

### Expected Output
```
======================================================================
🚀 HEPHAESTUS END-TO-END WORKFLOW DEMONSTRATION
======================================================================

[2024-11-07T14:30:22.123] INFO         | 🚀 Starting complete workflow execution...

======================================================================
📍 PHASE: Docker Setup
======================================================================

[2024-11-07T14:30:22.456] INFO         | 🐳 Verifying Docker setup...
[2024-11-07T14:30:27.789] SUCCESS      | ✅ All Docker containers running: hephaestus-server, hephaestus-qdrant

[2024-11-07T14:30:28.012] INFO         | 🔄 Ensuring Docker containers are running...
[2024-11-07T14:30:35.345] SUCCESS      | ✅ Docker containers started successfully

======================================================================
📍 PHASE: Health Check
======================================================================

[2024-11-07T14:30:35.678] INFO         | 🏥 Performing MCP server health check...
[2024-11-07T14:30:37.901] SUCCESS      | ✅ MCP server healthy (attempt 1/5)

======================================================================
📍 PHASE: Swarm Init
======================================================================

[2024-11-07T14:30:38.234] INFO         | 🐝 Initializing multi-agent swarm...
[2024-11-07T14:30:41.567] SUCCESS      | ✅ Swarm initialized
  └─ {
    "swarm_id": "swarm-2024-11-07-143041",
    "topology": "hierarchical",
    "max_agents": 6
}

======================================================================
📍 PHASE: Agent Spawning
======================================================================

[2024-11-07T14:30:41.890] INFO         | 👥 Spawning agent team...
[2024-11-07T14:30:43.123] SUCCESS      | ✅ Agent spawned: Project Coordinator
  └─ {
    "agent_id": "agent-coord-001",
    "type": "coordinator",
    "capabilities": ["planning", "delegation", "monitoring"]
}

[2024-11-07T14:30:44.456] SUCCESS      | ✅ Agent spawned: Frontend Developer
  └─ {
    "agent_id": "agent-frontend-001",
    "type": "coder",
    "capabilities": ["react", "typescript", "ui-design"]
}

[2024-11-07T14:30:45.789] SUCCESS      | ✅ Agent spawned: Backend Developer
[2024-11-07T14:30:47.012] SUCCESS      | ✅ Agent spawned: Code Analyst
[2024-11-07T14:30:48.345] SUCCESS      | ✅ Agent spawned: QA Engineer
[2024-11-07T14:30:48.678] INFO         | 📊 Agent spawn summary
  └─ {
    "total_spawned": 5,
    "total_requested": 5,
    "success_rate": "100%"
}

======================================================================
📍 PHASE: Ticket Creation
======================================================================

[2024-11-07T14:30:48.901] INFO         | 🎫 Creating project tickets...
[2024-11-07T14:30:49.234] SUCCESS      | ✅ Ticket created: Project Infrastructure Setup
  └─ {
    "ticket_id": "ticket-001",
    "priority": "critical"
}

[2024-11-07T14:30:50.567] SUCCESS      | ✅ Ticket created: API Endpoint Design & Implementation
[2024-11-07T14:30:51.890] SUCCESS      | ✅ Ticket created: Frontend UI Components Development
[2024-11-07T14:30:53.123] SUCCESS      | ✅ Ticket created: Code Quality Review & Optimization
[2024-11-07T14:30:54.456] SUCCESS      | ✅ Ticket created: Comprehensive Testing & Validation

======================================================================
📍 PHASE: Agent Assignment
======================================================================

[2024-11-07T14:30:54.789] INFO         | 📋 Assigning tickets to agents...
[2024-11-07T14:30:55.012] SUCCESS      | ✅ Assigned: Project Infrastructure Setup → Project Coordinator
[2024-11-07T14:30:56.345] SUCCESS      | ✅ Assigned: API Endpoint Design & Implementation → Backend Developer
[2024-11-07T14:30:57.678] SUCCESS      | ✅ Assigned: Frontend UI Components Development → Frontend Developer
[2024-11-07T14:30:58.901] SUCCESS      | ✅ Assigned: Code Quality Review & Optimization → Code Analyst
[2024-11-07T14:31:00.234] SUCCESS      | ✅ Assigned: Comprehensive Testing & Validation → QA Engineer
[2024-11-07T14:31:00.567] INFO         | 📊 Assignment summary
  └─ {
    "total_assigned": 5,
    "total_tickets": 5
}

======================================================================
📍 PHASE: Memory Init
======================================================================

[2024-11-07T14:31:00.890] INFO         | 💾 Initializing memory store...
[2024-11-07T14:31:02.123] SUCCESS      | ✅ Memory store initialized
  └─ {
    "namespace": "hephaestus-workflow",
    "persistence": "enabled"
}

======================================================================
📍 PHASE: Task Orchestration
======================================================================

[2024-11-07T14:31:02.456] INFO         | 🎯 Orchestrating workflow tasks...
[2024-11-07T14:31:04.789] SUCCESS      | ✅ Tasks orchestrated
  └─ {
    "task_id": "task-2024-11-07-143104",
    "total_tasks": 5,
    "strategy": "adaptive"
}

======================================================================
📍 PHASE: Monitoring
======================================================================

[2024-11-07T14:31:05.012] INFO         | 📊 Monitoring agents for 15 seconds...
[2024-11-07T14:31:05.345] INFO         | 📊 Status update
  └─ {
    "active_agents": 5,
    "elapsed": "0s"
}

[2024-11-07T14:31:10.678] INFO         | 📊 Status update
  └─ {
    "active_agents": 5,
    "elapsed": "5s"
}

[2024-11-07T14:31:16.901] INFO         | 📊 Status update
  └─ {
    "active_agents": 4,
    "elapsed": "11s"
}

[2024-11-07T14:31:20.234] SUCCESS      | ✅ Monitoring complete
  └─ {
    "samples_collected": 3
}

======================================================================
📍 PHASE: State Persistence
======================================================================

[2024-11-07T14:31:20.567] INFO         | 💾 Saving workflow state to memory...
[2024-11-07T14:31:21.890] SUCCESS      | ✅ Workflow state saved
  └─ {
    "agents_count": 5,
    "tickets_count": 5
}

======================================================================
📊 EXECUTION SUMMARY
======================================================================

[2024-11-07T14:31:22.123] INFO         | 🚀 Starting complete workflow execution...
[2024-11-07T14:31:22.456] INFO         | 📈 Generating execution report...
[2024-11-07T14:31:22.789] SUCCESS      | ✅ Report generated
  └─ {
    "total_duration_seconds": 60,
    "agents_spawned": 5,
    "tickets_created": 5
}

[2024-11-07T14:31:23.012] SUCCESS      | ✅ Report saved
  └─ {
    "path": "/Users/nova/Sites/bench/execution_reports/workflow_20241107_143023.json"
}

[2024-11-07T14:31:23.345] INFO         | 📊 Workflow Statistics
  └─ {
    "completed_phases": 10,
    "failed_phases": 0,
    "total_phases": 10,
    "success_rate": "100%"
}

======================================================================
✅ WORKFLOW COMPLETED SUCCESSFULLY
======================================================================
```

## Example 2: Viewing Execution Report

### Command
```bash
cat execution_reports/workflow_20241107_143023.json | jq '.'
```

### Output
```json
{
  "workflow_summary": {
    "execution_time_seconds": 60,
    "start_time": "2024-11-07T14:30:22.123456",
    "end_time": "2024-11-07T14:31:22.456789",
    "status": "completed"
  },
  "infrastructure": {
    "docker_containers": 3,
    "mcp_server": "running",
    "qdrant_database": "connected"
  },
  "agents": {
    "total_spawned": 5,
    "types": ["coordinator", "coder", "analyst", "tester"],
    "details": [
      {
        "agent_id": "agent-coord-001",
        "type": "coordinator",
        "name": "Project Coordinator",
        "status": "spawned",
        "created_at": "2024-11-07T14:30:43.123456"
      },
      {
        "agent_id": "agent-frontend-001",
        "type": "coder",
        "name": "Frontend Developer",
        "status": "spawned",
        "created_at": "2024-11-07T14:30:44.456789"
      },
      {
        "agent_id": "agent-backend-001",
        "type": "coder",
        "name": "Backend Developer",
        "status": "spawned",
        "created_at": "2024-11-07T14:30:45.789012"
      },
      {
        "agent_id": "agent-analyst-001",
        "type": "analyst",
        "name": "Code Analyst",
        "status": "spawned",
        "created_at": "2024-11-07T14:30:47.012345"
      },
      {
        "agent_id": "agent-tester-001",
        "type": "tester",
        "name": "QA Engineer",
        "status": "spawned",
        "created_at": "2024-11-07T14:30:48.345678"
      }
    ]
  },
  "tickets": {
    "total_created": 5,
    "categories": ["infrastructure", "backend", "frontend", "quality", "testing"],
    "details": [
      {
        "ticket_id": "ticket-001",
        "title": "Project Infrastructure Setup",
        "description": "Initialize Docker, Qdrant, and MCP server infrastructure",
        "priority": "critical",
        "category": "infrastructure",
        "assignee": "Project Coordinator",
        "status": "pending",
        "created_at": "2024-11-07T14:30:49.234567"
      },
      {
        "ticket_id": "ticket-002",
        "title": "API Endpoint Design & Implementation",
        "description": "Design RESTful API with authentication and core endpoints",
        "priority": "high",
        "category": "backend",
        "assignee": "Backend Developer",
        "status": "pending",
        "created_at": "2024-11-07T14:30:50.567890"
      }
    ]
  },
  "memory": {
    "state_saved": true,
    "namespace": "hephaestus-workflow",
    "retention": "extended"
  },
  "execution_log": {
    "total_events": 50,
    "success_count": 50,
    "error_count": 0,
    "events": [
      {
        "timestamp": "2024-11-07T14:30:22.123456",
        "level": "INFO",
        "message": "🚀 Starting complete workflow execution...",
        "elapsed_seconds": 0
      }
    ]
  }
}
```

## Example 3: Custom Agent Configuration

### Modify demo_e2e_workflow.py

```python
# Change agents to spawn
def spawn_agents_parallel(self) -> bool:
    """Spawn custom agent team"""
    self.log("INFO", "👥 Spawning custom agent team...")

    agents_to_spawn = [
        ("coordinator", "Scrum Master", ["planning", "delegation", "monitoring"]),
        ("coder", "Machine Learning Engineer", ["python", "pytorch", "data-science"]),
        ("coder", "DevOps Engineer", ["kubernetes", "docker", "ci-cd"]),
        ("analyst", "Security Analyst", ["security", "vulnerability", "compliance"]),
        ("tester", "Test Automation Engineer", ["automation", "selenium", "pytest"]),
    ]

    success_count = 0
    for agent_type, name, capabilities in agents_to_spawn:
        if self.spawn_agent(agent_type, name, capabilities):
            success_count += 1

    return success_count == len(agents_to_spawn)
```

### Result
```
[...] ✅ Agent spawned: Scrum Master
[...] ✅ Agent spawned: Machine Learning Engineer
[...] ✅ Agent spawned: DevOps Engineer
[...] ✅ Agent spawned: Security Analyst
[...] ✅ Agent spawned: Test Automation Engineer
```

## Example 4: Monitor in Real-Time

### Terminal 1: Run Workflow
```bash
python demo_e2e_workflow.py
```

### Terminal 2: Watch Docker
```bash
watch -n 2 'docker stats --no-stream | grep hephaestus'
```

### Output
```
CONTAINER ID   NAME                  CPU %   MEM USAGE
abc123         hephaestus-server     2.1%    340.2 MB
def456         hephaestus-qdrant     1.8%    285.6 MB
ghi789         hephaestus-monitor    0.5%    95.3 MB
```

### Terminal 3: Check MCP Server
```bash
watch -n 5 'curl -s http://localhost:8000/swarm/status | jq .'
```

### Output
```json
{
  "swarm_id": "swarm-2024-11-07-143041",
  "active_agents": 5,
  "total_agents": 5,
  "status": "running",
  "uptime_seconds": 45
}
```

## Example 5: API Interactions

### Query Agents
```bash
curl -s http://localhost:8000/swarm/agents | jq '.[] | {name, type, status}'
```

Output:
```json
{
  "name": "Project Coordinator",
  "type": "coordinator",
  "status": "active"
}
{
  "name": "Frontend Developer",
  "type": "coder",
  "status": "active"
}
{
  "name": "Backend Developer",
  "type": "coder",
  "status": "active"
}
{
  "name": "Code Analyst",
  "type": "analyst",
  "status": "idle"
}
{
  "name": "QA Engineer",
  "type": "tester",
  "status": "active"
}
```

### Query Tickets
```bash
curl -s http://localhost:8000/tickets | jq '.[] | {title, status, assignee}'
```

Output:
```json
{
  "title": "Project Infrastructure Setup",
  "status": "in_progress",
  "assignee": "Project Coordinator"
}
{
  "title": "API Endpoint Design & Implementation",
  "status": "pending",
  "assignee": "Backend Developer"
}
{
  "title": "Frontend UI Components Development",
  "status": "pending",
  "assignee": "Frontend Developer"
}
{
  "title": "Code Quality Review & Optimization",
  "status": "pending",
  "assignee": "Code Analyst"
}
{
  "title": "Comprehensive Testing & Validation",
  "status": "pending",
  "assignee": "QA Engineer"
}
```

### Query Memory
```bash
curl -s http://localhost:8000/memory/get?key=workflow_state | jq '.value.agents_spawned'
```

Output:
```
5
```

## Example 6: Integration with CI/CD

### GitHub Actions Workflow

```yaml
name: Run E2E Workflow

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:      # Manual trigger

jobs:
  workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Start Docker services
        run: |
          cd Hephaestus
          docker-compose up -d
          sleep 10

      - name: Run E2E Workflow
        run: |
          cd ..
          python demo_e2e_workflow.py

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: workflow-report
          path: execution_reports/

      - name: Publish Report
        run: |
          # Post report to dashboard or Slack
          REPORT=$(cat execution_reports/workflow_*.json | jq '.workflow_summary')
          echo "Workflow completed: $REPORT"
```

## Example 7: Performance Analysis

### Extract Performance Metrics

```bash
# Get execution time
cat execution_reports/workflow_*.json | jq '.workflow_summary.execution_time_seconds'

# Count events
cat execution_reports/workflow_*.json | jq '.execution_log.total_events'

# Count successes/errors
cat execution_reports/workflow_*.json | jq '.execution_log | {success_count, error_count}'

# Check agent types
cat execution_reports/workflow_*.json | jq '.agents.types | unique'
```

### Generate Summary Report

```bash
#!/bin/bash
REPORT=$(cat execution_reports/workflow_*.json)

echo "═══════════════════════════════════════"
echo "WORKFLOW EXECUTION SUMMARY"
echo "═══════════════════════════════════════"
echo ""
echo "Execution Time: $(echo $REPORT | jq '.workflow_summary.execution_time_seconds')s"
echo "Agents Spawned: $(echo $REPORT | jq '.agents.total_spawned')"
echo "Tickets Created: $(echo $REPORT | jq '.tickets.total_created')"
echo "Success Rate: $(echo $REPORT | jq '.execution_log.success_count / .execution_log.total_events * 100' | jq 'floor')%"
echo ""
```

## Example 8: Error Handling

### Scenario: Docker Not Running

```bash
python demo_e2e_workflow.py
```

Output:
```
[2024-11-07T14:30:22.123] INFO         | 🐳 Verifying Docker setup...
[2024-11-07T14:30:27.456] ERROR        | ❌ Docker verification failed: Cannot connect to Docker daemon
[2024-11-07T14:30:27.789] INFO         | 🔄 Ensuring Docker containers are running...
[2024-11-07T14:30:35.012] SUCCESS      | ✅ Docker containers started successfully
[2024-11-07T14:30:45.345] SUCCESS      | ✅ MCP server healthy (attempt 5/5)
... [rest of workflow continues]
```

### Scenario: MCP Server Timeout

```bash
python demo_e2e_workflow.py
```

Output:
```
[2024-11-07T14:30:35.678] INFO         | 🏥 Performing MCP server health check...
[2024-11-07T14:30:37.901] WARNING      | ⚠️  Health check failed (attempt 1/5), retrying...
[2024-11-07T14:30:40.234] WARNING      | ⚠️  Health check failed (attempt 2/5), retrying...
[2024-11-07T14:30:42.567] SUCCESS      | ✅ MCP server healthy (attempt 3/5)
... [workflow continues with 3-second recovery]
```

## Example 9: Extending the Orchestrator

### Create Custom Orchestrator Class

```python
from demo_e2e_workflow import WorkflowOrchestrator

class AIProjectOrchestrator(WorkflowOrchestrator):
    """Custom orchestrator for AI projects"""

    def spawn_agents_parallel(self) -> bool:
        """AI-specific agent team"""
        self.log("INFO", "🤖 Spawning AI research team...")

        agents_to_spawn = [
            ("coordinator", "Research Lead", ["research", "planning", "publication"]),
            ("coder", "ML Engineer", ["pytorch", "tensorflow", "cuda"]),
            ("coder", "Data Engineer", ["etl", "data-pipeline", "spark"]),
            ("analyst", "Research Analyst", ["statistical-analysis", "visualization"]),
            ("tester", "ML Validation Engineer", ["model-validation", "a-b-testing"]),
        ]

        # Spawn agents...
        return True

    def create_tickets(self) -> bool:
        """AI-specific tickets"""
        self.log("INFO", "🎫 Creating AI research tickets...")

        tickets_to_create = [
            {"title": "Literature Review", "category": "research"},
            {"title": "Data Preparation", "category": "data"},
            {"title": "Model Development", "category": "ml"},
            {"title": "Evaluation & Validation", "category": "testing"},
            {"title": "Paper Writing & Publication", "category": "documentation"},
        ]

        # Create tickets...
        return True

# Usage
if __name__ == "__main__":
    orchestrator = AIProjectOrchestrator()
    orchestrator.run_complete_workflow()
```

## Example 10: Batch Execution

### Run Multiple Workflows

```bash
#!/bin/bash

for i in {1..5}; do
    echo "Running workflow iteration $i..."
    python demo_e2e_workflow.py

    # Extract metrics
    REPORT=$(cat execution_reports/workflow_*.json | tail -1)
    TIME=$(echo $REPORT | jq '.workflow_summary.execution_time_seconds')

    echo "Iteration $i completed in ${TIME}s"
    sleep 5  # Pause between runs
done

# Generate comparison report
echo "All iterations complete. Generating comparison..."
```

---

These examples demonstrate the flexibility and power of the end-to-end workflow system. Adapt them to your specific needs!
