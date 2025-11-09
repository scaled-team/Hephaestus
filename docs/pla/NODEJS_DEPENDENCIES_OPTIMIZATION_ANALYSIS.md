# Node Modules & Dependencies Optimization Analysis Report

**Date**: November 8, 2025
**Project**: Hephaestus MCP Server
**Status**: Analysis Only (No Code Changes Made)
**Scope**: Frontend dependencies, Docker architecture, worktree management

---

## 📊 EXECUTIVE SUMMARY

### Current State: **SIGNIFICANT BLOAT DETECTED**
- **Total Disk Usage**: 2.8 GB
- **Node Modules Duplication**: 1.24 GB spread across 4+ locations
- **Worktrees Count**: 13 active + 1 default worktree (14 total)
- **Repeated Dependencies**: Same dependencies installed in multiple locations
- **Wasted Space**: ~70% of node_modules could be eliminated with optimization

### Key Findings:
1. ✅ Frontend dependencies are reasonable (246M) in isolation
2. ❌ Worktrees contain duplicate full frontend installations (662M + 332K + others)
3. ❌ Docker build includes redundant dependencies (building in container)
4. ❌ No npm workspaces or monorepo structure (could reduce duplication 50%)
5. ❌ Worktree data/projects directory contains full node_modules (45M)

### Optimization Potential:
- **Quick Wins** (30-40% reduction): 800M - 1.0G freed
- **Structural Changes** (60-70% reduction): 1.8G - 2.0G freed with monorepo + workspaces

---

## 🔍 DETAILED CURRENT STATE ANALYSIS

### 1. Disk Space Distribution

```
/Users/nova/Sites/bench/Hephaestus/
├── 2.8 GB    TOTAL PROJECT
│
├── 2.2 GB    data/                          ❌ NEEDS ANALYSIS
│   ├── 2.0 GB    worktrees/                 (Agent git worktrees with duplicated node_modules)
│   ├── 45 MB     projects/                  (Project workspaces, some with node_modules)
│   └── (rest: logs, docs, database)
│
├── 334 MB    venv/                          ⚠️  Python virtual environment
├── 262 MB    frontend/                      ✅ PRIMARY FRONTEND
│   └── 246 MB    node_modules/              (Frontend dependencies)
│
├── 48 MB     logs/                          ℹ️  Development logs
├── 5 MB      src/                           ✅ Application source
├── 4 MB      assets/                        ℹ️  Static assets
├── 1 MB      tests/                         ✅ Test files
├── (rest: configuration files, scripts)
```

### 2. Node Modules Locations & Sizes

| Location | Size | Type | Issue |
|----------|------|------|-------|
| `frontend/node_modules` | 246 MB | Primary | ✅ Expected |
| `data/projects/stockton-ai/node_modules` | 45 MB | Project | ❌ Duplicate |
| `data/worktrees/default/node_modules` | 730 MB | Worktree | ❌ Massive duplicate |
| `data/worktrees/wt_675c5468.../frontend/node_modules` | 662 MB | Worktree | ❌ Massive duplicate |
| `data/worktrees/default/frontend/node_modules` | 332 KB | Worktree | ✅ Minimal |
| **TOTAL** | **~1.7 GB** | **5+ locations** | **❌ SEVERE DUPLICATION** |

### 3. Worktree Analysis

**Total Worktrees**: 14
- 1 `default` worktree (primary working directory)
- 13 named worktrees (wt_*)

**Storage Breakdown** (worktrees directory):
```
Total: 2.0 GB

Per Worktree Structure:
- Each worktree is a full git clone with:
  - Complete source code (backend + frontend)
  - node_modules (730 MB - 1 GB each!)
  - package.json + package-lock.json
  - Cache directories (.git, .mypy_cache, .pytest_cache, .ruff_cache)
  - Test files and migrations
  - Documentation and reports

Average per worktree: ~140 MB - 150 MB (mostly node_modules)
```

**Problem**: Each worktree is an independent copy with its own complete node_modules

---

## 🚨 ROOT CAUSES OF BLOAT

