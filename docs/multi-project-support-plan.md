# Multi-Project Concurrent Support Plan

## Context & Current Constraints

- **Single-project assumption everywhere**: `hephaestus_config.yaml` currently stores one `paths.project_root`, `paths.worktree_base`, and `git.main_repo_path`, so every service (agent creation, queue, memory, tickets) reads/write against `data/projects/stockton-ai` only. Bootstrapping (`scripts/bootstrap_project.py`) also assumes one repo + PRD path.
- **Subsystem coupling**: Docs such as `docs/core/worktree-isolation.md`, `docs/core/queue-and-task-management.md`, and `docs/core/memory-system.md` describe worktree, queue, and RAG flows that depend on a single git repo, a shared task table, and a shared Qdrant namespace (`hephaestus_*`). Ticket APIs (`docs/api/tickets.md`) and feature docs (`docs/features/task-deduplication.md`) similarly scope all semantics to one workflow/project.
- **Runtime layout review**: The repo root contains `src/agents`, `src/services`, `src/core`, `frontend/`, `docs/`, and `data/` (see `tree -L 2`). `data/projects` already holds multiple folders (`stockton-ai`, `stockton-ai-worktrees`), hinting we can extend this to a registry model.

> **Goal**: Allow Hephaestus to orchestrate *multiple distinct codebases* at once—each with isolated git state, worktrees, tickets, memories, and agent pools—while keeping shared infrastructure (FastAPI server, Guardian, queue) efficient and observable.

## Success Criteria

1. Users can register multiple projects (each with repo path, PRD, worktree root, ticket board config) without duplicating servers.
2. Task/ticket/agent CRUD APIs accept a `project_id` (auto-detected from agent context) and always route to the right git worktree, memory namespace, and Qdrant collection set.
3. Queue service enforces global concurrency limits **and** per-project limits to avoid starvation.
4. Bootstrap + SDK flows can launch workflows for different projects concurrently (e.g., run a Phase 1 analysis in Project A while validation proceeds in Project B).
5. Monitoring (Guardian, diagnostics, logs) can filter/aggregate per project; migrations keep existing single-project installs working by auto-creating a `default` project record.

## Proposed Architecture

### 1. Project Registry & Configuration Layer

- **Config file**: Replace single `paths.project_root` with:
  ```yaml
  projects:
    - id: stockton-ai
      name: Stockton AI
      repo_path: ./data/projects/stockton-ai
      prd_path: ./data/projects/stockton-ai/PRD.md
      worktree_base: /tmp/hephaestus_worktrees/stockton-ai
      phase_folder: ./src/workflow/prd_to_software
      ticket_board_config: config/boards/stockton-ai.json
      qdrant_namespace: hephaestus_stockton
      max_concurrent_agents: 3
  default_project_id: stockton-ai
  ```
- **ProjectRegistry service** (`src/core/project_registry.py`): loads config/database, exposes lookups, caches env paths, and validates that repo/worktree directories exist. Registry should expose atomic operations (register/update/archive).
- **CLI tooling**: extend `scripts/bootstrap_project.py` or add `scripts/project_admin.py` to register new projects, sync repos, or clone remote git URLs into `data/projects/<slug>`.

### 2. Database & Domain Model Extensions

- Add `projects` table (id, name, repo_path, prd_path, worktree_base, qdrant_namespace, metadata JSON).
- Add `project_id` foreign keys to all runtime tables that represent contextual work (`tasks`, `agents`, `tickets`, `workflows`, `ticket_comments`, `memories`, `results`, `agent_logs`, queue tables). Default existing rows to `default`.
- Create Alembic-style migration script (see `scripts/migrate_add_worktrees.py` as reference) to backfill data, add indices on `(project_id, status)` for hot paths, and enforce `NOT NULL` where viable.

### 3. Git, Worktrees, and Filesystem Isolation

- Enhance `WorktreeManager` (`src/core/worktree_manager.py`) to accept `project_id` and derive:
  - `repo_path` = `ProjectRegistry.get(project_id).repo_path`
  - `worktree_base` = `<project.worktree_base>/<agent_id>`
  - PRD symlink resolution per project.
- Track project context in `agent_worktrees` table and ensure cleanup scripts purge per-project directories.
- When an agent spawns subtasks (per docs/guides/phases-system.md), automatically inherit the parent `project_id`; guard rails so cross-project task creation requires explicit override + permissions.

### 4. Queue, Task Lifecycle, and Agent Manager

- QueueService (`src/services/queue_service.py`) should partition tasks by `project_id`, offering:
  - Global `max_concurrent_agents` (existing config) and optional per-project override (config-driven).
  - Fair scheduling (round-robin or weighted) so one noisy project cannot starve others.
- AgentManager must pass `project_id` through tmux env vars and to MCP headers (e.g., `X-Project-ID`) so backend endpoints can auto-detect context when agents call `create_ticket`, `save_memory`, etc.
- Update REST/MCP endpoints:
  - Accept `project_id` in payloads and fallback to: agent context → task → project.
  - Expose `/api/projects`, `/api/projects/{id}/status`, `/api/tasks?project_id=...`.
- Phase definitions (`src/workflow/**/*.json|yaml`) can be reused, but allow per-project overrides (e.g., `projects/<id>/phases.json`).

### 5. Memory & Vector Store Namespacing

