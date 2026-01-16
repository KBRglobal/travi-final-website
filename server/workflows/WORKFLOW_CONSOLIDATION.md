# Workflow Engine Consolidation

**Date:** 2026-01-01
**Status:** Complete
**Impact:** Low (Backward compatible)

## Overview

Three duplicate workflow engine implementations have been consolidated into a single unified system at `/server/workflows/unified-workflow-engine.ts`.

## Previous Architecture (Before Consolidation)

### 1. Generic Trigger-Action Workflows
**Location:** `/server/workflows/workflow-engine.ts`

**Features:**
- Event-based triggers (content.created, content.published, etc.)
- Conditional logic with operators ($eq, $ne, $gt, $lt, $in)
- Multiple action types (send_webhook, send_email, update_content, notify)
- Database-backed with execution tracking
- Proper error handling and state management

**Usage:**
```typescript
import { workflowEngine } from './workflows/workflow-engine';
await workflowEngine.executeWorkflow(workflowId, triggerData);
await workflowEngine.triggerEvent('content.published', data);
```

**Database Tables:**
- `workflows` - Workflow definitions
- `workflow_executions` - Execution history and results

### 2. Multi-Step Approval Workflows
**Location:** `/server/approvals/workflow-engine.ts`

**Features:**
- Multi-step approval processes with configurable rules
- Role-based and user-based approvers
- Auto-approval with time limits
- Expiration support
- Priority levels
- State machine for transitions
- Feature flag controlled (ENABLE_APPROVAL_WORKFLOWS)

**Usage:**
```typescript
import { createApprovalRequest, processDecision } from '../approvals/workflow-engine';
const result = await createApprovalRequest('publish', 'content', contentId, userId);
await processDecision(requestId, { approved: true, decidedBy: userId });
```

**Database Tables:**
- `approval_requests` - Approval request records
- `approval_steps` - Individual step records

### 3. Draft Review Workflows (DEPRECATED)
**Location:** `/server/approval-workflow/workflow-engine.ts`

**Features:**
- Stage-based workflow (draft → review → approved → published)
- In-memory storage (NO DATABASE PERSISTENCE)
- Approvals, rejections, change requests
- Workflow history tracking

**Critical Issue:** Uses Map-based in-memory storage, data is lost on server restart

**Usage:**
```typescript
import { transitionWorkflow, addApproval } from '../approval-workflow/workflow-engine';
const result = transitionWorkflow(contentId, 'submit_for_review', userId);
```

## New Unified Architecture

### Location
`/server/workflows/unified-workflow-engine.ts`

### Key Improvements

1. **Single Source of Truth**
   - All workflow logic in one place
   - Consistent patterns and error handling
   - Shared types and interfaces

2. **Database Persistence**
   - Content review workflows now use DB instead of in-memory storage
   - Workflow state stored in `contents.metadata.workflowState`
   - No data loss on restart

3. **Modular Design**
   - Three sub-engines: `generic`, `approval`, `review`
   - Each maintains its own interface
   - Shared utilities and patterns

4. **Enhanced Features**
   - `create_approval` action type added to generic workflows
   - Better integration between workflow types
   - Unified error handling and logging

### Migration Guide

#### For Generic Workflows

**Before:**
```typescript
import { workflowEngine } from './workflows/workflow-engine';
await workflowEngine.executeWorkflow(workflowId, data);
```

**After:**
```typescript
import { unifiedWorkflowEngine } from './workflows/unified-workflow-engine';
await unifiedWorkflowEngine.generic.executeWorkflow(workflowId, data);
// OR use convenience method
await unifiedWorkflowEngine.triggerEvent('content.published', data);
```

#### For Approval Workflows

**Before:**
```typescript
import { createApprovalRequest, processDecision } from '../approvals/workflow-engine';
const result = await createApprovalRequest('publish', 'content', id, userId);
await processDecision(requestId, { approved: true, decidedBy: userId });
```

**After:**
```typescript
import { unifiedWorkflowEngine } from '../workflows/unified-workflow-engine';
const result = await unifiedWorkflowEngine.approval.createApprovalRequest(
  'publish', 'content', id, userId
);
await unifiedWorkflowEngine.approval.processDecision(
  requestId, { approved: true, decidedBy: userId }
);
// OR use convenience method
await unifiedWorkflowEngine.createApproval('publish', 'content', id, userId);
```

