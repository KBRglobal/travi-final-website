# AI Agent Governance Framework

> Defining how AI agents work together without chaos

---

## Overview

This document establishes the governance framework for AI agents operating on the TRAVI codebase. It defines roles, boundaries, handoff protocols, and safety mechanisms to prevent conflicts and ensure coordinated development.

---

## Agent Roles & Responsibilities

### Defined Agent Types

| Agent Role | Primary Responsibility | Authority Level |
|------------|----------------------|-----------------|
| **Feature Agent** | Implements new features and enhancements | Branch-scoped |
| **Fix Agent** | Resolves bugs and issues | Branch-scoped |
| **Review Agent** | Code review and quality checks | Read-only + Comments |
| **Refactor Agent** | Code improvements and optimization | Branch-scoped |
| **Documentation Agent** | Maintains docs and guides | `docs/` directory only |
| **Test Agent** | Creates and maintains tests | `tests/` directory only |
| **Security Agent** | Security audits and fixes | Advisory + Critical fixes |
| **Orchestration Agent** | Coordinates multi-agent work | Meta-operations only |

### Role Definitions

#### Feature Agent
- **Can**: Create branches, write code, modify existing files, run tests
- **Cannot**: Merge to main, delete other agents' branches, modify governance docs
- **Scope**: Single feature per assignment

#### Fix Agent
- **Can**: Create hotfix branches, modify code, run tests
- **Cannot**: Refactor unrelated code, add new features
- **Scope**: Single issue per assignment

#### Review Agent
- **Can**: Read all code, add comments, request changes, approve PRs
- **Cannot**: Modify code directly, merge without approval
- **Scope**: Assigned PRs only

#### Refactor Agent
- **Can**: Restructure code, optimize performance, update patterns
- **Cannot**: Change functionality, modify APIs without approval
- **Scope**: Designated areas only

#### Documentation Agent
- **Can**: Create/modify files in `docs/`, update README files
- **Cannot**: Modify source code, change configurations
- **Scope**: Documentation files only

#### Test Agent
- **Can**: Create/modify test files, update test configurations
- **Cannot**: Modify production code to make tests pass
- **Scope**: Test infrastructure only

#### Security Agent
- **Can**: Audit code, report vulnerabilities, apply critical patches
- **Cannot**: Make broad architectural changes
- **Scope**: Security-related changes only

#### Orchestration Agent
- **Can**: Assign tasks, coordinate agents, resolve conflicts
- **Cannot**: Write feature code, bypass governance rules
- **Scope**: Meta-operations and coordination

---

## Boundaries & Scope Enforcement

### File Ownership Matrix

```
/client/          -> Feature Agent, Fix Agent, Refactor Agent
/server/          -> Feature Agent, Fix Agent, Refactor Agent
/shared/          -> Requires approval from 2+ agents
/docs/            -> Documentation Agent (primary), any agent (read)
/tests/           -> Test Agent (primary), Feature Agent (own tests)
/scripts/         -> Requires Orchestration Agent approval
/migrations/      -> Requires explicit approval
/.env*            -> NO agent access (human only)
/package.json     -> Requires approval for dependency changes
```

### Branch Namespace Rules

```
claude/<purpose>-<session-id>     # AI agent working branches
feature/<name>                     # Human feature branches
fix/<issue-id>                     # Human fix branches
docs/<topic>                       # Documentation updates
hotfix/<issue>                     # Critical production fixes
```

### Concurrent Work Rules

1. **One agent per branch**: No two agents may work on the same branch simultaneously
2. **File locking**: When an agent is modifying a file, other agents must wait
3. **Directory ownership**: Critical directories require single-agent access

---

## Handoff Protocols

### Agent-to-Agent Handoff

When transferring work between agents:

```
┌─────────────────┐
│  Source Agent   │
│  Completes Task │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Commit Changes │
│  Clear Message  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Handoff  │
│    Manifest     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Target Agent   │
│  Picks Up Work  │
└─────────────────┘
```

### Handoff Manifest Format

```json
{
  "handoff_id": "unique-id",
  "timestamp": "ISO-8601",
  "source_agent": {
    "type": "feature",
    "session_id": "abc123"
  },
  "target_agent": {
    "type": "review",
    "session_id": null
  },
  "context": {
    "branch": "claude/feature-name-abc123",
    "files_modified": ["file1.ts", "file2.ts"],
    "summary": "Implemented user authentication flow",
    "blockers": [],
    "next_steps": ["Review code", "Run tests"]
  },
  "status": "pending_pickup"
}
```

### Handoff Rules

1. **Complete before handoff**: Never hand off incomplete work without explicit blocker documentation
2. **Clean state**: All changes must be committed before handoff
3. **Context preservation**: Document all decisions and rationale
4. **No orphaned branches**: Every branch must have an owner

---

## Approval Flows

### Standard Approval Matrix

| Action | Required Approvals |
|--------|-------------------|
| Create branch | None (auto-approved) |
| Modify existing code | None (branch-scoped) |
| Add new dependency | Human + Security Agent |
| Modify shared types | Feature Agent + Review Agent |
| Database migration | Human + 2 Agents |
| Merge to main | Human required |
| Delete branch | Owner only |
| Modify governance docs | Orchestration Agent + Human |
| Access secrets/env | Never (human only) |

