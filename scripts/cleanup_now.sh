#!/bin/bash
# Immediate cleanup of stale agents and orphaned tmux sessions
# Run this when you see terminated agents with tmux sessions still active

echo "🧹 Running immediate agent cleanup..."
echo ""

# Run the audit and fix script
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py --fix --force

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Refresh the frontend to see the changes."

