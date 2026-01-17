# AI Global Stop Protocol

> When and how all AI agents must halt

---

## Halt Hierarchy

```
╔═══════════════════════════════════════════════════════════════╗
║                    HALT PRIORITY LEVELS                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  LEVEL 0: EMERGENCY STOP                                      ║
║  ─────────────────────                                        ║
║  Trigger: Human command, security breach, system failure      ║
║  Effect:  ALL agents stop IMMEDIATELY                         ║
║  Resume:  Human approval required                             ║
║                                                               ║
║  LEVEL 1: SECTOR FREEZE                                       ║
║  ──────────────────────                                       ║
║  Trigger: Critical conflict, merge risk, design violation     ║
║  Effect:  Agents in affected scope stop                       ║
║  Resume:  Orchestrator + human approval                       ║
║                                                               ║
║  LEVEL 2: AGENT PAUSE                                         ║
║  ────────────────────                                         ║
║  Trigger: Error threshold, test failures, blocked state       ║
║  Effect:  Single agent pauses                                 ║
║  Resume:  Orchestrator approval                               ║
║                                                               ║
║  LEVEL 3: SOFT STOP                                           ║
║  ─────────────────                                            ║
║  Trigger: Resource limits, queue management                   ║
║  Effect:  Agent completes current commit, then waits          ║
║  Resume:  Automatic when conditions clear                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Immediate Halt Triggers

### LEVEL 0: Emergency Stop

**Any of these trigger immediate global halt:**

| Trigger | Signal | Response Time |
|---------|--------|---------------|
| Human `STOP ALL` command | Explicit | Immediate |
| Security breach detected | Automated | Immediate |
| Production system failure | Automated | Immediate |
| Unauthorized access attempt | Automated | Immediate |
| Data corruption detected | Automated | Immediate |
| Main branch compromised | Automated | Immediate |

**Emergency Stop Procedure:**

```
1. ALL agents receive HALT signal
2. Each agent:
   a. Stops current operation mid-action
   b. Commits current state with [EMERGENCY-HALT] tag
   c. Pushes to branch (if possible)
   d. Reports status to registry
   e. Enters frozen state
3. Registry marks all active tasks as FROZEN
4. Alert sent to all human operators
5. No agent may resume without human clearance
```

### LEVEL 1: Sector Freeze

**These trigger halt for agents in affected scope:**

| Trigger | Affected Agents | Detection |
|---------|-----------------|-----------|
| Merge conflict on shared files | Agents touching those files | Git conflict |
| Design decision required | Agents in that feature area | Orchestrator signal |
| Critical dependency failure | Downstream agents | Registry check |
| Security vulnerability in scope | All agents in scope | Security Agent alert |
| API breaking change | Consumers of that API | Automated check |

**Sector Freeze Procedure:**

```
1. Identify affected scope
2. Signal PAUSE to agents in scope
3. Each affected agent:
   a. Completes current atomic operation (max 30 seconds)
   b. Commits with [SECTOR-FREEZE] tag
   c. Enters blocked state
4. Unaffected agents continue normally
5. Orchestrator coordinates resolution
6. Resume requires Orchestrator + human for LEVEL 1
```

### LEVEL 2: Agent Pause

**These trigger individual agent pause:**

| Trigger | Threshold | Detection |
|---------|-----------|-----------|
| Consecutive errors | 5 in 10 minutes | Error counter |
| Test failure rate | >50% of tests | Test runner |
| Lint errors introduced | >10 new errors | Linter |
| Unresolved conflicts | After 3 attempts | Git check |
| Scope violation attempt | 1 occurrence | Permission check |
| Dependency timeout | 5 minutes | Registry |

**Agent Pause Procedure:**

```
1. Agent detects trigger condition
2. Agent:
   a. Halts new operations
   b. Commits current state with [PAUSED] tag
   c. Logs reason and context
   d. Sets status to BLOCKED
   e. Requests Orchestrator review
3. Orchestrator evaluates:
   a. Can agent self-recover? → Provide guidance
   b. Is task salvageable? → Reassign or resume
   c. Is task flawed? → Cancel and document
```

### LEVEL 3: Soft Stop

**These trigger graceful pause:**

| Trigger | Condition | Resumption |
|---------|-----------|------------|
| Agent capacity reached | Max concurrent for type | When slot frees |
| Resource throttling | API limits, compute limits | When limits reset |
| Priority preemption | Higher priority task needs resources | When preempting task done |
| Scheduled maintenance | Planned downtime window | After maintenance |

**Soft Stop Procedure:**

```
1. Agent receives SOFT-STOP signal
2. Agent:
   a. Completes current logical unit of work
   b. Commits with clear message (no special tag)
   c. Sets status to BLOCKED with reason
   d. Enters wait state
3. Automatic resume when condition clears
4. No escalation needed
```

---

## Risk Categories

### Merge Risk

**Definition:** Changes that may cause git conflicts or integration failures.

```
MERGE RISK INDICATORS:
- Multiple agents modifying same file
- Changes to shared types/interfaces
- Modifications to base classes or utilities
- Long-running branches (>24 hours without rebase)
- Changes to package.json or config files

MERGE RISK RESPONSE:
1. Flag affected tasks in registry
2. Coordinate commit order
3. If conflict unavoidable:
   a. Earlier task commits first
   b. Later task must rebase
   c. If rebase fails → Sector Freeze
