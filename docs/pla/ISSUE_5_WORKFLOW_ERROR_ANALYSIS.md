# Issue #5: Workflow Error Handling - Comprehensive Analysis

**Status**: IN PROGRESS 🔄
**Priority**: HIGH
**Impact**: CRITICAL
**Estimated Fix Time**: 4-5 hours

---

## Overview

Comprehensive analysis of error handling gaps in the workflow execution system. Identifies where error handling is missing or incomplete and provides fix recommendations.

---

## Key Findings

### ✅ Areas WITH Adequate Error Handling

1. **WorkflowResultService** (`src/services/workflow_result_service.py`)
   - Has try-catch blocks for file validation (lines 65-89)
   - Validates inputs before operations
   - Returns clear error messages on failure
   - Database operations use context managers

2. **WorkflowTerminationHandler** (`src/workflow/termination_handler.py`)
   - Has try-catch block (lines 51-80)
   - Handles agent termination errors gracefully
   - Properly logs errors with context
   - Returns summary of what succeeded/failed

3. **PhaseManager.load_active_workflow()** (`src/phases/phase_manager.py`)
   - Has try-catch for workflow loading (lines 94-100)
   - Logs diagnostic information
   - Has fallback behavior (sets workflow_id even if loading fails)

### ❌ Areas WITH MISSING Error Handling

1. **Agent Execution in AgentManager**
   - `create_agent_for_task()` - No visible try-catch blocks
   - Task execution likely missing error handling
   - No per-task error capture
   - Task status may not be updated on failure

2. **Task Execution Flow**
   - No comprehensive try-catch around task execution
   - Errors may not propagate to task status
   - Agent failures may leave task in "in_progress" state
   - No error message capture for agent troubleshooting

3. **LLM Provider Calls in Conductor**
   - `analyze_system_coherence()` has try-catch (line 95)
   - But only at analysis level
   - Per-task LLM calls may lack error handling
   - Failed LLM calls may not update task state

4. **Monitor/Guardian Loop**
   - Main monitoring loop may lack comprehensive error handling
   - Individual agent monitoring may not catch all errors
   - Missing try-catch in critical paths

---

## Error Handling Gaps

### Gap 1: Task Execution Without Try-Catch

**Location**: `src/agents/manager.py` - `create_agent_for_task()`

**Current Code**:
```python
async def create_agent_for_task(
    self,
    task: Task,
    enriched_data: Dict[str, Any],
    memories: List[Dict[str, Any]],
    project_context: str,
    ...
) -> Agent:
    """Create an agent for a specific task."""
    # No try-catch wrapper
    # If anything fails, agent creation fails silently
    # Task status stays in "in_progress"
```

**Issue**: If agent creation fails, no error is logged to task, task stays in "in_progress" state

**Fix Needed**:
```python
async def create_agent_for_task(...) -> Agent:
    try:
        # Agent creation logic
        return agent
    except Exception as e:
        logger.error(f"Failed to create agent for task {task.id}: {e}", exc_info=True)
        # Update task status
        # Return clear error
        raise
```

### Gap 2: No Task Status Updates on Failure

**Issue**: Task may not have a way to mark itself as "failed" with error message

**Example**:
- Agent crashes → Task stays "in_progress"
- User checks task later → Still shows "in_progress"
- No indication of what went wrong
- Agent is zombie process

**Fix Needed**: All task execution needs:
```python
try:
    result = execute_task()
    task.status = "done"
    task.result = result
except Exception as e:
    task.status = "failed"
    task.error_message = str(e)
    task.error_traceback = traceback.format_exc()
    logger.error(f"Task {task.id} failed: {e}")
```

### Gap 3: Agent Monitoring Without Error Context

**Location**: `src/monitoring/monitor.py`

**Issue**: Main monitoring loop may not catch errors from individual agent checks

**Example**:
```python
# Likely missing try-catch
for agent in agents:
    status = agent.get_status()  # If this fails?
    # No error handling
```