- Following `docs/core/memory-system.md`, create per-project Qdrant collections or use a `project_id` payload field and filter on retrieval.
- `vector_store.collection_prefix` should become a template (`hephaestus_{project_id}`); `MemoryService` picks the right collection automatically.
- Support global/shared collections (e.g., CVE knowledge) but default all agent-written memories, ticket embeddings, and task dedup vectors to the project namespace.
- Provide migration util to clone existing embeddings into the new namespaced collection.

### 6. Tickets, Deduplication, and Search

- Extend TicketService/search pipelines (`docs/api/tickets.md`, `docs/features/task-deduplication.md`) to include `project_id` filters both in SQLite FTS5 queries and Qdrant hybrid search.
- Update `ticket_board_config` loading so each project can define its own columns/types; fallback to global defaults otherwise.
- Ensure `task_similarity_service` only detects duplicates within the same project & phase combination.

### 7. SDK, CLI, and Automation Touchpoints

- Update `HephaestusSDK` (`docs/sdk/overview.md`) to accept `project_id`:
  ```python
  sdk = HephaestusSDK(project_id="stockton-ai", phases=..., working_directory="...")
  ```
- Add helper APIs for listing projects, retrieving defaults, and switching contexts mid-run (e.g., `sdk.with_project("new")`).
- Update bootstrap + SWEbench scripts to optionally loop through project IDs, and ensure `check_setup_macos.py` validates that every configured project has required env (git repo present, PRD file, etc.).

### 8. Monitoring, Guardian, and Observability

- Guardian + diagnostic agents (`docs/guides/guardian-monitoring.md`, `docs/features/diagnostic-agents.md`) need project filters so they only intervene with agents working on their project.
- Monitoring dashboards (frontend) should gain a project switcher and per-project summaries (active agents, queued tasks, ticket counts, memory stats).
- Logging (`logs/session_*.json`) should include `project_id` for easier Kibana/Grafana ingestion.

## Implementation Plan

1. **Discovery & Schema Design (1 sprint)**
   - Finalize `projects` config schema + DB ERD.
   - Write migration scripts + dry-run on sample DB (`data/hephaestus.db`).
   - Update docs (`docs/core`, `docs/getting-started/bootstrap-new-project.md`) to describe multi-project conceptually.

2. **Foundational Plumbing (1–2 sprints)**
   - Implement `ProjectRegistry`, config loader changes, and new CLI commands.
   - Refactor WorktreeManager + file layout to require `project_id`.
   - Ensure bootstrap + SDK can register/select projects, even if runtime still single-project (feature flags).

3. **Runtime & API Integration (2 sprints)**
   - Thread `project_id` through AgentManager, QueueService, task/ticket endpoints, and MCP tools (update `claude_mcp_client.py`, `qdrant_mcp_openai.py` as needed).
   - Introduce per-project concurrency controls and scheduling fairness.
   - Implement memory + Qdrant namespacing and migrate embeddings.

4. **Frontend, Monitoring, and UX (1–2 sprints)**
   - Add project switcher + filters to frontend (Kanban, phases, task tables, observability views).
   - Extend Guardian/diagnostic flows to respect project scoping.
   - Enhance logging/metrics to include project-level dashboards.

5. **Stabilization & Rollout (1 sprint)**
   - Backfill tests (unit/integration/e2e) covering cross-project isolation (see `tests/test_queue_service.py`, `tests/test_worktree_manager.py`, `tests/test_ticket_system.py`).
   - Provide migration guide + fallback plan (ability to run legacy single-project mode).
   - Update docs/guides/getting-started to show running two projects simultaneously, plus troubleshooting entries.

## Risks & Mitigations

- **Data migration complexity**: Backfill scripts must lock tables briefly; mitigate by providing offline migration command + backups (`sqlite3 .backup`). Add feature flag to keep legacy behavior until migration succeeds.
- **Resource contention**: Running more projects increases CPU/GPU usage; incorporate per-project agent caps + scheduler fairness, and document hardware sizing guidance.
- **Cross-project contamination**: Slight mistakes in path routing could leak files/memories. Add guard assertions (e.g., agent workspace paths must start with project’s `worktree_base`) and automated tests that intentionally create cross-project tasks to ensure errors are raised.
- **DX regression**: More config can overwhelm users. Provide `scripts/project_admin.py init --from-git <url>` that scaffolds entries, and keep `default_project_id` for quick single-project setups.

## Documentation & Communication Updates

- Update `docs/getting-started/quick-start.md` and `bootstrap-new-project.md` with multi-project bootstrap commands.
- Add a dedicated guide (this document) under `docs/` and link it from `START_HERE.md` + `README.md`.
- Extend troubleshooting (`docs/troubleshooting/agent-issues.md`) with per-project debugging tips (e.g., verifying the correct project_id is reaching MCP headers).

## Appendix A – Repository Structure Highlights

- `src/core/` – config, WorktreeManager, database access points that need project awareness.
- `src/services/` – queue, task similarity, ticket services that will gain `project_id` filters.
- `src/memory/` & `qdrant_mcp_openai.py` – handle embeddings that must be namespaced.
- `frontend/src/` – UI components for phases, tickets, monitoring dashboards.
- `docs/` – authoritative references used in this plan: `core/{worktree-isolation,memory-system,queue-and-task-management}.md`, `features/{task-deduplication,diagnostic-agents}.md`, `guides/phases-system.md`, `api/tickets.md`, `sdk/overview.md`, `getting-started/*`.

This plan preserves Hephaestus’s existing strengths (self-building workflows, powerful queueing, worktree isolation, RAG memory) while methodically extending each subsystem to reason about multiple concurrent projects.
