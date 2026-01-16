# AI Human-in-the-Loop Protocol

> When humans must be involved — no exceptions

---

## Core Principle

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   SPEED IS MEANINGLESS IF THE RESULT IS WRONG.                ║
║                                                               ║
║   Agents operate at machine speed.                            ║
║   Humans provide judgment and authority.                      ║
║                                                               ║
║   This document defines the HARD BOUNDARIES.                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Human Approval: MANDATORY

### Actions That ALWAYS Require Human Approval

```
═══════════════════════════════════════════════════════════════
NEVER PROCEED WITHOUT HUMAN APPROVAL
═══════════════════════════════════════════════════════════════

PRODUCTION OPERATIONS
├── Merge to main/master branch
├── Deploy to production environment
├── Rollback production changes
├── Modify production database
└── Change production configuration

DATA OPERATIONS
├── Delete any user data
├── Modify data retention policies
├── Export user data
├── Access PII or sensitive data
└── Change encryption settings

SECURITY OPERATIONS
├── Modify authentication system
├── Change authorization rules
├── Update security policies
├── Handle security incidents
└── Patch critical vulnerabilities

INFRASTRUCTURE
├── Modify CI/CD pipeline
├── Change deployment configuration
├── Update environment variables
├── Modify database schemas (production)
└── Scale infrastructure

FINANCIAL / LEGAL
├── Modify payment processing
├── Change pricing logic
├── Update terms of service
├── Modify compliance-related code
└── Handle user complaints

IRREVERSIBLE ACTIONS
├── Delete repositories or branches on main
├── Remove backups
├── Terminate services
├── Revoke credentials
└── Any action that cannot be undone
```

### Approval Request Format

```yaml
approval_request:
  request_id: "APR-2024-0115-0001"
  requested_by:
    agent_type: "feature"
    agent_id: "feature/Xyz789"
    task_id: "TASK-2024-0115-0001"

  action:
    type: "merge_to_main"
    description: "Merge newsletter feature to main branch"
    branch: "claude/feature-newsletter-Xyz789"
    commits: 5
    files_changed: 12

  justification: |
    Newsletter feature complete.
    All tests passing.
    Code reviewed by Review Agent.
    No security issues detected.

  risk_assessment:
    level: "low"
    potential_impact: "New feature, no existing code modified"
    rollback_plan: "Revert merge commit"

  urgency: "normal"              # normal | urgent | critical

  waiting_since: "2024-01-15T10:00:00Z"
  expires: "2024-01-16T10:00:00Z"  # Auto-cancel if not addressed
```

---

## Agent Autonomy: PERMITTED

### Actions Agents May Take Without Approval

```
═══════════════════════════════════════════════════════════════
AGENTS MAY PROCEED AUTONOMOUSLY
═══════════════════════════════════════════════════════════════

BRANCH OPERATIONS
├── Create feature branches (claude/* namespace only)
├── Commit to own branch
├── Push to own branch
├── Rebase own branch on main
└── Delete own branch after merge

CODE OPERATIONS
├── Write new code in scope
├── Modify existing code in scope
├── Add tests for own code
├── Fix lint errors in own code
└── Refactor within defined scope

DOCUMENTATION
├── Update docs for own changes
├── Add inline comments
├── Update README for own feature
└── Create technical documentation

TESTING
├── Run test suites
├── Add new tests
├── Fix failing tests (in scope)
└── Generate test reports

COMMUNICATION
├── Update task status in registry
├── Signal other agents via handoff
├── Request reviews
└── Report errors and blockers

RESEARCH
├── Read any code in repository
├── Analyze existing patterns
├── Review documentation
└── Check dependencies
```

### Autonomy Boundaries

```
AUTONOMOUS WITHIN SCOPE means:
├── File is in task's scope.include
├── File is NOT in forbidden_areas
├── Operation is NOT in approval_required list
├── No conflict with other active tasks
└── All quality gates pass
```

---

## Agents: NEVER ALLOWED

### Decisions Agents Must Never Make Alone

```
═══════════════════════════════════════════════════════════════
ABSOLUTE PROHIBITIONS — NO EXCEPTIONS
═══════════════════════════════════════════════════════════════

ARCHITECTURAL DECISIONS
├── Change system architecture
├── Introduce new design patterns
├── Modify core abstractions
├── Change database schema design
└── Alter API contracts

TECHNOLOGY CHOICES
├── Add new frameworks
├── Remove existing dependencies
├── Change programming languages
├── Switch database engines
└── Modify build tooling

USER IMPACT
├── Change user-facing behavior
├── Modify UI/UX patterns
├── Alter error messages
├── Change notification logic
└── Modify user workflows

BUSINESS LOGIC
├── Change pricing or billing logic
├── Modify eligibility rules
├── Alter compliance logic
├── Change data validation rules (user-facing)
└── Modify business workflows

PROCESS DECISIONS
├── Change deployment process
├── Modify code review requirements
├── Alter testing requirements
├── Change documentation standards
└── Modify governance rules

SECRETS & CREDENTIALS
├── Access any .env file
├── Read credentials
├── Modify API keys
├── Change access tokens
└── View secrets in any form
```

