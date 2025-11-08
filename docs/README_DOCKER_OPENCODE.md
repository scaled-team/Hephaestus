# Hephaestus Docker + OpenCode Setup Guide

**Status**: ✅ Production Ready
**Last Updated**: 2025-11-07
**Version**: 1.0

---

## 📖 Start Here

This document is the main entry point for understanding how Hephaestus works with OpenCode agents in Docker.

### Quick Navigation

**Are you...?**

- **An OpenCode Agent** → Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **A Developer** → Read [OPENCODE_QUICK_REFERENCE.md](./OPENCODE_QUICK_REFERENCE.md)
- **Deploying/Maintaining** → Read [docker-compose.yml](./docker-compose.yml)
- **Looking for Details** → Read [OPENCODE_FILE_WRITE_GUIDE.md](./OPENCODE_FILE_WRITE_GUIDE.md)
- **Can't Find Something** → Read [DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md)

---

## 🎯 The Core Constraint

When running in Docker, OpenCode agents can **ONLY write to these paths**:

```
/app/data/     → Databases, cache, persistent data
/app/logs/     → Log files, execution records
/app/docs/     → Documentation, reports
/app/projects/ → Project workspaces
/app/src/      → Source code
/app/scripts/  → Utility scripts
```

**Anything else will fail with "Write outside of project scope" error.**

---

## 🚀 Quick Start (For Agents)

### 1. Know Your Constraints
```python
# ✅ WORKS - Path starts with /app/
with open('/app/logs/output.txt', 'w') as f:
    f.write('Success!')

# ❌ FAILS - Path doesn't start with /app/
with open('/root/output.txt', 'w') as f:
    f.write('This will error!')
```

### 2. Create Directories First
```python
from pathlib import Path

# ✅ WORKS - Create parent directories
Path('/app/logs/subdir').mkdir(parents=True, exist_ok=True)
with open('/app/logs/subdir/output.txt', 'w') as f:
    f.write('Success!')

# ❌ FAILS - Directory doesn't exist
with open('/app/logs/nonexistent/output.txt', 'w') as f:
    f.write('This will error!')
```

### 3. Use Absolute Paths
```python
# ✅ WORKS - Absolute path
with open('/app/logs/output.txt', 'w') as f:
    f.write('Success!')

# ⚠️ RISKY - Relative path (behavior varies)
with open('output.txt', 'w') as f:
    f.write('Depends on working directory')
```

### 4. Log Success
```python
print(f'✅ Wrote to: /app/logs/output.txt')
```

---

## 📋 Complete Documentation

| File | Purpose | Read When |
|------|---------|-----------|
| **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** | Complete agent guide | You're an agent, getting started |
| **[OPENCODE_QUICK_REFERENCE.md](./OPENCODE_QUICK_REFERENCE.md)** | Quick lookup card | You need a quick answer |
| **[OPENCODE_FILE_WRITE_GUIDE.md](./OPENCODE_FILE_WRITE_GUIDE.md)** | Detailed technical guide | You need deep understanding |
| **[docker-compose.yml](./docker-compose.yml)** | Infrastructure config | You're deploying or maintaining |
| **[Dockerfile](./Dockerfile)** | Image definition | You're building or modifying the image |
| **[opencode.json](./opencode.json)** | Agent configuration | You're configuring agents |
| **[DOCKER_OPENCODE_UPDATE_SUMMARY.md](./DOCKER_OPENCODE_UPDATE_SUMMARY.md)** | Summary of updates | You want to understand what changed |
| **[DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md)** | Navigation guide | You can't find something |
| **[COMPLETION_REPORT.md](./COMPLETION_REPORT.md)** | Work completion summary | You want to verify all work is done |

---

## ⚡ Common Tasks

### Task: Write a Log File
```python
from pathlib import Path

log_dir = '/app/logs/my_agent'
Path(log_dir).mkdir(parents=True, exist_ok=True)

with open(f'{log_dir}/execution.log', 'w') as f:
    f.write('Agent execution log\n')

print(f'✅ Log written to: {log_dir}/execution.log')
```

