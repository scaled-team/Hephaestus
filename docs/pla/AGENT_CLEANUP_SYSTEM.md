# Agent Cleanup & Self-Healing System

## Overview

The Hephaestus monitoring system now includes automated cleanup and self-healing capabilities to handle stale agent records and orphaned tmux sessions. This prevents the system from getting stuck with "ghost agents" that appear to be running but are actually terminated.

## Problems Solved

### Problem 1: Stale Agent Records
**Symptom**: Agents marked as "working" or "idle" in the database, but their tmux sessions don't exist.

**Cause**: Agent processes terminated unexpectedly (crash, kill signal, container restart) without updating the database.

**Impact**: 
- Monitor wastes resources analyzing non-existent agents
- System appears to have active agents when it doesn't
- Can prevent new agents from being spawned

**Solution**: Automated detection and status update to "terminated"

### Problem 2: Orphaned Tmux Sessions
**Symptom**: Agents marked as "terminated" in the database, but their tmux sessions still exist showing "> Killed" status.

**Cause**: Agent termination updated the database but didn't clean up the tmux session.

**Impact**:
- Clutters tmux session list
- Confuses users who see "Killed" agents
- Wastes system resources

**Solution**: Automated detection and tmux session cleanup

### Problem 3: SQLAlchemy Session Isolation
**Symptom**: SQLAlchemy queries return 0 results while raw SQL shows data exists.

**Cause**: SQLAlchemy sessions cache data and don't automatically see changes made by other processes or raw SQL.

**Impact**:
- Application code can't see database updates
- Cleanup scripts fail to find agents
- Monitor can't detect agents

**Solution**: Added `expire_on_commit=False` to sessionmaker and `session.expire_all()` before queries

## Automated Cleanup System

### Monitor Integration

The monitor now runs automated cleanup every **5 minutes** as part of its monitoring cycle.

**Location**: `src/monitoring/monitor.py` - `_cleanup_stale_agents()` method

**What it does**:
1. **Detects stale agents**: Finds agents marked as working/idle but with missing tmux sessions
2. **Updates database**: Marks stale agents as "terminated"
3. **Kills orphaned sessions**: Finds terminated agents with running tmux sessions and kills them
4. **Logs all actions**: Provides detailed logging for troubleshooting

**Configuration**:
```python
self.cleanup_interval_minutes = 5  # Run cleanup every 5 minutes
```

### Manual Cleanup Script

For immediate cleanup, use the audit script:

```bash
# Dry run (shows what would be done)
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py

# Fix stale agents and orphaned sessions
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py --fix --force
```

**Quick cleanup script**:
```bash
./scripts/cleanup_stale_agents_now.sh
```

## How It Works

### Detection Logic

#### Stale Agent Detection
```python
# Find agents marked as working/idle but with missing tmux sessions
SELECT id, status, tmux_session_name, agent_type
FROM agents
WHERE status IN ('working', 'idle', 'pending', 'assigned')

# For each agent:
if tmux_session_name not in active_tmux_sessions:
    # Mark as terminated
    UPDATE agents SET status = 'terminated' WHERE id = ?
```

#### Orphaned Session Detection
```python
# Find terminated agents with running tmux sessions
SELECT id, tmux_session_name, agent_type
FROM agents
WHERE status = 'terminated' AND tmux_session_name IS NOT NULL

# For each agent:
if tmux_session_name in active_tmux_sessions:
    # Kill the tmux session
    session.kill_session()
```

### Cleanup Flow

```
Monitor Cycle (every 30 seconds)
    ↓
Check if 5 minutes passed since last cleanup
    ↓
Run _cleanup_stale_agents()
    ↓
    ├─→ Get all active tmux sessions
    ├─→ Query database for non-terminated agents
    ├─→ Find agents with missing tmux sessions → Mark as terminated
    ├─→ Query database for terminated agents
    └─→ Find terminated agents with tmux sessions → Kill sessions
```

## Logging

All cleanup actions are logged with the `[CLEANUP]` prefix:

```
[CLEANUP] Terminated stale agent b1f3b0dd... (diagnostic, was working) - tmux session agent_b1f3b0dd_r not found
[CLEANUP] Cleaned up 1 stale agent(s)
[CLEANUP] Killed orphaned tmux session 'agent_d2105255' for terminated agent d2105255... (phase)
[CLEANUP] Killed 1 orphaned tmux session(s)
```

