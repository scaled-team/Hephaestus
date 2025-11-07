# Database Initialization Fix Summary

## Problem

The Hephaestus monitoring service was failing with:
```
(sqlite3.OperationalError) no such table: agents
```

## Root Cause Analysis

### Issue 1: Database Not Initialized
The database file existed (652 KB) but had no tables created. The `init_db.py` script needed to be run.

### Issue 2: Wrong Database Path in Monitor
The monitor service (`run_monitor.py`) was using the **DatabaseManager default constructor** without passing the configured database path:

```python
# WRONG:
db_manager = DatabaseManager()  # Uses default "hephaestus.db"
```

This caused it to create and use an empty database at `/app/hephaestus.db` instead of the correct `/app/data/hephaestus.db`.

## Solution

### Step 1: Initialize Database
```bash
docker compose exec hephaestus-server python scripts/init_db.py
```

**Result**: Created all 42 tables in `/app/data/hephaestus.db`

Tables created:
- agents
- tasks
- memories
- agent_logs
- project_context
- workflows
- phases
- phase_executions
- agent_worktrees
- worktree_commits
- validation_reviews
- merge_conflict_resolutions
- agent_results
- workflow_results
- guardian_analyses
- conductor_analyses
- detected_duplicates
- steering_interventions
- diagnostic_runs
- tickets
- ticket_comments
- ticket_history
- ticket_commits
- board_configs
- ticket_fts (and 17 more tables)

### Step 2: Fix Monitor Database Path

**File**: `run_monitor.py:53`

**Before**:
```python
# Initialize database manager
db_manager = DatabaseManager()
logger.info("Database manager initialized")
```

**After**:
```python
# Initialize database manager
db_manager = DatabaseManager(str(config.database_path))
logger.info(f"Database manager initialized: {config.database_path}")
```

**Why This Works**:
- Now uses `config.database_path` from `hephaestus_config.yaml`
- Config has: `database: ./data/hephaestus.db`
- Environment variable override: `DATABASE_PATH=/app/data/hephaestus.db`
- Result: Monitor uses correct `/app/data/hephaestus.db` path

### Step 3: Restart Services
```bash
docker compose restart hephaestus-monitor
```

## Verification

### Before Fix
```
ERROR - Error in monitoring cycle: (sqlite3.OperationalError) no such table: agents
```

### After Fix
```
INFO - Database manager initialized: /app/data/hephaestus.db
INFO - Starting monitoring loop
INFO - Trajectory monitoring 0 active agents
INFO - Found active workflow (cd4f1be7)
✅ No errors
```

## Related Files That May Need Similar Fixes

I checked all other entry points and they either:
1. **Already pass database path correctly**:
   - `run_server.py` - Uses config
   - `run_prd_workflow.py` - Uses config or parameter

2. **Use scripts that already handle environment variables**:
   - `scripts/init_db.py` - Uses `os.getenv("DATABASE_PATH", ...)`
   - `scripts/create_test_tickets.py` - Uses environment variable pattern

**Recommendation**: Audit any other files that directly instantiate `DatabaseManager()` to ensure they pass the database path.

## Testing Commands

### Verify Database Location
```bash
# List tables
docker compose exec hephaestus-server python -c "
import sqlite3
conn = sqlite3.connect('/app/data/hephaestus.db')
cursor = conn.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name')
tables = cursor.fetchall()
print(f'Total tables: {len(tables)}')
for t in tables:
    print(f'  - {t[0]}')
"
```

### Verify Monitor Using Correct Path
```bash
# Check monitor logs
docker compose logs hephaestus-monitor | grep "Database manager initialized"

# Should show:
# Database manager initialized: /app/data/hephaestus.db
```

### Check for Rogue Empty Database Files
```bash
# List all .db files
docker compose exec hephaestus-server find /app -name "*.db" -ls
```

## Prevention

To prevent this issue in the future:

1. **Explicit Path Passing**: Always pass database path explicitly when instantiating DatabaseManager
2. **Config Usage**: Use `config.database_path` from configuration system
3. **Environment Variables**: DatabaseManager should respect `DATABASE_PATH` environment variable
4. **Documentation**: Document that DatabaseManager requires explicit path in Docker environments

## Status: ✅ RESOLVED

- ✅ Database initialized with all 42 tables
- ✅ Monitor service fixed to use correct database path
- ✅ Services restarted and running without errors
- ✅ No empty database files remaining

The Hephaestus monitoring system is now fully operational! 🎉
