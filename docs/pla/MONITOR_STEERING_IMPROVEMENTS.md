# Monitor & Guardian Steering Improvements

## Overview

Updated the Guardian and Monitor services to be more proactive about nudging misaligned agents, preventing situations where agents get stuck on decision screens or idle states for extended periods.

**CRITICAL FIX**: Resolved cross-container communication issue where steering messages were not reaching agents because the monitor (in `hephaestus-app`) was trying to access tmux sessions in `hephaestus-server` directly. Now uses the `/api/send_message` API endpoint for reliable cross-container messaging.

## Changes Made

### 0. **CRITICAL FIX**: Cross-Container Messaging (`src/monitoring/guardian.py`)

**Lines 306-415**: Fixed the `steer_agent` method to use the `/api/send_message` API endpoint instead of direct tmux access.

**The Problem:**
- Monitor runs in `hephaestus-app` container
- Agents are created in `hephaestus-server` container
- Tmux sessions are local to each container - they don't share
- Guardian was calling `agent_manager.send_message_to_agent()` which tried to access tmux directly
- Result: `Could not get tmux session agent_xxx_r` errors, messages never reached agents

**The Solution:**
- Use HTTP API endpoint: `POST http://hephaestus-server:8000/api/send_message`
- Send JSON payload with `recipient_agent_id` and `message`
- Include `X-Agent-ID: guardian-monitor` header to identify sender
- API endpoint handles tmux access within the server container
- Reliable cross-container communication

**Code changes:**
```python
# OLD: Direct tmux access (doesn't work across containers)
await self.agent_manager.send_message_to_agent(agent.id, formatted_message)

# NEW: API endpoint (works across containers)
import httpx
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://hephaestus-server:8000/api/send_message",
        json={
            "recipient_agent_id": agent.id,
            "message": formatted_message,
        },
        headers={
            "X-Agent-ID": "guardian-monitor",
        },
        timeout=10.0,
    )
```

**Benefits:**
- ✅ Messages now reach agents reliably
- ✅ Works across Docker containers
- ✅ Proper error handling and logging
- ✅ Uses existing, tested API infrastructure

### 1. Guardian Post-Processing (`src/monitoring/guardian.py`)

**Lines 174-213**: Added post-processing logic to ensure `needs_steering` is set appropriately even when the LLM doesn't explicitly set it.

**Triggers for automatic steering:**

1. **Misaligned agents with low scores**
   - Condition: `trajectory_aligned=False` AND `alignment_score < 0.5`
   - Action: Set `needs_steering=True`, type=`misaligned`
   - Message: Lists top 3 alignment issues and asks agent to review requirements

2. **Idle agents with alignment issues**
   - Condition: `current_phase='idle'` AND has alignment issues
   - Action: Set `needs_steering=True`, type=`idle`
   - Message: Prompts agent to start working and read the ticket

**Example log output:**
```
[GUARDIAN POST-PROCESS] Setting needs_steering=True for agent cb5e118a... (misaligned, score=0.20)
[GUARDIAN POST-PROCESS] Setting needs_steering=True for agent d650294e... (idle with issues)
```

### 2. Enhanced Steering Method (`src/monitoring/guardian.py`)

**Lines 306-377**: Improved the `steer_agent` method with better logging and cooldown checks.

**Improvements:**

1. **Cooldown enforcement** - Checks `_should_steer_agent()` before sending messages (max 1 per 1 minute)
2. **Enhanced logging** - All log messages now use `[GUARDIAN STEER]` prefix with agent ID truncation
3. **Better visibility** - Logs show:
   - When steering is sent: `✅ Sent steering message`
   - When cooldown is active: `⏱️ Skipping steering - cooldown active`
   - When message is queued: `💬 Discarding steering message - previous message still queued`

**Example log output:**
```
[GUARDIAN STEER] Agent cb5e118a... - Type: idle
[GUARDIAN STEER] ✅ Sent steering message to agent cb5e118a... - Type: idle, Message: You appear to be idle...
```

### 3. Monitor Multi-Tier Steering Logic (`src/monitoring/monitor.py`)

**Lines 626-688**: Added multi-tier steering logic in the monitoring cycle to catch agents that need nudging.

**Three-tier steering system:**

#### Tier 1: Guardian Explicit Recommendation
- Condition: `needs_steering=True` (set by Guardian LLM or post-processing)
- Uses Guardian's recommended steering type and message

#### Tier 2: Misaligned Agents
- Condition: `trajectory_aligned=False` AND `alignment_score < 0.5`
- Type: `misaligned`
- Message: Auto-generated from alignment issues
- Example:
  ```
  Your trajectory is misaligned (score: 0.32). Please address these issues:
    - Has not read the ticket (no get_ticket call)
    - No tests have been executed
    - Missing Phase 3 validation and documentation
  
  Review the task requirements and adjust your approach.
  ```

#### Tier 3: Long-Running Idle Agents
- Condition: `current_phase='idle'` AND agent age > 10 minutes
- Type: `idle`
- Message: Prompts agent to start working
- Example:
  ```
  You've been idle for 12.3 minutes. Please start working on the task.
  Begin by reading the ticket using get_ticket.
  ```

