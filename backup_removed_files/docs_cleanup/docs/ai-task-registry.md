# AI Task Registry

> Lightweight registry for tracking all AI agent work

---

## Registry Schema

```yaml
# ═══════════════════════════════════════════════════════════════
# TASK REGISTRY ENTRY
# ═══════════════════════════════════════════════════════════════

task_id: "TASK-2024-0115-0001"

# ─── OWNERSHIP ────────────────────────────────────────────────
owner:
  agent_type: "feature"
  agent_id: "feature/Xyz789"
  assigned_at: "2024-01-15T10:00:00Z"

# ─── LOCATION ─────────────────────────────────────────────────
branch: "claude/feature-newsletter-Xyz789"
base_branch: "main"

# ─── SCOPE LOCK ───────────────────────────────────────────────
locked_files:
  exclusive:                     # No other agent may touch
    - "/client/src/components/Newsletter.tsx"
    - "/server/routes/newsletter.ts"
  shared_read:                   # Others may read, not write
    - "/shared/types/newsletter.ts"
  unlocked: []                   # Previously locked, now released

locked_directories:
  - "/client/src/components/Newsletter/"

# ─── DEPENDENCIES ─────────────────────────────────────────────
dependencies:
  upstream:                      # Tasks that must complete before this
    - task_id: "TASK-2024-0114-0003"
      status: "done"
  downstream:                    # Tasks waiting on this
    - task_id: "TASK-2024-0115-0005"
      status: "blocked"

# ─── STATUS ───────────────────────────────────────────────────
status: "active"                 # planned|active|blocked|done|frozen
status_history:
  - status: "planned"
    at: "2024-01-15T09:00:00Z"
  - status: "active"
    at: "2024-01-15T10:00:00Z"

# ─── TIMESTAMPS ───────────────────────────────────────────────
created_at: "2024-01-15T09:00:00Z"
started_at: "2024-01-15T10:00:00Z"
completed_at: null
frozen_at: null

# ─── METADATA ─────────────────────────────────────────────────
priority: "high"
estimated_scope: "medium"        # small|medium|large|xl
conflict_zone: false             # True if overlapping scope detected
```

---

## Status Definitions

| Status | Meaning | Allowed Transitions |
|--------|---------|---------------------|
| `planned` | Defined, not started | → `active`, `cancelled` |
| `active` | Work in progress | → `blocked`, `done`, `frozen` |
| `blocked` | Waiting on dependency | → `active`, `cancelled`, `frozen` |
| `done` | Successfully completed | Terminal |
| `frozen` | Halted by kill-switch | → `active` (with approval) |
| `cancelled` | Abandoned | Terminal |

```
        ┌──────────┐
        │ planned  │
        └────┬─────┘
             │
             ▼
        ┌──────────┐     ┌──────────┐
        │  active  │◄────│ blocked  │
        └────┬─────┘     └────▲─────┘
             │                │
             ├────────────────┘
             │
     ┌───────┼───────┐
     ▼       ▼       ▼
┌────────┐ ┌────────┐ ┌────────┐
│  done  │ │ frozen │ │cancelled│
└────────┘ └────────┘ └────────┘
```

---

## Conflict Detection

### Pre-Work Conflict Check

**Before any task starts, run this check:**

```
═══════════════════════════════════════════════════════════════
CONFLICT DETECTION ALGORITHM
═══════════════════════════════════════════════════════════════

INPUT: new_task (proposed task)
OUTPUT: APPROVED | REJECTED | QUEUE

FOR each active_task IN registry WHERE status IN (active, blocked):

  # CHECK 1: Exact file collision
  IF new_task.scope.include ∩ active_task.locked_files.exclusive ≠ ∅:
    → REJECT(reason: "File locked by {active_task.task_id}")

  # CHECK 2: Directory collision
  IF new_task.scope.include overlaps active_task.locked_directories:
    → REJECT(reason: "Directory locked by {active_task.task_id}")

  # CHECK 3: Same branch
  IF new_task.branch = active_task.branch:
    → REJECT(reason: "Branch already in use")

  # CHECK 4: Dependency cycle
  IF new_task depends on active_task AND active_task depends on new_task:
    → REJECT(reason: "Circular dependency detected")

END FOR

# CHECK 5: Agent capacity
IF count(active_tasks WHERE agent_type = new_task.agent_type) >= MAX_CONCURRENT:
  → QUEUE(reason: "Agent type at capacity")

# ALL CHECKS PASSED
→ APPROVED
```

### Conflict Matrix

| Condition | Result | Action |
|-----------|--------|--------|
| Same file, both exclusive | REJECT | Wait for first task to complete |
| Same file, one read-only | ALLOW | Read-only agent proceeds |
| Same directory | REJECT | Unless scopes are provably disjoint |
| Same branch | REJECT | Never allow |
| Dependency not met | BLOCK | Wait for upstream task |
| Agent at capacity | QUEUE | Wait for slot |

---

## Parallel Task Approval

### Parallel Work Rules

Tasks may run in parallel **only if**:

