# Agent Flow Diagnosis - System Stuck Analysis

**Date**: 2025-11-08  
**Status**: 🔴 **SYSTEM STUCK - NO ORCHESTRATOR RUNNING**

## Executive Summary

The Hephaestus agent system is **completely stuck** because:

1. ❌ **NO ORCHESTRATOR RUNNING** - The orchestrator that spawns agents is not running
2. ✅ Monitor is running (but only monitors, doesn't spawn agents)
3. ✅ MCP Server is running (but only responds to API calls)
4. ⚠️ 3 pending tasks waiting to be picked up
5. ⚠️ 14 blocked tasks waiting for dependencies
6. ⚠️ 27 terminated agents (all previous agents finished/failed)
7. ⚠️ 0 active agents currently running

## Current System State

### Containers Running
```
✅ hephaestus-server   - MCP Server (API only, no orchestration)
✅ hephaestus-app      - Frontend + Monitor (monitoring only)
✅ hephaestus-qdrant   - Vector database
```

### Processes Running
```
hephaestus-app:
  ✅ python run_monitor.py  - Monitoring loop (passive)
  ✅ npm run dev            - Frontend dev server

hephaestus-server:
  ✅ python run_server.py   - MCP API server
  ❌ NO ORCHESTRATOR        - Nothing spawning agents!
```

### Database State

**Workflow:**
- ID: ba49cf7a
- Name: "Prd To Software"
- Status: active
- Created: 2025-11-08 06:00:16

**Tasks:**
- ✅ Done: 19 tasks
- ❌ Failed: 13 tasks
- ⏸️ Blocked: 14 tasks
- ⏳ Pending: 3 tasks (waiting to be picked up)

**Agents:**
- 🔴 Terminated: 27 agents
- 🟢 Active: 0 agents
- 🟡 Working: 0 agents

**Pending Tasks (should be running but aren't):**
1. `d06e3bf4` - DIAGNOSTIC task (no ticket_id - this is the problem!)
2. `b026e462` - Phase 3: Frontend Infrastructure Validation
3. `3dc63b78` - Backend Infrastructure Documentation

## Root Cause Analysis

### Problem 1: No Orchestrator Process

**What's missing:**
- There is NO process running that picks up pending tasks and spawns agents
- The monitor only observes and sends steering messages
- The MCP server only responds to API calls
- Nothing is actively checking for pending tasks and creating agents

**Expected behavior:**
- An orchestrator process should be running that:
  1. Polls for pending tasks every N seconds
  2. Checks if there are available agent slots
  3. Spawns new agents for pending tasks
  4. Updates task status to "assigned"

**Current behavior:**
- Tasks sit in "pending" status forever
- No agents are spawned
- System is completely idle

### Problem 2: Diagnostic Task Missing Ticket ID

**Issue:**
- Task `d06e3bf4` is a DIAGNOSTIC task created by the monitor
- It has `ticket_id = NULL`
- When an agent tries to run this task, MCP tools fail because they require ticket_id
- This causes the agent to crash immediately

**Impact:**
- Even if orchestrator was running, this task would fail
- Agent would terminate with error
- Task would be marked as "failed"

### Problem 3: Blocked Tasks Waiting

**Issue:**
- 14 tasks are in "blocked" status
- These are Phase 2 tasks waiting for Phase 1 to complete
- But Phase 1 tasks have failed, so these will never unblock

**Blocked tasks:**
- Phase 2: Database Models & Schema
- Phase 2: Authentication System
- Phase 2: Data Integration Layer
- Phase 2: LLM & RAG Pipeline
- Phase 2: API Layer & Endpoints
- ... and 9 more

## What Should Be Happening

### Normal Agent Flow

```
1. Orchestrator Loop (every 30s)
   ↓
2. Check for pending tasks
   ↓
3. Check available agent slots (max concurrent)
   ↓
4. Spawn agent for highest priority pending task
   ↓
5. Agent picks up task, updates status to "working"
   ↓
6. Agent executes task using MCP tools
   ↓
7. Agent completes task, updates status to "done"
   ↓
8. Agent terminates
   ↓
9. Orchestrator picks up next pending task
   ↓
10. Repeat
```

### Current Broken Flow

```
1. ❌ NO ORCHESTRATOR RUNNING
   ↓
2. Tasks sit in "pending" forever
   ↓
3. No agents spawned
   ↓
4. System idle
   ↓
5. Monitor detects stuck state
   ↓
6. Monitor creates DIAGNOSTIC task
   ↓
7. DIAGNOSTIC task also sits in "pending"
   ↓
8. Nothing happens
```

## Solutions

### Immediate Fix: Start Orchestrator

**Option 1: Run orchestrator manually**
```bash
docker exec -d hephaestus-server python3 -c "
from src.orchestration.orchestrator import Orchestrator
from src.core.database import DatabaseManager
import asyncio

async def run():
    db = DatabaseManager('/app/data/hephaestus.db')
    orch = Orchestrator(db)
    await orch.run()

asyncio.run(run())
"
```

**Option 2: Add orchestrator to docker-compose**
- Create a separate orchestrator service
- Or integrate into hephaestus-server startup

**Option 3: Add orchestrator to run_server.py**
- Run orchestrator in background thread alongside MCP server

### Fix Diagnostic Task Issue

**Option 1: Allow NULL ticket_id for diagnostic tasks**
```python
# In MCP tools, check if task is diagnostic
if task.ticket_id is None and task.raw_description.startswith("DIAGNOSTIC"):
    # Allow NULL ticket_id for diagnostic tasks
    ticket_id = "DIAGNOSTIC"
else:
    # Require ticket_id for normal tasks
    if task.ticket_id is None:
        raise ValueError("Task missing ticket_id")
```

**Option 2: Create system ticket for diagnostics**
```python
# When creating diagnostic task, also create a system ticket
system_ticket = create_ticket(
    name="System Diagnostics",
    description="System-generated diagnostic tasks",
    status="active"
)
diagnostic_task.ticket_id = system_ticket.id
```

### Fix Blocked Tasks

**Option 1: Unblock manually**
```sql
UPDATE tasks 
SET status = 'pending' 
WHERE status = 'blocked' 
AND id IN (
    -- List of task IDs that should be unblocked
);
```

**Option 2: Reset workflow**
```sql
-- Mark all failed tasks as pending to retry
UPDATE tasks 
SET status = 'pending', 
    assigned_agent_id = NULL,
    failure_reason = NULL
WHERE status = 'failed';
```

**Option 3: Create new workflow**
- Start fresh with new workflow
- Learn from failures in current workflow
- Better task dependencies

## Recommended Action Plan

### Phase 1: Get System Running (Immediate)

1. **Start orchestrator process**
   - Add to docker-compose or run manually
   - Verify it's polling for pending tasks

2. **Fix diagnostic task**
   - Delete the broken diagnostic task OR
   - Create system ticket and assign to it

3. **Verify agent spawning**
   - Check that agents are created for pending tasks
   - Monitor logs for agent creation

### Phase 2: Fix Architecture (Short-term)

1. **Integrate orchestrator into system**
   - Add orchestrator service to docker-compose
   - Or run as background thread in run_server.py
   - Ensure it starts automatically

2. **Fix MCP tools to handle diagnostics**
   - Allow NULL ticket_id for diagnostic tasks
   - Or always create system ticket

3. **Add orchestrator monitoring**
   - Monitor should check if orchestrator is running
   - Alert if orchestrator crashes
   - Auto-restart if needed

### Phase 3: Improve Resilience (Long-term)

1. **Add health checks**
   - Orchestrator heartbeat
   - Agent spawning metrics
   - Task processing rate

2. **Add auto-recovery**
   - Restart orchestrator if crashed
   - Retry failed tasks automatically
   - Unblock tasks if dependencies resolved

3. **Add observability**
   - Dashboard showing orchestrator status
   - Metrics on task processing
   - Alerts for stuck states

## Verification Steps

After implementing fixes, verify:

1. **Orchestrator is running**
   ```bash
   docker exec hephaestus-server ps aux | grep orchestrator
   ```

2. **Agents are being spawned**
   ```bash
   docker exec hephaestus-server tmux -S /tmp/tmux-shared/default list-sessions
   # The server uses a shared tmux socket, so you must pass -S /tmp/tmux-shared/default
   # Should see agent_* sessions
   ```

3. **Tasks are being processed**
   ```sql
   SELECT status, COUNT(*) FROM tasks GROUP BY status;
   # Should see "working" and "done" increasing
   ```

4. **No stuck states**
   ```bash
   docker exec hephaestus-app tail -f /app/logs/monitor.log | grep STUCK
   # Should not see repeated stuck warnings
   ```

## Files to Check

1. **Orchestrator code**: `src/orchestration/orchestrator.py`
2. **Server startup**: `run_server.py`
3. **Docker compose**: `docker-compose.yml`
4. **Monitor code**: `src/monitoring/monitor.py`
5. **MCP tools**: `src/mcp/tools/`

## Next Steps

**CRITICAL**: The system cannot progress until an orchestrator is running!

Choose one of the solutions above and implement it immediately. Without an orchestrator:
- No agents will be spawned
- No tasks will be processed
- System will remain completely idle
- All pending work will sit forever

**Recommended**: Add orchestrator as a background thread in `run_server.py` so it starts automatically with the MCP server.
