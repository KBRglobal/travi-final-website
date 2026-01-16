# Workflow Engine

## Quick Start

**Use the unified workflow engine for all workflow operations:**

```typescript
import { unifiedWorkflowEngine } from './workflows/unified-workflow-engine';

// Generic trigger-action workflows
await unifiedWorkflowEngine.generic.executeWorkflow(workflowId, data);
await unifiedWorkflowEngine.triggerEvent('content.published', data);

// Approval workflows
await unifiedWorkflowEngine.approval.createApprovalRequest(
  'publish', 'content', contentId, userId
);

// Content review workflows
await unifiedWorkflowEngine.review.transitionWorkflow(
  contentId, 'submit_for_review', userId
);
```

## Files

- **`unified-workflow-engine.ts`** ✅ **USE THIS** - Consolidated workflow engine
- **`workflow-engine.ts`** ⚠️ **DEPRECATED** - Generic workflows (backward compat only)
- **`WORKFLOW_CONSOLIDATION.md`** 📖 - Detailed consolidation documentation

## Features

### 1. Generic Trigger-Action Workflows
- Event-based triggers
- Conditional logic
- Multiple action types (webhook, email, content updates)
- Execution tracking

### 2. Multi-Step Approval Workflows
- Configurable approval rules
- Auto-approval and expiration
- Role-based approvers
- State machine transitions

### 3. Content Review Workflows
- Stage-based workflow (draft → review → approved → published)
- Approvals, rejections, change requests
- Database persistence (no data loss)

## Environment Variables

```bash
# Enable approval workflows (default: false)
ENABLE_APPROVAL_WORKFLOWS=true

# Enable content review workflows (default: false)
ENABLE_CONTENT_REVIEW=true
```

## Migration

See **`WORKFLOW_CONSOLIDATION.md`** for detailed migration guide and API reference.

## Architecture Decision

**Date:** 2026-01-01
**Decision:** Consolidate three duplicate workflow engines into one unified system

**Rationale:**
- Eliminate code duplication
- Improve maintainability
- Add database persistence to content review workflows
- Provide consistent API across all workflow types

**Impact:** Low - All old files maintain backward compatibility
