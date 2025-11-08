# 🚀 START HERE - Docker & OpenCode Setup

**Status**: ✅ Production Ready
**Last Updated**: 2025-11-07
**Total Documentation**: ~8,500 lines

---

## ⚡ TL;DR (30 seconds)

OpenCode agents running in Docker can **ONLY write to these 6 paths**:

```
/app/data/     → Persistent data, cache, databases
/app/logs/     → Log files, execution records
/app/docs/     → Documentation, reports
/app/projects/ → Project workspaces
/app/src/      → Source code
/app/scripts/  → Utility scripts
```

**Everything else will fail!**

---

## 🎯 Choose Your Path

### 👤 I'm an OpenCode Agent
→ Read: **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**
- Quick Start in 2 minutes
- Code examples for your task
- Error scenarios and fixes

### 👨‍💻 I'm a Developer
→ Read: **[README_DOCKER_OPENCODE.md](./README_DOCKER_OPENCODE.md)**
- System overview
- Quick reference card
- Common tasks and solutions

### 🔧 I'm Deploying/Maintaining
→ Read: **[docker-compose.yml](./docker-compose.yml)**
- Infrastructure configuration
- Volume mounts explained
- Service definitions

### 🤔 I Can't Find Something
→ Read: **[DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md)**
- Navigation guide
- Topic index
- Search by problem

---

## 📖 Complete Documentation Map

```
┌─────────────────────────────────────────────────────────────┐
│                   START_HERE.md (you are here)              │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────────────────┐
    │            │                        │
    ▼            ▼                        ▼
AGENT?      DEVELOPER?            DevOps/Admin?
    │            │                        │
    ▼            ▼                        ▼
IMPL.GD.    README_DO.          docker-compose.yml
 (400L)      (300L)                  (180L)
    │            │                        │
    └────────────┼────────────────────────┘
                 │
    ┌────────────┼────────────────────────┐
    │            │                        │
    ▼            ▼                        ▼
   Quick    Technical Details      System Info
 Reference   File Write Guide    Update Summary
  (100L)       (370L)              (280L)
```

---

## 🎓 Quick Code Examples

### Example 1: Write a Log
```python
from pathlib import Path

log_dir = '/app/logs/my_task'
Path(log_dir).mkdir(parents=True, exist_ok=True)

with open(f'{log_dir}/output.log', 'w') as f:
    f.write('Agent execution log')

print(f'✅ Wrote to: {log_dir}/output.log')
```

### Example 2: Cache a Result
```python
from pathlib import Path
import json

cache_dir = '/app/data/cache'
Path(cache_dir).mkdir(parents=True, exist_ok=True)

data = {'status': 'success', 'value': 123}
with open(f'{cache_dir}/result.json', 'w') as f:
    json.dump(data, f)

print(f'✅ Cached to: {cache_dir}/result.json')
```

### Example 3: Write a Report
```python
from pathlib import Path

doc_dir = '/app/docs/analysis'
Path(doc_dir).mkdir(parents=True, exist_ok=True)

report = '# Report\n\nFindings...'
with open(f'{doc_dir}/report.md', 'w') as f:
    f.write(report)

print(f'✅ Report written to: {doc_dir}/report.md')
```

---

## ❌ Common Mistakes

| Mistake | ❌ Wrong | ✅ Correct |
|---------|---------|-----------|
| Writing to /root/ | `open('/root/file.txt')` | `open('/app/logs/file.txt')` |
| Parent dir doesn't exist | `open('/app/logs/sub/file')` | `Path('/app/logs/sub').mkdir(parents=True, exist_ok=True)` |
| Writing to /tmp/ | `open('/tmp/file.txt')` | `open('/app/logs/file.txt')` |
| Relative paths | `open('file.txt')` | `open('/app/logs/file.txt')` |

---

## 📊 Documentation Overview

| File | Purpose | Read Time |
|------|---------|-----------|
| **[README_DOCKER_OPENCODE.md](./README_DOCKER_OPENCODE.md)** | System overview + quick start | 10 min |
| **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** | Complete agent guide with examples | 20 min |
| **[OPENCODE_QUICK_REFERENCE.md](./OPENCODE_QUICK_REFERENCE.md)** | Quick lookup card | 5 min |
| **[OPENCODE_FILE_WRITE_GUIDE.md](./OPENCODE_FILE_WRITE_GUIDE.md)** | Deep technical reference | 30 min |
| **[docker-compose.yml](./docker-compose.yml)** | Infrastructure configuration | 10 min |
| **[opencode.json](./opencode.json)** | Agent configuration | 5 min |
| **[DOCKER_OPENCODE_UPDATE_SUMMARY.md](./DOCKER_OPENCODE_UPDATE_SUMMARY.md)** | Summary of changes | 15 min |
| **[DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md)** | Complete navigation guide | 10 min |
| **[COMPLETION_REPORT.md](./COMPLETION_REPORT.md)** | Work verification | 15 min |