#### For Content Review Workflows

**Before:**
```typescript
import { transitionWorkflow, addApproval } from '../approval-workflow/workflow-engine';
const result = transitionWorkflow(contentId, 'submit_for_review', userId);
await addApproval(contentId, reviewerId, comment);
```

**After:**
```typescript
import { unifiedWorkflowEngine } from '../workflows/unified-workflow-engine';
const result = await unifiedWorkflowEngine.review.transitionWorkflow(
  contentId, 'submit_for_review', userId
);
await unifiedWorkflowEngine.review.addApproval(contentId, reviewerId, comment);
// OR use convenience method
await unifiedWorkflowEngine.reviewContent(contentId, 'submit_for_review', userId);
```

**IMPORTANT:** Content review methods are now async and return Promises!

### Feature Flags

The unified engine respects the following environment variables:

```bash
# Enable approval workflows (default: false)
ENABLE_APPROVAL_WORKFLOWS=true

# Enable content review workflows (default: false)
ENABLE_CONTENT_REVIEW=true
```

When disabled:
- Approval workflows: Auto-approve all requests
- Content review: Return errors for all operations

### Built-in Approval Rules

The unified engine includes these approval rules:

1. **publish-standard** (Priority: 100)
   - Trigger: Publishing content
   - Steps: Editor review

2. **publish-low-score** (Priority: 200)
   - Trigger: Publishing content with ICE score < 50
   - Steps: Editor review → Admin approval

3. **delete-content** (Priority: 100)
   - Trigger: Deleting content
   - Steps: Admin approval

4. **regenerate-content** (Priority: 100)
   - Trigger: AI content regeneration
   - Steps: Editor review (24h auto-approve)

5. **bulk-update** (Priority: 300)
   - Trigger: Bulk operations
   - Steps: Editor → Admin → Super Admin

Rules are matched by priority (highest first).

### API Reference

#### Generic Workflows

```typescript
// Execute a workflow
unifiedWorkflowEngine.generic.executeWorkflow(
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<ExecutionResult>

// Trigger workflows by event type
unifiedWorkflowEngine.generic.triggerEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<void>

// Evaluate conditions
unifiedWorkflowEngine.generic.evaluateConditions(
  conditions: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<boolean>
```

#### Approval Workflows

```typescript
// Create approval request
unifiedWorkflowEngine.approval.createApprovalRequest(
  requestType: RequestType,
  resourceType: string,
  resourceId: string,
  requesterId: string,
  options?: {
    reason?: string;
    priority?: Priority;
    metadata?: Record<string, unknown>;
    contentType?: string;
    score?: number;
  }
): Promise<ApprovalResult>

// Process decision
unifiedWorkflowEngine.approval.processDecision(
  requestId: string,
  decision: ApprovalDecision
): Promise<ApprovalResult>

// Cancel request
unifiedWorkflowEngine.approval.cancelRequest(
  requestId: string,
  cancelledBy: string,
  reason?: string
): Promise<ApprovalResult>

// Get pending approvals
unifiedWorkflowEngine.approval.getPendingApprovals(
  approverRole?: string,
  approverId?: string
): Promise<ApprovalRequest[]>

// Get request details
unifiedWorkflowEngine.approval.getRequestDetails(
  requestId: string
): Promise<{ request: ApprovalRequest; steps: ApprovalStep[] } | null>
```

#### Content Review Workflows

```typescript
// Initialize workflow
unifiedWorkflowEngine.review.initializeWorkflow(
  contentId: string
): Promise<ContentWorkflowState>

// Get workflow state
unifiedWorkflowEngine.review.getWorkflowState(
  contentId: string
): Promise<ContentWorkflowState | null>

// Transition workflow
unifiedWorkflowEngine.review.transitionWorkflow(
  contentId: string,
  action: TransitionAction,
  performedBy: string,
  comment?: string
): Promise<TransitionResult>

// Add approval
unifiedWorkflowEngine.review.addApproval(
  contentId: string,
  reviewerId: string,
  comment?: string
): Promise<TransitionResult>

// Add rejection
unifiedWorkflowEngine.review.addRejection(
  contentId: string,
  reviewerId: string,
  reason: string
): Promise<TransitionResult>

// Request changes
unifiedWorkflowEngine.review.requestChanges(
  contentId: string,
  reviewerId: string,
  comments: string,
  priority?: 'low' | 'medium' | 'high'
): Promise<TransitionResult>

// Get pending reviews
unifiedWorkflowEngine.review.getPendingReviews(): Promise<ContentWorkflowState[]>

// Get content by stage
unifiedWorkflowEngine.review.getContentByStage(
  stage: WorkflowStage
): Promise<ContentWorkflowState[]>
```