### Task: Cache a Result
```python
from pathlib import Path
import json

cache_dir = '/app/data/cache'
Path(cache_dir).mkdir(parents=True, exist_ok=True)

result = {'status': 'success', 'data': [1, 2, 3]}
with open(f'{cache_dir}/result.json', 'w') as f:
    json.dump(result, f)

print(f'✅ Cache written to: {cache_dir}/result.json')
```

### Task: Write a Report
```python
from pathlib import Path

doc_dir = '/app/docs/analysis'
Path(doc_dir).mkdir(parents=True, exist_ok=True)

report = """# Analysis Report

## Findings
- Finding 1
- Finding 2

## Recommendations
1. Action 1
2. Action 2
"""

with open(f'{doc_dir}/report.md', 'w') as f:
    f.write(report)

print(f'✅ Report written to: {doc_dir}/report.md')
```

---

## ❌ Common Mistakes (And How to Fix Them)

### Mistake 1: Writing to /root/
```python
# ❌ WRONG
with open('/root/myfile.txt', 'w') as f:  # /root is not mounted!
    f.write('data')

# ✅ CORRECT
from pathlib import Path
Path('/app/logs').mkdir(parents=True, exist_ok=True)
with open('/app/logs/myfile.txt', 'w') as f:
    f.write('data')
```

### Mistake 2: Parent Directory Doesn't Exist
```python
# ❌ WRONG
with open('/app/logs/subdir/file.txt', 'w') as f:  # subdir doesn't exist!
    f.write('data')

# ✅ CORRECT
from pathlib import Path
Path('/app/logs/subdir').mkdir(parents=True, exist_ok=True)
with open('/app/logs/subdir/file.txt', 'w') as f:
    f.write('data')
```

### Mistake 3: Writing to /tmp/
```python
# ❌ WRONG
with open('/tmp/myfile.txt', 'w') as f:  # /tmp is not mounted!
    f.write('data')

# ✅ CORRECT
from pathlib import Path
Path('/app/logs').mkdir(parents=True, exist_ok=True)
with open('/app/logs/myfile.txt', 'w') as f:
    f.write('data')
```

---

## 🔧 Infrastructure Overview

### Docker Architecture
```
Host Machine (./data/, ./logs/, ./docs/, etc.)
        ↓
Docker Compose (docker-compose.yml)
        ↓
Volume Mounts (./data/ ← → /app/data/, etc.)
        ↓
Container (hephaestus-server)
        ↓
OpenCode Agent (runs inside container)
        ↓
File Write Attempts (ONLY to /app/mounted/paths)
```

### Volume Mounts
```
Host Path          ↔  Container Path    ↔ Writable?
./data/            ↔  /app/data/        ✅ Yes
./logs/            ↔  /app/logs/        ✅ Yes
./docs/            ↔  /app/docs/        ✅ Yes
./projects/        ↔  /app/projects/    ✅ Yes
./src/             ↔  /app/src/         ✅ Yes
./scripts/         ↔  /app/scripts/     ✅ Yes
/root/             ↔  (not mounted)     ❌ No
/tmp/              ↔  (not mounted)     ❌ No
```

---

## 📊 System Information

### Container Details
- **Image**: python:3.11-slim
- **Working Directory**: /app
- **OpenCode Version**: Latest
- **Available Services**: qdrant (vector store), hephaestus (task management)

### Configuration Files
- **opencode.json** - Agent configuration with embedded guidance
- **docker-compose.yml** - Infrastructure with volume mounts
- **Dockerfile** - Image definition with constraints

