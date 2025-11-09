# Deep Review: Why Ticket Updates Aren't Working in MCP

## 🔴 CRITICAL ISSUE FOUND

The agent completes work but **tickets are not updating** because the MCP tool handler is missing a required parameter.

---

## THE PROBLEM

### Line 4726 in `src/mcp/server.py`:

```python
result = await TicketService.change_ticket_status(
    ticket_id=arguments.get("ticket_id"),
    new_status=arguments.get("new_status"),
    agent_id=arguments.get("agent_id", "mcp-claude")
)
```

### What the method REQUIRES (Line 643 in `src/services/ticket_service.py`):

```python
async def change_status(
    ticket_id: str,
    agent_id: str,
    new_status: str,
    comment: str,           # ⚠️ REQUIRED - NOT OPTIONAL!
    commit_sha: Optional[str] = None,
) -> Dict[str, Any]:
```

### The Issue:
- **Missing Parameter**: `comment` is **REQUIRED** but **NOT PROVIDED** by MCP handler
- **Result**: Function call fails silently or throws an error
- **Impact**: Ticket status never updates despite agent completing the work

---

## CALL FLOW ANALYSIS

### How It Should Work:

```
1. Agent completes work
   └─ Calls: update_ticket_status MCP tool

2. MCP Server receives call (line 4722)
   ├─ tool_name == "update_ticket_status"
   └─ Arguments: ticket_id, new_status, agent_id, comment

3. Handler calls TicketService.change_status (line 4726)
   ├─ ticket_id ✅ PROVIDED
   ├─ agent_id ✅ PROVIDED
   ├─ new_status ✅ PROVIDED
   ├─ comment ❌ MISSING! (REQUIRED)
   └─ commit_sha (optional)

4. If comment missing:
   ├─ Function fails with TypeError
   ├─ Error not properly handled
   ├─ Ticket NOT updated
   └─ Agent unaware of failure
```

### What Actually Happens:

```
Agent completes task
  ↓
Calls: update_ticket_status tool
  ↓
MCP handler receives: {ticket_id, new_status, agent_id}
  ↓
Calls change_status without 'comment' parameter
  ↓
❌ FAILS: Missing required parameter 'comment'
  ↓
Ticket status UNCHANGED
  ↓
Agent thinks update worked but it didn't
```

---

## ROOT CAUSE ANALYSIS

### What's Missing:

1. **No `comment` parameter in MCP handler call**
   - Line 4726: Should pass `comment=arguments.get("comment", "Status updated by agent")`
   - Currently: Only passes 3 parameters when 4 are required

2. **No error handling**
   - MCP handler doesn't catch TypeError or ValueError
   - If comment is missing, exception is not properly propagated to agent

3. **No logging of the failure**
   - Agent has no way to know the update failed
   - Silently continues as if ticket was updated

---

## THE FIX

### Current Code (BROKEN):
```python
elif tool_name == "update_ticket_status":
    from src.services.ticket_service import TicketService

    result = await TicketService.change_ticket_status(  # ❌ Missing 'comment' param
        ticket_id=arguments.get("ticket_id"),
        new_status=arguments.get("new_status"),
        agent_id=arguments.get("agent_id", "mcp-claude")
    )
    return {"success": True, "result": result}
```

