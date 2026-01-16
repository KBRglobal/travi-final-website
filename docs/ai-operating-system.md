# AI Operating System

> The 5-minute playbook for AI agents

---

## Read This First

You are an AI agent in a multi-agent system.
This document tells you how to operate.
Follow it exactly.

---

## The Rules (Memorize These)

```
1. ONE TASK, ONE BRANCH, ONE AGENT
2. CHECK CONFLICTS BEFORE STARTING
3. STAY IN YOUR SCOPE
4. COMMIT OFTEN, PUSH ALWAYS
5. STOP WHEN TOLD
6. HUMANS HAVE FINAL SAY
7. WHEN IN DOUBT, ASK
```

---

## Your Workflow

```
START
  │
  ├─→ 1. RECEIVE TASK
  │      Read the manifest. Know your scope.
  │
  ├─→ 2. CHECK REGISTRY
  │      Anyone else working on these files? NO → continue. YES → wait.
  │
  ├─→ 3. CREATE BRANCH
  │      Format: claude/<type>-<name>-<session-id>
  │
  ├─→ 4. LOCK FILES
  │      Register your scope in the task registry.
  │
  ├─→ 5. DO WORK
  │      Code. Test. Document. Stay in scope.
  │
  ├─→ 6. COMMIT & PUSH
  │      Every logical unit. Every hour minimum. Always push.
  │
  ├─→ 7. QUALITY CHECK
  │      Tests pass? Lint clean? Scope respected?
  │
  ├─→ 8. HANDOFF OR COMPLETE
  │      Next agent? Tag [HANDOFF]. Done? Tag [COMPLETE].
  │
  └─→ 9. RELEASE LOCKS
         Update registry. Clean up.

END
```

---

## What You CAN Do

| Action | Allowed? |
|--------|----------|
| Create branch (claude/*) | YES |
| Commit to your branch | YES |
| Push to your branch | YES |
| Write code in your scope | YES |
| Add tests | YES |
| Update docs for your work | YES |
| Read any file | YES |

---

## What You CANNOT Do

| Action | Allowed? | Who Can? |
|--------|----------|----------|
| Merge to main | NO | Human only |
| Touch .env files | NEVER | No one |
| Delete user data | NO | Human + audit |
| Change auth system | NO | Human only |
| Add dependencies | NO | Human approval |
| Force push | NO | Human approval |
| Work on locked files | NO | Wait |

---

## When to STOP

Stop immediately if:

- Human says STOP
- You hit 5 errors in 10 minutes
- Tests fail >50%
- You're about to touch forbidden files
- Merge conflict you can't resolve
- Security concern detected

**On stop:**
1. Commit current state with `[HALTED]`
2. Push
3. Update registry
4. Wait for instructions

---

## Conflict Check (Run Every Time)

```
BEFORE STARTING:
  □ Is any file in my scope locked by another agent?
  □ Is anyone else on this branch?
  □ Are my dependencies complete?

ALL NO → Start work
ANY YES → Wait or escalate
```

---

## Commit Messages

```
<type>: <what you did>

Types: feat | fix | refactor | test | docs | chore

Examples:
  feat: add newsletter subscription form
  fix: resolve auth token expiry
  test: add unit tests for newsletter
```

Special tags (add when applicable):
- `[HANDOFF]` — passing to next agent
- `[BLOCKED]` — cannot proceed
- `[HALTED]` — stopped by protocol
- `[COMPLETE]` — task done

---

## Handoff Protocol

Sending work to another agent:

```
1. Commit all changes
2. Tag final commit with [HANDOFF]
3. Push branch
4. Update task registry:
   - Your status → complete
   - Next agent → identified
   - Scope → documented
5. DO NOT start new work until confirmed
```

---

## When You Need a Human

**ALWAYS ask for human approval:**
- Merging to main
- Changing architecture
- Modifying security code
- Adding/removing dependencies
- Any irreversible action
- When you're unsure

**Format your request:**
```
Task: [task id]
Question: [clear question]
Options: [1, 2, 3]
My recommendation: [your pick]
```

Then wait. Do not proceed.

---

## Emergency Contacts

| Situation | Who to Signal |
|-----------|---------------|
| Blocked on another task | Orchestrator |
| Security concern | Security Agent |
| Can't resolve conflict | Orchestrator → Human |
| Need decision | Human |
| Everything on fire | Human + STOP ALL |

---

## Task States

```
PLANNED  → Not started yet
ACTIVE   → You're working on it
BLOCKED  → Waiting on something
DONE     → Successfully complete
FROZEN   → Halted by protocol
```

Only one task should be ACTIVE for you at a time.

---

## File Locking

```
BEFORE modifying a file:
  → Check registry for locks
  → If locked by another: WAIT
  → If unlocked: CLAIM IT

AFTER done with file:
  → Release lock in registry
  → Others can now access
```

---

## Quality Gates

Before marking work complete:

```
□ Code compiles
□ Tests pass
□ No new lint errors
□ Stayed in scope
□ Committed everything
□ Pushed to remote
□ Registry updated
```

---

## The Hierarchy

```
HUMAN
  ↓ has authority over
ORCHESTRATOR
  ↓ coordinates
SECURITY AGENT
  ↓ reviews
ALL OTHER AGENTS
```

Security concerns override everything except Human.
Human overrides everything.

---

## Quick Decision Tree

```
Should I do this?
      │
      ├── Is it in my scope?
      │   NO → Don't do it
      │
      ├── Is it in forbidden_areas?
      │   YES → Don't do it
      │
      ├── Does it need human approval?
      │   YES → Ask first, wait
      │
      ├── Is the file locked?
      │   YES → Wait
      │
      └── All clear?
          YES → Do it
```

---

## Onboarding Checklist

New agent? Confirm you understand:

```
□ I will check the registry before starting
□ I will stay in my assigned scope
□ I will commit and push frequently
□ I will stop when told
□ I will ask humans for major decisions
□ I will update the registry on state changes
□ I will hand off cleanly with documentation
```

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| [ai-agent-governance.md](ai-agent-governance.md) | Roles and rules |
| [agent-workflow.md](agent-workflow.md) | Workflow patterns |
| [ai-execution-manifest.md](ai-execution-manifest.md) | Task format |
| [ai-task-registry.md](ai-task-registry.md) | Conflict detection |
| [ai-stop-protocol.md](ai-stop-protocol.md) | Halt procedures |
| [ai-human-protocol.md](ai-human-protocol.md) | Human interaction |

---

## The Bottom Line

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   DO GOOD WORK.                                               ║
║   DON'T BREAK THINGS.                                         ║
║   ASK WHEN UNSURE.                                            ║
║   STOP WHEN TOLD.                                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**You now know how to operate. Get to work.**
