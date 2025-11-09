# Ticket Kanban Board Sync Issue - Root Cause Analysis

**Status**: 🔍 ROOT CAUSE IDENTIFIED
**Severity**: HIGH
**Impact**: Kanban board doesn't reflect agent progress in real-time

---

## Problem Statement

Agents complete work on tasks but **tickets don't move through the Kanban board columns** as they progress through phases. Despite agents completing work:
- Tickets stay in "backlog" status
- Board doesn't show "building" or "building-done" states
- Users can't see progress on the Kanban board
- No visual indication of which component is being worked on

---

## Root Cause: Missing Explicit Instructions

### Discovery Process

1. **Searched for ticket status update calls** in workflow code
   - Found 0 calls to `update_ticket_status` or `change_ticket_status` in phase files

2. **Examined ticket service**
   - Confirmed `change_status()` method exists and works (src/services/ticket_service.py:642-776)
   - Method is fully functional with proper validation and error handling

3. **Reviewed phase definitions**
   - Found "done_definitions" that mention ticket status changes
   - BUT: No explicit MCP tool call instructions for agents

### The Gap

**Phase 2 (Plan & Implementation) - Lines 36:**
```
"Ticket moved from 'backlog' to 'building-done' status"
```

This is a **requirement**, but agents don't have **explicit instructions** on HOW to update the status.

**Phase 1 (Requirements Analysis):**
```
"CRITICAL: ONE Phase 2 Plan & Implementation task created for EVERY ticket"
```

No instruction to update ticket status.

**Phase 3 (Validate & Document):**
```
"Only Phase 5 resolves tickets"
```

No instruction for intermediate status updates.

---

## Solution: Add Explicit Status Update Instructions

The fix requires adding explicit MCP tool call instructions to each phase's workflow notes.

### Phase 1: Requirements Analysis

**Add this section to done_definitions:**
```
"✅ All Phase 1 tasks use mcp__hephaestus__update_ticket_status to mark ticket as created"
```

**Add this to workflow instructions:**
```
# STEP X: UPDATE TICKET STATUS IN KANBAN
After creating each ticket, update its status so the board reflects progress:

```python
# Move ticket to "backlog" status (ready for Phase 2)
mcp__hephaestus__update_ticket_status({
    "ticket_id": "[TICKET ID FROM ABOVE]",
    "new_status": "backlog",
    "agent_id": "[YOUR ACTUAL AGENT ID]",
    "comment": "Ticket created by Phase 1 Requirements Analysis. Ready for Phase 2 design and implementation."
})
```

✅ **After this call**, the Kanban board will show the ticket in the "backlog" column
```

### Phase 2: Plan & Implementation

**Add this section BEFORE design/implementation starts:**
```
# STEP 1B: UPDATE TICKET STATUS TO "building"
As soon as you start work, update the ticket status so the team knows you're working on it:

```python
mcp__hephaestus__update_ticket_status({
    "ticket_id": "[TICKET ID]",
    "new_status": "building",
    "agent_id": "[YOUR ACTUAL AGENT ID]",
    "comment": "Phase 2: Started design and implementation. Working on this component now."
})
```

✅ **After this call**, the Kanban board will show the ticket moved to the "building" column
```

**Add this section when DONE with implementation:**
```
# STEP FINAL: UPDATE TICKET STATUS TO "building-done"
When you've completed design and implementation (all tests passing):

```python
mcp__hephaestus__update_ticket_status({
    "ticket_id": "[TICKET ID]",
    "new_status": "building-done",
    "agent_id": "[YOUR ACTUAL AGENT ID]",
    "comment": "Phase 2: Completed design document and implementation. All tests passing. Ready for Phase 3 validation."
})
```

✅ **After this call**, the Kanban board will show the ticket moved to "building-done" column
✅ **Phase 3** validation task will now begin
```

### Phase 3: Validate & Document

**Add this section when starting validation:**
```
# STEP 1B: UPDATE TICKET STATUS TO "validating"
Update the ticket status to show validation is in progress:

```python
mcp__hephaestus__update_ticket_status({
    "ticket_id": "[TICKET ID]",
    "new_status": "validating",
    "agent_id": "[YOUR ACTUAL AGENT ID]",
    "comment": "Phase 3: Started validation and documentation"
})
```

✅ **After this call**, the Kanban board will show ticket in "validating" column
```

**Add this section when validation complete:**
```
# STEP FINAL: UPDATE TICKET STATUS TO "done"
When validation and documentation are complete:

```python
mcp__hephaestus__update_ticket_status({
    "ticket_id": "[TICKET ID]",
    "new_status": "done",
    "agent_id": "[YOUR ACTUAL AGENT ID]",
    "comment": "Phase 3: Completed validation and documentation. Component ready for release."
})
```

✅ **After this call**, the Kanban board will show ticket in the "done" column
✅ **Workflow complete!**
```