### Fixed Code (WORKING):
```python
elif tool_name == "update_ticket_status":
    from src.services.ticket_service import TicketService

    ticket_id = arguments.get("ticket_id")
    new_status = arguments.get("new_status")
    agent_id = arguments.get("agent_id", "mcp-claude")
    comment = arguments.get("comment", "Status updated by agent")  # ✅ Add default comment

    if not ticket_id:
        raise HTTPException(status_code=400, detail="ticket_id is required")
    if not new_status:
        raise HTTPException(status_code=400, detail="new_status is required")

    try:
        result = await TicketService.change_status(  # ✅ Now includes all required params
            ticket_id=ticket_id,
            agent_id=agent_id,
            new_status=new_status,
            comment=comment,  # ✅ REQUIRED parameter now provided
            commit_sha=arguments.get("commit_sha")
        )

        if result.get("success"):
            return {"success": True, "result": result}
        else:
            return {"success": False, "error": result.get("message", "Unknown error"), "result": result}
    except ValueError as e:
        logger.error(f"Validation error updating ticket {ticket_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## WHY THIS WASN'T CAUGHT

### Testing Gaps:

1. **No MCP Integration Tests**
   - Tests don't verify that agents calling MCP tools actually update tickets
   - Missing end-to-end test: agent → MCP tool → ticket update

2. **No Error Propagation**
   - If TypeError occurs, it's not logged properly
   - No error message reaches the agent

3. **Silent Failures**
   - Even if function fails, MCP handler might still return success
   - Agent has no way to know the update failed

---

## METHOD SIGNATURE REFERENCE

### `TicketService.change_status()` (Line 643)

**Required Parameters:**
- `ticket_id` (str): ID of the ticket to update
- `agent_id` (str): ID of the agent making the change
- `new_status` (str): New status to move to (must be valid per board config)
- `comment` (str): **REQUIRED** - Explanation for status change

**Optional Parameters:**
- `commit_sha` (Optional[str]): Commit SHA to link with status change

**Returns:**
```python
{
    "success": bool,
    "ticket_id": str,
    "old_status": str,
    "new_status": str,
    "message": str,
    "blocked": bool,  # If ticket is blocked
    "blocking_ticket_ids": List[str],
    "blocking_tickets": List[str],
}
```

**Raises:**
- `ValueError`: If ticket not found, invalid status, or ticket is blocked

---

## IMPACT ASSESSMENT

### Current Broken State:
- ✅ Agents complete work
- ✅ Agents call MCP tool to update ticket
- ❌ Ticket status DOES NOT update
- ❌ Agent unaware of failure
- ❌ Work appears incomplete in tracking system

### After Fix:
- ✅ Agents complete work
- ✅ Agents call MCP tool to update ticket
- ✅ Ticket status UPDATES correctly
- ✅ Agent receives success confirmation
- ✅ Work properly tracked in system

---

## RELATED ISSUES TO CHECK

### 1. Agent-Side MCP Call
Check what parameters agents are sending to the tool:

**File**: Look in agent prompts for how they call `update_ticket_status`

**Expected**: Should include or allow comment parameter:
```json
{
    "tool": "update_ticket_status",
    "ticket_id": "...",
    "new_status": "done",
    "comment": "Implementation complete, all tests passing"
}
```

### 2. MCP Tool Definition
Check the tool definition that agents see:

**File**: Around line 4637 in `src/mcp/server.py`

**Verify**: Tool schema clearly states `comment` is required

### 3. Error Handling in Monitoring
Check if monitoring catches the update failures:

**File**: `src/monitoring/` directory

**Verify**: Monitor logs show ticket update attempts and results

---

## VERIFICATION CHECKLIST

After applying the fix, verify:

- [ ] `comment` parameter is extracted from arguments
- [ ] Default comment provided if not supplied: `"Status updated by agent"`
- [ ] Proper validation of required fields (ticket_id, new_status)
- [ ] Error handling with proper HTTP status codes
- [ ] Logging of success and failures
- [ ] Agent receives proper success/failure response
- [ ] Ticket status actually updates in database
- [ ] Test with agent completing a task

---

## TEST CASE

Create test to verify ticket updates work:

```python
# In tests/test_mcp_ticket_update.py

@pytest.mark.asyncio
async def test_update_ticket_status_via_mcp():
    """Verify agents can update ticket status via MCP."""

    # 1. Create ticket
    ticket = create_test_ticket(status="in_progress")

    # 2. Simulate agent calling MCP tool
    response = await client.post(
        "/tools/execute",
        json={
            "tool_name": "update_ticket_status",
            "arguments": {
                "ticket_id": ticket.id,
                "new_status": "done",
                "agent_id": "test-agent",
                "comment": "Task completed successfully"
            },
            "headers": {"X-Agent-ID": "test-agent"}
        }
    )

    # 3. Verify response
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # 4. Verify ticket actually updated
    updated_ticket = db.query(Ticket).filter_by(id=ticket.id).first()
    assert updated_ticket.status == "done"
    assert updated_ticket.completed_at is not None
```

---

## SUMMARY

| Issue | Cause | Impact | Fix |
|-------|-------|--------|-----|
| Ticket not updating | Missing `comment` parameter in MCP handler | Agent work not tracked | Add `comment=arguments.get("comment", default)` |
| Silent failures | No error handling | Agent unaware of failure | Add try-catch with proper logging |
| No validation | Missing parameter checks | Invalid tickets updated | Validate ticket_id and new_status |
| No agent feedback | Exception not returned | Agent can't debug | Return proper error responses |

**Timeline to Fix:** ~30 minutes
**Risk Level:** Low (just adding missing parameter and error handling)
**Priority:** Critical (affects all agent ticket tracking)