## SQLAlchemy Session Fix

### Changes Made

**File**: `src/core/database.py`

```python
# Before
self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

# After
self.SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=self.engine,
    expire_on_commit=False  # Prevents cached objects from being expired after commit
)
```

**File**: `src/agents/manager.py` - `get_active_agents()` method

```python
def get_active_agents(self) -> List[Agent]:
    session = self.db_manager.get_session()
    try:
        # Expire all cached objects to ensure we get fresh data from database
        session.expire_all()
        
        agents = session.query(Agent).filter(
            Agent.status != "terminated"
        ).all()
        return agents
    finally:
        session.close()
```

## Testing

### Verify Cleanup is Working

1. **Check monitor logs**:
```bash
docker exec hephaestus-app tail -f /app/logs/monitor.log | grep CLEANUP
```

2. **Run audit script**:
```bash
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py
```

3. **Check for stale agents**:
```bash
docker exec hephaestus-server python3 -c "
from src.core.database import DatabaseManager, Agent
db = DatabaseManager('/app/data/hephaestus.db')
session = db.get_session()
session.expire_all()
agents = session.query(Agent).filter(Agent.status != 'terminated').all()
print(f'Active agents: {len(agents)}')
session.close()
"
```

4. **Check for orphaned tmux sessions**:
```bash
docker exec hephaestus-server tmux -S /tmp/tmux-shared/default list-sessions
```

### Expected Behavior

- **No stale agents**: All agents in database should have valid tmux sessions or be marked as terminated
- **No orphaned sessions**: All tmux sessions should belong to active agents (except `hephaestus_keepalive`)
- **Cleanup runs every 5 minutes**: Check logs for `[CLEANUP]` messages
- **SQLAlchemy sees current data**: Queries should return same results as raw SQL

## Troubleshooting

### Issue: Cleanup not running

**Check**:
```bash
docker exec hephaestus-app tail -n 100 /app/logs/monitor.log | grep -E "CLEANUP|Trajectory monitoring"
```

**Solution**: Restart monitor
```bash
docker compose restart hephaestus-app
```

### Issue: Stale agents still exist

**Check**:
```bash
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py
```

**Solution**: Run manual cleanup
```bash
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py --fix --force
```

### Issue: SQLAlchemy not seeing data

**Check**:
```bash
# Compare SQLAlchemy vs raw SQL
docker exec hephaestus-server python3 -c "
from src.core.database import DatabaseManager, Agent
import sqlite3

db = DatabaseManager('/app/data/hephaestus.db')
session = db.get_session()
session.expire_all()
sqlalchemy_count = session.query(Agent).count()
session.close()

conn = sqlite3.connect('/app/data/hephaestus.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM agents')
raw_count = cursor.fetchone()[0]
conn.close()

print(f'SQLAlchemy: {sqlalchemy_count}')
print(f'Raw SQL: {raw_count}')
print(f'Match: {sqlalchemy_count == raw_count}')
"
```

**Solution**: Ensure `session.expire_all()` is called before queries

## Configuration

### Cleanup Interval

To change how often cleanup runs, edit `src/monitoring/monitor.py`:

```python
# In Monitor.__init__()
self.cleanup_interval_minutes = 5  # Change this value
```

### Disable Cleanup

To temporarily disable automated cleanup:

```python
# In Monitor._monitoring_cycle(), comment out:
# await self._cleanup_stale_agents()
```

## Future Improvements

1. **Configurable cleanup interval**: Move to config file
2. **Cleanup metrics**: Track how many agents/sessions cleaned over time
3. **Alert on excessive cleanup**: Warn if too many stale agents detected (indicates systemic issue)
4. **Graceful agent shutdown**: Ensure agents always update database before terminating
5. **Health check endpoint**: API endpoint to check for stale agents

## Related Files

- `src/monitoring/monitor.py` - Automated cleanup in monitoring loop
- `src/agents/manager.py` - SQLAlchemy session fix
- `src/core/database.py` - Session configuration
- `scripts/audit_and_fix_agents.py` - Manual cleanup script
- `scripts/cleanup_stale_agents_now.sh` - Quick cleanup wrapper
