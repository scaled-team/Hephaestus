# Critical Bugs Found - Deep System Review

**Date**: 2025-11-08 23:58 UTC
**Severity**: CRITICAL - System has 5 blocking issues
**Status**: Issues identified, fixes required

---

## Summary

Deep review of the system identified **5 critical bugs** preventing proper operation:

1. ✅ **QueueService Method Error** - FIXED (previous work)
2. ❌ **Ticket Type Validation Mismatch** - BREAKING
3. ❌ **Monitor Endpoints Return 404** - BREAKING
4. ⚠️ **Frontend JSX Cache Issues** - BLOCKING
5. ❌ **Ticket Creation Default Type Wrong** - BREAKING

---

## Bug #1: Ticket Type Validation Mismatch (CRITICAL)

### Problem
Backend logs show:
```
ERROR - [TICKET_CREATE] ❌ ValueError: Invalid ticket type 'task'.
Allowed types: ['component', 'bug', 'design-revision', 'documentation']
```

### Root Cause Analysis
Three different systems define allowed ticket types differently:

**MCP Server Endpoint** (`src/mcp/server.py`):
```python
ticket_type: str = Field(default="task", description="Type of ticket...")
"enum": ["bug", "feature", "improvement", "task", "spike"]
```

**Phase Manager** (`src/phases/phase_manager.py`):
```python
ticket_types=phases_config.board_config.get('ticket_types', ['task']),
default_ticket_type=phases_config.board_config.get('default_ticket_type', 'task'),
```

**Ticket Service Validation** (`src/services/ticket_service.py`):
```python
allowed_types = [t["id"] if isinstance(t, dict) else t for t in board_config.ticket_types]
# board_config.ticket_types = ['component', 'bug', 'design-revision', 'documentation']
```

### Impact
- **Severity**: CRITICAL
- **Effect**: Phase 2 agents cannot create tickets
- **Status**: BLOCKING workflow execution
- **Error Rate**: 100% of Phase 2 ticket creation attempts

###  Evidence
```
2025-11-08 18:53:02,060 - src.mcp.server - ERROR - [TICKET_CREATE] ❌ ValueError: Invalid ticket type 'task'
```

### Fix Required
Either:
**Option A** (Recommended): Fix MCP server and phase defaults to use valid type
```python
# In src/mcp/server.py
ticket_type: str = Field(default="component", description="...")
"enum": ["component", "bug", "design-revision", "documentation"]

# In src/phases/phase_manager.py
default_ticket_type='component'
```

**Option B**: Add 'task' to board config allowed types
```python
ticket_types=['component', 'bug', 'design-revision', 'documentation', 'task']
```

### Recommended Fix
**Option A** - change defaults from 'task' to 'component' in:
- `src/mcp/server.py` line where default is set
- `src/phases/phase_manager.py` defaults

---

## Bug #2: Monitor Endpoints Return 404 (CRITICAL)

### Problem
Frontend logs show:
```
GET /api/monitor/system HTTP/1.1" 404 Not Found
GET /api/monitor/docker-logs HTTP/1.1" 404 Not Found
```

### Root Cause
These endpoints are not implemented in the API server:
- `/api/monitor/system` - NOT FOUND
- `/api/monitor/docker-logs` - NOT FOUND

But frontend tries to call them repeatedly in SteeringEventsCard and monitoring dashboard

### Evidence
```
INFO:     172.18.0.3:40614 - "GET /api/monitor/docker-logs HTTP/1.1" 404 Not Found
INFO:     172.18.0.3:40626 - "GET /api/monitor/system HTTP/1.1" 404 Not Found
```

### Impact
- **Severity**: CRITICAL
- **Effect**: Monitoring dashboard cannot load system data
- **Performance**: Repeated 404 errors degrade frontend responsiveness
- **User Experience**: Dashboard shows errors instead of data

### Fix Required
Either:
**Option A**: Implement the missing endpoints in src/mcp/server.py
- `GET /api/monitor/system` - Return system metrics
- `GET /api/monitor/docker-logs` - Return Docker container logs

**Option B**: Remove calls to non-existent endpoints from frontend
- Update frontend to not call these endpoints
- Use existing operational endpoints instead

### Recommended Fix
**Option A** - Implement missing monitor endpoints with proper response format

---

## Bug #3: Frontend JSX Vite Cache Issue (CRITICAL)

### Problem
Vite reports:
```
[vite] Pre-transform error: /Users/nova/Sites/bench/Hephaestus/frontend/src/pages/Config.tsx:
Adjacent JSX elements must be wrapped in an enclosing tag. (376:4) and (496:4)
```

But Config.tsx file is only 391 lines - error references line 496 which doesn't exist.

### Root Cause
- Vite holding stale/corrupt cached version of file
- File was modified after initial Vite load
- Cache not invalidated properly
- HMR (Hot Module Replacement) holding old AST

### Evidence
```
File actual length: 391 lines
Error references: 376, 496 lines
Current file appears correct
```

### Impact
- **Severity**: CRITICAL
- **Effect**: Frontend compilation fails
- **Users**: Cannot load config page or any page using Config.tsx
- **Status**: Development server stuck with cache error

