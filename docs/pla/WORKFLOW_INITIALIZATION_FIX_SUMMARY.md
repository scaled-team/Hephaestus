# Workflow Initialization & Ticket Listing Fix - Summary

**Date**: November 8, 2025, 01:50 UTC
**Status**: ✅ **FIXED AND VERIFIED**
**Issue**: GET /api/tickets endpoint returning 500 error - "No active workflows found"
**Root Cause**: Database session management and file path mismatch

---

## Problem Statement

The ticket listing endpoint (`GET /api/tickets`) was returning a 500 error with the message:
```
"Could not determine workflow_id: no active workflows found or multiple workflows exist"
```

Even though the server logs showed the workflow was successfully initialized and committed to the database, subsequent queries for active workflows returned empty results.

---

## Root Cause Analysis

### Issue #1: Workflow Status Not Reset on Reuse
**File**: `src/phases/phase_manager.py` (lines 130-141)
**Problem**: When reusing an existing workflow (on service restart), the code updated the `phases_folder_path` and name, but **DID NOT** reset the status to 'active'. If a workflow previously had status='completed' or other values, it would remain in that state and wouldn't be found by queries looking for 'active' or 'paused' workflows.

**Evidence**:
```python
if existing_workflow:
    # ... updates name and phases_folder_path ...
    session.commit()  # ❌ Committed without resetting status!
```

### Issue #2: Database Path Mismatch in Query Function
**File**: `src/core/database.py` (line 1025)
**Problem**: The `get_db()` context manager was using the wrong database file path. It was checking for `HEPHAESTUS_TEST_DB` environment variable and defaulting to `"hephaestus.db"` (relative path), but the actual production database was being stored at `/app/data/hephaestus.db` (as set by the `DATABASE_PATH` environment variable).

**Evidence**:
```python
def get_db(database_path: Optional[str] = None):
    if database_path is None:
        # ❌ Only checks HEPHAESTUS_TEST_DB, ignores DATABASE_PATH
        database_path = os.environ.get("HEPHAESTUS_TEST_DB", "hephaestus.db")
```

**Impact**:
- `phase_manager.initialize_workflow()` wrote to the database at `/app/data/hephaestus.db`
- `get_single_active_workflow()` queried from `./hephaestus.db` (different file!)
- Queries found no workflows because they were looking in the wrong database file

---

## Fixes Applied

### Fix #1: Reset Workflow Status on Reuse
**File**: `src/phases/phase_manager.py` (line 139)
**Change**: Added explicit status reset when reusing a workflow

```python
existing_workflow.status = "active"  # ✅ Reset to active on reuse
session.flush()  # Flush changes
session.commit()  # Commit transaction
```

**Benefit**: Ensures workflows are always 'active' when reused, making them findable by subsequent queries.

### Fix #2: Use DATABASE_PATH Environment Variable
**File**: `src/core/database.py` (lines 1024-1028)
**Change**: Updated `get_db()` to check DATABASE_PATH environment variable

```python
if database_path is None:
    # Check environment variable for test database first
    database_path = os.environ.get("HEPHAESTUS_TEST_DB", None)
    if database_path is None:
        # ✅ Use DATABASE_PATH env var if set (production database path)
        database_path = os.environ.get("DATABASE_PATH", "hephaestus.db")
```

**Benefit**: All database queries now use the same database file that was written to during initialization.

---

## Verification

### Before Fix
```
GET /api/tickets → 500 Error
"Could not determine workflow_id: no active workflows found"
```

### After Fix
```
GET /api/tickets → 200 OK
{
    "success": true,
    "tickets": [],
    "total_count": 0,
    "has_more": false
}
```

### Workflow Initialization Logs
```
✅ Updated workflow with new phases folder path and reset status to 'active'
✅ Workflow ID 5e0ff4b... has status='active' (verified in DB)
```

---

## Technical Details

### Why This Happened

1. **Service Startup Flow**:
   - Server starts and initializes workflow via PhaseManager
   - PhaseManager uses db_manager initialized with correct database path
   - Workflow is created/updated and committed successfully

2. **Request Processing Flow**:
   - Client requests GET /api/tickets
   - Handler calls `get_single_active_workflow()`
   - This function uses `get_db()` context manager (creates new DatabaseManager)
   - New DatabaseManager uses wrong database path
   - Query finds no workflows because it's looking in wrong database

3. **Database Path Configuration**:
   - Docker environment sets: `DATABASE_PATH=/app/data/hephaestus.db`
   - But `get_db()` was defaulting to: `./hephaestus.db` (relative path = `/app/hephaestus.db`)
   - These are different files!

### Session Management Lessons

- Each call to `get_db()` creates a new DatabaseManager instance
- DatabaseManager instances maintain their own SQLAlchemy engine and session factory
- Multiple instances pointing to different database files can cause data consistency issues
- Always use environment variables consistently across all database access points

---

## Files Modified

1. **src/phases/phase_manager.py**
   - Added: `existing_workflow.status = "active"` (line 139)
   - Added: `session.flush()` call (line 140)
   - Enhanced logging (line 145)

2. **src/core/database.py**
   - Fixed: `get_db()` function to check DATABASE_PATH environment variable (lines 1024-1028)
   - Now checks HEPHAESTUS_TEST_DB first (for tests), then DATABASE_PATH (for production)

---

## Testing Performed

✅ Server startup with workflow initialization
✅ GET /api/tickets endpoint returns 200 OK
✅ Health check endpoint operational
✅ Database persistence verified
✅ Workflow status correctly set to 'active'

---

## Production Impact

- **Severity**: HIGH (500 errors on ticket operations)
- **Scope**: Affects all workflow-based ticket operations
- **Risk of Fix**: LOW (minimal changes, well-isolated)
- **Breaking Changes**: NONE

---

## Recommendations

### Short-term
1. ✅ Apply both fixes (completed)
2. ✅ Verify ticket operations work (completed)
3. Test with actual agent ticket creation

### Long-term
1. Refactor `get_db()` to accept database path parameter or use a global database manager
2. Add integration tests for database session consistency across components
3. Document database path configuration requirements in setup guide
4. Add logging for database file path at startup for debugging

---

## Conclusion

The workflow initialization issue was caused by a combination of:
1. Missing workflow status reset on reuse
2. Database path mismatch between initialization and query operations

Both issues have been fixed. The ticket listing endpoint now works correctly, and workflows are properly persisted and retrievable from the database.

Status: **✅ PRODUCTION READY**
