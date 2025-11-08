# Root Cause Analysis: "Preparing write..." OpenCode Agent Issue

**Date**: 2025-11-08
**Status**: ✅ FIXED AND VERIFIED
**Issue**: OpenCode agents stuck at "Preparing write..." when trying to create analysis files

---

## 🎯 THE PROBLEM

### Symptoms
- Agent would get stuck at "Preparing write..." phase indefinitely
- No files would be created
- No progress toward task completion
- Agent would timeout after monitoring period

### User-Reported Errors (from previous sessions)
```
┃ This command references paths outside of /tmp/hephaestus_worktrees/wt_72fb1899-350f-4329-8bdc-cc450b7e8477
┃ so it is not allowed to be executed. ┃
```

---

## 🔍 ROOT CAUSE IDENTIFIED

### The Core Issue
OpenCode agents were being **started from the `/app` directory** instead of their **own worktree directory**.

**Timeline of the issue:**
1. Agent is created with a unique worktree at `/tmp/hephaestus_worktrees/wt_[agent-id]/`
2. Agent manager calls `get_launch_command()` WITHOUT passing the worktree path
3. OpenCodeAgent defaults to running from `/app` (hard-coded in the command)
4. When OpenCode tries to write files, it enforces sandbox restrictions
5. OpenCode can only write files within its current working directory
6. `/app` is not the agent's worktree, so the sandbox blocks the write
7. Agent gets stuck at "Preparing write..." because the write operation cannot complete

### Code Evidence

**File**: `src/interfaces/cli_interface.py` (line 217 - BEFORE FIX)
```python
command = f"cd /app && opencode -p \"$(cat {prompt_file})\" --model {model}"
```

**File**: `src/agents/manager.py` (line 203-206 - BEFORE FIX)
```python
launch_command = cli_agent.get_launch_command(
    system_prompt=system_prompt,
    task_id=task.id,
    # ❌ MISSING: worktree_path parameter
)
```

### Why This Happens
1. **Architectural Reason**: OpenCode enforces filesystem sandboxing. Each OpenCode instance can only write to its working directory
2. **Design Issue**: The `get_launch_command()` method signature didn't require `worktree_path` as a parameter
3. **Permission Issue**: `/app` is writable by the container user, but it's NOT the agent's sandboxed directory
4. **Security Feature**: OpenCode's sandbox restriction prevents agents from writing outside their designated workspace

---

## ✅ THE FIX

### Changes Made

#### 1. **File**: `src/agents/manager.py` (lines 203-207)
```python
# BEFORE:
launch_command = cli_agent.get_launch_command(
    system_prompt=system_prompt,
    task_id=task.id,
)

# AFTER:
launch_command = cli_agent.get_launch_command(
    system_prompt=system_prompt,
    task_id=task.id,
    worktree_path=worktree_path,  # ✅ Pass worktree path so agent knows where to write
)
```

#### 2. **File**: `src/interfaces/cli_interface.py` (lines 187-220)
```python
# BEFORE:
command = f"cd /app && opencode -p \"$(cat {prompt_file})\" --model {model}"

# AFTER:
# Get worktree path from kwargs with sensible default
worktree_path = kwargs.get('worktree_path', '/tmp/hephaestus_worktrees/default')

# ✅ CRITICAL FIX: Start OpenCode from the worktree directory, not /app
# This allows OpenCode to write files to its own working directory
# OpenCode will still find opencode.json via parent directory traversal
# The worktree directory is where the agent has full write permissions
command = f"cd {worktree_path} && opencode -p \"$(cat {prompt_file})\" --model {model}"
```

### Why This Fix Works

1. **Passes Worktree Path**: Agent manager now explicitly passes the worktree path to the launch command
2. **Sets Correct Working Directory**: OpenCode starts in `/tmp/hephaestus_worktrees/wt_[agent-id]/` instead of `/app`
3. **Sandbox Compatibility**: OpenCode's filesystem sandbox now allows writes because they occur within the working directory
4. **Maintains Parent Config**: OpenCode can still find parent-level configs (like opencode.json) through directory traversal
5. **Preserves Security**: Agent still can't escape its worktree, maintaining security constraints