### Fix Required
Clear all Vite caches:
```bash
cd frontend
rm -rf node_modules/.vite dist .vite-cache
npm run dev
```

### Recommended Fix
Immediately execute cache clearing commands above

---

## Bug #4: Ticket Creation Type Undefined (SECONDARY)

### Problem
Backend logs show:
```
WARNING - Failed to update ticket status when assigning task: name 'Ticket' is not defined
```

### Root Cause
After ticket creation succeeds, code tries to update ticket status but `Ticket` class not defined in that scope.

### Location
`src/mcp/server.py` - in `create_agent_and_task_for_queue` function when updating ticket status

### Impact
- **Severity**: MEDIUM (not blocking but causes errors)
- **Effect**: Ticket status doesn't update after creation
- **Symptoms**: Kanban board doesn't show ticket after creation

### Fix Required
Import `Ticket` at top of function scope or use proper reference

---

## Bug #5: Docker Build Failure (CRITICAL)

### Problem
Docker build fails with BuildKit executor error:
```
github.com/moby/buildkit/executor/runcexecutor.exitError
github.com/moby/buildkit/executor/runcexecutor.(*runcExecutor).Run
```

### Root Cause
- Build cache corrupted
- Resource exhaustion during build
- Dockerfile or dependency issue

### Impact
- **Severity**: CRITICAL
- **Effect**: Cannot create new Docker images
- **Deployment**: Blocked
- **Testing**: Containerized tests impossible

### Fix Required
```bash
cd /Users/nova/Sites/bench/Hephaestus
docker builder prune --all
docker rmi hephaestus:test || true
docker-compose build --no-cache hephaestus-server
```

---

## System Health Summary

| Component | Status | Impact | Fix Priority |
|-----------|--------|--------|--------------|
| Ticket Type Validation | ❌ BROKEN | Phase 2 cannot create tickets | 1 (CRITICAL) |
| Monitor Endpoints | ❌ MISSING | Dashboard non-functional | 2 (CRITICAL) |
| Frontend JSX Cache | ⚠️ CORRUPTED | Config page broken | 3 (CRITICAL) |
| Ticket Undefined | ⚠️ ERROR | Ticket status not updated | 4 (MEDIUM) |
| Docker Build | ❌ FAILED | Cannot deploy | 5 (CRITICAL) |

---

## Recommended Action Plan

### IMMEDIATE (Now)
1. **Fix Ticket Type Mismatch**:
   ```python
   # src/mcp/server.py - change default from "task" to "component"
   ticket_type: str = Field(default="component", ...)
   # Change enum to match board config
   "enum": ["component", "bug", "design-revision", "documentation"]
   ```

2. **Clear Frontend Cache**:
   ```bash
   cd frontend
   rm -rf node_modules/.vite dist .vite-cache
   ```

3. **Restart Backend**:
   ```bash
   cd /Users/nova/Sites/bench/Hephaestus
   docker-compose restart hephaestus-server
   ```

### SHORT-TERM (Next 30 minutes)
1. Implement missing monitor endpoints
2. Fix Ticket undefined error
3. Clean Docker build cache and rebuild
4. Verify ticket creation works
5. Test full Phase 1→2→3 workflow

### MEDIUM-TERM (This session)
1. Add integration tests for ticket creation
2. Add API endpoint validation
3. Implement proper error messages
4. Add system health monitoring

---

## Files Requiring Changes

### MUST FIX
- `src/mcp/server.py` - Line ~1150 (ticket_type default)
- `src/phases/phase_manager.py` - Lines with 'task' defaults
- `src/services/ticket_service.py` - Optional: add 'task' to allowed_types

### SHOULD IMPLEMENT
- `src/mcp/server.py` - Add monitor endpoints
- `frontend/src/pages/Config.tsx` - Cache issue (delete cache to fix)

### SHOULD FIX
- `src/mcp/server.py` - Import and use Ticket class properly when updating status

---

## Testing Post-Fix

### Test Ticket Creation
```python
# Should return 200 with valid type 'component'
POST /api/tickets/create
{
  "title": "Test Ticket",
  "description": "Test",
  "ticket_type": "component",  # NOT "task"
  "priority": "medium"
}
```

### Test Monitor Endpoints
```bash
curl http://localhost:8000/api/monitor/system
curl http://localhost:8000/api/monitor/docker-logs
```

### Test Full Workflow
1. Create Phase 1 task → tickets created with type 'component'
2. Advance to Phase 2 → Phase 2 agents inherit ticket_id
3. Phase 2 agents can update ticket status
4. Kanban board reflects all updates

---

## Session Conclusion

**Issues Found**: 5 critical bugs identified
**Root Causes**: Configuration mismatches, missing endpoints, cache corruption
**System Status**: ⚠️ DEGRADED - requires immediate fixes
**Estimated Fix Time**: 30-60 minutes for all issues
**Impact If Not Fixed**: Complete workflow blockage

The system needs immediate attention to the ticket type validation issue before Phase 2 agents can proceed with implementation.

---

## Sign-Off

**Review Completed**: 2025-11-08 23:58:30 UTC
**Status**: Critical bugs documented
**Next Step**: Execute recommended fixes
**System Status**: BLOCKED - Requires action
