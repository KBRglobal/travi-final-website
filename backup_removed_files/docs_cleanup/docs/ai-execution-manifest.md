# AI Execution Manifest

> The single entry point for all AI agent work

---

## Purpose

Every AI task enters through this manifest. No exceptions.
No task executes without a valid manifest entry.

---

## Canonical Task Request Format

```yaml
# ═══════════════════════════════════════════════════════════════
# AI TASK REQUEST — MANDATORY FORMAT
# ═══════════════════════════════════════════════════════════════

task_id: "TASK-YYYY-MMDD-NNNN"       # Auto-generated, unique
created_at: "ISO-8601 timestamp"
requested_by: "human | orchestrator | agent-id"

# ───────────────────────────────────────────────────────────────
# SECTION 1: OBJECTIVE (Required)
# ───────────────────────────────────────────────────────────────
objective:
  summary: "One-line description of what must be done"
  details: |
    Multi-line description if needed.
    Be specific. Be concrete.
  type: "feature | fix | refactor | docs | test | security | audit"
  priority: "critical | high | medium | low"

# ───────────────────────────────────────────────────────────────
# SECTION 2: SCOPE (Required)
# ───────────────────────────────────────────────────────────────
scope:
  include:
    - "/path/to/allowed/directory/"
    - "/path/to/specific/file.ts"
  exclude: []  # Will be populated from forbidden_areas

# ───────────────────────────────────────────────────────────────
# SECTION 3: FORBIDDEN AREAS (Required — can be empty)
# ───────────────────────────────────────────────────────────────
forbidden_areas:
  files:
    - "/.env*"                    # ALWAYS forbidden
    - "/secrets/*"                # ALWAYS forbidden
    - "/docs/ai-*.md"             # Governance docs protected
  directories:
    - "/migrations/"              # Unless explicitly approved
  operations:
    - "delete_branch:main"        # Never
    - "force_push:*"              # Never without human approval
    - "modify:package.json"       # Requires approval

# ───────────────────────────────────────────────────────────────
# SECTION 4: SUCCESS CRITERIA (Required)
# ───────────────────────────────────────────────────────────────
success_criteria:
  must_have:
    - "Criterion 1 — what MUST be true when done"
    - "Criterion 2 — measurable, verifiable"
  should_have:
    - "Nice to have but not blocking"
  verification:
    - "tests_pass: true"
    - "lint_pass: true"
    - "no_new_errors: true"

# ───────────────────────────────────────────────────────────────
# SECTION 5: AGENT ASSIGNMENT (Auto-populated or specified)
# ───────────────────────────────────────────────────────────────
assignment:
  agent_type: null               # Selected by rules below
  agent_id: null                 # Assigned at pickup
  branch: null                   # Created at execution start

# ───────────────────────────────────────────────────────────────
# SECTION 6: DEPENDENCIES & BLOCKERS
# ───────────────────────────────────────────────────────────────
dependencies:
  tasks: []                      # Task IDs that must complete first
  approvals: []                  # Required approvals before start

blockers:
  current: []                    # Active blockers
  resolved: []                   # Previously resolved

# ───────────────────────────────────────────────────────────────
# SECTION 7: HANDOFF REQUIREMENTS
# ───────────────────────────────────────────────────────────────
handoff:
  next_agent: null               # Who receives work after completion
  handoff_type: "sequential | parallel | terminal"
  checklist_required: true       # Must complete handoff checklist
```

---

## Agent Selection Rules

When a task arrives, select agent type using these rules **in order**:

```
RULE 1: SECURITY FIRST
  IF objective.type = "security" OR forbidden_areas violated
  THEN → Security Agent

RULE 2: DOCUMENTATION SCOPE
  IF scope.include ONLY contains "/docs/*"
  THEN → Documentation Agent

RULE 3: TEST SCOPE
  IF scope.include ONLY contains "/tests/*" OR "*.test.*" OR "*.spec.*"
  THEN → Test Agent

RULE 4: BUG FIX
  IF objective.type = "fix"
  THEN → Fix Agent

RULE 5: REFACTOR
  IF objective.type = "refactor"
  THEN → Refactor Agent

RULE 6: NEW FEATURE
  IF objective.type = "feature"
  THEN → Feature Agent

RULE 7: AUDIT / REVIEW
  IF objective.type = "audit"
  THEN → Review Agent

RULE 8: DEFAULT
  ELSE → Feature Agent (with scope restrictions)
```

### Agent Availability Check

Before assignment, verify:

```
[ ] Agent type exists and is operational
[ ] No conflicting tasks for same scope
[ ] Agent has capacity (not overloaded)
[ ] Required approvals obtained
[ ] Dependencies satisfied
```

---

## Expected Outputs Per Agent Type