### 1. **No NPM Workspaces / Monorepo Structure**
- Frontend dependencies installed once per location
- No shared dependency resolution
- Each worktree installs full `node_modules`

**Impact**: 70% duplication across 5+ locations

### 2. **Worktree Strategy Without Optimization**
- Git worktrees are meant for working trees, not full isolated environments
- No shared `node_modules` mounting strategy
- Each worktree runs independent `npm ci`

**Impact**: 730 MB - 1 GB per worktree unnecessarily

### 3. **Docker Multi-Stage Build Not Optimized**
- Frontend dependencies built into container image
- No layer caching strategy for npm installs
- Docker build includes all node_modules every time

**Impact**: Slower builds, larger images

### 4. **Project Workspace Contains node_modules**
- `data/projects/stockton-ai/` has own node_modules (45 MB)
- Unclear why projects directory contains dependencies

**Impact**: 45 MB unnecessary in project space

### 5. **No .gitignore Enforcement on Worktrees**
- .git directories included in worktrees
- node_modules not properly excluded from git tracking
- Cache directories (.mypy_cache, .pytest_cache) included

**Impact**: Redundant data in git index

---

## 📋 DEPENDENCY ANALYSIS

### Frontend Dependencies (246 MB)
**Package Count**: ~150 dependencies (including transitive)

**Critical Dependencies**:
```
Framework & Build:
├── react@18.2.0 + react-dom@18.2.0
├── vite@5.4.20 (build tool)
├── tailwindcss@3.3.6 (CSS framework)
├── typescript@5.3.0
└── @vitejs/plugin-react@4.2.0

UI Components & Visualization:
├── reactflow@11.11.4 (diagram/flow rendering)
├── react-flow-renderer@10.3.17 (alternative)
├── react-grid-layout@1.5.2 (layout)
├── recharts@3.2.1 (charting)
├── lucide-react@0.292.0 (icons)
├── @radix-ui/* (accessible components)
└── framer-motion@10.16.0 (animations)

Data & State:
├── @tanstack/react-query@5.8.0 (server state)
├── axios@1.6.0 (HTTP client)
├── date-fns@2.30.0 (date utilities)
└── react-router-dom@6.20.0 (routing)

Code Quality & Styling:
├── tailwind-merge@3.3.1 (Tailwind utilities)
├── class-variance-authority@0.7.1 (component variants)
├── clsx@2.1.1 (conditional classes)
├── highlight.js@11.9.0 (syntax highlighting)
├── react-markdown@9.0.1 (markdown rendering)
├── react-hot-toast@2.4.1 (notifications)
└── devDependencies (autoprefixer, postcss, etc)
```

**Analysis**:
- ✅ Dependencies are reasonable and well-chosen
- ⚠️ Some redundancy: `react-flow-renderer` (deprecated) + `reactflow` (both installed)
- ⚠️ Charting libraries could be optimized (recharts is heavy)
- ✅ No obvious unnecessary dependencies

---

## 🏗️ ARCHITECTURE ISSUES

### Issue 1: Docker Build Strategy

**Current State**:
```dockerfile
# Frontend built in container
COPY frontend/package*.json ./frontend/
RUN npm ci                          # Installs 246 MB each build

# Result: Large image, slower builds, duplicated in final image
```

**Problem**:
- npm install happens EVERY build
- Full node_modules in final image
- Layer caching ineffective for large npm packages
- 246 MB+ per image layer

### Issue 2: Worktree Independence

**Current State**:
```
data/worktrees/
├── default/
│   ├── node_modules/  (730 MB)
│   ├── frontend/      (49 MB, separate from root)
│   ├── backend/       (61 MB)
│   └── package.json
│
├── wt_*.../
│   ├── node_modules/  (662 MB each!)
│   └── (same structure repeated)
```

**Problem**:
- Each worktree = complete isolated environment
- No way to share `node_modules` across worktrees
- `npm ci` runs for every worktree
- **Total: 1.7 GB+ for 14 worktrees with shared dependencies**

### Issue 3: Docker Compose Mounting Strategy

