#!/usr/bin/env python3
"""Bootstrap a fresh Hephaestus project and create the Phase 1 task.

What this script does:
- Optionally wipe Qdrant memories (for a truly clean slate)
- Reinitialize Qdrant collections
- Start backend + monitor via run_prd_workflow.py
- Poll backend health
- Programmatically create the Phase 1 task against your PRD

Usage example (inside Docker):

  docker compose exec hephaestus-server python scripts/bootstrap_project.py \
    --working-dir "./projects/stockton-ai" \
    --worktrees "./projects/stockton-ai-worktrees" \
    --prd "./projects/stockton-ai/Stockton-AI-PRD.md" \
    --drop-db --clean-qdrant

Requirements:
- Docker services running (hephaestus-server, qdrant)
- Run from inside Docker container for proper service name resolution

Environment Variables:
- QDRANT_URL: Qdrant URL (default: http://qdrant:6333)
- BASE_URL: Backend URL (default: http://hephaestus-server:8000)
- DATABASE_PATH: Database path (default: /app/data/hephaestus.db)
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import subprocess
from pathlib import Path
from typing import Dict

import requests


def run(cmd: list[str], env: Dict[str, str] | None = None) -> int:
    """Run a command to completion, return exit code."""
    print("$", " ".join(cmd))
    return subprocess.call(cmd, env=env)


def spawn(cmd: list[str], env: Dict[str, str] | None = None) -> subprocess.Popen:
    """Spawn a long-running process without waiting for completion."""
    print("$ (spawn)", " ".join(cmd))
    return subprocess.Popen(cmd, env=env)


def ensure_qdrant() -> None:
    """Check Qdrant health; raise if not reachable."""
    # Use QDRANT_URL from environment or default to Docker service name
    qdrant_url = os.getenv("QDRANT_URL", "http://qdrant:6333")
    try:
        r = requests.get(qdrant_url, timeout=3)
        if r.status_code != 200:
            raise RuntimeError(
                f"Qdrant returned status {r.status_code} at {qdrant_url}.\n"
                "Ensure Qdrant service is running in Docker."
            )
        print(f"[qdrant] Connected to Qdrant at {qdrant_url} ✓")
    except Exception as e:
        raise RuntimeError(
            f"Qdrant is not reachable at {qdrant_url}.\n"
            "Ensure Qdrant service is running in Docker."
        ) from e


def poll_backend(timeout: int = 60, base_url: str = None) -> None:
    """Wait until backend /health is healthy or timeout."""
    # Use BASE_URL from environment or default to Docker service name
    if base_url is None:
        base_url = os.getenv("BASE_URL", "http://hephaestus-server:8000")

    start = time.time()
    print(f"[health] Waiting for backend at {base_url} to become healthy...")
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{base_url}/health", timeout=2)
            if r.ok and r.json().get("status") == "healthy":
                print("[health] Backend is healthy ✓")
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Backend at {base_url} did not become healthy within timeout")


def create_phase1_task(
    prd_path: str,
    project_name: str,
    base_url: str = None,
    agent_id: str = "main-session-agent",
) -> None:
    """Create the Phase 1 task programmatically."""
    # Use BASE_URL from environment or default to Docker service name
    if base_url is None:
        base_url = os.getenv("BASE_URL", "http://hephaestus-server:8000")

    # Agent runs in worktree where PRD is always at: PRD.md (generic name)
    # Note: Worktree manager creates PRD.md symlink, not the original filename
    prd_filename = "PRD.md"

    description = (
        f"Phase 1: Read PRD.md and immediately use curl commands to create tickets in the Hephaestus system.\n\n"
        f"STEP 1: Read the PRD.md file to understand requirements\n"
        f"STEP 2: For each infrastructure component needed, immediately use the 'Create a Ticket' curl command\n"
        f"STEP 3: For each feature/component, immediately use the 'Create a Ticket' curl command\n"
        f"STEP 4: Use the 'Mark Your Task as Done' curl command when all tickets are created\n\n"
        f"DO NOT create any markdown files, analysis documents, or plans.\n"
        f"ONLY use the curl commands provided in your instructions to interact with the Hephaestus server.\n"
        f"CREATE TICKETS DIRECTLY - no intermediate documentation needed."
    )

    done_definition = "\n".join(
        [
            "SUCCESS CRITERIA:",
            "- Used curl command to create at least 3 infrastructure tickets (database, API, deployment)",
            "- Used curl command to create tickets for all major features/components from PRD",
            "- All tickets have proper titles, descriptions, and component labels",
            "- Used curl command to mark this task as done",
            "",
            "HOW TO VERIFY:",
            "- Check the response from each curl command shows 'id' field (ticket created)",
            "- Final curl command to mark task done returns success",
            "",
            "REMINDER: DO NOT create markdown files. ONLY use curl commands."
        ]
    )

    payload = {
        "task_description": description,
        "done_definition": done_definition,
        "ai_agent_id": agent_id,
        "phase_id": "1",
        "priority": "high",
    }
    headers = {"Content-Type": "application/json", "X-Agent-ID": agent_id}

    r = requests.post(f"{base_url}/create_task", json=payload, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()
    print("[task] Created Phase 1 task:")
    print("       id:", data.get("task_id"))
    print("       status:", data.get("status"))
    print("       agent:", data.get("assigned_agent_id"))
    print("→ View tasks:    ", f"{base_url}/api/tasks")
    print("→ Tickets board: ", f"{base_url}/tickets")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap a fresh project and seed Phase 1 task")
    parser.add_argument("--working-dir", required=True, help="Absolute path to project directory")
    parser.add_argument("--worktrees", required=True, help="Path for git worktrees (e.g., /tmp/hephaestus_worktrees)")
    parser.add_argument("--prd", required=True, help="Absolute path to PRD file")
    parser.add_argument("--clean-qdrant", action="store_true", help="Clean Qdrant collections before starting")
    parser.add_argument("--drop-db", action="store_true", help="Drop database before starting")
    parser.add_argument("--mcp-port", default="8000", help="MCP server port (default: 8000)")
    args = parser.parse_args()

    # Sanity checks
    prd_path = Path(args.prd)
    if not prd_path.exists():
        raise SystemExit(f"PRD not found: {prd_path}")

    Path(args.worktrees).mkdir(parents=True, exist_ok=True)

    # 1) Ensure Qdrant is reachable
    ensure_qdrant()

    # 2) Clean and reinit Qdrant collections (optional)
    if args.clean_qdrant:
        code = run([sys.executable, "scripts/clean_qdrant.py", "--force", "--prefix", "hephaestus"])
        if code != 0:
            raise SystemExit("Failed to clean Qdrant collections")
    code = run([sys.executable, "scripts/init_qdrant.py"])
    if code != 0:
        raise SystemExit("Failed to initialize Qdrant collections")

    # 3) Start services via run_prd_workflow.py in resume mode
    # Note: Uses default database (./hephaestus.db) for simplicity
    env = os.environ.copy()
    env.update(
        {
            "WORKING_DIRECTORY": args.working_dir,
            "WORKTREE_BASE": args.worktrees,
            "MCP_PORT": str(args.mcp_port),
        }
    )

    run_args = [sys.executable, "run_prd_workflow.py", "--resume"]
    if args.drop_db:
        run_args.append("--drop-db")
    # Start and wait for it to report healthy
    # Spawn in background (run_prd_workflow keeps the services running)
    proc = spawn(run_args, env=env)

    # 4) Poll backend health and create Phase 1 task
    # Use environment variable or default to Docker service name
    base_url = os.getenv("BASE_URL", f"http://hephaestus-server:{args.mcp_port}")
    poll_backend(timeout=60, base_url=base_url)

    project_name = Path(args.working_dir).name.replace("-", "_")
    create_phase1_task(str(prd_path), project_name, base_url=base_url)

    print("\n[ok] Services are running in the spawned process.")
    print("     To stop them, Ctrl+C in that terminal, or kill the PID:")
    print(f"     PID: {proc.pid}")


if __name__ == "__main__":
    main()