```
PARALLEL ALLOWED WHEN:
1. No overlapping files in scope
2. No overlapping directories
3. No shared dependencies (or all dependencies met)
4. Different branches
5. No conflicting outputs expected
```

### Parallel Task Approval Process

```
┌─────────────────────────────────────────────────────────────┐
│              PARALLEL TASK APPROVAL FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. TASK A and TASK B both request start
   │
   ▼
2. EXTRACT scope from both tasks
   │
   ▼
3. COMPUTE intersection of scopes
   │
   ├── Intersection ≠ ∅?
   │   │
   │   ├── YES → CAN'T PARALLELIZE
   │   │         Option 1: Queue one
   │   │         Option 2: Merge into single task
   │   │         Option 3: Split scope explicitly
   │   │
   │   └── NO → CONTINUE
   │
   ▼
4. CHECK shared dependencies
   │
   ├── Both depend on same incomplete task?
   │   │
   │   ├── YES → Both BLOCKED until dependency done
   │   │
   │   └── NO → CONTINUE
   │
   ▼
5. VERIFY agent availability
   │
   ├── Both agent types available?
   │   │
   │   ├── NO → Queue lower priority task
   │   │
   │   └── YES → CONTINUE
   │
   ▼
6. APPROVE PARALLEL EXECUTION
   │
   └── Both tasks status → ACTIVE
       Lock respective files
       Begin work simultaneously
```

### Parallel Approval Matrix

| Task A Type | Task B Type | Can Parallel? | Condition |
|-------------|-------------|---------------|-----------|
| Feature | Feature | YES | Different scope |
| Feature | Test | YES | Test scope ⊂ tests/ only |
| Feature | Docs | YES | Docs scope ⊂ docs/ only |
| Feature | Security | NO | Security takes priority |
| Fix | Feature | YES | Different scope |
| Fix | Fix | YES | Different scope |
| Refactor | Any | CAUTION | Refactor scope often broad |
| Security | Any | NO | Security runs alone |

---

## Registry Operations

### Register New Task

```yaml
operation: REGISTER
input:
  task_manifest: <valid manifest>
steps:
  1. Validate manifest format
  2. Generate task_id
  3. Run conflict detection
  4. If APPROVED:
     - Create registry entry
     - Set status = "planned"
     - Lock declared files
  5. If REJECTED:
     - Return rejection reason
     - Do not create entry
  6. If QUEUE:
     - Create entry with status = "blocked"
     - Add queue position
```

### Update Task Status

```yaml
operation: UPDATE_STATUS
input:
  task_id: string
  new_status: string
  reason: string (optional)
steps:
  1. Validate transition is allowed
  2. Update status
  3. Update status_history
  4. If new_status = "done":
     - Release all file locks
     - Notify downstream tasks
  5. If new_status = "frozen":
     - Preserve locks
     - Record freeze reason
```

### Release Locks

```yaml
operation: RELEASE_LOCKS
input:
  task_id: string
  files: list (optional, releases all if empty)
steps:
  1. Verify task owns the locks
  2. Move files from locked to unlocked
  3. Check if any queued tasks can now proceed
  4. Notify waiting tasks
```

### Query Active Conflicts

```yaml
operation: CHECK_CONFLICTS
input:
  scope: list of files/directories
output:
  conflicts: list of {task_id, conflict_type, files}
steps:
  1. For each file in scope:
     - Check against all locked_files.exclusive
     - Check against all locked_directories
  2. Return list of conflicts with details
```

---

## Registry Maintenance

### Stale Task Detection

```
STALE TASK RULES:
- active task with no commits in 24 hours → ALERT
- active task with no commits in 72 hours → ESCALATE
- blocked task with no status change in 48 hours → REVIEW
- planned task not started in 7 days → CANCEL or reassign
```

### Orphan Detection

```
ORPHAN CONDITIONS:
- Branch exists with no registry entry
- Registry entry exists with deleted branch
- Locked files with no active task owner

ORPHAN RESOLUTION:
1. Alert Orchestration Agent
2. Attempt to match orphans
3. If unmatchable, escalate to human
4. Clean up after resolution
```

### Registry Cleanup

```
CLEANUP TRIGGERS:
- Task marked "done" for > 7 days
- Task marked "cancelled" for > 3 days
- Task marked "frozen" for > 30 days without activity

CLEANUP ACTIONS:
- Archive registry entry
- Ensure all locks released
- Verify branch cleaned up
- Update downstream dependencies
```

---

## Quick Reference

### File Lock States

```
EXCLUSIVE  → Only owner can read/write
SHARED     → Owner writes, others read
UNLOCKED   → Anyone can access
```

### Conflict Resolution Priority

```
1. Security tasks always win
2. Hotfixes over features
3. Earlier timestamp over later
4. Smaller scope over larger
5. Human decision breaks ties
```

### Maximum Concurrent Limits

```
Feature Agents:  5 parallel
Fix Agents:      3 parallel
Refactor Agents: 1 at a time
Test Agents:     3 parallel
Doc Agents:      2 parallel
Security Agents: 1 at a time
Review Agents:   Unlimited
```

---

[AI Execution Manifest](ai-execution-manifest.md) | [AI Operating System](ai-operating-system.md)
