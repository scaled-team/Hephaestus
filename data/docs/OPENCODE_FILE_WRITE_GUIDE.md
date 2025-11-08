# OpenCode Agent File Write Guide - Docker Environment

## 🎯 Problem

OpenCode agents running in Docker containers receive "write outside of project scope" errors when trying to write files to locations outside the mounted volumes.

---

## 📁 Docker Volume Mounts (Writable Directories)

The Hephaestus Docker containers have these volume mounts available for writing:

### **Primary Writable Paths**

| Mount Point | Docker Path | Purpose | Status |
|------------|------------|---------|--------|
| `./data/` | `/app/data/` | Database, logs, docs, projects, worktrees | ✅ Writable |
| `./data/logs/` | `/app/data/logs/` | Log files | ✅ Writable |
| `./data/docs/` | `/app/data/docs/` | Documentation | ✅ Writable |
| `./data/projects/` | `/app/data/projects/` | Project workspaces | ✅ Writable |
| `./data/worktrees/` | `/app/data/worktrees/` | Agent git worktrees | ✅ Writable |
| `./src/` | `/app/src/` | Source code | ✅ Writable |
| `./scripts/` | `/app/scripts/` | Script files | ✅ Writable |

### **Read-Only / Configuration Mounts**

| Mount Point | Docker Path | Purpose | Status |
|------------|------------|---------|--------|
| `./hephaestus_config.yaml` | `/app/hephaestus_config.yaml` | Config | 🔒 Read-only |
| `./opencode.json` | `/app/opencode.json` | OpenCode config | 🔒 Read-only |
| `./.env` | `/app/.env` | Environment variables | 🔒 Read-only |

---

## ✅ How to Write Files Correctly

### **From Inside Docker Container**

When agents write files inside the Docker container, use these paths:

```bash
# ✅ CORRECT - Writing to writable volumes
/app/data/filename.txt
/app/logs/filename.log
/app/docs/filename.md
/app/projects/projectname/file.py
/app/src/modulename/file.ts
/app/scripts/scriptname.sh
```

### **From Host Machine (Outside Docker)**

These correspond to these host paths:

```bash
# ✅ CORRECT - Host equivalents
./data/filename.txt              → /app/data/filename.txt
./logs/filename.log              → /app/logs/filename.log
./docs/filename.md               → /app/docs/filename.md
./projects/projectname/file.py   → /app/projects/projectname/file.py
./src/modulename/file.ts         → /app/src/modulename/file.ts
./scripts/scriptname.sh           → /app/scripts/scriptname.sh
```

---

## ❌ What Causes "Write Outside of Project Scope" Errors

### **Error Scenario 1: Writing to Home Directory**
```bash
# ❌ FAILS - Not in mounted volumes
/root/myfile.txt
/root/.config/myfile.txt
~/.myfile.txt
```

**Fix**: Write to `/app/data/` instead:
```bash
# ✅ SUCCEEDS
/app/data/myfile.txt
```

### **Error Scenario 2: Writing to System Directories**
```bash
# ❌ FAILS - System directories not mounted
/tmp/myfile.txt
/var/log/myfile.log
/etc/myconfig.conf
```

**Fix**: Write to `/app/logs/` instead:
```bash
# ✅ SUCCEEDS
/app/logs/myfile.log
```

### **Error Scenario 3: Writing Outside Mounted Project**
```bash
# ❌ FAILS - Path outside Docker volume mounts
/Users/nova/Sites/bench/myfile.txt
/Users/nova/Desktop/myfile.txt
```

**Fix**: Write to project-relative path:
```bash
# ✅ SUCCEEDS
/app/projects/myproject/myfile.txt
```

---

## 🔧 Agent Best Practices for File Writing

### **1. Always Use Absolute Container Paths**

When writing from OpenCode agents inside Docker, use absolute paths within the container:

```python
# ✅ CORRECT
file_path = "/app/data/agent_output.txt"
with open(file_path, 'w') as f:
    f.write("Agent output")

# ❌ WRONG - Relative paths may fail
file_path = "data/agent_output.txt"
with open(file_path, 'w') as f:
    f.write("Agent output")
```

### **2. Create Directories Before Writing**

Always ensure the directory exists:

```python
import os
from pathlib import Path

# ✅ CORRECT
output_dir = "/app/logs/agent_runs"
Path(output_dir).mkdir(parents=True, exist_ok=True)

file_path = os.path.join(output_dir, "run_2025-11-07.log")
with open(file_path, 'w') as f:
    f.write("Run log")
```

### **3. Use Project-Specific Subdirectories**

Organize files by purpose and project:

```
/app/data/
  ├── hephaestus.db         # Database
  ├── agent_memories/       # Agent memory files
  └── cache/                # Cached data

/app/logs/
  ├── agent_runs/           # Agent execution logs
  ├── errors/               # Error logs
  └── performance/          # Performance metrics

/app/docs/
  ├── analysis/             # Analysis reports
  ├── workflows/            # Workflow documentation
  └── api/                  # API documentation

/app/projects/
  ├── project-alpha/        # Project workspace
  ├── project-beta/         # Project workspace
  └── shared/               # Shared project files
```

### **4. Document Your File Locations**

When an agent creates output files, document where they're written:

```bash
# At the end of agent execution, log:
echo "Output written to: /app/logs/agent_output/result_2025-11-07.json"
echo "Report available at: /app/docs/analysis/summary.md"
```

---

## 🚀 Docker Compose Volume Configuration Reference

### **From docker-compose.yml**

