# 📁 How to Access Agent-Created Files

## Quick Answer

**Your agent files are here on your Mac:**
```
/Users/nova/Sites/bench/Hephaestus/
├── worktrees/          ← Agent git worktrees (agent output)
├── logs/               ← Agent execution logs
├── docs/               ← Generated documentation
├── data/               ← Database files, cache
└── projects/           ← Project workspaces
```

---

## Volume Mounts Explained

The Docker containers have **volume mounts** set up, which means:
- Files created **inside the container** automatically appear **on your Mac**
- You can edit them locally and they sync to the container
- No manual copying needed!

### Volume Mount Mapping

| Purpose | Host Path (Your Mac) | Container Path (Docker) | Status |
|---------|----------------------|-------------------------|--------|
| **Agent Worktrees** | `./worktrees/` | `/tmp/hephaestus_worktrees/` | ✅ Mounted |
| **Logs** | `./logs/` | `/app/logs/` | ✅ Mounted |
| **Documentation** | `./docs/` | `/app/docs/` | ✅ Mounted |
| **Data/Cache** | `./data/` | `/app/data/` | ✅ Mounted |
| **Projects** | `./projects/` | `/app/projects/` | ✅ Mounted |

---

## Where to Find Each Type of File

### 1. **Agent Output Files** (Git Worktrees)
**Location:** `/Users/nova/Sites/bench/Hephaestus/worktrees/`

These are the working directories where agents create/modify code:
```bash
cd /Users/nova/Sites/bench/Hephaestus/worktrees/
ls -la
```

Each agent gets a unique worktree:
- `wt_<agent-id>/` - Isolated git worktree for each agent
- `.git/` - Git configuration for that worktree
- `README.md` - Agent's work summary
- Other files the agent created

### 2. **Logs** (Agent Output & Errors)
**Location:** `/Users/nova/Sites/bench/Hephaestus/logs/`

Organized by agent ID:
```bash
cd /Users/nova/Sites/bench/Hephaestus/logs/
ls -la                     # See agent directories
cat <agent-id>/output.log # See what agent did
```

Contains:
- `output.log` - Everything the agent printed
- `error.log` - Any errors that occurred
- `state.log` - Agent state changes

### 3. **Documentation** (Generated Reports)
**Location:** `/Users/nova/Sites/bench/Hephaestus/docs/`

Test reports, analysis, and documentation:
```bash
ls -la /Users/nova/Sites/bench/Hephaestus/docs/
```

Files created by agents:
- `COMPLETION_REPORT.md` - Final summary
- `test_report_*.md` - Test results
- `CONFIGURATION_SUMMARY.md` - Setup details
- Various analysis documents

### 4. **Database Files**
**Location:** `/Users/nova/Sites/bench/Hephaestus/data/`

Contains:
- `hephaestus.db` - SQLite database with all tasks/tickets/agents
- Cache files and temporary data

### 5. **Projects**
**Location:** `/Users/nova/Sites/bench/Hephaestus/projects/`

Project workspaces and build artifacts

---

## Current Agent Status

### Active Agents Right Now
```bash
# Check what agents are working on:
curl -s "http://localhost:8000/api/agents" | jq '.[] | {id, status, current_task_id}'
```

### View Current Task Output
Each agent creates logs you can monitor:
```bash
# Find an agent ID from the curl command above, then:
tail -f /Users/nova/Sites/bench/Hephaestus/logs/<agent-id>/output.log
```

---

## Easy Access Commands

### Open Finder to Agent Files
```bash
open /Users/nova/Sites/bench/Hephaestus/worktrees/
open /Users/nova/Sites/bench/Hephaestus/docs/
open /Users/nova/Sites/bench/Hephaestus/logs/
```

### View Recent Agent Output
```bash
# Most recent 50 lines of output
tail -50 /Users/nova/Sites/bench/Hephaestus/logs/*/output.log | less

# Follow along as agent works
tail -f /Users/nova/Sites/bench/Hephaestus/logs/*/output.log
```

### List All Generated Reports
```bash
ls -lh /Users/nova/Sites/bench/Hephaestus/docs/ | grep -E "test_report|COMPLETION|SUMMARY"
```

### Check Database Status
```bash
# View all tickets
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db "SELECT id, title, status FROM tickets LIMIT 10;"

# View all tasks
sqlite3 /Users/nova/Sites/bench/Hephaestus/data/hephaestus.db "SELECT id, status, description FROM tasks LIMIT 10;"
```

---

## Real-Time Monitoring

### Monitor Agent Activity
```bash
# In one terminal, watch agent activity:
watch -n 2 'curl -s http://localhost:8000/api/agents | jq ".[] | {id: .id[0:8], status, task: .current_task_id[0:8]}"'

# In another terminal, follow logs:
tail -f /Users/nova/Sites/bench/Hephaestus/logs/*/output.log
```

### Get Task Progress
```bash
curl -s "http://localhost:8000/api/tasks?skip=0&limit=100" | jq '.[] | {status, description}'
```

---

## Docker Compose Volume Configuration

The volumes are defined in `docker-compose.yml`:

```yaml
volumes:
  # Agent worktrees (git working directories)
  - ./worktrees:/tmp/hephaestus_worktrees

  # Data persistence
  - ./data:/app/data
  - ./logs:/app/logs
  - ./docs:/app/docs
  - ./projects:/app/projects
```

This means:
- **Read/Write**: Both host and container can read/write
- **Real-time**: Changes sync immediately
- **Persistent**: Files survive container restarts

---

## Examples

### Example 1: View Test Report
```bash
ls /Users/nova/Sites/bench/Hephaestus/docs/test_report*.md
cat /Users/nova/Sites/bench/Hephaestus/docs/test_report_backend.md
```

### Example 2: Check What Agent Is Creating
```bash
# List files in an agent's worktree
ls -la /Users/nova/Sites/bench/Hephaestus/worktrees/wt_87a98ec3-8c7c-46d0-9d29-e471d97e6f29/

# View what they wrote
cat /Users/nova/Sites/bench/Hephaestus/worktrees/wt_87a98ec3-8c7c-46d0-9d29-e471d97e6f29/README.md
```

### Example 3: Watch Real-Time Output
```bash
# Keep a terminal window open with this:
cd /Users/nova/Sites/bench/Hephaestus
tail -f logs/*/output.log
```

---

## Troubleshooting

### Files Not Showing Up?
1. Check Docker is running:
   ```bash
   docker-compose ps
   ```

2. Verify volumes are mounted:
   ```bash
   docker inspect hephaestus-server | grep -A 20 Mounts
   ```

3. Check permissions:
   ```bash
   ls -la /Users/nova/Sites/bench/Hephaestus/ | grep -E "worktrees|logs|docs|data|projects"
   ```

### Can't Edit Files?
The volume is read-write, so you can:
- Open files in VS Code
- Edit locally
- Changes sync to container immediately

Just edit files directly in:
```
/Users/nova/Sites/bench/Hephaestus/
```

---

## Summary

**The bottom line:**
- All agent files appear on your Mac in `/Users/nova/Sites/bench/Hephaestus/`
- Open in Finder or VS Code to browse
- Edit files and they sync to Docker automatically
- No manual copying or volume setup needed - it's already configured!

Enjoy monitoring your agents work! 🎉