### Escalation Path

```
Level 0: Agent Self-Approval (branch work)
    ↓
Level 1: Peer Agent Review (cross-functional)
    ↓
Level 2: Orchestration Agent (conflicts)
    ↓
Level 3: Human Intervention (critical decisions)
```

### Approval Request Format

```markdown
## Approval Request

**Agent**: Feature Agent (session: xyz789)
**Action**: Add new npm dependency
**Package**: zod@3.22.0
**Reason**: Schema validation for API inputs
**Risk Assessment**: Low - well-maintained, no security advisories
**Waiting On**: Human approval, Security Agent review
```

---

## Kill-Switch Mechanisms

### Immediate Stop Triggers

The following conditions trigger immediate agent cessation:

| Trigger | Action |
|---------|--------|
| Human `STOP` command | Immediate halt, commit current state |
| Error rate > 5 in 10 minutes | Pause and alert |
| Unauthorized file access attempt | Halt + log + alert |
| Merge conflict unresolvable | Halt + request human help |
| Test failure rate > 50% | Halt + rollback consideration |
| Security vulnerability detected | Halt + Security Agent takeover |

### Kill-Switch Implementation

```typescript
// Conceptual kill-switch check
interface KillSwitchState {
  active: boolean;
  reason?: string;
  triggeredBy?: 'human' | 'system' | 'agent';
  timestamp?: string;
}

// Agents must check before each action
async function checkKillSwitch(): Promise<KillSwitchState> {
  // 1. Check for human stop command
  // 2. Check error thresholds
  // 3. Check system health
  // 4. Verify agent authorization
}
```

### Recovery Protocol

After a kill-switch activation:

1. **Preserve state**: Commit all work with `[HALTED]` prefix
2. **Document cause**: Log the trigger reason
3. **Notify**: Alert relevant parties
4. **Wait for clearance**: Do not resume without explicit authorization
5. **Review before restart**: Analyze what caused the halt

---

## Conflict Prevention

### Duplicate Work Prevention

1. **Task registry**: All active tasks must be registered centrally
2. **Branch naming**: Descriptive names prevent overlap
3. **Pre-flight check**: Before starting, verify no other agent has the task
4. **Scope declaration**: Explicitly declare files to be modified

### Conflict Resolution Priority

When two agents conflict:

```
1. Earlier timestamp wins for branch ownership
2. More specific scope wins (file > directory)
3. Security concerns override feature work
4. Human decision breaks ties
```

### Merge Conflict Protocol

```
IF merge_conflict THEN
    1. HALT both agents
    2. Preserve both branches
    3. Document conflict in manifest
    4. Request Orchestration Agent intervention
    5. If unresolvable, escalate to human
END IF
```

---

## Audit & Compliance

### Required Logging

All agents must log:

- Task assignment received
- Branch creation/modification
- Files accessed (read/write)
- Approvals requested/received
- Handoffs initiated/completed
- Errors encountered
- Kill-switch checks

### Audit Trail Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "agent_type": "feature",
  "session_id": "abc123",
  "action": "file_modify",
  "target": "/client/src/components/Auth.tsx",
  "outcome": "success",
  "context": {
    "task_id": "TASK-456",
    "branch": "claude/auth-feature-abc123"
  }
}
```

### Compliance Checks

- [ ] All agents operate within defined scope
- [ ] No unauthorized file access
- [ ] All changes are committed with clear messages
- [ ] Handoffs are properly documented
- [ ] Kill-switch mechanisms are functional
- [ ] Audit logs are complete

---

## Governance Updates

### Change Process

Changes to this governance framework require:

1. Proposal by Orchestration Agent or Human
2. Review period (minimum 1 day)
3. Approval by designated human
4. Documentation update
5. Agent re-orientation

### Version Control

This document is version controlled. All agents must reference the current version and check for updates before major operations.

---

## Quick Reference

### Agent Can/Cannot Summary

| Agent | Can Create Branches | Can Merge | Can Modify All Code | Needs Approval For |
|-------|--------------------|-----------|--------------------|-------------------|
| Feature | Yes | No | No (scoped) | Dependencies, shared types |
| Fix | Yes | No | No (scoped) | Architectural changes |
| Review | No | No | No | - |
| Refactor | Yes | No | Yes (designated) | API changes |
| Docs | Yes | No | No | Non-doc files |
| Test | Yes | No | No | Production code |
| Security | Yes | No | Yes (security) | Feature changes |
| Orchestration | No | No | No | Code changes |

### Emergency Contacts

- **Kill-switch activation**: Orchestration Agent
- **Security incident**: Security Agent
- **Unresolvable conflict**: Human intervention required
- **Governance violation**: Log and halt

---

**Document Version**: 1.0.0
**Last Updated**: 2024
**Owner**: Orchestration Agent

---

[Back to Documentation Hub](README.md) | [Agent Workflow](agent-workflow.md)