---

## 🔍 Finding Information by Topic

### "Where can I write files?"
→ OPENCODE_QUICK_REFERENCE.md (line 4-14)
→ README_DOCKER_OPENCODE.md (section "The Core Constraint")

### "Show me code examples"
→ IMPLEMENTATION_GUIDE.md (section "Implementation Scenarios")
→ README_DOCKER_OPENCODE.md (section "Common Tasks")
→ opencode.json (agent_instructions.common_patterns)

### "I got an error"
→ README_DOCKER_OPENCODE.md (section "Common Mistakes")
→ IMPLEMENTATION_GUIDE.md (section "Error Scenarios & Solutions")
→ OPENCODE_FILE_WRITE_GUIDE.md (section "Troubleshooting")

### "Infrastructure/Docker question"
→ docker-compose.yml (with detailed comments)
→ Dockerfile (with constraints explained)
→ OPENCODE_FILE_WRITE_GUIDE.md (section "Docker Volume Mounts")

### "I need quick reference"
→ OPENCODE_QUICK_REFERENCE.md (1-page reference)

### "I need deep understanding"
→ OPENCODE_FILE_WRITE_GUIDE.md (comprehensive guide)

### "Can't find anything"
→ DOCKER_OPENCODE_DOCUMENTATION_INDEX.md (navigation + search)

---

## ✅ Verify Setup Works

```bash
# Inside container, test writable paths:
mkdir -p /app/logs/test && echo "✓ /app/logs is writable"
mkdir -p /app/data/test && echo "✓ /app/data is writable"
mkdir -p /app/docs/test && echo "✓ /app/docs is writable"
mkdir -p /app/projects/test && echo "✓ /app/projects is writable"
mkdir -p /app/src/test && echo "✓ /app/src is writable"
mkdir -p /app/scripts/test && echo "✓ /app/scripts is writable"

# On host, verify files appear:
ls -la ./logs/test/     # Should see test directory
ls -la ./data/test/     # Should see test directory
# ... and so on
```

---

## 🚀 Quick Start (2 minutes)

### Step 1: Understand Constraints
You can **ONLY write to**:
- `/app/data/` - Databases, cache, data
- `/app/logs/` - Log files, records
- `/app/docs/` - Documentation, reports
- `/app/projects/` - Project workspaces
- `/app/src/` - Source code
- `/app/scripts/` - Scripts

### Step 2: Create Directory
```python
from pathlib import Path
Path('/app/logs').mkdir(parents=True, exist_ok=True)
```

### Step 3: Write File
```python
with open('/app/logs/output.txt', 'w') as f:
    f.write('Success!')
```

### Step 4: Log It
```python
print(f'✅ Wrote to: /app/logs/output.txt')
```

---

## 📞 Having Issues?

| Problem | Check | Reference |
|---------|-------|-----------|
| "Write outside of project scope" | Path starts with `/app/`? | README_DOCKER_OPENCODE.md → Troubleshooting |
| "No such file or directory" | Parent directory created? | IMPLEMENTATION_GUIDE.md → Error 2 |
| "Permission denied" | Volume mounted writable? | docker-compose.yml → volumes section |
| Can't find answer | Search by topic | DOCKER_OPENCODE_DOCUMENTATION_INDEX.md |

---

## ⭐ Key Takeaways

1. **6 Writable Paths Only**: `/app/data/`, `/app/logs/`, `/app/docs/`, `/app/projects/`, `/app/src/`, `/app/scripts/`
2. **Always Use Absolute Paths**: Start with `/app/`
3. **Create Directories First**: Use `Path(dir).mkdir(parents=True, exist_ok=True)`
4. **Multiple Documentation**: Different docs for different needs
5. **Examples Available**: Copy-paste ready code included

---

## 🎯 Next Steps

**Choose your path:**

- **I'm an agent** → [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **I'm a developer** → [README_DOCKER_OPENCODE.md](./README_DOCKER_OPENCODE.md)
- **I'm deploying** → [docker-compose.yml](./docker-compose.yml)
- **I need to find something** → [DOCKER_OPENCODE_DOCUMENTATION_INDEX.md](./DOCKER_OPENCODE_DOCUMENTATION_INDEX.md)

---

**Ready? Pick a guide above and start! 🚀**

---

## 📊 Documentation Stats

- **Total Lines**: ~8,500
- **Files Updated**: 3 (docker-compose.yml, Dockerfile, opencode.json)
- **Files Created**: 7 new guides
- **Code Examples**: 20+
- **Error Scenarios**: 10+
- **Documentation Entry Points**: 5+
- **Audiences Covered**: 6+ (agents, developers, DevOps, leadership, etc.)

---

**Status**: ✅ Production Ready | **Date**: 2025-11-07 | **Version**: 1.0