---

## Why This Happens

### Design vs. Reality Gap

1. **Design Intention**: Phase definitions list status transitions as "done_definitions"
   - These are REQUIREMENTS for completion
   - Implies agents SHOULD update status
   - But doesn't explicitly show HOW

2. **Agent Perspective**: Agents execute tasks and complete work
   - No explicit instructions on which MCP tool to call
   - Don't know when/where to update status
   - Complete work but board never updates

3. **User Impact**: Team can't see progress
   - Kanban board is stale
   - No indication which agent is working on what
   - Can't track workflow completion

---

## MCP Tool Reference

The correct MCP tool to call is:

```
mcp__hephaestus__update_ticket_status({
    "ticket_id": string (required),
    "new_status": string (required),
    "agent_id": string (required),
    "comment": string (required)
})
```

**Valid statuses** are configured in BoardConfig.columns for each workflow.

**Typical Kanban columns**:
- `backlog` - Ticket created, waiting to be started
- `building` - Agent actively working on implementation
- `building-done` - Implementation complete, ready for validation
- `validating` - Validation in progress
- `done` - Complete and ready for release

---

## Files to Modify

1. **src/workflow/prd_to_software/phase_1_requirements_analysis.py**
   - Add status update instruction section
   - Show how to move ticket to "backlog" after creation
   - Add to done_definitions: explicit status update requirement

2. **src/workflow/prd_to_software/phase_2_plan_and_implementation.py**
   - Add status update instruction section
   - Show how to move ticket to "building" when starting
   - Show how to move ticket to "building-done" when done
   - Add to done_definitions: explicit status update requirement

3. **src/workflow/prd_to_software/phase_3_validate_and_document.py**
   - Add status update instruction section
   - Show how to move ticket to "validating" when starting
   - Show how to move ticket to "done" when complete
   - Add to done_definitions: explicit status update requirement

---

## Implementation Plan

### Step 1: Update Phase 1 (Requirements Analysis)
- Add done_definition about updating ticket status
- Add workflow instruction section with MCP call example
- Show expected Kanban board result

### Step 2: Update Phase 2 (Plan & Implementation)
- Add done_definition about updating ticket status
- Add "start work" section with MCP call
- Add "work complete" section with MCP call
- Show expected Kanban board progression

### Step 3: Update Phase 3 (Validate & Document)
- Add done_definition about updating ticket status
- Add "start validation" section with MCP call
- Add "validation complete" section with MCP call
- Show expected Kanban board progression

### Step 4: Add Board Configuration Documentation
- Document valid statuses in board configuration
- Show how status transitions work
- Document any blocking rules or validations

### Step 5: Testing
- Run Phase 1 task and verify ticket appears in "backlog"
- Run Phase 2 task and verify ticket moves to "building" then "building-done"
- Run Phase 3 task and verify ticket moves to "validating" then "done"
- Verify Kanban board updates in real-time

---

## Expected Result

After implementation:
- ✅ Phase 1 completes → Ticket visible in "backlog" column
- ✅ Phase 2 starts → Ticket moves to "building" column
- ✅ Phase 2 completes → Ticket moves to "building-done" column
- ✅ Phase 3 starts → Ticket moves to "validating" column
- ✅ Phase 3 completes → Ticket moves to "done" column
- ✅ **Kanban board shows real-time progress of all active work**

---

## Related Issues

This is connected to the earlier fixes we made:

1. **Issue #1 Fix**: MCP ticket update parameter fix
   - Fixed the `comment` parameter being missing
   - Made `update_ticket_status` work correctly
   - **This fix enables the current solution**

2. **Issue #3 Fix**: Request context capture
   - Captures IP/user-agent for security audit
   - Applies to all MCP calls including ticket updates
   - **Ensures audit trail of status changes**

---

## Conclusion

The root cause is **missing explicit instructions**, not a code defect. The infrastructure is in place:
- ✅ `change_status()` method exists and works
- ✅ MCP tool handler is implemented correctly
- ✅ Database can track status changes
- ✅ Board configuration supports multiple columns

**What's missing**: Clear, step-by-step instructions for agents on WHEN and HOW to update ticket status at each phase.

Adding explicit MCP tool calls to the phase definitions will solve the problem and make the Kanban board a real-time reflection of workflow progress.

---

## Implementation Status

- [ ] Phase 1: Add ticket status update instructions
- [ ] Phase 2: Add start/complete status update instructions
- [ ] Phase 3: Add start/complete status update instructions
- [ ] Testing: Verify Kanban board updates in real-time
- [ ] Documentation: Update workflow guide with status transition diagram

---

**Priority**: HIGH
**Estimated Implementation Time**: 1-2 hours
**Complexity**: Low (just adding instruction text)
**Risk**: Minimal (non-breaking change, just adds missing instructions)
