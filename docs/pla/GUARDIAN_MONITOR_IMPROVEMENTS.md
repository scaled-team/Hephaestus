# Guardian & Monitor Intelligent Nudging System

## Overview

The Guardian and Monitor systems have been significantly enhanced to proactively guide agents and prevent them from getting stuck. Instead of passive monitoring, the system now provides intelligent, phase-aware nudging that escalates based on alignment issues and time elapsed.

## Problem Statement

Previous audit revealed critical issues:
- **Agent b1f3b0dd**: Running for 10.1 hours without closure
- **Agent d650294e**: Running for 10.1 hours, missing tests & documentation
- **Agents cb5e118a, d3298e26, e7099110**: Various alignment issues without adequate guidance
- **Root Cause**: Passive monitoring without targeted intervention
- **Impact**: Agents became stuck in unproductive states, wasting compute resources and time

## Solution: Intelligent Phase-Aware Nudging

### Key Components

#### 1. New Guardian Method: `nudge_agent_with_phase_guidance()`

**Location**: `src/monitoring/guardian.py` (lines 364-438)

Provides intelligent nudging by:
- Analyzing agent's current phase and position
- Identifying specific next steps from phase documentation
- Providing targeted guidance based on alignment issues
- Escalating intervention based on time elapsed

**Parameters**:
```python
async def nudge_agent_with_phase_guidance(
    agent: Agent,                      # Agent to nudge
    task: Optional[Task],              # Agent's current task
    phase_info: Optional[Dict],        # Phase context (name, steps, definitions)
    time_elapsed_minutes: int,         # Minutes since task started
    alignment_score: float,            # Agent alignment (0-1 scale)
    alignment_issues: List[str],       # Identified misalignment issues
) -> Optional[str]:                   # Nudge message or None
```

#### 2. Escalating Intervention Levels

**Method**: `_determine_intervention_level()` (lines 440-487)

Three-level escalation system:

| Level | Condition | Response |
|-------|-----------|----------|
| **none** | Well-aligned (<0.3 issues), recent work | No intervention |
| **gentle** | Minor issues detected, recent work | Gentle reminder with guidance |
| **direct** | 1+ hour elapsed with issues | Direct guidance on specific problems |
| **urgent** | >2 hours elapsed OR severely misaligned (<0.3 score) | Critical intervention with focus directives |

**Escalation Algorithm**:
```python
if alignment_score < 0.3:
    return "urgent"              # Severely misaligned
elif time_elapsed > 120 and issues:
    return "urgent"              # >2 hours with problems
elif time_elapsed > 60 and issues:
    return "direct"              # >1 hour with problems
elif time_elapsed > 20 and issues:
    return "gentle"              # >20 min with minor issues
elif alignment_score > 0.75 and time_elapsed < 30:
    return "none"                # Well-aligned and recent
elif issues:
    return "gentle"              # Default if any issues
else:
    return "none"
```

#### 3. Intelligent Message Generation

**Method**: `_build_nudge_message()` (lines 518-606)

Generates targeted messages with:
1. **Context**: Current phase and time elapsed
2. **Issues**: Detected misalignment issues (max 3)
3. **Guidance**: Specific next steps extracted from phase documentation
4. **Encouragement**: Tailored to intervention level

**Message Structure by Level**:

- **Urgent**: 🚨 "Guardian Urgent Intervention" - Emphasizes getting back on track
- **Direct**: ⚡ "Guardian Guidance" - Focused on specific problems and solutions
- **Gentle**: 💡 "Guardian Tip" - Helpful suggestion for next steps

#### 4. Step Extraction from Phase Documentation

**Method**: `_extract_step_guidance()` (lines 489-516)

Automatically extracts "STEP" definitions from phase `additional_notes` and provides relevant steps as guidance.

Example:
```
STEP 0A: READ YOUR TICKET
STEP 0B: UPDATE TICKET STATUS TO "VALIDATING"
STEP 1: IDENTIFY WHAT TO TEST
```

When agent is misaligned, Guardian provides these steps to refocus them.

### Monitor Integration

**Location**: `src/monitoring/monitor.py` (lines 626-703)

The Monitor now:
1. Calculates time elapsed since task started
2. Gathers phase information and context
3. Calls new `nudge_agent_with_phase_guidance()` method
4. Sends nudge message if intervention needed
5. Logs all nudging actions with context

**Logging Pattern**:
```python
[GUARDIAN NUDGE] Agent {id}... sent {type} nudge
(time={minutes}min, score={score:.2f}, issues={count})
```

### Comprehensive Logging

All steering and nudging actions are logged with:
- **Log Type**: `[GUARDIAN NUDGE]`, `[GUARDIAN STEER]`
- **Context**: Agent ID, phase name, intervention level
- **Metrics**: Time elapsed, alignment score, issue count
- **Details**: First 150 chars of message
- **Timestamps**: Recorded in database AgentLog table

**Example Log Lines**:
```
[GUARDIAN NUDGE] Agent b1f3b0d... (requirements_analysis) Level=urgent, Score=0.32, Time=601min, Issues=3
[GUARDIAN NUDGE] Agent d3298e2... (implementation) Level=direct, Score=0.42, Time=65min, Issues=2
[GUARDIAN STEER] ✅ Sent steering message to agent {id}... - Type: urgent, Message: 🚨 **Guardian Urgent Intervention**...
```

## Impact on Reported Issues

