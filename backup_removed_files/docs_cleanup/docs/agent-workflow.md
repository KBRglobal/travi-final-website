# AI Agent Workflow

> How AI agents collaborate on the TRAVI codebase

---

## Overview

This document describes the practical workflows for AI agent collaboration. It complements the [AI Agent Governance](ai-agent-governance.md) framework with actionable procedures.

---

## Workflow Patterns

### Single-Agent Workflow

The simplest pattern: one agent, one task.

```
┌──────────────────────────────────────────────────────────┐
│                    SINGLE-AGENT FLOW                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   1. RECEIVE TASK                                        │
│      └─→ Validate scope matches agent role               │
│                                                          │
│   2. CREATE BRANCH                                       │
│      └─→ claude/<purpose>-<session-id>                   │
│                                                          │
│   3. EXECUTE WORK                                        │
│      └─→ Make changes within authorized scope            │
│      └─→ Commit frequently with clear messages           │
│                                                          │
│   4. SELF-VERIFY                                         │
│      └─→ Run tests, check linting                        │
│      └─→ Review own changes                              │
│                                                          │
│   5. COMPLETE                                            │
│      └─→ Push branch                                     │
│      └─→ Create PR or hand off                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Multi-Agent Sequential Workflow

Multiple agents working in sequence on related tasks.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Feature   │────→│    Test     │────→│   Review    │
│    Agent    │     │    Agent    │     │    Agent    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
 Implements          Adds tests          Reviews all
  feature            for feature          changes
```

**Handoff Protocol:**

1. Feature Agent completes implementation
2. Feature Agent commits with `[READY-FOR-TESTS]` tag
3. Test Agent picks up, adds tests
4. Test Agent commits with `[READY-FOR-REVIEW]` tag
5. Review Agent reviews entire branch

### Multi-Agent Parallel Workflow

Multiple agents working simultaneously on independent tasks.

```
                    ┌─────────────┐
                    │ Orchestrator│
                    │   assigns   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Feature A  │ │  Feature B  │ │    Docs     │
    │    Agent    │ │    Agent    │ │    Agent    │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           ▼               ▼               ▼
      branch-A        branch-B        branch-docs
           │               │               │
           └───────────────┴───────────────┘
                           │
                    ┌──────▼──────┐
                    │   Merge     │
                    │  Coordinator│
                    └─────────────┘
```

**Parallel Work Rules:**

- Each agent has exclusive branch ownership
- No overlapping file modifications
- Coordinate on shared types/interfaces
- Orchestrator resolves any conflicts before merge

---

## Task Assignment Protocol

### Assignment Request Format

```yaml
task_id: TASK-2024-001
type: feature
priority: medium
agent_role: feature
scope:
  - /client/src/components/Newsletter/
  - /server/routes/newsletter.ts
  - /shared/types/newsletter.ts
dependencies:
  - none
blockers:
  - none
description: |
  Implement newsletter subscription component with
  email validation and API integration.
acceptance_criteria:
  - Email input with validation
  - Subscribe button with loading state
  - Success/error feedback
  - API endpoint for subscription
deadline: none
assigned_to: null
```

### Assignment Acceptance

Before accepting a task, an agent must verify:

```
[ ] Task scope matches agent role
[ ] No conflicting tasks are in progress
[ ] Required files are not locked by another agent
[ ] Dependencies are satisfied
[ ] Blockers are resolved
```

### Task States

```
PENDING     →  Waiting for assignment
ASSIGNED    →  Agent has accepted
IN_PROGRESS →  Work has begun
BLOCKED     →  Waiting on dependency/approval
REVIEW      →  Ready for review
COMPLETED   →  All acceptance criteria met
CANCELLED   →  Task abandoned (with reason)
```

---

## Branch Management

### Branch Lifecycle

```
CREATE              WORK                COMPLETE            CLEANUP
   │                  │                     │                  │
   ▼                  ▼                     ▼                  ▼
┌──────┐         ┌──────┐             ┌──────┐            ┌──────┐
│ New  │─────────│Active│─────────────│Merged│────────────│Delete│
│Branch│         │ Work │             │  PR  │            │Branch│
└──────┘         └──────┘             └──────┘            └──────┘
                     │
                     ▼
                ┌──────┐
                │Stale │──→ Cleanup or Resume
                │(>7d) │
                └──────┘
```

