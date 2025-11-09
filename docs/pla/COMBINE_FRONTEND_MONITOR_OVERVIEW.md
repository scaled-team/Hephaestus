# Combining Frontend & Monitor into Single Container

## 🎯 OBJECTIVE

Combine the **Frontend** (React/Vite dev server) and **Monitor** (Python process) into a **single Docker container** so both can:
- Share the **same tmux sessions**
- Access **shared environment variables**
- Mount **shared volumes** for code
- Have **unified logging** and debugging

## 📊 BEFORE vs AFTER ARCHITECTURE

### BEFORE (4 Separate Containers)
```
┌─────────────────────────────────────────────────────────────────┐
│ Docker Compose Network                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   qdrant     │  │ hephaestus-  │  │ hephaestus-  │          │
│  │              │  │   server     │  │   monitor    │          │
│  │ Vector DB    │  │              │  │              │          │
│  │ :6333        │  │ MCP Backend  │  │ Python Proc  │          │
│  │              │  │ :8000        │  │ (Isolated)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │     hephaestus-frontend                  │                  │
│  │                                          │                  │
│  │     npm run dev (Vite)                   │                  │
│  │     Frontend React UI                    │                  │
│  │     :5173 (Isolated)                     │                  │
│  │                                          │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
│  ⚠️  PROBLEMS:                                                 │
│  - Frontend and Monitor CANNOT share tmux                      │
│  - Separate tmux sessions → Can't control agents together      │
│  - 4 containers = overhead                                     │
│  - Separate volumes for node_modules (duplication)             │
│  - Hard to debug across processes                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AFTER (3 Containers - Frontend + Monitor Combined)
```
┌─────────────────────────────────────────────────────────────────┐
│ Docker Compose Network                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   qdrant     │  │ hephaestus-  │                            │
│  │              │  │   server     │                            │
│  │ Vector DB    │  │              │                            │
│  │ :6333        │  │ MCP Backend  │                            │
│  │              │  │ :8000        │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  hephaestus-app  (COMBINED CONTAINER)                  │    │
│  │                                                        │    │
│  │  ┌──────────────────┐  ┌──────────────────┐           │    │
│  │  │   Frontend       │  │     Monitor      │           │    │
│  │  │                  │  │                  │           │    │
│  │  │ npm run dev      │  │ python run_      │           │    │
│  │  │ Vite :5173       │  │ monitor.py       │           │    │
│  │  │                  │  │                  │           │    │
│  │  │ React UI         │  │ Health checks    │           │    │
│  │  │                  │  │ Diagnostics      │           │    │
│  │  │                  │  │ Agent control    │           │    │
│  │  └──────────────────┘  └──────────────────┘           │    │
│  │                                                        │    │
│  │  ✅ SAME tmux session (both access /var/run/docker)  │    │
│  │  ✅ SHARED environment variables                      │    │
│  │  ✅ SHARED volumes (/app/src, /app/frontend/src)     │    │
│  │  ✅ UNIFIED logging (single docker logs output)       │    │
│  │  ✅ SHARED /app directory (no duplication)            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ✅ BENEFITS:                                                  │
│  - Both processes share tmux → Can control agents together     │
│  - Single container = less overhead                            │
│  - Frontend UI can display Monitor's data                      │
│  - Monitor can control agents, Frontend shows results          │
│  - Easier debugging (single container logs)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 TECHNICAL PROCESS STEPS

### STEP 1: Create Process Orchestrator (`app/run_app.js`)
**Purpose**: Manage both frontend and monitor processes in a single container

**What it does**:
```javascript
// 1. Start Frontend (npm run dev)
//    ├─ Runs on port 5173
//    ├─ Hot reloads on code changes
//    └─ Outputs to console
//
// 2. Start Monitor (python run_monitor.py)
//    ├─ Runs continuously in background
//    ├─ Performs health checks
//    ├─ Controls agents
//    └─ Outputs to console
//
// 3. Both processes run SIMULTANEOUSLY in same container
//    ├─ Share /var/run/docker.sock (tmux access)
//    ├─ Share environment variables
//    ├─ Share /app directory
//    └─ Can communicate via internal APIs
//
// 4. Graceful shutdown
//    ├─ SIGINT/SIGTERM signals both processes
//    ├─ Waits for clean shutdown
//    └─ Exits container when done
```

