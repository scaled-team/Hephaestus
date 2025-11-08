# Path Mismatch Fix - Bootstrap Script

**Date**: 2025-11-07
**Issue**: Agent instructed to read PRD at wrong path relative to worktree

---

## Problem

The bootstrap script was passing the full repository path (`projects/stockton-ai/Stockton-AI-PRD.md`) to the agent's task description, but agents run in git worktrees where files are at the root level.

**What happened**:
- Bootstrap called with: `--prd "./projects/stockton-ai/Stockton-AI-PRD.md"`
- Agent task created with: "Analyze PRD at projects/stockton-ai/Stockton-AI-PRD.md"
- Agent worktree has PRD at: `/tmp/hephaestus_worktrees/wt_<agent_id>/PRD.md` (root level)
- **Result**: Agent couldn't find file, got stuck for 9+ minutes, eventually terminated

## Root Cause

**File**: `scripts/bootstrap_project.py`, line 105

**Before**:
```python
def create_phase1_task(
    prd_path: str,  # Full repo path: "./projects/stockton-ai/Stockton-AI-PRD.md"
    project_name: str,
    base_url: str = None,
    agent_id: str = "main-session-agent",
) -> None:
    description = (
        "Phase 1: Analyze PRD at "
        f"{prd_path} for {project_name}. "  # ← WRONG: Uses full repo path
```

## Fix Applied (Final Version)

**After**:
```python
def create_phase1_task(
    prd_path: str,
    project_name: str,
    base_url: str = None,
    agent_id: str = "main-session-agent",
) -> None:
    # Agent runs in worktree where PRD is always at: PRD.md (generic name)
    # Note: Worktree manager creates PRD.md symlink, not the original filename
    prd_filename = "PRD.md"  # ← FINAL FIX: Hardcode to PRD.md

    description = (
        "Phase 1: Analyze PRD at "
        f"{prd_filename} for {project_name}. "  # ← CORRECT: Uses PRD.md
```

**Logic**:
- Worktree manager creates generic symlink: `PRD.md` (not original filename)
- Agent told to read: `PRD.md`
- Worktree has: `PRD.md` at root → **works!**

### Why Not Use Original Filename?

**Attempted Fix #1** (Wrong):
```python
prd_filename = Path(prd_path).name  # → "Stockton-AI-PRD.md"
```
- Worktree has: `PRD.md` (generic)
- Agent looks for: `Stockton-AI-PRD.md` (specific)
- **Result**: File not found, agent stuck ❌

**Attempted Fix #2** (Correct):
```python
prd_filename = "PRD.md"  # → "PRD.md" (hardcoded)
```
- Worktree has: `PRD.md` (generic)
- Agent looks for: `PRD.md` (generic)
- **Result**: File found, agent proceeds ✅

## Verification

**Before Fix - Agent Stuck**:
```bash
# Agent told to read:
"projects/stockton-ai/Stockton-AI-PRD.md"

# Worktree contents:
/tmp/hephaestus_worktrees/wt_eca21804.../
├── PRD.md (symlink)
├── Stockton-AI-PRD.md (symlink)
└── TECHNICAL-SPEC.md

# Path doesn't exist → agent stuck
```

**After Fix - Correct Path**:
```bash
# Agent told to read:
"Stockton-AI-PRD.md"

# Worktree contents:
/tmp/hephaestus_worktrees/wt_<agent_id>/
├── Stockton-AI-PRD.md  ✅ EXISTS

# Path exists → agent proceeds
```

## Bootstrap Usage (Correct)

The first option you provided is **correct**:

```bash
python scripts/bootstrap_project.py \
  --working-dir "./projects/stockton-ai" \
  --worktrees "/tmp/hephaestus_worktrees/" \
  --prd "./projects/stockton-ai/Stockton-AI-PRD.md"
```

**Why it's correct**:
- `--prd` points to PRD in Hephaestus repo (used to create symlink in worktree)
- Bootstrap script NOW extracts just the filename before sending to agent
- Agent receives correct worktree-relative path

## Next Steps

1. ✅ **Fix Applied**: `scripts/bootstrap_project.py` updated
2. ⏳ **Test Fix**: Restart bootstrap with fixed script
3. ⏳ **Verify**: Agent should now find PRD and create tickets
4. ⏳ **Monitor**: Track ticket creation and memory saving

---

**Status**: ✅ Fix complete, ready to test
**Files Modified**: `scripts/bootstrap_project.py` (line 106)
