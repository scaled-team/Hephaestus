# Hephaestus OpenCode Docker Implementation Guide

**Version**: 1.0
**Date**: 2025-11-07
**Status**: Ready for Deployment

---

## 🎯 Quick Start for Agents

You are running in a Docker container with specific file write constraints. Follow these rules and you'll have no problems:

### The Golden Rule
**Only write files to paths starting with `/app/` that are mounted in `docker-compose.yml`**

### The 6 Writable Paths
```
/app/data/     → Databases, cache, agent memories
/app/logs/     → Log files, execution records
/app/docs/     → Reports, documentation
/app/projects/ → Project workspaces, deliverables
/app/src/      → Source code modifications
/app/scripts/  → Utility scripts
```

### Pre-Execution Checklist
Before writing files, verify:
- ✓ Path starts with `/app/`
- ✓ Parent directory exists OR will be created
- ✓ Using absolute paths (not relative)
- ✓ NOT writing to `/root/`, `/tmp/`, `/etc/`, or other unmounted dirs

---

## 📖 Where to Find Information

| Question | Answer Location |
|----------|-----------------|
| "Where can I write files?" | opencode.json → agent_context → critical_constraints |
| "Show me code examples" | opencode.json → agent_instructions → common_patterns |
| "How do I fix write errors?" | opencode.json → file_write_guide → error_resolution |
| "What are best practices?" | opencode.json → agent_instructions → best_practices |
| "Quick reference?" | OPENCODE_QUICK_REFERENCE.md |
| "Detailed guide?" | OPENCODE_FILE_WRITE_GUIDE.md |
| "Docker setup?" | docker-compose.yml (top of file) |
| "Image details?" | Dockerfile (top of file) |

---

## 🔧 Implementation Scenarios

### Scenario 1: Logging Execution
**Goal**: Write logs during agent execution

```python
from pathlib import Path
from datetime import datetime

# Step 1: Define log directory
log_dir = '/app/logs/my_agent'

# Step 2: Create if doesn't exist
Path(log_dir).mkdir(parents=True, exist_ok=True)

# Step 3: Write log file with timestamp
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
log_file = f'{log_dir}/execution_{timestamp}.log'

with open(log_file, 'w') as f:
    f.write('Agent execution started\n')
    f.write('Processing...\n')
    f.write('Completed successfully\n')

# Step 4: Report completion
print(f'✅ Wrote logs to: {log_file}')
```

**Key Points**:
- Always use absolute paths starting with `/app/`
- Create directory with `mkdir(parents=True, exist_ok=True)`
- Use timestamps in filenames for multiple executions
- Print output location for verification

---

### Scenario 2: Caching Results
**Goal**: Cache computation results for reuse

```python
from pathlib import Path
import json

# Step 1: Define cache directory
cache_dir = '/app/data/computation_cache'

# Step 2: Create if doesn't exist
Path(cache_dir).mkdir(parents=True, exist_ok=True)

# Step 3: Prepare data
result = {
    'computation': 'expensive_operation',
    'value': 12345,
    'timestamp': '2025-11-07T18:30:00Z'
}

# Step 4: Write cache file
cache_file = f'{cache_dir}/result_cache.json'
with open(cache_file, 'w') as f:
    json.dump(result, f, indent=2)

# Step 5: Report completion
print(f'✅ Cached result to: {cache_file}')
```

**Key Points**:
- Use `/app/data/` for persistent data
- JSON format for human-readable cache
- Include metadata (timestamp, source) in cache
- Log cache location for debugging

---

### Scenario 3: Writing Documentation
**Goal**: Generate reports and documentation

```python
from pathlib import Path
from datetime import datetime

# Step 1: Define documentation directory
doc_dir = '/app/docs/analysis'

# Step 2: Create if doesn't exist
Path(doc_dir).mkdir(parents=True, exist_ok=True)

# Step 3: Generate report content
timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
report = f"""# Analysis Report

**Generated**: {timestamp}

## Findings
- Finding 1: Description
- Finding 2: Description
- Finding 3: Description

## Recommendations
1. Action 1
2. Action 2
3. Action 3

## Technical Details
```
Code example or technical output
```
"""

# Step 4: Write documentation
report_file = f'{doc_dir}/analysis_report_{datetime.now().strftime("%Y%m%d")}.md'
with open(report_file, 'w') as f:
    f.write(report)

# Step 5: Report completion
print(f'✅ Report written to: {report_file}')
```

**Key Points**:
- Use `/app/docs/` for documentation
- Use markdown format for readability
- Include generation timestamp
- Use date in filename for multiple reports per day

---

## ⚠️ Error Scenarios & Solutions

### Error 1: "Write outside of project scope"

**Cause**: Path does not start with `/app/` or is not mounted

**Wrong Code**:
```python
with open('/root/myfile.txt', 'w') as f:
    f.write('data')
```

**Correct Code**:
```python
from pathlib import Path
Path('/app/logs').mkdir(parents=True, exist_ok=True)
with open('/app/logs/myfile.txt', 'w') as f:
    f.write('data')
```