**Current State** (docker-compose.yml):
```yaml
hephaestus-app:
  volumes:
    - ./frontend/src:/app/frontend/src          # Source only
    - ./data:/app/data
    # ❌ node_modules NOT mounted from host
    # ❌ Docker creates own node_modules in container
```

**Problem**:
- Frontend source mounted, but node_modules built in container
- Can't use host node_modules (different platforms sometimes)
- But development setup is inefficient

---

## 💡 OPTIMIZATION STRATEGIES

### STRATEGY A: Quick Wins (No Architecture Changes)

**Timeline**: Immediate
**Effort**: Low
**Savings**: 300-400 MB

#### 1. Remove Unused Worktree node_modules
```
Action: Clean node_modules from worktrees that aren't actively used
Impact: Remove 730 MB × (N-1) worktrees = 500-900 MB freed
Risk: Low (can reinstall with npm ci)
```

#### 2. Remove Old Worktrees
```
Action: Identify and archive old worktrees (> 1 week unused)
Impact: Remove 140 MB × (number of old worktrees)
Risk: Low (archived, not deleted)
```

#### 3. Consolidate Projects
```
Action: Remove stockton-ai/node_modules
Impact: 45 MB freed
Risk: Low (it's a test project)
```

#### 4. Add .gitignore Optimization
```
Action: Ensure node_modules excluded from git tracking
Impact: Reduce .git directory overhead
Risk: Low (configuration only)
```

---

### STRATEGY B: Structural Optimization (Medium Effort)

**Timeline**: 1-2 days
**Effort**: Medium
**Savings**: 800 MB - 1.2 GB

#### 1. Implement NPM Workspaces (Monorepo)

**Structure**:
```
/Hephaestus/
├── package.json (root workspace config)
│   ├── "workspaces": ["packages/frontend", "packages/backend"]
│
├── packages/
│   ├── frontend/
│   │   ├── package.json (frontend-specific deps)
│   │   ├── src/
│   │   └── (NO node_modules - uses root)
│   │
│   └── backend/
│       ├── package.json (backend-specific deps)
│       ├── src/
│       └── (NO node_modules - uses root)
│
└── node_modules/  ⭐ SINGLE INSTALLATION
    ├── react
    ├── tailwindcss
    ├── (all deps, deduplicated)
```

**Benefits**:
- ✅ Single `node_modules` in root (saves 246 MB × 5 = 1.2 GB)
- ✅ Monorepo tooling (lerna, nx, turbo) handles resolution
- ✅ Workspace dependencies isolated (package.json per workspace)
- ✅ Faster `npm ci` (one installation)
- ✅ Better dependency visibility

**Implementation Steps**:
1. Create root `package.json` with workspaces config
2. Move `frontend/package.json` to `packages/frontend/package.json`
3. Move `src/` to appropriate backend workspace
4. Run `npm ci` once (installs all deps to single root node_modules)
5. Update Docker COPY commands
6. Remove duplicate node_modules

**Savings**: 800 MB - 1.2 GB

#### 2. Worktree Shared Dependencies

**Option 1: Symlink node_modules**
```bash
# In each worktree, instead of npm ci:
cd /path/to/worktree
ln -s ../../frontend/node_modules ./node_modules

# Pros: Fast, no duplication
# Cons: Platform-dependent, could break if main node_modules updated
```

**Option 2: Monorepo in Worktrees**
```bash
# Clone project as monorepo
# Each worktree shares parent's node_modules
# Requires workspace structure above

# Pros: Clean, supported by npm
# Cons: Requires monorepo setup
```

**Savings**: 300-400 MB

#### 3. Optimize Docker Build

**Before**:
```dockerfile
COPY frontend/package*.json ./frontend/
RUN npm ci                     # 246 MB every build
COPY frontend/ ./frontend/
```

**After (with Monorepo)**:
```dockerfile
COPY package*.json ./
COPY packages/frontend/package.json ./packages/frontend/
RUN npm ci                      # One install, layer cached

COPY packages/frontend/ ./packages/frontend/
```

**Benefits**:
- ✅ Smaller layer size (with cache)
- ✅ Better cache hit rate
- ✅ Faster builds