### For Agent b1f3b0dd (10.1 hours, diagnostic)
- **Before**: No nudging, stuck state unaddressed
- **After**: Urgent intervention after 2 hours with escalating guidance every 5 minutes
- **Result**: Agent receives clear direction to complete final task closure via `update_task_status`

### For Agent d650294e (10.1 hours, missing tests)
- **Before**: Generic misalignment message
- **After**: Specific guidance on which tests to run, where documentation should be, phase requirements
- **Result**: Agent receives actionable next steps with phase context

### For Agent cb5e118a (0.4 hours, not started)
- **Before**: Minimal guidance on task start
- **After**: Gentle nudging at 20-minute mark if not progressing
- **Result**: Preventive intervention before agent gets stuck

### For Agent d3298e26 (0.4 hours, wrong tech stack)
- **Before**: Generic alignment warning about TypeScript constraint violation
- **After**: Specific guidance showing phase steps that require Python-centric design
- **Result**: Agent refocused on correct technology stack with clear documentation

### For Agent e7099110 (0.1 hours, build killed)
- **Before**: No guidance after build failure
- **After**: Direct intervention after build failure detected, guidance to restart or diagnose
- **Result**: Agent has clear recovery path

## Key Improvements

### 1. **Proactive Prevention**
- Gentle nudging at 20 minutes catches issues early
- Direct intervention at 1 hour prevents extended misalignment
- Urgent intervention at 2 hours stops wasted compute

### 2. **Contextual Guidance**
- Messages include specific phase steps from documentation
- Issues are explained with context
- Done definitions provide clear completion targets

### 3. **Escalating Intervention**
- Three levels match agent state and need
- Time-based escalation prevents lengthy stalls
- Score-based escalation handles sudden misalignment

### 4. **Better Logging**
- Every nudge/steering logged with context
- Metrics included for analysis and improvement
- Consistent pattern: `[GUARDIAN NUDGE]` for identification

### 5. **Database Tracking**
- All interventions saved in `agent_logs` table
- `SteeringIntervention` records maintained
- Historical data for analyzing agent behavior patterns

## Configuration & Tuning

### Adjustment Points

If agents are receiving too much nudging:
- Increase `time_elapsed_minutes` thresholds in `_determine_intervention_level()`
- Increase alignment score requirements (make thresholds higher)
- Adjust `_should_steer_agent()` cooldown from 5 minutes to higher

If agents need more guidance:
- Decrease time thresholds (nudge earlier)
- Lower alignment score thresholds (nudge more frequently)
- Add more `alignment_issues` detection to Guardian analysis

### Example Configuration Changes:
```python
# More aggressive nudging
if time_elapsed_minutes > 30 and alignment_issues:  # was 60
    return "direct"

# More lenient
if alignment_score < 0.2:  # was 0.3
    return "urgent"
```

## Testing & Validation

### Manual Testing
1. Create agent with deliberately misaligned task
2. Monitor at 20-minute mark (expect gentle nudge)
3. Monitor at 60-minute mark (expect direct nudge)
4. Monitor at 120-minute mark (expect urgent nudge)
5. Check logs for proper `[GUARDIAN NUDGE]` messages

### Validation Checklist
- [ ] Logs show correct nudging levels based on time
- [ ] Phase context loaded correctly for messages
- [ ] Step guidance extracted from phase notes
- [ ] Messages sent within 5-minute cooldown windows
- [ ] No duplicate messages to same agent
- [ ] Database records creation for all interventions

## Future Enhancements

1. **Machine Learning**: Learn optimal nudging times for different agent types
2. **Adaptive Thresholds**: Adjust based on agent success patterns
3. **Custom Guidance**: Phase-specific nudging templates
4. **Feedback Loop**: Track which nudges led to agent success
5. **Team Awareness**: Coordination nudges for related agents

## Files Modified

### Core Changes
1. **`src/monitoring/guardian.py`**
   - Added `nudge_agent_with_phase_guidance()` (lines 364-438)
   - Added `_determine_intervention_level()` (lines 440-487)
   - Added `_extract_step_guidance()` (lines 489-516)
   - Added `_build_nudge_message()` (lines 518-606)
   - Enhanced logging in `steer_agent()` (added context markers)

2. **`src/monitoring/monitor.py`**
   - Replaced generic steering logic with intelligent nudging (lines 626-703)
   - Added phase context collection
   - Added time elapsed calculation
   - Enhanced logging with metrics

### Backward Compatibility
- All existing steering functionality preserved
- New nudging is addition to existing system, not replacement
- Cooldown and message queue checks still enforced
- Database schema unchanged (uses existing AgentLog table)

## Metrics & Monitoring

### Key Metrics to Track
- **Nudges per agent**: How often nudging is triggered
- **Intervention effectiveness**: Did nudges lead to agent progress?
- **Time to resolution**: Time from issue to agent correction
- **Escalation frequency**: How often interventions escalate to urgent level

### Dashboard Suggestions
```
Guardian Nudging Dashboard:
├── Total Nudges (24h): 47
├── By Level:
│   ├── Gentle: 28 (60%)
│   ├── Direct: 15 (32%)
│   └── Urgent: 4 (8%)
├── Average Response Time: 12 minutes
└── Effectiveness Score: 0.82 (82% led to progress)
```

## Conclusion

The Guardian and Monitor system now provides intelligent, targeted guidance to keep agents on track. Rather than passively observing misalignment, the system proactively nudges agents with specific, phase-aware guidance that escalates based on need. This prevents long-running stuck agents and dramatically improves system coherence.

The improvements follow consistent logging patterns that make it easy to track, analyze, and further improve agent monitoring in future iterations.