```

### Security Risk

**Definition:** Changes that may introduce vulnerabilities or expose sensitive data.

```
SECURITY RISK INDICATORS:
- Modifications to authentication/authorization code
- Changes to data validation or sanitization
- New external dependencies added
- Changes to encryption or hashing
- Modifications to API endpoints
- Changes to file permissions or access controls

SECURITY RISK RESPONSE:
1. Immediate notification to Security Agent
2. Security Agent review BEFORE merge
3. If vulnerability detected:
   a. LEVEL 1 Sector Freeze
   b. Affected code quarantined
   c. Fix prioritized over all other work
```

### Design Risk

**Definition:** Changes that may violate architecture or create technical debt.

```
DESIGN RISK INDICATORS:
- New patterns inconsistent with existing architecture
- Tight coupling between previously separate modules
- Bypassing established abstractions
- Hardcoded values that should be configurable
- Missing error handling on critical paths
- Performance implications not considered

DESIGN RISK RESPONSE:
1. Orchestrator flags for review
2. If minor → Note for future refactor
3. If major:
   a. LEVEL 2 Agent Pause
   b. Design decision required
   c. May need human architectural input
```

---

## Signaling Stop to the System

### Agent Self-Report

When an agent detects it should stop:

```yaml
stop_signal:
  agent_id: "feature/Xyz789"
  level: 2                       # LEVEL 0-3
  trigger: "error_threshold"
  details:
    error_count: 5
    time_window: "10 minutes"
    last_error: "Type error in Newsletter.tsx"
  current_state:
    branch: "claude/feature-newsletter-Xyz789"
    last_commit: "abc123"
    uncommitted_changes: false
  recommended_action: "review_errors"
  timestamp: "2024-01-15T10:30:00Z"
```

### Orchestrator Broadcast

When Orchestrator initiates stop:

```yaml
halt_broadcast:
  level: 1                       # Sector Freeze
  scope:
    files:
      - "/shared/types/*"
    agents:
      - "feature/*"
      - "refactor/*"
  reason: "Conflicting type modifications detected"
  instructions: |
    1. Complete current atomic operation
    2. Commit with [SECTOR-FREEZE] tag
    3. Report status to registry
    4. Await further instructions
  initiated_by: "orchestrator"
  timestamp: "2024-01-15T10:30:00Z"
  expected_duration: "30 minutes"
```

### Human Override

When human commands stop:

```yaml
human_override:
  command: "STOP ALL"            # or "STOP <agent_id>" or "STOP <scope>"
  level: 0                       # Emergency unless specified
  reason: "Deployment preparation"
  resume_condition: "Human clearance required"
  operator: "human"
  timestamp: "2024-01-15T10:30:00Z"
```

---

## Safe Resume Protocol

### Resume Requirements by Level

| Level | Who Can Resume | Required Before Resume |
|-------|----------------|------------------------|
| LEVEL 0 | Human only | Full system audit |
| LEVEL 1 | Human + Orchestrator | Conflict resolution verified |
| LEVEL 2 | Orchestrator | Root cause addressed |
| LEVEL 3 | Automatic | Condition cleared |

### Resume Checklist

```
═══════════════════════════════════════════════════════════════
RESUME CHECKLIST
═══════════════════════════════════════════════════════════════

BEFORE RESUMING ANY HALTED AGENT:

[ ] Halt trigger identified and documented
[ ] Root cause understood
[ ] Corrective action taken (if applicable)
[ ] No new conflicts introduced during halt
[ ] Branch still valid (not stale, no merge conflicts)
[ ] Task still relevant (not superseded)
[ ] Dependencies still valid
[ ] Approval obtained (per level requirements)

UPON RESUME:

[ ] Agent fetches latest from base branch
[ ] Agent rebases if needed
[ ] Agent status updated to ACTIVE
[ ] Resume timestamp recorded
[ ] Monitoring increased for first hour
```

### Resume Signal

```yaml
resume_signal:
  task_id: "TASK-2024-0115-0001"
  agent_id: "feature/Xyz789"
  approved_by: "orchestrator"    # or "human"
  approval_level: 2
  conditions:
    - "Reviewed error logs"
    - "Fixed type definition"
    - "Rebased on latest main"
  resume_instructions: |
    Continue from last commit.
    Pay attention to Newsletter type definitions.
    Run tests before next commit.
  timestamp: "2024-01-15T11:00:00Z"
```

---

## Quick Reference

### Stop Level Summary

```
LEVEL 0: GLOBAL EMERGENCY
         Everyone stops NOW
         Human restart only

LEVEL 1: SECTOR FREEZE
         Scoped agents stop
         Human + Orchestrator restart

LEVEL 2: AGENT PAUSE
         One agent stops
         Orchestrator restart

LEVEL 3: SOFT STOP
         Graceful wait
         Auto-restart
```

### Common Triggers Quick Lookup

| Symptom | Likely Level | First Action |
|---------|--------------|--------------|
| Security alert | 0 | Global halt |
| Merge conflict | 1 | Sector freeze |
| Repeated errors | 2 | Agent pause |
| API rate limit | 3 | Soft stop |
| Human STOP | 0/1/2 | Per command |
| Test failures | 2 | Agent pause |
| Design violation | 2 | Agent pause |

---

**When in doubt, STOP. A false halt is recoverable. A bad merge is not.**

---

[AI Task Registry](ai-task-registry.md) | [AI Operating System](ai-operating-system.md)
