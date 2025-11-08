# Next Session Checklist - Fix Database Persistence Issue

**Critical Issue**: API persistence broken - must fix before proceeding
**Estimated Fix Time**: 20-30 minutes
**Status**: Documented, ready for action

---

## Pre-Session Verification

- [ ] Docker Compose services running: `docker compose ps`
- [ ] Backend API healthy: `curl http://localhost:8000/health`
- [ ] Database file exists: `ls -la data/hephaestus.db`

---

## Step 1: Investigate create_ticket Endpoint (10 min)

### 1A: Review Source Code
```bash
# Find create_ticket endpoint implementation
grep -n "def create_ticket" src/mcp/server.py

# Check for session.commit() in the endpoint
grep -A 30 "def create_ticket" src/mcp/server.py | grep -E "commit|flush|add|return"
```

**What to look for**:
- [ ] Does endpoint call `session.add()`?
- [ ] Does endpoint call `session.commit()`?
- [ ] Is response hardcoded or from database?

### 1B: Check Database Configuration
```bash
# Check what database path API uses
grep -n "database\|DATABASE\|db_path\|DB_PATH" src/mcp/server.py | head -20

# Check environment variables
docker compose exec -T hephaestus-server env | grep -i database
```

**What to look for**:
- [ ] Is API using correct database path?
- [ ] Is it using `:memory:` instead of file?
- [ ] Are env vars pointing to right location?

---

## Step 2: Test Database Persistence (5 min)

### 2A: Direct Database Write Test
```bash
# Create test record directly in DB
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db << 'SQL'
INSERT INTO tickets (id, title, workflow_id, status) 
VALUES ('test-ticket', 'Test Ticket', 'cd4f1be7-e2c6-405d-8d40-4570c0ffc929', 'backlog');
SELECT COUNT(*) FROM tickets;
SQL
```

**Expected**: Should show 1 (or higher if tickets exist)

### 2B: API Persistence Test
```bash
# Call API to create ticket
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: test" \
  -d '{
    "title": "Test API Persistence",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929"
  }'

# Check database immediately
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db \
  "SELECT COUNT(*) FROM tickets;"
```

**Expected**: Count should increase by 1

**If not increasing**:
- [ ] API has persistence bug
- [ ] Need to check session.commit()
- [ ] May need to rebuild Docker

---

## Step 3: Fix the Issue

### Option A: Add Missing Commit (Most Likely)
1. Open `src/mcp/server.py`
2. Find `create_ticket` endpoint
3. Add `session.commit()` after `session.add(ticket)`
4. Test again

### Option B: Rebuild Docker
```bash
docker compose down
docker compose build
docker compose up -d
```

### Option C: Check Database Path
If API uses different database path than expected:
1. Check env var `DATABASE_PATH`
2. Verify it points to `/app/data/hephaestus.db`
3. Update if needed
4. Rebuild

---

## Step 4: Verify Fix Works

```bash
# Run the persistence test again (Step 2B)
# Should now show count increasing

# Then run manual ticket creation (all 17 tickets)
# See MANUAL_TICKET_CREATION_GUIDE.md for full commands

# Quick version:
for i in {1..17}; do
  curl -s -X POST http://localhost:8000/create_ticket ...
done

# Verify all created:
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db \
  "SELECT COUNT(*) FROM tickets;"
# Expected: 17 or more
```

---

## Step 5: Resume Ticket Creation

Once database is fixed:
1. Run all curl commands from `MANUAL_TICKET_CREATION_GUIDE.md`
2. Verify count increased to 17
3. Mark task as done
4. Verify Phase 2 tasks spawn

---

## Success Criteria

- [ ] API persistence test succeeds
- [ ] Ticket count increases in database after API call
- [ ] 17 tickets created and verified in database
- [ ] Task 3550d3c2 marked as "done"
- [ ] Phase 2 tasks spawn automatically
- [ ] Workflow progresses from Phase 1 → Phase 2

---

## Files Available for This Session

| File | Purpose |
|------|---------|
| CRITICAL_DATABASE_ISSUE.md | Investigation procedures and root causes |
| MANUAL_TICKET_CREATION_GUIDE.md | Ready-to-execute curl commands (17 tickets) |
| SESSION_COMPLETION_SUMMARY.md | Full session analysis and findings |
| BOOTSTRAP_SESSION_ANALYSIS.md | Agent planning loop documentation |

---

## Rollback Plan

If fixing breaks something:
```bash
# Revert changes
git checkout src/mcp/server.py

# Restart services
docker compose down
docker compose up -d

# Verify health
curl http://localhost:8000/health
```

---

## Expected Timeline

1. Pre-checks: 2 minutes
2. Investigate code: 5 minutes
3. Test persistence: 5 minutes
4. Fix issue: 5-10 minutes
5. Verify fix: 5 minutes
6. Create tickets: 5 minutes
7. Mark complete: 2 minutes

**Total: 30-45 minutes**

---

## Notes for Next Session

- The agent planning loop is secondary - fix database first
- Agent is stuck in planning loop but analysis was successful
- All 17 ticket definitions are ready in curl format
- No code changes needed except database persistence fix

Good luck! 🚀