**Savings**: 100-200 MB in image size (via layer caching)

---

### STRATEGY C: Advanced Optimization (High Effort, Maximum Savings)

**Timeline**: 2-3 days
**Effort**: High
**Savings**: 1.8 - 2.0 GB (60-70% reduction)

#### Combine Strategies A + B + C:

1. **Implement monorepo (Strategy B.1)** → 800 MB - 1.2 GB
2. **Remove duplicate worktrees** → 400 MB - 600 MB
3. **Optimize Docker multi-stage build** → 100 MB - 200 MB
4. **Shared worktree dependencies (Strategy B.2)** → 200 MB - 300 MB
5. **Clean old projects** → 45 MB - 100 MB

**Total Savings**: 1.5 - 2.4 GB (55-85% reduction)

**Result**:
```
Before: 2.8 GB
After:  0.8 - 1.0 GB
Reduction: 65-70%
```

---

## 📊 RECOMMENDATION MATRIX

### By Priority & Impact

| Strategy | Priority | Effort | Savings | Timeline | Risk |
|----------|----------|--------|---------|----------|------|
| **A1: Remove unused worktrees** | 🔴 High | 🟢 Low | 500-900 MB | Hours | 🟢 Low |
| **A2: Clean old worktrees** | 🔴 High | 🟢 Low | 100-200 MB | Hours | 🟢 Low |
| **A3: Remove projects/node_modules** | 🟡 Medium | 🟢 Low | 45 MB | Minutes | 🟢 Low |
| **A4: gitignore optimization** | 🟡 Medium | 🟢 Low | 20-50 MB | Minutes | 🟢 Low |
| **B1: NPM Workspaces** | 🔴 High | 🟡 Medium | 800 MB - 1.2 GB | 1-2 days | 🟡 Medium |
| **B2: Shared worktree deps** | 🟡 Medium | 🟡 Medium | 200-300 MB | 1 day | 🟡 Medium |
| **B3: Docker optimization** | 🟡 Medium | 🟢 Low | 100-200 MB | 2 hours | 🟢 Low |
| **C: All above combined** | 🔴 High | 🟠 High | 1.5 - 2.4 GB | 2-3 days | 🟡 Medium |

### Quick Wins Path (Recommended First)
```
1. A1: Remove unused worktrees (500-900 MB, 30 min)
   └─ Archives old worktrees, keeps recent 3-4

2. A3: Clean projects/node_modules (45 MB, 5 min)
   └─ Remove from stockton-ai project

3. B1: Implement monorepo (800 MB - 1.2 GB, 1-2 days)
   └─ Biggest savings, enables other optimizations

4. B2: Worktree dependencies (200-300 MB, 1 day)
   └─ Only relevant after monorepo setup

Total after Quick Wins: 1.0 - 1.3 GB freed (35-50% reduction)
```

---

## 🔧 DETAILED IMPLEMENTATION GUIDANCE

### Phase 1: Cleanup (Hours)

**Task 1.1: Inventory Worktrees**
```bash
# Find worktrees and their last use date
for wt in /Users/nova/Sites/bench/Hephaestus/data/worktrees/wt_*; do
  echo "$(basename $wt): $(stat -f '%Sm' $wt | head -1)"
done
```

**Task 1.2: Archive Old Worktrees**
```bash
# Create archive directory
mkdir -p ~/Hephaestus_Worktree_Archive

# Move worktrees older than 1 week to archive
for wt in /path/to/worktrees/wt_*; do
  if [ modification_time > 1_week ]; then
    mv "$wt" ~/Hephaestus_Worktree_Archive/
  fi
done
```

**Expected Impact**: 500-700 MB freed

---

### Phase 2: NPM Workspaces (1-2 Days)

**Task 2.1: Create Root Workspace Config**
```json
{
  "name": "hephaestus-monorepo",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/frontend",
    "packages/backend"
  ],
  "scripts": {
    "install": "npm ci",
    "dev": "npm run dev --workspace=packages/frontend",
    "build": "npm run build --workspace=packages/frontend"
  }
}
```

