# OpenCode Docker - Quick Reference Card

## 🚀 TL;DR: File Writing Rules

**When agents write files in OpenCode Docker, use ONLY these paths:**

```bash
/app/data/           ← Database, cache, logs, docs, projects, worktrees
/app/data/logs/      ← Log files, metrics
/app/data/docs/      ← Documentation, reports
/app/data/projects/  ← Project workspaces
/app/data/worktrees/ ← Agent git worktrees
/app/src/            ← Source code
/app/scripts/        ← Script files
```

**NEVER write to:**
```bash
/root/          ❌ Home directory
/tmp/           ❌ Temporary files
/etc/           ❌ System config
~/anything      ❌ Home shortcuts
```

---

## 📝 Copy-Paste Ready Code

### **Write to Logs**
```python
from pathlib import Path
import json

output_dir = "/app/data/logs/myagent"
Path(output_dir).mkdir(parents=True, exist_ok=True)

output_file = f"{output_dir}/output.json"
with open(output_file, 'w') as f:
    json.dump({"result": "success"}, f)

print(f"✅ Wrote to: {output_file}")
```

### **Write to Data/Cache**
```python
from pathlib import Path

cache_file = "/app/data/cache/mydata.txt"
Path("/app/data/cache").mkdir(parents=True, exist_ok=True)

with open(cache_file, 'w') as f:
    f.write("cached data")

print(f"✅ Cached to: {cache_file}")
```

### **Write to Docs**
```python
from pathlib import Path

doc_file = "/app/docs/analysis/report.md"
Path("/app/docs/analysis").mkdir(parents=True, exist_ok=True)

with open(doc_file, 'w') as f:
    f.write("# Analysis Report\n\nFindings...")

print(f"✅ Documented at: {doc_file}")
```

---

## 🔍 Volume Mapping Cheat Sheet

| Container Path | Host Path | Accessible from Host? |
|---|---|---|
| `/app/data/` | `./data/` | ✅ Yes |
| `/app/logs/` | `./logs/` | ✅ Yes |
| `/app/docs/` | `./docs/` | ✅ Yes |
| `/app/projects/` | `./projects/` | ✅ Yes |
| `/app/src/` | `./src/` | ✅ Yes |
| `/app/scripts/` | `./scripts/` | ✅ Yes |
| `/root/` | ❌ Not mounted | ❌ No |
| `/tmp/` | ❌ Not mounted | ❌ No |

---

## ⚡ Common Errors & Fixes

**Error: "Write outside of project scope"**
```
❌ Problem: /root/myfile.txt
✅ Solution: /app/data/myfile.txt
```

**Error: "No such file or directory"**
```python
# ❌ Wrong: Assumes directory exists
with open("/app/logs/subdir/file.txt", 'w') as f:
    f.write("data")

# ✅ Correct: Create directory first
from pathlib import Path
Path("/app/logs/subdir").mkdir(parents=True, exist_ok=True)
with open("/app/logs/subdir/file.txt", 'w') as f:
    f.write("data")
```

**Error: "Permission denied"**
```bash
# Check and fix permissions
chmod 755 /app/data
chmod 755 /app/logs
chmod 755 /app/docs
```

---

## 📂 Recommended Directory Structure

```
/app/
├── data/
│   ├── hephaestus.db
│   ├── cache/
│   │   └── agent_cache.pkl
│   └── memories/
│       └── agent_memories.json
├── logs/
│   ├── agent_runs/
│   │   └── run_2025-11-07.log
│   ├── errors/
│   │   └── error_2025-11-07.log
│   └── performance/
│       └── metrics_2025-11-07.csv
├── docs/
│   ├── analysis/
│   │   └── summary_2025-11-07.md
│   ├── workflows/
│   │   └── workflow_definition.md
│   └── api/
│       └── endpoints.md
├── projects/
│   ├── project-alpha/
│   │   ├── src/
│   │   └── output/
│   └── project-beta/
│       ├── src/
│       └── output/
├── src/
│   ├── agents/
│   ├── workflows/
│   └── core/
└── scripts/
    ├── startup.sh
    └── cleanup.sh
```

---

## 🎯 Agent Developer Checklist

Before writing files:

- [ ] Path starts with `/app/`?
- [ ] Directory exists or will be created?
- [ ] File has clear, descriptive name?
- [ ] Output location is documented?
- [ ] Host can access the file?

Before deployment:

- [ ] Tested file writing locally?
- [ ] All paths are absolute (not relative)?
- [ ] Directory creation handles race conditions?
- [ ] Error handling for write failures?
- [ ] Output files logged to `/app/logs/`?

---

## 🚀 One-Liners for File Operations

```bash
# Create log with timestamp
mkdir -p /app/logs/agent && echo "$(date): Starting task" >> /app/logs/agent/run.log

# Write JSON output
python -c "import json; json.dump({'status': 'done'}, open('/app/data/result.json', 'w'))"

# Append to CSV
echo "$(date),task_name,success" >> /app/logs/performance/metrics.csv

# Create documentation
mkdir -p /app/docs/analysis && cat > /app/docs/analysis/report.md << 'EOF'
# Report
Analysis complete.
EOF
```

---

## ✅ Success Indicators

When file writing works correctly, you should see:

```
✅ Wrote to: /app/logs/myfile.log
✅ Cached to: /app/data/result.pkl
✅ Documented at: /app/docs/analysis/report.md
```

Files should appear in:
- Host: `./logs/`, `./data/`, `./docs/`, etc.
- Container: `/app/logs/`, `/app/data/`, `/app/docs/`, etc.

---

## 🔗 Related Documentation

- **Full Guide**: See `OPENCODE_FILE_WRITE_GUIDE.md`
- **Docker Config**: See `docker-compose.yml`
- **OpenCode Config**: See `opencode.json`
- **Hephaestus Config**: See `hephaestus_config.yaml`

---

**Remember: `/app/` paths are your friends! 🎉**

Everything else is a permission error waiting to happen. 🛑