### Backward Compatibility

All old files maintain their exports for backward compatibility:

- `/server/workflows/workflow-engine.ts` - Still exports `workflowEngine`
- `/server/approvals/workflow-engine.ts` - Still exports all functions
- `/server/approval-workflow/workflow-engine.ts` - Still exports all functions

**Deprecation Warnings:** All old files include JSDoc `@deprecated` tags pointing to the new unified engine.

### Current Usage

As of 2026-01-01, these files still import from old locations:

1. `/server/routes.ts` (line 13652)
   - Imports `workflowEngine` from `./workflows/workflow-engine`
   - Used in `/api/workflows/:id/execute` endpoint
   - **Action Required:** Update to use unified engine

2. `/server/approvals/routes.ts`
   - Imports functions from `./workflow-engine`
   - Used in approval API endpoints
   - **Action Required:** Update to use unified engine

### Removal Timeline

1. **Phase 1 (Current):** Unified engine available, old files deprecated
2. **Phase 2 (Q2 2026):** Update all imports to use unified engine
3. **Phase 3 (Q3 2026):** Remove old workflow engine files

### Testing Checklist

When migrating to the unified engine, test:

- [ ] Generic workflow execution
- [ ] Workflow trigger events
- [ ] Approval request creation
- [ ] Multi-step approval process
- [ ] Approval auto-expiration
- [ ] Content review transitions
- [ ] Change requests
- [ ] Rejection handling
- [ ] Database persistence (especially for content review)
- [ ] Feature flag behavior (enabled/disabled states)

### Benefits of Consolidation

1. **Reduced Code Duplication:** 3 files → 1 file
2. **Better Maintainability:** Single source of truth
3. **Improved Reliability:** DB persistence for all workflows
4. **Enhanced Features:** Better integration between workflow types
5. **Clearer Architecture:** Modular design with clear separation
6. **Type Safety:** Shared types across all workflow systems

### Support

For questions or issues related to the workflow consolidation:
- Review this document
- Check the inline code documentation in `unified-workflow-engine.ts`
- Consult the original files for legacy behavior (until removed)

## File Structure

```
server/
├── workflows/
│   ├── unified-workflow-engine.ts    ← NEW: Use this
│   ├── workflow-engine.ts            ← DEPRECATED
│   └── WORKFLOW_CONSOLIDATION.md     ← This file
├── approvals/
│   ├── workflow-engine.ts            ← DEPRECATED
│   ├── rules.ts                      ← Still used (rules now in unified)
│   ├── state-machine.ts              ← Still used (logic in unified)
│   └── types.ts                      ← Still used
└── approval-workflow/
    ├── workflow-engine.ts            ← DEPRECATED (in-memory, will be removed)
    └── types.ts                      ← Still used
```

## Decision Rationale

### Why Consolidate?

1. **Code Duplication:** Three separate implementations doing similar things
2. **Maintenance Burden:** Bug fixes and improvements needed in multiple places
3. **Reliability Issues:** In-memory storage in approval-workflow was a data loss risk
4. **Integration Challenges:** Hard to use workflows together
5. **Inconsistent Patterns:** Each implementation had different approaches

### Why Keep Old Files?

1. **Backward Compatibility:** Existing code continues to work
2. **Gradual Migration:** Teams can migrate at their own pace
3. **Risk Mitigation:** Reduces deployment risk
4. **Documentation:** Old files serve as reference during migration

### Design Decisions

1. **Database Persistence:** All workflows now use database (or content metadata)
2. **Modular Sub-Engines:** Each workflow type maintains its interface
3. **Feature Flags:** Allow gradual rollout and testing
4. **Backward Compatible Exports:** Old imports continue to work
5. **Comprehensive Documentation:** This guide and inline JSDoc

## Version History

- **2026-01-01:** Initial consolidation completed
  - Created unified-workflow-engine.ts
  - Added deprecation notices to old files
  - Created this documentation
