# Ticket ID Guide for Multi-Phase Workflow

## Quick Summary

The Hephaestus workflow uses **ticket-based tracking** to manage work across phases. Each piece of work (ticket) flows through:

```
Phase 1 (Requirements) → Creates Ticket
    ↓
Phase 2 (Implementation) → Works on Ticket, Creates Phase 3 Task
    ↓
Phase 3 (Validation) → Validates Ticket, Resolves Ticket
```

**Critical**: Phase 2 and Phase 3 agents **MUST** know the ticket ID to complete their work properly.

---

## How Ticket IDs Flow

### Phase 1: Creates Everything

Phase 1 creates tickets using:
```python
ticket = mcp__hephaestus__create_ticket({
    "title": "Component Name",
    "description": "Component requirements...",
    # ... other fields
})

ticket_id = ticket["ticket_id"]  # Save this!
```

Phase 1 then creates Phase 2 tasks with:
```python
mcp__hephaestus__create_task({
    "description": f"Phase 2: Design Component - TICKET: {ticket_id}. Component implementation based on requirements.",
    "ticket_id": ticket_id,  # CRITICAL: Include ticket_id
    # ... other fields
})
```

### Phase 2: Receives Ticket ID

Phase 2 agent receives the task description:
```
"Phase 2: Design Database Schema - TICKET: ticket-abc123def456. Database design and schema implementation..."
```

Phase 2 **extracts** the ticket ID:
```python
# From task description: "TICKET: ticket-abc123def456"
my_ticket_id = "ticket-abc123def456"
```

Phase 2 uses it for status updates:
```python
# STEP 0B: Update ticket to "building" status
mcp__hephaestus__update_ticket_status({
    "ticket_id": my_ticket_id,
    "new_status": "building",
    "comment": "Phase 2: Starting implementation..."
})

# ... do work ...

# STEP 18: Update ticket to "building-done" status
mcp__hephaestus__update_ticket_status({
    "ticket_id": my_ticket_id,
    "new_status": "building-done",
    "comment": "Phase 2: Implementation complete, code tested"
})
```

Phase 2 creates Phase 3 task with:
```python
mcp__hephaestus__create_task({
    "description": f"Phase 3: Validate & Document - TICKET: {my_ticket_id}. Validate implementation and write documentation.",
    "ticket_id": my_ticket_id,  # CRITICAL: Pass same ticket_id forward
    # ... other fields
})
```

### Phase 3: Completes Workflow

Phase 3 agent receives task with ticket ID in description, extracts it, and completes workflow:

```python
# STEP 0A: Extract ticket_id from task description
my_ticket_id = "ticket-abc123def456"

# STEP 0B: Update ticket to "validating" status
mcp__hephaestus__update_ticket_status({
    "ticket_id": my_ticket_id,
    "new_status": "validating",
    "comment": "Phase 3: Starting validation..."
})

# ... run tests and validate ...

# STEP 12: Update ticket to "done" status
mcp__hephaestus__update_ticket_status({
    "ticket_id": my_ticket_id,
    "new_status": "done",
    "comment": "Phase 3: All tests pass, documentation complete, ready for production"
})

# STEP 13: Resolve ticket (ONLY Phase 3 does this)
mcp__hephaestus__resolve_ticket({
    "ticket_id": my_ticket_id,
    "resolution_comment": "Component complete and validated. All requirements met."
})
```

---

## If You Don't Have a Ticket ID

### Option 1: Search for Existing Tickets

```python
existing_tickets = mcp__hephaestus__search_tickets({
    "query": "Database Models",  # Or your component name
    "search_type": "hybrid",
    "limit": 10
})

# Review results and find matching ticket
my_ticket_id = existing_tickets[0]["id"]  # If found
```

### Option 2: Request Ticket from Phase 1

If Phase 1 hasn't created tickets yet:
1. Ask orchestrator to run Phase 1
2. Get returned ticket IDs from Phase 1 output
3. Use those ticket IDs in your phase

### Option 3: Get Ticket ID from Task Description

Your task description should contain:
```
"Phase 2: Implementation - TICKET: ticket-abc123def456. ..."
```

Extract it:
```python
import re
task_description = "[your task description]"
match = re.search(r'TICKET: (ticket-[a-z0-9]+)', task_description)
if match:
    my_ticket_id = match.group(1)
```

---

## Why This Matters

1. **Kanban Board Updates**: Ticket status updates move the ticket through Kanban columns
2. **Blocking Relationships**: Tickets can block other tickets - proper IDs enable this
3. **Workflow Closure**: Only Phase 3 with correct ticket_id can resolve (move to "done")
4. **Team Visibility**: Ticket ID enables team to track work across all three phases
5. **Audit Trail**: All status updates logged against ticket for complete history