```yaml
hephaestus-server:
  volumes:
    # Data persistence
    - ./data:/app/data           # Host ./data → Container /app/data
    - ./logs:/app/logs           # Host ./logs → Container /app/logs
    - ./docs:/app/docs           # Host ./docs → Container /app/docs

    # Project workspace
    - ./projects:/app/projects   # Host ./projects → Container /app/projects

    # Source code
    - ./src:/app/src             # Host ./src → Container /app/src
    - ./scripts:/app/scripts     # Host ./scripts → Container /app/scripts
```

### **How Volume Mounts Work**

- **Left side** (host): Path on your machine
- **Right side** (container): Path inside Docker container
- **Colon separator**: `host_path:container_path`
- **Read/Write**: By default bidirectional (unless `:ro` added)

Example:
```yaml
- ./data:/app/data
  # Anything written to /app/data inside container
  # appears in ./data on host machine
```

---

## 📊 File Writing Checklist for Agents

Before writing files, agents should check:

- [ ] **Path is writable?** Use one of: `/app/data/`, `/app/logs/`, `/app/docs/`, `/app/projects/`, `/app/src/`, `/app/scripts/`
- [ ] **Directory exists?** Create with `mkdir -p` or `Path().mkdir()`
- [ ] **Proper permissions?** Use 644 for files, 755 for directories
- [ ] **File naming?** Use clear, descriptive names with timestamps
- [ ] **Host accessible?** Will the host be able to see the files?

---

## 🔍 Troubleshooting Write Errors

### **Error: "Write outside of project scope"**

```
Resolution:
1. Check if path starts with /app/
2. Verify directory is in docker-compose.yml volumes
3. Use absolute path instead of relative path
4. Create directory first if it doesn't exist
```

### **Error: "Permission denied"**

```
Resolution:
1. Check file permissions (should be 644)
2. Check directory permissions (should be 755)
3. Ensure /app/ parent directory is writable
4. Run: chmod 755 /app/data (if needed)
```

### **Error: "No such file or directory"**

```
Resolution:
1. Create parent directories: mkdir -p /app/logs/subdir
2. Don't rely on parent directory existing
3. Check for typos in path
4. Verify volume mount in docker-compose.yml
```

---

## 💡 Real-World Examples

### **Example 1: Agent Logging Analysis Results**

```python
# Agent needs to write analysis results
import json
from pathlib import Path

# ✅ CORRECT: Use /app/docs for documentation
output_dir = "/app/docs/analysis"
Path(output_dir).mkdir(parents=True, exist_ok=True)

analysis = {
    "agent": "analytics-agent",
    "timestamp": "2025-11-07T18:30:00Z",
    "findings": ["Finding 1", "Finding 2"]
}

output_file = f"{output_dir}/analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(output_file, 'w') as f:
    json.dump(analysis, f, indent=2)

print(f"✅ Analysis written to: {output_file}")
```

### **Example 2: Agent Performance Metrics**

```python
# Agent tracks performance metrics
import csv
from pathlib import Path

# ✅ CORRECT: Use /app/logs for metrics
metrics_dir = "/app/logs/performance"
Path(metrics_dir).mkdir(parents=True, exist_ok=True)

metrics_file = f"{metrics_dir}/metrics_{datetime.now().strftime('%Y%m%d')}.csv"

# Write metrics
with open(metrics_file, 'a', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        datetime.now().isoformat(),
        "query_execution",
        "0.234",  # seconds
        "success"
    ])

print(f"✅ Metrics logged to: {metrics_file}")
```

### **Example 3: Agent Caching Results**

```python
# Agent caches computation results
import pickle
from pathlib import Path

# ✅ CORRECT: Use /app/data for cached data
cache_dir = "/app/data/cache"
Path(cache_dir).mkdir(parents=True, exist_ok=True)

cache_file = f"{cache_dir}/computation_result.pkl"

result = {"computation": "expensive_operation", "value": 12345}
with open(cache_file, 'wb') as f:
    pickle.dump(result, f)

print(f"✅ Cache saved to: {cache_file}")
```

---

## 📋 Summary Table

### **What to Do When Agents Write Files**

| Scenario | Container Path | Host Path | Writable? |
|----------|---|---|---|
| All data | `/app/data/` | `./data/` | ✅ Yes |
| Log files | `/app/data/logs/` | `./data/logs/` | ✅ Yes |
| Documentation | `/app/data/docs/` | `./data/docs/` | ✅ Yes |
| Project files | `/app/data/projects/` | `./data/projects/` | ✅ Yes |
| Worktrees | `/app/data/worktrees/` | `./data/worktrees/` | ✅ Yes |
| Source code | `/app/src/` | `./src/` | ✅ Yes |
| Scripts | `/app/scripts/` | `./scripts/` | ✅ Yes |
| Config files | `/app/opencode.json` | `./opencode.json` | 🔒 Read-only |
| Home directory | `/root/` | N/A | ❌ No |
| System dirs | `/tmp/`, `/etc/` | N/A | ❌ No |

---

## 🎯 Key Takeaway

**Always write to `/app/` mounted volumes. Never write to:**
- `/root/` (home directory)
- `/tmp/` (temporary)
- `/etc/` (system config)
- Any path outside docker-compose.yml volumes

**For agents working in Docker: Use `/app/data/`, `/app/logs/`, `/app/docs/`, or `/app/projects/`**

---

## 📞 Additional Resources

- [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/)
- [docker-compose.yml in this project](./docker-compose.yml)
- [OpenCode Configuration](./opencode.json)
- [Hephaestus Configuration](./hephaestus_config.yaml)

