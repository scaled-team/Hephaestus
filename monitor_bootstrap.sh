#!/bin/bash

# Comprehensive Bootstrap Monitoring Script
# Monitors task execution, agent activity, ticket creation, and MCP tool usage

echo "=================================================="
echo "  Hephaestus Bootstrap Monitor - End-to-End"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WORKFLOW_ID="cd4f1be7-e2c6-405d-8d40-4570c0ffc929"
LOG_FILE="/tmp/bootstrap_monitor_$(date +%Y%m%d_%H%M%S).log"

echo "Workflow ID: $WORKFLOW_ID"
echo "Log file: $LOG_FILE"
echo ""

# Function to get DB stats
get_stats() {
    docker exec hephaestus-server python -c "
from sqlalchemy import create_engine, text
engine = create_engine('sqlite:///./data/hephaestus.db')
with engine.connect() as conn:
    # Count tasks
    tasks = conn.execute(text('''
        SELECT COUNT(*), status FROM tasks
        WHERE workflow_id = '$WORKFLOW_ID'
        GROUP BY status
    ''')).fetchall()

    # Count tickets
    tickets = conn.execute(text('SELECT COUNT(*) FROM tickets')).scalar()

    # Count active agents
    agents = conn.execute(text('''
        SELECT COUNT(*), status FROM agents
        WHERE current_task_id IN (
            SELECT id FROM tasks WHERE workflow_id = '$WORKFLOW_ID'
        )
        GROUP BY status
    ''')).fetchall()

    print('TASKS:' + str(dict(tasks)) if tasks else 'TASKS:{}')
    print('TICKETS:' + str(tickets))
    print('AGENTS:' + str(dict(agents)) if agents else 'AGENTS:{}')
" 2>/dev/null
}

# Function to get latest agent activity
get_agent_activity() {
    docker logs hephaestus-server 2>&1 | grep -E "(Creating opencode agent|terminated successfully|Manual termination)" | tail -5
}

# Function to check for MCP tool calls
check_mcp_calls() {
    docker logs hephaestus-server 2>&1 | grep -E "(create_ticket|MCP.*ticket)" | tail -3
}

# Initial state
echo -e "${BLUE}[INITIAL STATE]${NC}"
get_stats
echo ""

# Monitor loop
ITERATION=0
LAST_TICKET_COUNT=0
AGENT_STARTED=false

while true; do
    ((ITERATION++))
    TIMESTAMP=$(date '+%H:%M:%S')

    # Get current stats
    STATS=$(get_stats)
    TASK_STATUS=$(echo "$STATS" | grep "TASKS:" | cut -d: -f2)
    TICKET_COUNT=$(echo "$STATS" | grep "TICKETS:" | cut -d: -f2)
    AGENT_STATUS=$(echo "$STATS" | grep "AGENTS:" | cut -d: -f2)

    # Check for agent start
    if echo "$AGENT_STATUS" | grep -q "working" && [ "$AGENT_STARTED" = false ]; then
        echo -e "${GREEN}[$TIMESTAMP] 🚀 AGENT STARTED${NC}"
        AGENT_STARTED=true
    fi

    # Check for ticket creation
    if [ "$TICKET_COUNT" -gt "$LAST_TICKET_COUNT" ]; then
        DELTA=$((TICKET_COUNT - LAST_TICKET_COUNT))
        echo -e "${GREEN}[$TIMESTAMP] ✅ TICKETS CREATED: +$DELTA (Total: $TICKET_COUNT)${NC}"
        LAST_TICKET_COUNT=$TICKET_COUNT
    fi

    # Check for completion
    if echo "$TASK_STATUS" | grep -q "completed"; then
        echo -e "${GREEN}[$TIMESTAMP] 🎉 TASK COMPLETED!${NC}"
        echo ""
        echo "=== FINAL STATE ==="
        get_stats
        echo ""
        echo "=== RECENT AGENT ACTIVITY ==="
        get_agent_activity
        break
    fi

    # Check for termination/failure
    if echo "$TASK_STATUS" | grep -qE "(cancelled|failed)" && echo "$AGENT_STATUS" | grep -q "terminated"; then
        echo -e "${RED}[$TIMESTAMP] ❌ TASK FAILED/CANCELLED${NC}"
        echo ""
        echo "=== FINAL STATE ==="
        get_stats
        echo ""
        echo "=== RECENT AGENT ACTIVITY ==="
        get_agent_activity
        break
    fi

    # Periodic status update (every 30 seconds)
    if [ $((ITERATION % 6)) -eq 0 ]; then
        echo -e "${YELLOW}[$TIMESTAMP] Status: Tasks=$TASK_STATUS | Tickets=$TICKET_COUNT | Agents=$AGENT_STATUS${NC}"
    fi

    # Log to file
    echo "[$TIMESTAMP] Tasks=$TASK_STATUS | Tickets=$TICKET_COUNT | Agents=$AGENT_STATUS" >> "$LOG_FILE"

    sleep 5
done

echo ""
echo "Monitor complete. Log saved to: $LOG_FILE"