### Key Files (From Host)
- **./data/** - Persistent data (mounted as /app/data/ in container)
- **./logs/** - Log files (mounted as /app/logs/ in container)
- **./docs/** - Documentation (mounted as /app/docs/ in container)
- **./projects/** - Project workspaces (mounted as /app/projects/ in container)
- **./src/** - Source code (mounted as /app/src/ in container)
- **./scripts/** - Scripts (mounted as /app/scripts/ in container)

---

## 🎓 Key Concepts

### Why These Constraints?
1. **Isolation** - Agents can't accidentally modify system files
2. **Persistence** - Files survive container restarts
3. **Security** - Controlled filesystem access
4. **Debugging** - Easy to inspect files from host
5. **Clarity** - Developers know exactly where to write

### How Docker Works
- Container has its own filesystem
- Only paths in `docker-compose.yml` volumes are shared with host
- Agent writes to `/app/` = writes to `./` on host
- Host can inspect, backup, or share agent outputs

### OpenCode Configuration
- **opencode.json** contains agent context and constraints
- **agent_context.critical_constraints** lists what agents must follow
- **file_write_guide** documents writable paths
- **agent_instructions** provides code examples
- **error_handling** explains common problems and solutions

---

## ✅ Verification

### Verify Your Setup Works
```bash
# Inside container, test all writable paths
mkdir -p /app/logs/test && touch /app/logs/test/test.txt && echo "✓ /app/logs"
mkdir -p /app/data/test && touch /app/data/test/test.txt && echo "✓ /app/data"
mkdir -p /app/docs/test && touch /app/docs/test/test.txt && echo "✓ /app/docs"
mkdir -p /app/projects/test && touch /app/projects/test/test.txt && echo "✓ /app/projects"
mkdir -p /app/src/test && touch /app/src/test/test.txt && echo "✓ /app/src"
mkdir -p /app/scripts/test && touch /app/scripts/test/test.txt && echo "✓ /app/scripts"
```

### Verify From Host
```bash
# Host can see files written by container
ls -la ./logs/test/     # Should see test.txt
ls -la ./data/test/     # Should see test.txt
# ... and so on for other directories
```

---

## 🆘 Troubleshooting

### Error: "Write outside of project scope"
**Cause**: Path doesn't start with `/app/` or isn't mounted
**Solution**: Use only `/app/data/`, `/app/logs/`, `/app/docs/`, `/app/projects/`, `/app/src/`, or `/app/scripts/`

### Error: "No such file or directory"
**Cause**: Parent directory doesn't exist
**Solution**: Create it first: `Path(dir).mkdir(parents=True, exist_ok=True)`

### Error: "Permission denied"
**Cause**: Directory is read-only or not properly mounted
**Solution**: Check docker-compose.yml to ensure path is mounted without `:ro`

### Files Not Appearing on Host
**Cause**: Written to unmounted path
**Solution**: Verify file is in one of the 6 `/app/` mounted directories

**For more help**: See [DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md)

---

## 📞 Documentation Map

```
README_DOCKER_OPENCODE.md (← you are here)
    ↓
    ├─→ IMPLEMENTATION_GUIDE.md (for agents)
    ├─→ OPENCODE_QUICK_REFERENCE.md (for developers)
    ├─→ OPENCODE_FILE_WRITE_GUIDE.md (for technical details)
    ├─→ docker-compose.yml (infrastructure)
    ├─→ Dockerfile (image definition)
    ├─→ opencode.json (agent configuration)
    └─→ DOCKER_OPENCODE_DOCUMENTATION_INDEX.md (navigation)
```

---

## 🚀 Next Steps

1. **Read** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) if you're an agent
2. **Check** [opencode.json](./opencode.json) for configuration
3. **Review** [docker-compose.yml](./docker-compose.yml) if deploying
4. **Search** [DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md) if you need something else
5. **Test** with verification steps above

---

## ✨ Summary

- **6 Writable Paths**: /app/data/, /app/logs/, /app/docs/, /app/projects/, /app/src/, /app/scripts/
- **1 Golden Rule**: All paths must start with /app/
- **2 Key Steps**: Create directory, write file
- **3+ Perspectives**: Agent, Developer, DevOps documentation
- **4+ Guides**: Quick start, quick reference, detailed, technical
- **Unlimited Support**: Documentation covers all scenarios

---

**Ready to start? Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)!** 🎯

