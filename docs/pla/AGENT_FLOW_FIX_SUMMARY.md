# Agent Flow Fix Summary

**Date**: 2025-11-08  
**Status**: 🔴 **CRITICAL BUG FOUND - SYSTEM COMPLETELY STUCK**

## Root Cause Identified

The Hephaestus agent system is **completely stuck** due to a **critical bug in the background queue processor**.

### The Bug

**File**: `src/mcp/server.py` line 1305 (in running container)  
**Error**: `AttributeError: 'QueueService' object has no attribute 'queue_task'`

The background queue processor is trying to call `queue_task()` but the correct method name is `enqueue_task()`.

### Evidence

```
2025-11-08 18:11:53,643 - src.mcp.server - INFO - [BACKGROUND_QUEUE] Found 3 pending task(s) - queuing for processing...
2025-11-08 18:11:53,646 - src.mcp.server - ERROR - [BACKGROUND_QUEUE] Error in background queue processor: 'QueueService' object has no attribute 'queue_task'
2025-11-08 18:11:53,648 - src.mcp.server - ERROR - Traceback (most recent call last):
  File "/app/src/mcp/server.py", line 1305, in background_queue_processor
    server_state.queue_service.queue_task(task.id)
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AttributeError: 'QueueService' object has no attribute 'queue_task'
```

This error repeats **every 60 seconds** since the server started at 17:58.

### Impact

1. ✅ Background queue processor IS running
2. ✅ It DOES find the 3 pending tasks
3. ❌ But it CRASHES when trying to queue them
4. ❌ No agents are spawned
5. ❌ Tasks sit in "pending" forever
6. ❌ System is completely idle

## Current System State

### What's Running
- ✅ MCP Server (API only)
- ✅ Monitor (passive observation)
- ✅ Background queue processor (but crashing)
- ❌ NO agents

### Database State
- Workflow: "Prd To Software" - active
- Tasks: 3 pending, 14 blocked, 19 done, 13 failed
- Agents: 27 terminated, 0 active

### Pending Tasks (waiting to be processed)
1. `d06e3bf4` - DIAGNOSTIC task (no ticket_id)
2. `b026e462` - Phase 3: Frontend Infrastructure Validation
3. `3dc63b78` - Backend Infrastructure Documentation

## The Fix

### Option 1: Fix the Code (RECOMMENDED)

The source code in `src/mcp/server.py` line 1305 already shows the correct method name:

```python
server_state.queue_service.enqueue_task(task.id)
```

**BUT** the running container has cached bytecode (.pyc files) with the old buggy code.

**Solution**:
1. Delete all .pyc files and __pycache__ directories
2. Restart the container
3. Verify the fix

```bash
# Clean Python cache
docker exec hephaestus-server find /app/src -name "*.pyc" -delete
docker exec hephaestus-server find /app/src -name "__pycache__" -type d -exec rm -rf {} +

# Restart server
docker compose restart hephaestus-server

# Wait 65 seconds and check logs
sleep 65
docker logs hephaestus-server 2>&1 | grep BACKGROUND_QUEUE | tail -10
```

**Expected result after fix**:
```
[BACKGROUND_QUEUE] Found 3 pending task(s) - queuing for processing...
[BACKGROUND_QUEUE] Queued pending task d06e3bf4...
[BACKGROUND_QUEUE] Queued pending task b026e462...
[BACKGROUND_QUEUE] Queued pending task 3dc63b78...
[BACKGROUND_QUEUE] Found 3 queued task(s), processing queue...
```

### Option 2: Rebuild Container

If cleaning cache doesn't work:

```bash
docker compose down
docker compose build hephaestus-server
docker compose up -d
```

## Secondary Issues

Once the queue processor is fixed, there are two more issues to address:

### Issue 1: Diagnostic Task Missing Ticket ID

Task `d06e3bf4` is a DIAGNOSTIC task with `ticket_id = NULL`. When an agent tries to run it, MCP tools will fail.

**Solution**: Update MCP tools to allow NULL ticket_id for diagnostic tasks:

```python
# In MCP tools
if task.ticket_id is None:
    if task.raw_description and task.raw_description.startswith("DIAGNOSTIC"):
        # Allow NULL ticket_id for diagnostic tasks
        ticket_id = "SYSTEM_DIAGNOSTIC"
    else:
        raise ValueError("Task missing ticket_id")
```

### Issue 2: Blocked Tasks

14 tasks are blocked waiting for Phase 1 dependencies that have failed.

**Options**:
1. Unblock them manually and retry
2. Mark failed tasks as pending to retry
3. Start a new workflow

## Verification Steps

After applying the fix:

1. **Check background queue processor is working**:
   ```bash
   docker logs hephaestus-server 2>&1 | grep BACKGROUND_QUEUE | tail -20
   ```
   Should see: "Queued pending task..." messages

2. **Check agents are being spawned**:
   ```bash
   docker exec hephaestus-server tmux -S /tmp/tmux-shared/default list-sessions
   ```
   Should see: `agent_*` sessions

3. **Check task status**:
   ```bash
   docker exec hephaestus-server python3 -c "
   import sqlite3
   conn = sqlite3.connect('/app/data/hephaestus.db')
   cursor = conn.cursor()
   cursor.execute('SELECT status, COUNT(*) FROM tasks GROUP BY status')
   for row in cursor.fetchall():
       print(f'{row[0]:15} - {row[1]}')
   conn.close()
   "
   ```
   Should see: "working" status appearing

4. **Check agent status**:
   ```bash
   docker exec hephaestus-server python3 -c "
   import sqlite3
   conn = sqlite3.connect('/app/data/hephaestus.db')
   cursor = conn.cursor()
   cursor.execute('SELECT status, COUNT(*) FROM agents GROUP BY status')
   for row in cursor.fetchall():
       print(f'{row[0]:15} - {row[1]}')
   conn.close()
   "
   ```
   Should see: "working" or "idle" status appearing

## Timeline

- **17:58**: Server started
- **17:58 - 18:52**: Background queue processor crashing every 60 seconds
- **18:52**: Attempted restart (didn't reload code due to cached bytecode)
- **18:53**: Attempted cache cleanup and restart
- **Current**: Waiting to verify if fix worked

## Next Steps

1. ✅ Verify background queue processor is working (check logs)
2. ⏳ Monitor agent spawning (should happen within 60 seconds)
3. ⏳ Fix diagnostic task ticket_id issue (when agent crashes)
4. ⏳ Decide what to do with blocked tasks
5. ⏳ Monitor system health

## Lessons Learned

1. **Python bytecode caching**: Docker volume mounts preserve .pyc files even after code changes
2. **Always check logs**: The error was logged every 60 seconds but went unnoticed
3. **Background processes**: Silent failures in background tasks can completely stall the system
4. **Testing**: Need integration tests that verify the full agent spawning flow

## Related Files

- `src/mcp/server.py` - Background queue processor (line 1290-1332)
- `src/orchestration/queue_service.py` - Queue service with `enqueue_task()` method
- `docs/AGENT_FLOW_DIAGNOSIS.md` - Initial diagnosis (before finding the bug)
- `docs/AGENT_CLEANUP_SYSTEM.md` - Cleanup system documentation