**Solution**:
1. Change path to start with `/app/`
2. Ensure directory exists before writing
3. Verify path is in the 6 writable directories

---

### Error 2: "No such file or directory"

**Cause**: Parent directory doesn't exist

**Wrong Code**:
```python
with open('/app/logs/subdir/myfile.txt', 'w') as f:
    f.write('data')
# Fails if /app/logs/subdir doesn't exist
```

**Correct Code**:
```python
from pathlib import Path
Path('/app/logs/subdir').mkdir(parents=True, exist_ok=True)
with open('/app/logs/subdir/myfile.txt', 'w') as f:
    f.write('data')
```

**Solution**:
1. Always create parent directories with `mkdir(parents=True, exist_ok=True)`
2. Use `Path()` from pathlib for cleaner code
3. Never assume directory exists

---

### Error 3: "Permission denied"

**Cause**: Directory permissions don't allow writing

**Wrong Code**:
```python
with open('/app/logs/readonly_file.txt', 'w') as f:
    f.write('data')
# Fails if /app/logs was mounted as read-only
```

**Correct Code**:
```python
# Verify the mount in docker-compose.yml:
# - ./logs:/app/logs  (not ./logs:/app/logs:ro)
# Then write normally:
from pathlib import Path
Path('/app/logs').mkdir(parents=True, exist_ok=True)
with open('/app/logs/myfile.txt', 'w') as f:
    f.write('data')
```

**Solution**:
1. Check docker-compose.yml volume mounts
2. Ensure path is not mounted as read-only (`:ro`)
3. Verify `/app/` parent directory is writable

---

## 🚀 Running Your Agent

### Step 1: Understand Your Environment
```bash
# You're running in: Docker container (hephaestus-server)
# Working directory: /app
# Writable paths: Only /app/data/, /app/logs/, /app/docs/,
#                 /app/projects/, /app/src/, /app/scripts/
```

### Step 2: Read Configuration
```bash
# OpenCode agent context is configured in:
cat /app/opencode.json

# Key sections:
# - agent_context.critical_constraints (what you must do)
# - file_write_guide.writable_paths (where you can write)
# - agent_instructions.common_patterns (code examples)
# - agent_instructions.error_handling (if something fails)
```

### Step 3: Start Coding
```python
# Template for any file operation:
from pathlib import Path

# 1. Define directory (choose from the 6 writable paths)
output_dir = '/app/logs/my_operation'

# 2. Create directory
Path(output_dir).mkdir(parents=True, exist_ok=True)

# 3. Write your file
output_file = f'{output_dir}/output.txt'
with open(output_file, 'w') as f:
    f.write('Your content here')

# 4. Log success
print(f'✅ Wrote to: {output_file}')
```

### Step 4: Test Locally (Optional)
```bash
# If you need to test file writes before running in container:
mkdir -p ./logs/test
echo "test" > ./logs/test/test.txt

# Then verify it appears on host:
ls -la ./logs/test/test.txt
```

---

## 🔍 Debugging File Write Issues

### Debug Checklist
- [ ] Error message contains "Write outside of project scope"?
  - → Path doesn't start with `/app/` or isn't mounted
  - → Fix: Change to `/app/data/`, `/app/logs/`, `/app/docs/`, `/app/projects/`, `/app/src/`, or `/app/scripts/`

- [ ] Error message contains "No such file or directory"?
  - → Parent directory doesn't exist
  - → Fix: Add `Path(parent_dir).mkdir(parents=True, exist_ok=True)` before writing

- [ ] Error message contains "Permission denied"?
  - → Directory is read-only or not properly mounted
  - → Fix: Check docker-compose.yml volume mounts, ensure no `:ro` suffix

- [ ] Agent successfully writes but host can't find the file?
  - → File was written to unmounted path
  - → Fix: Verify file is in one of the 6 `/app/` directories
  - → Host path equivalent: `./data/`, `./logs/`, `./docs/`, `./projects/`, `./src/`, `./scripts/`

### Debug Commands
```bash
# Inside container - list writable directories
ls -la /app/

# Inside container - verify write access
touch /app/logs/test.txt && rm /app/logs/test.txt && echo "✓ /app/logs is writable"
touch /app/data/test.txt && rm /app/data/test.txt && echo "✓ /app/data is writable"
touch /app/docs/test.txt && rm /app/docs/test.txt && echo "✓ /app/docs is writable"

# On host - verify mounts
docker volume inspect hephaestus_docker_logs

# On host - verify file appears after write
ls -la ./logs/  # Should show files written from inside container
```

---

## 📊 File Organization Best Practices