### When In Doubt

```
IF uncertain whether action requires approval:
  → STOP
  → Document the question
  → Request guidance
  → WAIT for response

NEVER assume. NEVER guess. NEVER proceed without clarity.
```

---

## Emergency Override Protocol

### When Humans Can Override Everything

```
HUMAN OVERRIDE AUTHORITY:
├── STOP ALL — Halt all agents immediately
├── PROCEED — Override blocked state
├── BYPASS — Skip approval for specific action
├── CANCEL — Terminate any task
├── REASSIGN — Move task to different agent
├── FREEZE — Lock down specific scope
└── RESUME — Clear any halt state
```

### Override Request Format

```yaml
human_override:
  override_id: "OVR-2024-0115-0001"
  type: "PROCEED"
  target:
    task_id: "TASK-2024-0115-0001"
    agent_id: "feature/Xyz789"

  overriding_requirement: "awaiting_human_approval"
  reason: |
    Urgent deployment needed.
    Manual review completed offline.

  scope: "single_action"         # single_action | full_task | permanent
  duration: "one_time"           # one_time | until_complete | permanent

  issued_by: "human_operator"
  timestamp: "2024-01-15T10:30:00Z"
```

### Override Audit

```
ALL OVERRIDES ARE:
├── Logged permanently
├── Traceable to human operator
├── Time-stamped
├── Scoped explicitly
└── Subject to review
```

---

## Escalation Path

```
┌─────────────────────────────────────────────────────────────┐
│                   ESCALATION LADDER                         │
└─────────────────────────────────────────────────────────────┘

LEVEL 1: Agent Self-Resolution
├── Agent attempts to resolve within scope
├── Uses existing patterns and rules
└── Logs decision rationale

    ↓ If unresolvable

LEVEL 2: Orchestrator Consultation
├── Orchestrator reviews context
├── Applies governance rules
├── Coordinates with other agents
└── Makes procedural decisions

    ↓ If requires authority or judgment

LEVEL 3: Human Decision
├── Human reviews request
├── Makes judgment call
├── Issues approval or rejection
└── May provide guidance for future

    ↓ If critical or policy-changing

LEVEL 4: Human Team Discussion
├── Multiple stakeholders consulted
├── Policy implications reviewed
├── Precedent considered
└── Documented decision made
```

### Escalation Timing

| Level | Max Wait Time | Escalation Trigger |
|-------|---------------|-------------------|
| 1 → 2 | 5 minutes | Cannot self-resolve |
| 2 → 3 | 30 minutes | Requires judgment |
| 3 → 4 | 4 hours | Policy implications |

---

## Communication Format

### Agent → Human Request

```markdown
## Human Decision Required

**Task**: TASK-2024-0115-0001
**Agent**: feature/Xyz789
**Urgency**: Normal

### Question
Should the newsletter form include phone number field?

### Context
- Spec is ambiguous on optional fields
- Similar forms in codebase use email only
- Phone validation would add complexity

### Options
1. Email only (matches existing pattern)
2. Email + optional phone
3. Wait for clarification from product

### My Recommendation
Option 1 — maintains consistency, can add phone later.

### Decision Needed By
2024-01-15T18:00:00Z (8 hours)
```

### Human → Agent Response

```yaml
human_response:
  to_request: "REQ-2024-0115-0001"
  decision: "option_1"
  rationale: "Consistency with existing forms. Phone can be Phase 2."
  additional_guidance: |
    Add a TODO comment noting phone field is planned.
    Create a follow-up task for Phase 2.
  applies_to: "this_task"        # this_task | similar_tasks | all_future
  timestamp: "2024-01-15T11:00:00Z"
```

---

## Quick Reference

### Decision Matrix

| Action | Agent Alone? | Orchestrator? | Human Required? |
|--------|--------------|---------------|-----------------|
| Write code in scope | YES | — | — |
| Merge to feature branch | YES | — | — |
| Add test dependency | — | YES | — |
| Merge to main | — | — | YES |
| Change architecture | — | — | YES |
| Access secrets | NEVER | NEVER | Special process |
| Delete user data | NEVER | NEVER | YES + audit |
| Deploy to production | NEVER | NEVER | YES |

### Emergency Contacts

```
WHEN HUMAN NEEDED:
1. Document the question clearly
2. Set urgency level appropriately
3. Provide context and options
4. State your recommendation
5. Wait for response
6. DO NOT PROCEED without answer
```

### Red Lines

```
THESE ARE ABSOLUTE:
├── Never touch production without human
├── Never access secrets
├── Never delete user data
├── Never change auth without human
├── Never override security controls
└── Never make irreversible changes alone

VIOLATION = IMMEDIATE HALT + INCIDENT REPORT
```

---

**Humans are not bottlenecks. Humans are guardrails.**

---

[AI Stop Protocol](ai-stop-protocol.md) | [AI Operating System](ai-operating-system.md)