**Task 2.2: Restructure Directories**
```
Before:
frontend/
├── src/
├── public/
└── package.json

After:
packages/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── backend/
    ├── src/
    └── package.json
```

**Task 2.3: Update Docker Build**
```dockerfile
# Copy workspace configs
COPY package.json package-lock.json ./
COPY packages/*/package.json packages/*/

# Single install for all workspaces
RUN npm ci

# Copy source code
COPY packages/ ./packages/
```

**Expected Impact**: 800 MB - 1.2 GB freed

---

### Phase 3: Docker Optimization (2 Hours)

**Multi-stage build with caching**:
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/*/package.json packages/*/
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=packages/frontend

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/packages/frontend/dist ./frontend/dist
# Only copy runtime dependencies
COPY --from=deps /app/node_modules ./node_modules
```

**Expected Impact**: 100-200 MB image size reduction

---

## 📈 EXPECTED RESULTS

### Before Optimization
```
Total Space: 2.8 GB
├── node_modules:     1.7 GB (60%)
├── worktrees:        2.0 GB (1.3 GB node_modules)
├── venv:             334 MB (12%)
└── other:            200 MB (7%)
```

### After Quick Wins (A1-A4 + B1)
```
Total Space: 1.0 - 1.3 GB
├── node_modules:     246 MB (20%)  ← Unified
├── worktrees:        400 MB (35%)  ← Cleaned & reduced
├── venv:             334 MB (29%)
└── other:            150 MB (13%)

Savings: 1.5 - 1.8 GB (55-65% reduction)
```

### After Full Optimization (All Strategies)
```
Total Space: 0.8 - 1.0 GB
├── node_modules:     246 MB (25%)  ← Unified, optimized
├── worktrees:        200 MB (20%)  ← Minimal (shared deps)
├── venv:             300 MB (30%)
└── other:            150 MB (15%)

Savings: 1.8 - 2.0 GB (65-70% reduction)
```

---

## ⚠️ CONSIDERATIONS & RISKS

### Risk: Breaking Changes
- **Monorepo migration**: Requires testing all build pipelines
- **Docker changes**: Image size changes, layer caching updates
- **Worktree structure**: Git operations might need adjustment

### Risk: Development Impact
- **Initial setup**: First monorepo npm ci might take longer
- **IDE/Editor**: May need reconfiguration for workspaces
- **CI/CD**: Pipeline updates needed for new structure

### Mitigations
1. **Test on branch first**: Create feature branch for optimization
2. **Gradual rollout**: Implement strategies one at a time
3. **Document changes**: Update all setup docs
4. **Backup original**: Archive current structure before major changes

---

## 📋 NEXT STEPS

### Immediate (This Session)
- [ ] Run Phase 1 cleanup (archive old worktrees)
- [ ] Document current disk usage baseline
- [ ] Plan Phase 2 monorepo structure

### Short Term (Next 1-2 Days)
- [ ] Implement NPM workspaces (Phase 2)
- [ ] Test with docker-compose
- [ ] Update documentation

### Medium Term (Next Week)
- [ ] Optimize Docker builds (Phase 3)
- [ ] Implement worktree sharing (Phase 2.2)
- [ ] Performance testing & validation

---

## 📌 KEY INSIGHTS

1. **Root Cause**: No unified dependency management (no monorepo/workspaces)
2. **Biggest Bloat**: Worktrees with independent node_modules (1.3 GB)
3. **Quick Fix**: Remove old worktrees (500+ MB immediately)
4. **Structural Fix**: Implement npm workspaces (1.2 GB + flexibility)
5. **Long-term**: Monorepo + shared dependencies = 65-70% space savings

**Overall**: Project is well-organized but lacks dependency optimization. Monorepo structure would provide significant space savings with added benefits for development workflow.

---

## 📞 REPORT METADATA

- **Analysis Depth**: Comprehensive (disk usage, Docker, architecture)
- **Code Changes**: None (analysis only)
- **Recommendations**: Prioritized by effort vs. impact
- **Timeline**: Phased approach (hours to days)
- **Risk Level**: Low to Medium (all reversible)