### Recommended Directory Structure
```
/app/
├── data/                 # Databases, cache, agent memories
│   ├── hephaestus.db    # Main database
│   ├── cache/           # Agent computation cache
│   └── memories/        # Agent memories and knowledge
│
├── logs/                 # All log files
│   ├── agent_runs/      # Agent execution logs
│   ├── errors/          # Error logs
│   └── performance/     # Performance metrics
│
├── docs/                 # Documentation and reports
│   ├── analysis/        # Analysis reports
│   ├── workflows/       # Workflow documentation
│   └── api/             # API documentation
│
├── projects/             # Project workspaces
│   ├── project-alpha/   # Project 1
│   │   ├── src/        # Project source
│   │   └── output/     # Project artifacts
│   └── project-beta/    # Project 2
│
├── src/                  # Application source code
│   ├── agents/          # Agent implementations
│   ├── workflows/       # Workflow definitions
│   └── core/            # Core modules
│
└── scripts/              # Utility scripts
    ├── deploy.sh        # Deployment scripts
    └── cleanup.py       # Cleanup utilities
```

### Naming Conventions
```
# Logs with timestamp
run_2025-11-07_183000.log       # YYYY-MM-DD_HHMMSS
metrics_2025-11-07.csv          # YYYY-MM-DD
analysis_results_v1.json        # descriptive_vN

# Cache files
user_data_cache.pkl
computation_cache.json
session_memory_12345.db

# Documentation
README.md
IMPLEMENTATION_NOTES.md
API_REFERENCE.md
TROUBLESHOOTING_GUIDE.md
```

---

## ✅ Verification Steps

### Verify Your Setup Works

```python
from pathlib import Path
import json
from datetime import datetime

# Test 1: Verify /app/logs is writable
test_log_dir = Path('/app/logs/verification')
test_log_dir.mkdir(parents=True, exist_ok=True)
test_log_file = test_log_dir / 'test.log'
test_log_file.write_text('✓ Log write successful')
print(f'✅ Test 1 passed: {test_log_file}')

# Test 2: Verify /app/data is writable
test_data_dir = Path('/app/data/verification')
test_data_dir.mkdir(parents=True, exist_ok=True)
test_data_file = test_data_dir / 'test.json'
test_data_file.write_text(json.dumps({'status': 'verified'}))
print(f'✅ Test 2 passed: {test_data_file}')

# Test 3: Verify /app/docs is writable
test_doc_dir = Path('/app/docs/verification')
test_doc_dir.mkdir(parents=True, exist_ok=True)
test_doc_file = test_doc_dir / 'test.md'
test_doc_file.write_text('# Verification\nSetup is working correctly.')
print(f'✅ Test 3 passed: {test_doc_file}')

# Test 4: Verify absolute paths work
abs_path = Path('/app/logs/absolute_path_test.txt')
abs_path.parent.mkdir(parents=True, exist_ok=True)
abs_path.write_text(f'Timestamp: {datetime.now()}')
print(f'✅ Test 4 passed: {abs_path}')

print('\n✅ All verification tests passed!')
print('Your agent can now safely write files to /app/ directories.')
```

---

## 📞 Getting Help

### If You Encounter an Error

1. **Read the error message carefully**
   - Does it mention "Write outside of project scope"?
   - Does it mention "No such file or directory"?
   - Does it mention "Permission denied"?

2. **Check the relevant section above**
   - Go to "Error Scenarios & Solutions"
   - Find your error type
   - Apply the solution

3. **Verify your path**
   - Is it absolute (starts with `/`)?
   - Does it start with `/app/`?
   - Is it one of the 6 writable paths?

4. **Test directory creation**
   - Ensure parent directory is created first
   - Use `Path(dir).mkdir(parents=True, exist_ok=True)`

5. **Review the examples**
   - Check "Implementation Scenarios" for your use case
   - Copy the pattern exactly
   - Verify it works before using in your code

### Ask for Help
If you're still stuck:
- Check `OPENCODE_FILE_WRITE_GUIDE.md` for detailed troubleshooting
- Check `OPENCODE_QUICK_REFERENCE.md` for quick lookup
- Review `docker-compose.yml` to understand the infrastructure
- Check `opencode.json` for configuration details

---

## 🎓 Key Concepts

### Why These Constraints Exist
Docker containers have isolated file systems. The volumes in `docker-compose.yml` specify which host directories are accessible inside the container.

**Benefits**:
- Data persistence (files survive container restarts)
- Isolation (agent code can't accidentally modify system files)
- Clarity (agent developers know exactly where to write)
- Debugging (can inspect files from host machine)

### What Each Directory Is For
```
/app/data/     ← Anything you want to persist between runs
/app/logs/     ← Anything you want to debug later
/app/docs/     ← Human-readable reports and documentation
/app/projects/ ← Complete deliverables and build artifacts
/app/src/      ← Application code (only modify intentionally)
/app/scripts/  ← Automation and utility tools
```

### How to Choose Which Path
- "I need this data again next run" → `/app/data/`
- "I want to debug what happened" → `/app/logs/`
- "I need to show this to humans" → `/app/docs/`
- "This is the final deliverable" → `/app/projects/`
- "This is application code" → `/app/src/`
- "This is a tool or utility" → `/app/scripts/`

---

## 🚀 You're Ready!

You now have:
- ✅ Clear understanding of where you can write files
- ✅ Code examples for common patterns
- ✅ Error scenarios and how to fix them
- ✅ Best practices to follow
- ✅ Directory structure to organize your work
- ✅ Verification tests to confirm everything works

Start writing code with confidence! 🎯
