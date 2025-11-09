#!/bin/bash
# Quick script to immediately clean up stale agents
# Run this when you see agents showing "Killed" but still marked as running

echo "Running immediate agent cleanup..."
docker exec hephaestus-server python3 /app/scripts/audit_and_fix_agents.py --fix --force
echo "Done!"

