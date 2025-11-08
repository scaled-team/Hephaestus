# OpenCode Agent File Writing - Documentation Index

## 🎯 Problem You're Facing

Your OpenCode agents running in Docker containers are getting errors like:
```
"Write outside of project scope"
"Permission denied"
"No such file or directory"
```

**This is solved! Read below.** ✅

---

## 📚 Documentation Files

Choose the right guide based on your needs:

### 1. **OPENCODE_DOCKER_SOLUTION.txt** (START HERE)
- **Length**: Quick read (3-5 minutes)
- **Format**: Plain text with clear sections
- **Best for**: Getting the TL;DR and quick fixes
- **Contains**:
  - Problem identification
  - Quick solution summary
  - Code examples (before/after)
  - Docker volume configuration
  - Quick start for agents

**Read this first if you want immediate answers!**

### 2. **OPENCODE_QUICK_REFERENCE.md** (BOOKMARK THIS)
- **Length**: Reference card (2 minutes to scan)
- **Format**: Markdown with copy-paste code
- **Best for**: Quick lookups during development
- **Contains**:
  - TL;DR summary
  - Copy-paste ready code examples
  - Volume mapping cheat sheet
  - Common errors & fixes
  - One-liners for file operations

**Use this as a quick reference while coding!**

### 3. **OPENCODE_FILE_WRITE_GUIDE.md** (COMPREHENSIVE)
- **Length**: Complete guide (10-15 minutes)
- **Format**: Markdown with extensive examples
- **Best for**: Deep understanding and best practices
- **Contains**:
  - Detailed problem explanation
  - All writable directories with descriptions
  - How to write files correctly
  - Error scenarios and solutions
  - Real-world examples
  - File organization recommendations
  - Troubleshooting section
  - Best practices for agents

**Read this for complete understanding!**

---

## 🚀 Quick Start (30 seconds)

**The Problem:**
```
Agent tries: with open("/root/myfile.txt", 'w') as f:
Error: "Write outside of project scope"
```

**The Solution:**
```python
# Use /app/ paths instead!
from pathlib import Path

Path("/app/logs").mkdir(parents=True, exist_ok=True)
with open("/app/logs/myfile.txt", 'w') as f:
    f.write("data")
# ✅ Success!
```

**Why it works:** Docker volumes mount `./logs/` to `/app/logs/` in the container.

---

## 📋 Writable Paths Reference

Inside Docker containers, agents can ONLY write to:

| Path | Purpose | Host Equivalent |
|------|---------|-----------------|
| `/app/data/` | Database, cache | `./data/` |
| `/app/logs/` | Logs, metrics | `./logs/` |
| `/app/docs/` | Documentation | `./docs/` |
| `/app/projects/` | Project files | `./projects/` |
| `/app/src/` | Source code | `./src/` |
| `/app/scripts/` | Scripts | `./scripts/` |

**Any other path will fail!**

---

## 🎓 Recommended Reading Path

**If you have 30 seconds:**
1. Read the "Quick Start" section above
2. Refer to "Writable Paths Reference" table

**If you have 5 minutes:**
1. Read `OPENCODE_DOCKER_SOLUTION.txt`
2. Use code examples as reference

**If you have 15 minutes:**
1. Read `OPENCODE_QUICK_REFERENCE.md`
2. Copy code snippets for your use case
3. Bookmark for future reference

**If you want complete mastery:**
1. Read `OPENCODE_FILE_WRITE_GUIDE.md` completely
2. Study the examples section
3. Review best practices
4. Save for reference

---

## 💡 Common Scenarios

### Scenario 1: Agent Needs to Log Output
```python
from pathlib import Path

# ✅ CORRECT
Path("/app/logs/myagent").mkdir(parents=True, exist_ok=True)
with open("/app/logs/myagent/output.log", 'w') as f:
    f.write("Agent output here")

# Host can see it at: ./logs/myagent/output.log
```

### Scenario 2: Agent Needs to Cache Data
```python
import pickle
from pathlib import Path

# ✅ CORRECT
Path("/app/data/cache").mkdir(parents=True, exist_ok=True)
with open("/app/data/cache/data.pkl", 'wb') as f:
    pickle.dump({"key": "value"}, f)

# Host can see it at: ./data/cache/data.pkl
```

### Scenario 3: Agent Needs to Write Documentation
```python
from pathlib import Path

# ✅ CORRECT
Path("/app/docs/analysis").mkdir(parents=True, exist_ok=True)
with open("/app/docs/analysis/report.md", 'w') as f:
    f.write("# Analysis Report\n\nResults...")

# Host can see it at: ./docs/analysis/report.md
```

---

## 🔧 Docker Configuration Reference

The magic happens in `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data         # ./data on host → /app/data in container
  - ./logs:/app/logs         # ./logs on host → /app/logs in container
  - ./docs:/app/docs         # ./docs on host → /app/docs in container
  # ... and more
```

This means:
- Files written to `/app/data/` in container appear in `./data/` on host
- It's bidirectional - changes on either side are visible to both
- Any path NOT in the volumes list is not accessible

---

## ❓ FAQ

**Q: Why can't I write to `/root/`?**
A: It's not mounted in docker-compose.yml. Only `/app/` paths are mounted.

**Q: Do I need to change my code between Docker and local?**
A: No! Always use `/app/` paths in your code. On the host, they appear in `./data/`, `./logs/`, etc.

**Q: What if the directory doesn't exist?**
A: Create it first with `Path("/app/path").mkdir(parents=True, exist_ok=True)`

**Q: Can the host access files written by the agent?**
A: Yes! Files in `/app/data/` appear in `./data/`, `/app/logs/` in `./logs/`, etc.

**Q: What about absolute paths from the host?**
A: Use relative paths on host: `./data/`, `./logs/`, etc. These correspond to `/app/data/`, `/app/logs/` in container.

---

## 🆘 Troubleshooting

**Error: "Write outside of project scope"**
- Check if path starts with `/app/`
- Verify volume is in docker-compose.yml
- Use absolute path instead of relative

**Error: "Permission denied"**
- Create directory first: `Path("/app/dir").mkdir(parents=True, exist_ok=True)`
- Check file permissions

**Error: "No such file or directory"**
- Create parent directories first
- Don't assume directories exist
- Use `mkdir(parents=True, exist_ok=True)`

---

## 📞 Next Steps

1. **Quick fix?** → Read `OPENCODE_DOCKER_SOLUTION.txt`
2. **Need reference?** → Use `OPENCODE_QUICK_REFERENCE.md`
3. **Want mastery?** → Study `OPENCODE_FILE_WRITE_GUIDE.md`
4. **Want to see config?** → Check `docker-compose.yml`

---

## ✅ Success Checklist

When file writing works correctly:

- [ ] Path starts with `/app/`
- [ ] Directory exists (created before writing)
- [ ] File appears on host in corresponding `./` directory
- [ ] No "Write outside of project scope" errors
- [ ] Agent can read the file back

---

**You've got this! Start with the OPENCODE_DOCKER_SOLUTION.txt file.** 🚀