### Branch Naming Convention

```
claude/<task-type>-<description>-<session-id>

Examples:
claude/feature-newsletter-YonVa
claude/fix-auth-error-Abc123
claude/refactor-api-routes-Xyz789
claude/docs-api-guide-Qrs456
```

### Stale Branch Policy

- Branches inactive for >7 days require status check
- Inactive branches are archived after 30 days
- Archived branches retain commit history
- Orphaned branches trigger Orchestrator alert

---

## Commit Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]

Agent: <agent-type>/<session-id>
Task: <task-id>
```

### Commit Types for Agents

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(newsletter): add subscription form` |
| `fix` | Bug fix | `fix(auth): resolve token expiry` |
| `refactor` | Code improvement | `refactor(api): simplify routes` |
| `test` | Test additions | `test(newsletter): add unit tests` |
| `docs` | Documentation | `docs(api): update endpoint docs` |
| `chore` | Maintenance | `chore(deps): update dependencies` |
| `wip` | Work in progress | `wip: partial newsletter form` |

### Special Commit Tags

```
[READY-FOR-TESTS]    - Feature complete, needs tests
[READY-FOR-REVIEW]   - All work complete, needs review
[BLOCKED]            - Cannot proceed, see body
[HALTED]             - Kill-switch activated
[HANDOFF]            - Transferring to another agent
```

---

## Conflict Prevention

### Pre-Work Checklist

Before starting any work:

```bash
# 1. Fetch latest changes
git fetch origin

# 2. Check for conflicting branches
git branch -r | grep claude/

# 3. Verify no other agent is modifying target files
# (Check task registry or handoff manifest)

# 4. Create your branch from latest main/develop
git checkout -b claude/<purpose>-<session-id> origin/main
```

### File Lock Protocol

When an agent needs exclusive access to critical files:

```yaml
file_lock:
  agent: feature/YonVa
  files:
    - /shared/types/user.ts
    - /shared/types/auth.ts
  reason: "Modifying shared type definitions"
  expires: "2024-01-15T12:00:00Z"

# Other agents must wait or request unlock
```

### Conflict Detection

```
IF attempting to modify locked file THEN
    1. Check lock owner
    2. If lock expired → claim lock
    3. If lock active → wait or request coordination
    4. Log conflict attempt
END IF
```

### Conflict Resolution Workflow

```
┌─────────────────────────────────────────────────────────┐
│                  CONFLICT DETECTED                       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Both agents HALT work  │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Preserve current state │
            │ Commit with [CONFLICT] │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Notify Orchestrator    │
            └────────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
    ┌───────────────┐        ┌───────────────┐
    │ Auto-resolve  │        │ Human needed  │
    │ (scope split) │        │ (escalate)    │
    └───────────────┘        └───────────────┘
```

---

## Communication Patterns

### Agent-to-Agent Communication

Agents communicate through:

1. **Commit messages** - Status and context
2. **Branch state** - Work completion status
3. **Task registry** - Assignment and progress
4. **Handoff manifests** - Transfer documentation

### Status Reporting

Regular status updates in commits:

```markdown
## Status Update

**Task**: TASK-2024-001
**Progress**: 70%
**Completed**:
- Newsletter form component
- Email validation
- API endpoint

**Remaining**:
- Error handling
- Loading states

**Blockers**: None
**ETA**: Next commit cycle
```

### Escalation Communication

```yaml
escalation:
  level: 2
  from: feature/YonVa
  to: orchestrator
  reason: "Cannot resolve type conflict with test agent"
  context:
    conflicting_file: /shared/types/newsletter.ts
    my_changes: "Added SubscriptionRequest type"
    their_changes: "Added NewsletterTestData type"
  requested_action: "Merge types or split file"
```

---

## Quality Gates

### Before Commit

```
[ ] Code compiles without errors
[ ] No new linting warnings
[ ] Changes are within authorized scope
[ ] Commit message follows convention
```

### Before Handoff

```
[ ] All commits pushed
[ ] Tests pass (if applicable)
[ ] No uncommitted changes
[ ] Handoff manifest updated
[ ] Clear summary in last commit
```