**Example log output:**
```
[GUARDIAN STEERING] Agent cb5e118a... needs steering (Guardian recommendation)
[GUARDIAN STEERING] Agent d650294e... misaligned (score=0.32)
[GUARDIAN STEERING] Agent e7099110... idle for 12.3 minutes
```

## Benefits

### 1. Faster Intervention
- Agents are nudged within 30 seconds (monitoring interval) of becoming misaligned
- No more 10+ hour stuck agents

### 2. Targeted Messaging
- Messages are specific to the agent's issues
- Lists concrete alignment problems
- Provides actionable guidance

### 3. Prevents Over-Messaging
- Cooldown system (1 minute between steerings)
- Checks for queued messages before sending
- Avoids spamming agents with unread messages

### 4. Better Observability
- Consistent logging patterns with `[GUARDIAN STEER]` prefix
- Clear visibility into why agents are being steered
- Easy to track steering history in logs

## Monitoring Cycle Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Monitoring Cycle (every 30 seconds)                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Guardian Analysis (for each active agent)                   │
│  - Analyze trajectory with LLM                              │
│  - Post-process to set needs_steering if needed             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Monitor Steering Decision                                   │
│  Tier 1: Guardian says needs_steering=True?                 │
│  Tier 2: Misaligned with score < 0.5?                       │
│  Tier 3: Idle for > 10 minutes?                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Guardian.steer_agent()                                      │
│  - Check cooldown (1 min)                                   │
│  - Check for queued messages                                │
│  - Send steering message via API                            │
│  - Log to database                                          │
└─────────────────────────────────────────────────────────────┘
```

## Testing

### Verify Steering is Working

1. **Check monitor logs:**
   ```bash
   docker exec hephaestus-app tail -f /app/logs/monitor.log | grep "GUARDIAN STEER"
   ```

2. **Look for steering indicators:**
   - `[GUARDIAN STEER] Agent xxx... - Type: idle`
   - `[GUARDIAN STEER] ✅ Sent steering message`
   - `[GUARDIAN POST-PROCESS] Setting needs_steering=True`

3. **Check agent received message:**
   - Look for `[GUARDIAN GUIDANCE - IDLE]:` in agent's tmux session
   - Check AgentLog table for `log_type='steering'`

### Expected Behavior

**Scenario 1: Idle Agent**
- Agent created but not working for 10+ minutes
- Monitor detects `current_phase='idle'`
- Sends message: "You've been idle for X minutes. Please start working..."

**Scenario 2: Misaligned Agent**
- Agent working but alignment score < 0.5
- Monitor detects misalignment
- Sends message with specific alignment issues

**Scenario 3: Cooldown Active**
- Agent was steered < 1 minute ago
- Monitor skips steering
- Logs: `⏱️ Skipping steering - cooldown active`

**Scenario 4: Queued Message**
- Agent has unread message in tmux
- Guardian detects "Press up to edit queued messages"
- Skips steering to avoid spam
- Logs: `💬 Discarding steering message - previous message still queued`

## Configuration

### Cooldown Period
- Default: 1 minute
- Location: `guardian.py` line 739
- Change: Modify `timedelta(minutes=1)` in `_should_steer_agent()`

### Idle Threshold
- Default: 10 minutes (600 seconds)
- Location: `monitor.py` line 664
- Change: Modify `age.total_seconds() > 600`

### Alignment Score Threshold
- Default: 0.5
- Location: Multiple places (guardian.py line 182, monitor.py line 637)
- Change: Modify `alignment_score < 0.5`

### Monitoring Interval
- Default: 30 seconds
- Location: `hephaestus_config.yaml` - `monitoring_interval_seconds`
- Change: Update config and restart monitor

## Troubleshooting

### Agents Not Being Steered

1. **Check Guardian analysis:**
   ```bash
   docker exec hephaestus-app tail -n 200 /app/logs/monitor.log | grep "Guardian analysis"
   ```
   - Look for `needs_steering=True`
   - Check `alignment_score` values

2. **Check cooldown:**
   - Look for `⏱️ Skipping steering - cooldown active`
   - Wait 1 minute and check again

3. **Check tmux session:**
   - Verify agent's tmux session exists
   - Look for `Could not get tmux session` errors

### Steering Messages Not Reaching Agent

1. **Check for queued messages:**
   - Look for `💬 Discarding steering message`
   - Agent may have unread message

2. **Check tmux connectivity:**
   - Verify agent manager can access tmux
   - Check container networking

3. **Check AgentLog table:**
   ```sql
   SELECT * FROM agent_logs 
   WHERE log_type = 'steering' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Future Improvements

1. **Adaptive Cooldown** - Shorter cooldown for critical issues, longer for minor ones
2. **Escalation** - If steering doesn't work after N attempts, escalate to restart
3. **Learning** - Track which steering messages are most effective
4. **User Notifications** - Alert users when agents are repeatedly stuck
5. **Steering Analytics** - Dashboard showing steering frequency and effectiveness

## Related Files

- `src/monitoring/guardian.py` - Guardian analysis and steering
- `src/monitoring/monitor.py` - Monitoring loop and steering decisions
- `src/monitoring/conductor.py` - System-wide coherence analysis
- `src/core/database.py` - AgentLog model for steering history
- `hephaestus_config.yaml` - Configuration settings

