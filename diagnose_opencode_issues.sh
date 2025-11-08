#!/bin/bash
# Diagnostic script for OpenCode agent issues

echo "🔍 OpenCode Agent Diagnostics"
echo "=============================="
echo ""

# Check if containers are running
echo "1. Checking Docker containers..."
docker-compose ps

echo ""
echo "2. Checking OpenCode configuration..."
docker exec hephaestus-server cat /app/opencode.json | python3 -m json.tool | head -50

echo ""
echo "3. Checking MCP server loading..."
docker exec hephaestus-server bash -c 'cd /tmp && timeout 10 opencode run "test" --model anthropic/claude-haiku-4-5 --print-logs 2>&1' | grep -i mcp

echo ""
echo "4. Checking active agents..."
curl -s http://localhost:8000/api/agents | python3 -m json.tool | grep -A 10 '"status"'

echo ""
echo "5. Checking tmux sessions..."
docker exec hephaestus-server tmux list-sessions 2>&1

echo ""
echo "6. Checking worktree permissions..."
docker exec hephaestus-server bash -c "ls -la /tmp/hephaestus_worktrees/wt_*/opencode.json 2>&1 | head -20"

echo ""
echo "7. Checking for recent errors in agent tmux sessions..."
for session in $(docker exec hephaestus-server tmux list-sessions -F '#{session_name}' 2>/dev/null); do
    echo "  Session: $session"
    docker exec hephaestus-server tmux capture-pane -t "$session" -p -S -100 2>&1 | grep -i "error\|crash\|fail" | tail -5
done

echo ""
echo "8. Checking file write permissions in worktrees..."
docker exec hephaestus-server bash -c "
for wt in /tmp/hephaestus_worktrees/wt_*; do
    if [ -d \"\$wt\" ]; then
        echo \"Worktree: \$wt\"
        echo \"  Permissions: \$(stat -c '%a %U:%G' \"\$wt\" 2>/dev/null || stat -f '%p %Su:%Sg' \"\$wt\")\"
        echo \"  Can write test: \"
        touch \"\$wt/test_write.tmp\" 2>&1 && echo \"    ✅ Write OK\" && rm \"\$wt/test_write.tmp\" || echo \"    ❌ Write FAILED\"
    fi
done
"

echo ""
echo "9. Checking OpenCode version and tools..."
docker exec hephaestus-server opencode --version 2>&1

echo ""
echo "=============================="
echo "✅ Diagnostics complete"