### Before Merge Request

```
[ ] All acceptance criteria met
[ ] Tests added for new code
[ ] Documentation updated
[ ] No merge conflicts
[ ] Code reviewed (if applicable)
[ ] Security scan passed
```

---

## Recovery Procedures

### Recovering from Failed Work

```bash
# If work is salvageable:
git stash
git checkout main
git pull origin main
git checkout -b claude/<purpose>-<new-session-id>
git stash pop
# Continue work

# If work needs to be abandoned:
git checkout main
git branch -D claude/<failed-branch>
# Document why in task registry
```

### Recovering from Conflicts

```bash
# Preserve your work
git stash

# Get latest main
git fetch origin
git checkout main
git pull origin main

# Create fresh branch
git checkout -b claude/<purpose>-<session-id>

# Carefully reapply changes
git stash pop
# Resolve any conflicts manually

# Commit with context
git commit -m "refactor: reapply changes after conflict resolution

Previous branch had conflicts with parallel work.
Resolved by rebasing on latest main.

Agent: feature/YonVa
Task: TASK-2024-001"
```

### Recovering from Kill-Switch

After kill-switch activation:

1. **Do not resume automatically**
2. **Wait for explicit clearance**
3. **Review the trigger cause**
4. **Verify scope hasn't changed**
5. **Start fresh if needed**

---

## Workflow Examples

### Example 1: Feature Implementation

```
1. Orchestrator assigns feature task to Feature Agent
2. Feature Agent:
   - Creates branch: claude/feature-user-profile-Xyz123
   - Implements feature over multiple commits
   - Tags final commit: [READY-FOR-TESTS]
   - Updates handoff manifest

3. Test Agent:
   - Picks up from manifest
   - Adds tests on same branch
   - Tags final commit: [READY-FOR-REVIEW]
   - Updates manifest

4. Review Agent:
   - Reviews all changes
   - Adds comments or approves
   - Tags: [APPROVED] or [CHANGES-REQUESTED]

5. Human:
   - Final review
   - Merges to main
```

### Example 2: Bug Fix (Fast Track)

```
1. Fix Agent receives high-priority bug
2. Fix Agent:
   - Creates branch: claude/fix-auth-crash-Abc789
   - Implements fix
   - Adds regression test
   - Tags: [READY-FOR-REVIEW]

3. Security Agent:
   - Quick review for security implications
   - Approves

4. Human:
   - Expedited merge to main
```

### Example 3: Parallel Feature Work

```
1. Orchestrator identifies two independent features
2. Assigns Feature A to Agent 1, Feature B to Agent 2
3. Both agents work simultaneously on separate branches
4. Orchestrator monitors for potential conflicts
5. Upon completion:
   - Test Agent tests both features
   - Review Agent reviews both
   - Human merges in order of completion
```

---

## Metrics & Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Task completion rate | >90% | <80% |
| Conflict frequency | <5% | >10% |
| Average task duration | Varies | >2x baseline |
| Kill-switch activations | 0 | Any |
| Handoff success rate | 100% | <95% |

### Health Indicators

```
GREEN  - All agents operating normally
YELLOW - Minor issues, monitoring required
RED    - Significant problems, intervention needed
```

---

## Quick Reference

### Agent Daily Workflow

```
1. Check for assigned tasks
2. Verify no conflicts with current work
3. Create/resume branch
4. Work within scope
5. Commit frequently
6. Update status regularly
7. Hand off when complete
8. Clean up branch after merge
```

### Emergency Procedures

| Situation | Action |
|-----------|--------|
| Merge conflict | HALT, preserve state, notify Orchestrator |
| Kill-switch triggered | HALT, commit with [HALTED], wait for clearance |
| Unauthorized access attempt | HALT, log, alert Security Agent |
| Test failures >50% | HALT, review changes, consider rollback |
| Human STOP command | Immediate halt, commit current state |

---

**Document Version**: 1.0.0
**Last Updated**: 2024
**Related**: [AI Agent Governance](ai-agent-governance.md)

---

[Back to Documentation Hub](README.md) | [AI Agent Governance](ai-agent-governance.md)