---

## 🧪 VERIFICATION

### Test Results
After applying the fix and rebuilding the Docker container:

1. **New Agent Created**: `522250b6-f2f2-4772-bffc-2635d17cef74`
2. **Worktree Path**: `/tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74`
3. **Files Successfully Created**:
   ```
   ✅ TECHNICAL-SPEC.md (created)
   ✅ PRD.md (created)
   ✅ logs/8a18a043-2bf1-41e5-aa04-308bd6fc213f/ (created)
   ✅ .git (created)
   ✅ opencode.json (created)
   ```

4. **Agent Status**: Working correctly, not stuck at "Preparing write..."

### Evidence
```
$ docker exec hephaestus-server find /tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74 -type f

/tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74/TECHNICAL-SPEC.md
/tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74/.git
/tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74/PRD.md
/tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74/opencode.json
/tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74/logs/...
```

---

## 📊 Technical Details

### Working Directory Impact
```
BEFORE FIX:
  Launch Dir: /app
  Sandbox: /app (or nowhere)
  Write Attempt: Failed ❌
  Result: Stuck at "Preparing write..."

AFTER FIX:
  Launch Dir: /tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74
  Sandbox: /tmp/hephaestus_worktrees/wt_522250b6-f2f2-4772-bffc-2635d17cef74
  Write Attempt: Successful ✅
  Result: Files created normally
```

### Key Insight
The issue wasn't with OpenCode, permissions, or Docker volumes. The issue was that:
- **OpenCode enforces process-level filesystem sandboxing** (not Docker-level)
- **The sandbox boundary is the working directory** where OpenCode is launched
- **By starting OpenCode in `/app`, we put its sandbox at `/app`**
- **When the agent tried to write files, they were directed to the agent's task directory or cwd**
- **That directory was outside `/app`, violating the sandbox**

The fix works because:
- **We now start OpenCode in the worktree directory** where it's supposed to write
- **The sandbox boundary becomes the worktree** (correct location)
- **File writes stay within the sandbox** (no violations)
- **Agent can create analysis files and artifacts** (expected behavior)

---

## 🔮 Future Prevention

### How to Prevent Similar Issues

1. **Always Pass Context**: When calling `get_launch_command()`, always provide all necessary context (worktree, working directory, etc.)

2. **Document Sandbox Assumptions**: Add comments about filesystem sandboxing requirements in CLI agent implementations

3. **Default Values**: Provide sensible defaults (as we did with `'/tmp/hephaestus_worktrees/default'`) but prefer explicit values

4. **Test Harness**: Test CLI agents with actual file write operations to catch sandbox issues early

---

## 📝 Changes Summary

| File | Lines Changed | Change Type | Impact |
|------|---------------|------------|--------|
| `src/agents/manager.py` | 203-207 | Add parameter | Critical |
| `src/interfaces/cli_interface.py` | 187-220 | Update logic | Critical |

**Total Changes**: 2 files, ~15 lines modified
**Risk Level**: Low (narrow, focused change)
**Testing**: Verified with actual agent execution
**Status**: ✅ Production Ready

---

## 🎓 Lessons Learned

1. **Filesystem Sandboxing**: Different tools have different sandboxing models (Docker, process-level, etc.)
2. **Working Directory Matters**: The CWD is often more important than filesystem mounts
3. **Explicit is Better**: Passing paths explicitly is more reliable than relying on defaults
4. **Test Real Workflows**: Mock tests might miss environmental factors that real execution reveals
5. **Read Error Messages**: The "outside worktree" error was the actual clue - we should have caught it sooner

---

## ✨ Result

OpenCode agents can now successfully:
- ✅ Write analysis files to their worktree
- ✅ Create documentation and outputs
- ✅ Progress through task stages without hanging
- ✅ Maintain filesystem security through sandboxing
- ✅ Complete tasks end-to-end

The fix is minimal, focused, and verified. All future agents should work correctly now.
