# Project Rules & Guidelines (Augment AI IDE Assistant)

This document equips the coding assistant with the core conventions, guardrails, and operational knowledge required when modifying the Hephaestus stack inside the Augment AI IDE. Follow these rules at all times unless the user explicitly overrides them.

---

## 1. Environment & Safety

- **Never reset or wipe the repo** (`git reset --hard`, `git checkout --`, `rm -rf`, etc.) unless the user explicitly requests it.
- **Work within the sandbox**. Assume filesystem access is scoped to the workspace plus `/tmp`. Use `bash -lc` via the CLI harness.
- **No network installs** unless the request clearly requires it. Prefer vendored dependencies.
- **Terminal output is summarized**; do not paste entire logs unless the user asks.
- **Document every change** in files or responses, especially when touching critical services (queue, monitoring, worktree manager).

---

## 2. Development Workflow

1. **Inspect before editing**: read files with `sed`, `rg`, or `cat` before making assumptions.
2. **Use `apply_patch`** for file edits so diffs stay small and traceable.
3. **Reference lines explicitly** when reporting back (e.g., `src/mcp/server.py:1406`).
4. **Prefer incremental fixes** over sweeping refactors unless directed.
5. **Respect existing TODOs and in-progress work**—do not delete or “fix” them unless asked.

---

## 3. Git & Worktree Rules

- Main repo lives at `paths.main_repo_path` (see `hephaestus_config.yaml`).
- Agents operate inside isolated worktrees. `src/core/worktree_manager.py` handles creation and merging.
- **Never leave the main repo dirty**: merges now auto-reset the repo (`_ensure_clean_main_repo`). Do not undo this protection.
- If you must touch git internals, use the provided abstractions (`WorktreeManager`) instead of custom shell commands.

---

## 4. Queue & Broadcast Requirements

- The orchestrator (`process_queue` in `src/mcp/server.py`) must **never** crash due to WebSocket errors. All broadcasts must go through `safe_broadcast(...)`.
- When adding new status updates, wrap them in `safe_broadcast` with a contextual tag (e.g., `context="task_dequeued"`).
- Verify that new long-running operations do not block `background_queue_processor`.

---

## 5. Tmux & Monitoring Essentials

- All tmux access **must** use the shared socket path from config: `config.tmux_socket_path` (currently `/tmp/tmux-shared/default`).
- Diagnostics and docs must use:  
  `docker exec hephaestus-server tmux -S /tmp/tmux-shared/default list-sessions`
- Monitoring cleanup runs every **2 minutes** (`monitoring.cleanup_interval_minutes`). If you adjust cadence, update both config and docs.
- Cleanup logic (`MonitoringLoop._cleanup_stale_agents`) is the source of truth for zombie detection; keep it in sync with agent lifecycle changes.

---

## 6. Agent Lifecycle Expectations

- Tasks assigned to agents must always have:
  - `workflow_id`
  - `phase_id` (UUID, not numeric)
  - `ticket_id` (when ticket tracking is enabled)
- Agent creation flow (simplified):
  1. Queue processor picks task.
  2. Ensures enrichment (`[QUEUE_ENRICHMENT]` logs).
  3. Builds prompt (replaces `[workflow_id]` placeholders).
  4. Creates worktree & merges latest main (auto-resolves conflicts).
  5. Spawns tmux session & CLI agent.
  6. Broadcasts `task_dequeued`.
- **Never bypass** `AgentManager.create_agent_for_task`; all spawns must go through it so cleanup/monitoring can track state.

---

## 7. Coding Style & Conventions

- Python: follow existing patterns (async/await in server, logging via `logger`, SQLAlchemy sessions with `try/finally`).
- Frontend (React/Vite): TypeScript + hooks; prefer functional components and existing contexts/stores.
- Docs: Markdown with clear headings; include command snippets in fenced blocks.
- When touching config, update both YAML and `Config` class defaults.

---

## 8. Quick Reference Commands

| Purpose | Command |
| --- | --- |
| List tmux sessions | `docker exec hephaestus-server tmux -S /tmp/tmux-shared/default list-sessions` |
| Check queue status | `curl http://localhost:8000/api/queue_status` |
| View agent status | `curl http://localhost:8000/agent_status` |
| Tail monitor logs | `docker exec hephaestus-app tail -f /app/logs/monitor.log` |
| Inspect worktrees | `ls /tmp/hephaestus_worktrees` |

---

## 9. When in Doubt

- Ask for clarification if requirements conflict.
- Surface trade-offs, especially around long-running agents, cleanup cadence, or git merges.
- Log significant observations in your response (performance issues, suspicious logs, etc.).

These rules ensure the Augment AI assistant preserves system health while delivering rapid fixes. Keep this file handy and update it whenever you introduce new operational constraints.***