**File**: `/app/run_app.js`

---

### STEP 2: Create Multi-Process Dockerfile (`app/Dockerfile`)
**Purpose**: Build a single image with all dependencies for both processes

**What it does**:
```dockerfile
FROM node:20-alpine
  └─ Base image with Node.js

RUN apk add --no-cache python3 py3-pip tmux curl git
  └─ Install Python, pip, tmux (for agent control)

COPY frontend/package*.json ./frontend/
RUN npm ci
COPY frontend/ .
  └─ Install frontend dependencies (npm packages)

COPY ../src ./src
COPY ../run_monitor.py .
COPY ../requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
  └─ Install monitor dependencies (Python packages)

EXPOSE 5173
  └─ Expose frontend port

CMD ["node", "run_app.js"]
  └─ Run orchestrator that starts both processes
```

**File**: `/app/Dockerfile`

---

### STEP 3: Update Docker Compose Configuration
**Purpose**: Define the new combined container in docker-compose.yml

**What changes**:
```yaml
REMOVED:
  hephaestus-monitor:     ← Delete (now part of hephaestus-app)
  hephaestus-frontend:    ← Delete (now part of hephaestus-app)

ADDED:
  hephaestus-app:
    build: .              ← Build from project root
    dockerfile: app/Dockerfile  ← Use combined Dockerfile

    volumes:
      - ./src:/app/src                           ← Monitor source (hot reload)
      - ./frontend/src:/app/frontend/src         ← Frontend source (hot reload)
      - /var/run/docker.sock:/var/run/docker.sock  ← ACCESS TMUX!
      - ./data:/app/data                         ← Shared data/logs
```

**File**: `/docker-compose.yml`

---

## 🏗️ HOW THEY SHARE TMUX

### The Key: Docker Socket Mount
```
┌──────────────────────────────────────┐
│ hephaestus-app Container             │
├──────────────────────────────────────┤
│                                      │
│  Process 1: npm run dev              │
│  Process 2: python run_monitor.py    │
│                                      │
│  Both have access to:                │
│  /var/run/docker.sock               │
│         ↓                            │
│         (mounted from host)          │
│         ↓                            │
│  Can communicate with Docker daemon  │
│  and tmux                            │
│                                      │
└──────────────────────────────────────┘
         ↓
    /var/run/docker.sock (host)
         ↓
    Docker Daemon (host)
         ↓
    tmux sessions
```

**Result**: Both processes can access and control the same tmux sessions!

---

## 📋 PROCESS WORKFLOW

### When Container Starts:

```
1. Docker starts hephaestus-app container
   └─ Mounts volumes (source code, docker.sock)
   └─ Sets environment variables
   └─ Runs: node run_app.js

2. run_app.js orchestrator starts:

   a) Frontend Process (npm run dev)
      ├─ Compiles React/Vite
      ├─ Starts dev server on :5173
      ├─ Watches for file changes
      └─ Runs in parallel (doesn't block)

   b) Monitor Process (python run_monitor.py)
      ├─ Imports from /app/src
      ├─ Connects to backend (:8000)
      ├─ Starts continuous monitoring loop
      ├─ Performs health checks every 60s
      ├─ Controls agents via API
      └─ Runs in parallel (doesn't block)

3. Both processes run simultaneously:

   Frontend:                 Monitor:
   ├─ Loads http://localhost:5173
   ├─ React components
   ├─ WebSocket to backend
   ├─ Vite hot reload
   └─ User interactions

                            ├─ Health check loop
                            ├─ Agent status updates
                            ├─ Auto-recovery actions
                            ├─ Log aggregation
                            └─ Diagnostic reports

4. Shared Access via tmux:
   ├─ Both can spawn tmux sessions
   ├─ Both can list sessions
   ├─ Both can send/receive messages
   └─ Frontend UI can show agent terminals

5. Graceful Shutdown:
   ├─ docker-compose down
   ├─ SIGTERM sent to run_app.js
   ├─ run_app.js terminates npm & python
   ├─ Wait for clean shutdown
   └─ Container exits
```