| Agent Type | Primary Output | Secondary Outputs | Artifacts |
|------------|----------------|-------------------|-----------|
| **Feature** | Working code | Tests for new code | Branch, commits |
| **Fix** | Bug resolution | Regression test | Branch, commits |
| **Refactor** | Improved code | Updated tests | Branch, commits |
| **Test** | Test coverage | Test reports | Branch, commits |
| **Docs** | Documentation | Updated links | Branch, commits |
| **Security** | Security fixes | Vulnerability report | Branch, commits, advisory |
| **Review** | Review comments | Approval/rejection | PR comments |
| **Orchestration** | Task coordination | Status reports | Manifest updates |

### Output Quality Gates

Every agent output must pass:

```yaml
quality_gates:
  code_agents:
    - compiles: true
    - no_lint_errors: true
    - tests_pass: true
    - no_security_warnings: true

  doc_agents:
    - links_valid: true
    - format_correct: true
    - no_broken_references: true

  all_agents:
    - commits_have_messages: true
    - branch_named_correctly: true
    - handoff_checklist_complete: true
```

---

## Mandatory Handoff Checklist

**No handoff is valid without completing ALL items.**

### Pre-Handoff (Sending Agent)

```
═══════════════════════════════════════════════════════════════
HANDOFF CHECKLIST — SENDING AGENT
═══════════════════════════════════════════════════════════════

COMMITS
[ ] All changes committed
[ ] Commit messages follow convention
[ ] No uncommitted files in working directory
[ ] Final commit tagged with [HANDOFF] or status tag

BRANCH STATE
[ ] Branch pushed to remote
[ ] No merge conflicts with base branch
[ ] Branch name matches task ID

VERIFICATION
[ ] Code compiles (if applicable)
[ ] Tests pass (if applicable)
[ ] No new lint errors introduced
[ ] Self-review completed

DOCUMENTATION
[ ] Summary of changes in final commit
[ ] Blockers documented (if any)
[ ] Next steps clearly stated
[ ] Files modified listed

MANIFEST UPDATE
[ ] Task status updated
[ ] Next agent specified
[ ] Handoff timestamp recorded
[ ] Dependencies updated
```

### Post-Handoff (Receiving Agent)

```
═══════════════════════════════════════════════════════════════
HANDOFF CHECKLIST — RECEIVING AGENT
═══════════════════════════════════════════════════════════════

VERIFICATION
[ ] Branch exists and is accessible
[ ] Latest changes pulled
[ ] Previous work reviewed
[ ] Scope understood

CONTINUATION
[ ] Task manifest read
[ ] Success criteria understood
[ ] Forbidden areas acknowledged
[ ] Dependencies verified

CONFIRMATION
[ ] Task status updated to "active"
[ ] Agent ID recorded in manifest
[ ] Work started timestamp recorded
```

---

## Manifest Validation

A task request is **INVALID** if:

```
INVALID CONDITIONS:
- task_id is missing or malformed
- objective.summary is empty
- scope.include is empty
- success_criteria.must_have is empty
- forbidden_areas not acknowledged
- priority not specified
```

A task request is **BLOCKED** if:

```
BLOCKED CONDITIONS:
- dependencies.tasks contains incomplete tasks
- dependencies.approvals contains pending approvals
- scope.include overlaps with active task scope
- forbidden_areas contains required files
```

---

## Quick Reference: Task States

```
PLANNED    → Task defined, not yet assigned
ASSIGNED   → Agent selected, not yet started
ACTIVE     → Work in progress
BLOCKED    → Cannot proceed, waiting on dependency
REVIEW     → Work complete, awaiting review
DONE       → All criteria met, merged
FROZEN     → Halted by kill-switch
CANCELLED  → Abandoned with documented reason
```

---

## Entry Point Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK ENTRY FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. REQUEST RECEIVED
   │
   ▼
2. VALIDATE MANIFEST FORMAT
   │── Invalid? → REJECT with reason
   │
   ▼
3. CHECK FORBIDDEN AREAS
   │── Violation? → REJECT or escalate to human
   │
   ▼
4. CHECK DEPENDENCIES
   │── Unmet? → STATUS = BLOCKED
   │
   ▼
5. CHECK SCOPE CONFLICTS
   │── Conflict? → REJECT or queue
   │
   ▼
6. SELECT AGENT (using rules)
   │
   ▼
7. ASSIGN TASK
   │── STATUS = ASSIGNED
   │
   ▼
8. AGENT PICKS UP
   │── STATUS = ACTIVE
   │
   ▼
9. WORK EXECUTED
   │
   ▼
10. HANDOFF OR COMPLETE
    │── Handoff? → Return to step 6 for next agent
    │── Complete? → STATUS = DONE
```

---

**This is the law. No task bypasses this manifest.**

---

[AI Agent Governance](ai-agent-governance.md) | [Agent Workflow](agent-workflow.md) | [AI Operating System](ai-operating-system.md)