**Fix Needed**:
```python
for agent in agents:
    try:
        status = agent.get_status()
        # Process status
    except Exception as e:
        logger.error(f"Error checking status of agent {agent.id}: {e}")
        # Mark agent as error state
        # Don't crash entire monitoring loop
```

### Gap 4: LLM Call Failures Not Handled

**Location**: `src/monitoring/conductor.py` Line 138

**Current Code**:
```python
gpt5_analysis = await llm_provider.analyze_system_coherence(
    guardian_summaries=guardian_summaries,
    system_goals=system_goals,
)
# What if this fails? No error handling shown
```

**Issue**: LLM calls can timeout, return errors, be rate-limited

**Fix Needed**:
```python
try:
    gpt5_analysis = await llm_provider.analyze_system_coherence(...)
    return gpt5_analysis
except asyncio.TimeoutError:
    logger.error("LLM analysis timed out, using cached analysis")
    return self._get_cached_analysis()
except Exception as e:
    logger.error(f"LLM analysis failed: {e}")
    return self._get_fallback_analysis()
```

### Gap 5: Database Operations Without Validation

**Location**: Various places in workflow code

**Issue**: Database commits may fail (transaction conflicts, deadlocks, connection failures)

**Current Pattern** (BAD):
```python
session.commit()  # What if this fails?
# No rollback, no error logging
```

**Needed Pattern** (GOOD):
```python
try:
    session.commit()
    logger.debug("Database operation succeeded")
except Exception as e:
    session.rollback()
    logger.error(f"Database operation failed: {e}", exc_info=True)
    raise
```

---

## Error Handling Pattern to Apply

### Standard Try-Catch Pattern for Workflow Operations

```python
async def execute_workflow_operation(task: Task) -> Dict[str, Any]:
    """
    Execute a workflow operation with comprehensive error handling.

    Returns:
        Dictionary with success/failure status and details
    """
    error_context = {
        "task_id": task.id,
        "operation": "execute_workflow_operation",
        "start_time": datetime.utcnow(),
    }

    try:
        # Step 1: Validate inputs
        if not task:
            raise ValueError("Task cannot be None")

        # Step 2: Execute operation
        result = await perform_operation(task)

        # Step 3: Validate result
        if not result:
            raise ValueError("Operation returned no result")

        # Step 4: Update database
        task.status = "done"
        task.result = result
        db.commit()

        logger.info(f"Task {task.id} completed successfully")
        return {"success": True, "result": result}

    except ValidationError as e:
        logger.warning(f"Task {task.id} validation failed: {e}")
        task.status = "failed"
        task.error_message = f"Validation failed: {str(e)}"
        db.commit()
        return {"success": False, "error": str(e), "error_type": "validation"}

    except TimeoutError as e:
        logger.error(f"Task {task.id} timed out: {e}")
        task.status = "failed"
        task.error_message = "Operation timed out"
        db.commit()
        return {"success": False, "error": "Timeout", "error_type": "timeout"}

    except DatabaseError as e:
        logger.error(f"Task {task.id} database error: {e}", exc_info=True)
        task.status = "failed"
        task.error_message = "Database operation failed"
        db.rollback()
        return {"success": False, "error": str(e), "error_type": "database"}

    except Exception as e:
        logger.error(f"Task {task.id} unexpected error: {e}", exc_info=True)
        task.status = "failed"
        task.error_message = f"Unexpected error: {str(e)}"
        task.error_traceback = traceback.format_exc()
        try:
            db.rollback()
        except:
            pass  # If rollback fails, log but continue
        return {"success": False, "error": str(e), "error_type": "unexpected"}
```

---

## Files to Fix

### Priority 1: CRITICAL - Task Execution
1. **`src/agents/manager.py`**
   - Wrap `create_agent_for_task()` with try-catch
   - Add error status updates to task
   - Estimated: 1 hour

2. **`src/monitoring/monitor.py`**
   - Wrap main agent monitoring loop with try-catch
   - Per-agent error handling
   - Estimated: 1.5 hours

### Priority 2: HIGH - LLM Operations
3. **`src/monitoring/conductor.py`**
   - Wrap LLM analysis calls with try-catch
   - Add fallback/retry logic
   - Estimated: 1 hour