---

## 📁 FILE STRUCTURE

```
/Users/nova/Sites/bench/Hephaestus/
│
├── docker-compose.yml (MODIFIED)
│   ├─ Removed: hephaestus-monitor service
│   ├─ Removed: hephaestus-frontend service
│   └─ Added: hephaestus-app service
│
├── app/ (NEW DIRECTORY)
│   ├── Dockerfile (NEW)
│   │   └─ Combines frontend + monitor builds
│   └── run_app.js (NEW)
│       └─ Orchestrates both processes
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── (no separate Dockerfile anymore)
│
├── src/
│   ├── monitoring/
│   ├── agents/
│   └── (monitor code - unchanged)
│
├── run_monitor.py (UNCHANGED)
├── requirements.txt (UNCHANGED)
└── (all other files unchanged)
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Stop Old Containers
```bash
docker-compose down
# Removes: qdrant, hephaestus-server, hephaestus-monitor, hephaestus-frontend
# Keeps: qdrant, hephaestus-server (unchanged)
```

### Step 2: Build New Combined Image
```bash
docker-compose build hephaestus-app
# Builds image from:
#   - Context: . (project root)
#   - Dockerfile: app/Dockerfile
#   - Includes: Frontend deps + Monitor deps + both in one image
```

### Step 3: Start All Services
```bash
docker-compose up -d
# Starts: qdrant, hephaestus-server, hephaestus-app
# hephaestus-app runs both frontend and monitor
```

### Step 4: Verify
```bash
# Check container is running
docker ps | grep hephaestus-app

# Check frontend loads
curl http://localhost:5173

# Check logs (both processes)
docker logs hephaestus-app

# Check both processes started
docker logs hephaestus-app | grep -E "Frontend|Monitor"
```

---

## 💡 KEY CONCEPTS

### Shared tmux Sessions
- **Before**: Frontend and Monitor each had their own tmux
- **After**: Both access the SAME tmux via `/var/run/docker.sock`
- **Result**: Frontend UI can display what Monitor is doing with agents

### Process Orchestration
- **What**: `run_app.js` manages both processes
- **How**: Uses Node.js `spawn()` to start child processes
- **Why**: Ensures both start together, stop cleanly, share environment

### Hot Reload
- **Frontend**: `/app/frontend/src` mounted → Changes reflected immediately
- **Monitor**: `/app/src` mounted → Changes reflected immediately
- **Benefit**: Development without rebuilding image

### Single Image, Multiple Processes
- **Before**: 2 images (frontend Dockerfile + main Dockerfile)
- **After**: 1 image with everything
- **Benefit**: Consistent build, easier maintenance

---

## ✅ VERIFICATION CHECKLIST

When deployment is complete, verify:

- [ ] Container `hephaestus-app` is running
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend API responds at http://localhost:8000
- [ ] Monitor logs appear in `docker logs hephaestus-app`
- [ ] Both processes show in logs
- [ ] Frontend can connect to backend (no CORS errors)
- [ ] Monitor performs health checks every 60 seconds
- [ ] Both can access tmux sessions (if applicable)

---

## 🎯 END RESULT

A single `hephaestus-app` container that:
1. ✅ Runs Frontend (React/Vite dev server) on port 5173
2. ✅ Runs Monitor (Python health checks) continuously
3. ✅ Both share the same tmux sessions
4. ✅ Both share environment variables
5. ✅ Both share mounted volumes
6. ✅ Hot reload for code changes
7. ✅ Unified logging for debugging
8. ✅ Simplified Docker architecture (3 containers instead of 4)
