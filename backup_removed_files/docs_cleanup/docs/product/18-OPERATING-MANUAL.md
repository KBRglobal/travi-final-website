# A. Operating Manual

**Effective:** 2026-01-01
**Version:** 1.0
**Status:** MANDATORY

---

## FROZEN (Do Not Touch Without Explicit Approval)

| Asset | Reason | Approver |
|-------|--------|----------|
| `/shared/schema.ts` | DB schema - system-wide impact | Tech Lead |
| `/server/auth.ts` | Security critical | Security Lead |
| `/server/security.ts` | Security middleware | Security Lead |
| `/server/access-control/*` | Permissions | Security Lead |
| `/client/src/App.tsx` | Route registry - Replit active | FRONTEND-AGENT-1 only |
| `/client/src/components/ui/*` | shadcn components - Replit active | Replit only |
| `/migrations/*` | DB migrations | DBA |
| `main` branch | Protected | Auto-merge via CI only |

## EDITABLE (By Designated Owner Only)

| Directory | Owner Agent | Notes |
|-----------|-------------|-------|
| `/server/routes.ts` | BACKEND-AGENT-1 | Section-based ownership |
| `/server/routes/*.ts` | BACKEND-AGENT-1,2,3 | By domain |
| `/client/src/pages/admin/*` | FRONTEND-AGENT-1,2 | New pages only |
| `/client/src/components/admin/*` | FRONTEND-AGENT-1,2,3 | New components only |
| `/docs/*` | CONTENT-AGENT | Documentation |
| `/tests/*` | QA-AGENT-1,2 | Test files |

## OFFICIAL WORKFLOW: Idea → Merge → Release

```
1. CLAIM    → Agent claims PM-### from backlog, announces in tracking
2. BRANCH   → Create branch: `pm-###-short-description`
3. BUILD    → Implement within Scope Boundaries only
4. TEST     → Pass all DoD criteria locally
5. PR       → Create PR with mandatory checklist attached
6. REVIEW   → Another agent reviews (not self)
7. CI       → All checks pass
8. MERGE    → Squash merge to `main`
9. VERIFY   → Smoke test in staging
10. CLOSE   → Mark PM-### complete in tracking
```

## MANDATORY PR CHECKLIST

```markdown
## PR Checklist (All Required)

- [ ] References: PM-###
- [ ] Scope: Only touched files within Scope Boundaries
- [ ] Tests: Added/updated tests, all passing
- [ ] Types: TypeScript compiles with 0 errors
- [ ] Lint: ESLint passes with 0 errors
- [ ] DoD: All Acceptance Criteria met
- [ ] Docs: Updated if API/schema changed
- [ ] Audit: Added audit logging if CRUD operation
- [ ] Rollback: Plan documented if Risk Level Critical/High
- [ ] No Conflicts: Rebased on latest main
```

## STOP-SHIP CRITERIA (Rollback Triggers)

1. **API error rate > 1%** after merge
2. **Auth/login broken** in staging
3. **Data loss** detected (any amount)
4. **Build fails** on main
5. **Security vulnerability** exposed
6. **Merge conflict** corrupts main

## DEFINITION OF DONE (One Paragraph)

A task is DONE when: code compiles without errors, all tests pass with ≥70% coverage on new code, the PR checklist is complete, another agent has approved the review, CI is green, the change is merged to main, smoke test passes in staging, and the corresponding PM-### item is marked complete with a link to the merged PR.