### Priority 3: MEDIUM - Data Validation
4. **`src/services/queue_service.py`**
   - Ensure database operations have error handling
   - Estimated: 0.5 hours

5. **`src/phases/phase_manager.py`**
   - Enhance existing error handling
   - Estimated: 0.5 hours

---

## Implementation Strategy

### Phase 1: Analysis (COMPLETE ✅)
- Identify gaps (this document)
- Plan fixes

### Phase 2: Implementation (NEXT 🔄)
1. Start with Priority 1 files
2. Apply consistent error handling pattern
3. Add proper logging
4. Test each fix

### Phase 3: Validation
1. Unit test error scenarios
2. Integration test with failing agents
3. Verify task status updates

### Phase 4: Deployment
1. Code review
2. Deploy with monitoring
3. Watch error logs

---

## Logging Standards

All error handling should follow this logging pattern:

```python
# Success
logger.info(f"Operation succeeded: {context}")

# Expected failure (e.g., validation)
logger.warning(f"Operation failed validation: {error_message}")

# Unexpected failure
logger.error(f"Operation failed unexpectedly: {error_message}", exc_info=True)

# Critical failures
logger.critical(f"Critical system failure: {error_message}", exc_info=True)
```

---

## Database Error Handling

All database operations must follow this pattern:

```python
session = db_manager.get_session()
try:
    # Perform operation
    session.add(obj)
    session.commit()
    logger.debug("Database operation succeeded")
    return {"success": True}
except sqlalchemy.exc.IntegrityError as e:
    session.rollback()
    logger.error(f"Integrity error: {e}")
    return {"success": False, "error": "Data integrity violation"}
except sqlalchemy.exc.OperationalError as e:
    session.rollback()
    logger.error(f"Database operational error: {e}")
    return {"success": False, "error": "Database connection failed"}
except Exception as e:
    session.rollback()
    logger.error(f"Unexpected database error: {e}", exc_info=True)
    return {"success": False, "error": "Database operation failed"}
```

---

## Testing Strategy

### Unit Tests Needed
1. Agent creation with mock failure
2. Task status update with DB failure
3. LLM call timeout handling
4. Monitor loop exception handling

### Integration Tests Needed
1. Full workflow with agent failure
2. Task gets marked as failed
3. Error message captured
4. Workflow continues with other tasks

### Manual Tests
1. Kill an agent mid-execution
2. Verify task marked as failed
3. Check error logs
4. Verify error message in task

---

## Success Criteria

✅ **Task Execution**
- All task exceptions caught and logged
- Task status updated to "failed" on error
- Error message captured for debugging

✅ **Agent Monitoring**
- Monitor loop doesn't crash on agent errors
- Errors logged with full context
- Failed agents marked appropriately

✅ **LLM Operations**
- LLM call failures don't crash system
- Fallback behavior implemented
- Clear error messages in logs

✅ **Database Operations**
- All commits wrapped with error handling
- Rollback on failure
- Clear error messages

✅ **Logging**
- All failures logged with exc_info
- Error context captured
- Searchable error messages

---

## Timeline Estimate

| Phase | Time | Status |
|-------|------|--------|
| Analysis | 1 hour | ✅ COMPLETE |
| Agent Fix | 1 hour | 🔄 NEXT |
| Monitor Fix | 1.5 hours | 🔄 NEXT |
| LLM Fix | 1 hour | ⏳ PENDING |
| Data Validation | 1 hour | ⏳ PENDING |
| Testing | 1-2 hours | ⏳ PENDING |
| **TOTAL** | **~7 hours** | **IN PROGRESS** |

---

## Conclusion

The workflow system has several critical gaps in error handling, particularly in:
1. Task execution without per-task error capture
2. Agent monitoring without crash protection
3. LLM calls without timeout/failure handling
4. Database operations without proper rollback

Applying the standard error handling pattern across these areas will significantly improve system reliability and observability.

**Next Step**: Begin implementing fixes starting with `src/agents/manager.py`