---

## Common Patterns by Phase

### Phase 1 Pattern
```python
# CREATE
ticket_id = mcp__hephaestus__create_ticket(...)["ticket_id"]
# PASS FORWARD
task_desc = f"Phase 2: ... - TICKET: {ticket_id}. ..."
```

### Phase 2 Pattern
```python
# EXTRACT
ticket_id = extract_from_task_description(task_description)
# UPDATE STATUS (twice)
mcp__hephaestus__update_ticket_status(..., new_status="building", ticket_id=ticket_id)
# ... work ...
mcp__hephaestus__update_ticket_status(..., new_status="building-done", ticket_id=ticket_id)
# PASS FORWARD
task_desc = f"Phase 3: ... - TICKET: {ticket_id}. ..."
```

### Phase 3 Pattern
```python
# EXTRACT
ticket_id = extract_from_task_description(task_description)
# UPDATE STATUS (twice)
mcp__hephaestus__update_ticket_status(..., new_status="validating", ticket_id=ticket_id)
# ... validate ...
mcp__hephaestus__update_ticket_status(..., new_status="done", ticket_id=ticket_id)
# RESOLVE (ONLY Phase 3)
mcp__hephaestus__resolve_ticket(..., ticket_id=ticket_id)
```

---

## Status Progression

```
Created
    ↓ (Phase 1 creates, updates to "backlog" - new STEP 6A2)
Backlog
    ↓ (Phase 2 STEP 0B updates)
Building
    ↓ (Phase 2 STEP 18 updates)
Building-Done
    ↓ (Phase 3 STEP 0B updates)
Validating
    ↓ (Phase 3 STEP 12 updates)
Done
    ↓ (Phase 3 STEP 13 resolves)
Resolved ✅
```

---

## Debugging Ticket ID Issues

### Problem: "Ticket not found"
```python
# If you get this error:
# "Ticket {ticket_id} not found"

# Check:
1. Verify ticket_id format: "ticket-abc123def456"
2. Search for correct ID: search_tickets(query="component name")
3. Verify Phase 1 created ticket: check logs for create_ticket call
```

### Problem: Status update fails
```python
# If update_ticket_status returns error:

# Check:
1. Ticket exists: search or get_ticket({ticket_id})
2. Status is valid: "backlog", "building", "building-done", "validating", "done"
3. Status transition is valid (see Status Progression above)
4. Ticket is not already resolved
```

### Problem: Can't extract ticket_id
```python
# If ticket_id not in task description:

# Check:
1. Look for pattern: "TICKET: ticket-xxxxx"
2. Search for recent tickets: search_tickets(query="...", recent=true)
3. Check agent logs for Phase 1 output
4. Request Phase 1 re-execution with proper task structure
```

---

## Reference: All Ticket-Related Calls

| Call | Phase | Purpose | Requires ticket_id |
|------|-------|---------|-------------------|
| `create_ticket()` | 1 | Create work ticket | No (returns ticket_id) |
| `update_ticket_status()` | 1,2,3 | Update status for Kanban | YES ✅ |
| `resolve_ticket()` | 3 only | Mark as complete | YES ✅ |
| `get_ticket()` | Any | Retrieve ticket details | YES ✅ |
| `search_tickets()` | Any | Find tickets | No (find then get) |
| `create_task()` | 1,2 | Create downstream task | YES ✅ (in description) |

---

## Summary

**The Key Rule**: Each agent must know its ticket_id and **pass it forward** to the next phase.

```
Phase 1 Creates ticket_id → Phase 1 puts in Task description
Phase 2 Extracts from description → Phase 2 uses for updates → Phase 2 puts in next Task
Phase 3 Extracts from description → Phase 3 uses for updates and resolve → Done ✅
```

Following this pattern ensures:
- ✅ Kanban board updates correctly
- ✅ Blocking relationships work
- ✅ Workflow completes properly
- ✅ Audit trail is complete
- ✅ Team has visibility

---

## Getting Help

If you're stuck on ticket IDs:

1. **Check logs**: Search for "create_ticket" or your component name
2. **Search tickets**: Use `search_tickets()` with component keywords
3. **Ask orchestrator**: Request full ticket list or Phase 1 re-run
4. **Follow patterns**: Use the Phase 1/2/3 patterns above as templates

Remember: **TICKET: {ticket_id}** in task descriptions is how phases communicate ticket IDs! 🎫
