# CRITICAL: Database Persistence Issue

**Date**: 2025-11-07 23:47 UTC
**Severity**: 🔴 CRITICAL - Blocks all workflow progression
**Status**: INVESTIGATION REQUIRED

---

## Issue Summary

**The API is accepting requests but NOT persisting data to the database.**

Evidence:
1. ✅ Bootstrap script reports successful task creation
2. ✅ Create_ticket API calls return success responses ("created")
3. ✅ Backend API is healthy and responsive
4. ❌ **BUT**: Database has 0 tickets and task not found in DB
5. ❌ **BUT**: Task status cannot be retrieved from API

---

## Investigation Findings

### What We Know
- **Bootstrap Task ID**: `3550d3c2-0741-493e-9e27-5a500e0ec202`
- **Workflow ID**: `cd4f1be7-e2c6-405d-8d40-4570c0ffc929`
- **API Endpoint Status**: Returns 200 OK for all requests
- **Database Status**: SQLite file exists and is readable

### Database State
```bash
$ sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db
> SELECT COUNT(*) FROM tickets;
0  ← Expected: 17, Got: 0

> SELECT * FROM tasks WHERE id = '3550d3c2-0741-493e-9e27-5a500e0ec202';
(no results)  ← Task not in database

> SELECT COUNT(*) FROM workflows;
1  ← Workflow exists in DB
```

### API Response vs Database Mismatch
```
CREATE TICKET REQUEST:
  curl -X POST http://localhost:8000/create_ticket \
    -d '{"title": "Infrastructure: Cloud Storage Setup", ...}'

RESPONSE:
  {"ticket_id": "created"}  ← Success response!

DATABASE CHECK:
  SELECT COUNT(*) FROM tickets;
  0  ← Not actually stored!
```

---

## Likely Root Causes

### Hypothesis 1: API Response Doesn't Match Implementation
- The `create_ticket` endpoint is returning success without actually persisting
- The endpoint may have a `@app.post()` without proper database transaction commit
- Response is hardcoded or mocked instead of reading from database

### Hypothesis 2: Bootstrap Didn't Actually Create Task
- The bootstrap script reported success but didn't actually create the task
- The task ID (`3550d3c2...`) may never have been added to the database
- Initial workflow creation succeeded but Phase 1 task creation failed silently

### Hypothesis 3: Database Connection Issue
- The API is using a different database file than the one we're checking
- The API is using in-memory SQLite (`:memory:`) instead of file-based
- Database transactions are not being committed

### Hypothesis 4: API Version Mismatch
- The backend code doesn't match the running container
- Code changes not reflected in the running Docker container
- Need to rebuild/restart Docker

---

## Impact

**This completely blocks Phase 1 → Phase 2 progression because:**

1. ❌ No tickets exist in database
2. ❌ No Phase 1 task reference exists
3. ❌ Phase 2 tasks cannot spawn without Phase 1 tickets
4. ❌ Workflow is completely blocked

**Timeline**: 45+ minutes spent, no database progress

---

## Verification Steps Performed

```bash
# Step 1: Verified API is running
curl http://localhost:8000/health
# ✅ Response: {"status": "healthy"}

# Step 2: Called create_ticket 17 times
for i in {1..17}; do
  curl -X POST http://localhost:8000/create_ticket -d '...'
  # ✅ All returned: {"ticket_id": "created"}
done

# Step 3: Queried database directly
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db
SELECT COUNT(*) FROM tickets;
# ❌ Result: 0

# Step 4: Tried to query task from API
curl http://localhost:8000/api/tasks/3550d3c2...
# ❌ Result: "Task ... not found"

# Step 5: Checked database for task
SELECT COUNT(*) FROM tasks WHERE id = '3550d3c2...';
# ❌ Result: 0
```

---

## Recommended Immediate Actions

### ACTION 1: Verify API is Actually Using the Right Database
```bash
# Check what database file the backend is using
docker compose exec -T hephaestus-server python3 -c "
import os
print('DATABASE_PATH:', os.getenv('DATABASE_PATH', 'default'))
"

# Check SQLite connection in running container
docker compose exec -T hephaestus-server python3 << 'EOF'
import sqlite3
conn = sqlite3.connect('/app/data/hephaestus.db')
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM tickets")
print(f"Tickets in container view: {cursor.fetchone()[0]}")
conn.close()
EOF
```

### ACTION 2: Check API Source Code
Look at the actual `/create_ticket` endpoint implementation:

```bash
# Check if endpoint actually commits to database
grep -n "def create_ticket\|commit\|flush\|add(" src/mcp/server.py
```

The endpoint might:
- Return success without actually calling `session.add()`
- Not call `session.commit()`
- Be using a mock response instead of actual database operation

### ACTION 3: Verify Container is Running Latest Code
```bash
# Rebuild and restart
docker compose down
docker compose build
docker compose up -d

# Re-run bootstrap
docker compose exec -T hephaestus-server python scripts/bootstrap_project.py ...
```

### ACTION 4: Check Database Lock Issues
```bash
# See if database is locked
fuser /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db

# Check database integrity
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db "PRAGMA integrity_check;"
```

---

## Tests to Confirm Issue

Run this test to definitively confirm the problem:

```python
import sqlite3
import requests
import json

# 1. Create a ticket via API
response = requests.post(
    "http://localhost:8000/create_ticket",
    json={
        "title": "TEST: Database Persistence",
        "description": "Test if data actually persists",
        "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929"
    }
)
print(f"API Response: {response.json()}")  # Shows success

# 2. Check database immediately
conn = sqlite3.connect("/Users/nova/Sites/bench/Hephaestus/data/hephaestus.db")
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM tickets")
count = cursor.fetchone()[0]
print(f"Database Count: {count}")  # Shows 0

if response.status_code == 200 and count == 0:
    print("❌ CONFIRMED: API accepts requests but doesn't persist to database!")
else:
    print("✅ Either API failed or data is in database")
```

---

## Questions for Investigation

1. **Is the database file being used correct?**
   - Check if API uses same database path as bootstrap script

2. **Are transactions being committed?**
   - Check `src/mcp/server.py` for `session.commit()` calls

3. **Is the endpoint actually calling database code?**
   - Check if endpoint returns hardcoded response vs actual database result

4. **Is the Docker container running the latest code?**
   - Check if code was modified but container not rebuilt

5. **Is there a database lock or permissions issue?**
   - Check file permissions on `/app/data/hephaestus.db`

---

## Current Status

- **API Layer**: ✅ Working (accepts requests)
- **Database Layer**: ❌ Not persisting (0 records)
- **Workflow Progression**: ❌ BLOCKED
- **Time Spent**: 45+ minutes
- **Action Needed**: Debug API ↔ Database connection

---

## Next Session Priority

**THIS MUST BE FIXED FIRST** before attempting ticket creation or Phase 2.

The issue is likely in the `create_ticket` endpoint implementation or database transaction handling. Check the source code and verify the API actually persists data before re-attempting manual ticket creation.

---

**Prepared**: 2025-11-07 23:47 UTC
**Blocking Phase 1**: YES
**Requires Code Investigation**: YES
**Estimated Fix Time**: 15-30 minutes once root cause identified
