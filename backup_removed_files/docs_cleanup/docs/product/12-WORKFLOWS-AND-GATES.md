# Workflows and Gates

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## 1. Content Publishing Workflow

### 1.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTENT LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐  │
│  │  DRAFT  │────►│ IN_REVIEW │────►│ APPROVED │────►│ SCHEDULED │  │
│  └────┬────┘     └─────┬─────┘     └────┬─────┘     └─────┬─────┘  │
│       │                │                │                  │        │
│       │                │                │                  │        │
│       │           ┌────▼────┐           │                  │        │
│       │           │ REJECTED│───────────┘                  │        │
│       │           └─────────┘                              │        │
│       │                                                    │        │
│       │                                    ┌───────────────▼──────┐ │
│       │                                    │      PUBLISHED       │ │
│       │                                    └───────────┬──────────┘ │
│       │                                                │            │
│       │                                    ┌───────────▼──────────┐ │
│       │                                    │      ARCHIVED        │ │
│       │                                    └──────────────────────┘ │
│       │                                                             │
│       └─────────────────────────────────────────────────────────────┘
│                              (always can go back to DRAFT)          │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Transitions

| From | To | Who Can | Conditions |
|------|----|---------| -----------|
| `DRAFT` | `IN_REVIEW` | Author, Contributor | Content complete |
| `IN_REVIEW` | `APPROVED` | Editor, Admin | Review passed |
| `IN_REVIEW` | `REJECTED` | Editor, Admin | With feedback |
| `REJECTED` | `DRAFT` | Author | Automatic |
| `APPROVED` | `SCHEDULED` | Editor, Admin | With date |
| `APPROVED` | `PUBLISHED` | Editor, Admin | Direct publish |
| `SCHEDULED` | `PUBLISHED` | System | At scheduled time |
| `PUBLISHED` | `ARCHIVED` | Editor, Admin | - |
| `PUBLISHED` | `DRAFT` | Editor, Admin | Unpublish |
| ANY | `DRAFT` | Editor, Admin | Reset |

### 1.3 Gates

| Gate | Condition | Blocks Transition To |
|------|-----------|---------------------|
| `TITLE_REQUIRED` | title.length > 0 | IN_REVIEW |
| `SLUG_REQUIRED` | slug.length > 0 | IN_REVIEW |
| `SEO_MINIMUM` | seoScore >= 50 | APPROVED |
| `HERO_IMAGE` | heroImage exists | PUBLISHED |
| `NO_BROKEN_LINKS` | All links valid | PUBLISHED |

---

## 2. Role Permissions Matrix

### 2.1 Content Actions

| Action | Admin | Editor | Author | Contributor | Viewer |
|--------|-------|--------|--------|-------------|--------|
| Create Draft | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Own Draft | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Any Draft | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit for Review | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish Directly | ✅ | ✅ | ❌ | ❌ | ❌ |
| Schedule | ✅ | ✅ | ❌ | ❌ | ❌ |
| Unpublish | ✅ | ✅ | ❌ | ❌ | ❌ |
| Archive | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete (soft) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete (hard) | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Published | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All | ✅ | ✅ | Own | Own | ❌ |

### 2.2 Media Actions

| Action | Admin | Editor | Author | Contributor | Viewer |
|--------|-------|--------|--------|-------------|--------|
| Upload | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Library | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Own | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Any | ✅ | ❌ | ❌ | ❌ | ❌ |
| Generate AI Images | ✅ | ✅ | ✅ | ❌ | ❌ |

### 2.3 User Actions

| Action | Admin | Editor | Author | Contributor | Viewer |
|--------|-------|--------|--------|-------------|--------|
| View Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change Role | ✅ | ❌ | ❌ | ❌ | ❌ |
| Disable User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete User | ✅ + 2FA | ❌ | ❌ | ❌ | ❌ |

### 2.4 System Actions

| Action | Admin | Editor | Author | Contributor | Viewer |
|--------|-------|--------|--------|-------------|--------|
| View Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change Settings | ✅ + 2FA | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| View System Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trigger Automation | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Dangerous Actions Protection

### 3.1 Protection Levels

| Level | Name | What Happens |
|-------|------|--------------|
| 0 | None | Direct execution |
| 1 | Confirm | Dialog: "Are you sure?" |
| 2 | Audit | Confirm + Audit log entry |
| 3 | 2FA | Confirm + TOTP verification + Audit |
| 4 | Dual | 2FA + Second admin approval |

### 3.2 Action Protection Map

| Action | Protection Level | Extra Requirements |
|--------|-----------------|-------------------|
| Create content | 0 | - |
| Edit content | 0 | - |
| Submit for review | 0 | - |
| Publish content | 1 | - |
| Unpublish content | 2 | Reason required |
| Archive content | 2 | - |
| Delete content (soft) | 2 | - |
| Delete content (hard) | 3 | 30 days after soft delete |
| Create user | 2 | - |
| Edit user role | 3 | - |
| Disable user | 3 | Reason required |
| Delete user | 4 | - |
| Change security settings | 3 | - |
| Change system settings | 3 | - |
| Bulk update (< 10) | 2 | Dry run first |
| Bulk update (10-100) | 3 | Dry run + Admin approval |
| Bulk update (> 100) | 4 | Dry run + 2 Admin approval |
| Bulk delete | 4 | Always dual approval |
| Export data | 3 | - |
| Database operations | 4 | - |

---

## 4. Review Workflow Details

### 4.1 Submit for Review

**Trigger:** Author clicks "Submit for Review"

**Preconditions:**
- Title exists
- Slug exists
- Content not empty

**Actions:**
1. Status changes to `IN_REVIEW`
2. Notification sent to all Editors
3. Content locked for Author (read-only)
4. Audit log entry created

**Timeout:**
- If no action in 48 hours, send reminder
- If no action in 7 days, escalate to Admin

### 4.2 Approve

**Trigger:** Editor clicks "Approve"

**Preconditions:**
- Status is `IN_REVIEW`
- SEO score >= 50
- Hero image exists

**Actions:**
1. Status changes to `APPROVED`
2. Notification sent to Author
3. Audit log entry created
4. Content ready for scheduling/publishing

### 4.3 Reject

**Trigger:** Editor clicks "Reject"

**Required Input:**
- Feedback text (minimum 20 characters)
- List of issues (checkboxes)

**Actions:**
1. Status changes to `REJECTED` then auto to `DRAFT`
2. Notification sent to Author with feedback
3. Content unlocked for Author
4. Audit log entry with feedback

### 4.4 Publish

**Trigger:** Editor clicks "Publish"

**Preconditions:**
- Status is `APPROVED` or `SCHEDULED`
- All gates passed

**Actions:**
1. Status changes to `PUBLISHED`
2. `publishedAt` set to now
3. Cache invalidated
4. Sitemap updated
5. Search index updated
6. Notification sent to Author
7. Audit log entry created

---

## 5. Version Control Workflow

### 5.1 Auto-Save

**Trigger:** Every 30 seconds while editing

**Actions:**
1. Save current state to draft
2. No version created
3. No notification

### 5.2 Manual Save

**Trigger:** User clicks "Save"

**Actions:**
1. Create version snapshot
2. Increment version number
3. Store diff from previous
4. Show "Saved" indicator

### 5.3 View History

**Available to:** Author (own content), Editor, Admin

**Shows:**
- Version number
- Timestamp
- Author
- Change summary (auto-generated)
- Diff link

### 5.4 Rollback

**Trigger:** Editor/Admin clicks "Restore this version"

**Protection Level:** 2 (Confirm + Audit)

**Actions:**
1. Create new version from selected
2. Current state backed up
3. Content restored
4. Notification to Author
5. Audit log entry

---

## 6. Bulk Operations Workflow

### 6.1 Select Items

**Max Selection:**
- Regular user: 50 items
- Editor: 100 items
- Admin: 500 items

### 6.2 Choose Action

**Available Actions:**
- Change status
- Add/remove tag
- Update category
- Assign author
- Delete (soft)

### 6.3 Dry Run (Required)

**Shows:**
- List of affected items
- What will change per item
- Potential issues
- Estimated time

### 6.4 Execute

**If items < 10:**
- Protection Level 2
- Immediate execution

**If items 10-100:**
- Protection Level 3 (2FA)
- Background execution
- Progress notification

**If items > 100:**
- Protection Level 4 (Dual approval)
- Scheduled execution
- Email notification on complete

### 6.5 Rollback Window

- 24 hours after execution
- One-click rollback available
- Shows what will be restored

---

## 7. Audit Coverage

### 7.1 What Gets Logged

| Event Type | Logged? | Data Captured |
|------------|---------|---------------|
| Content create | ✅ | User, content ID, type |
| Content edit | ✅ | User, content ID, fields changed |
| Content status change | ✅ | User, content ID, from→to |
| Content delete | ✅ | User, content ID, full snapshot |
| Media upload | ✅ | User, file info |
| Media delete | ✅ | User, file info |
| User create | ✅ | Creator, new user email/role |
| User role change | ✅ | Admin, user, from→to |
| User disable | ✅ | Admin, user, reason |
| Login success | ✅ | User, IP, device |
| Login failure | ✅ | Attempted email, IP |
| 2FA setup | ✅ | User |
| Settings change | ✅ | Admin, setting, from→to |
| Bulk operation | ✅ | Admin, operation, affected IDs |

### 7.2 Log Retention

| Log Type | Retention |
|----------|-----------|
| Content audit | Forever |
| User audit | 7 years |
| Security events | 7 years |
| System logs | 90 days |
| Access logs | 30 days |

### 7.3 Log Access

| Who | Can See |
|-----|---------|
| Admin | All logs |
| Editor | Content logs only |
| Author | Own content logs |
| Viewer | None |

---

## 8. Notification Rules

### 8.1 Content Notifications

| Event | Notify |
|-------|--------|
| Submitted for review | All Editors |
| Approved | Author |
| Rejected | Author |
| Published | Author |
| Unpublished | Author |
| Comment added | Author, mentioned users |

### 8.2 System Notifications

| Event | Notify |
|-------|--------|
| New user created | All Admins |
| User role changed | Affected user, all Admins |
| Security event | All Admins |
| Bulk operation complete | Initiator |

### 8.3 Notification Channels

| Priority | Channels |
|----------|----------|
| Low | In-app only |
| Medium | In-app + Email |
| High | In-app + Email + Dashboard badge |
| Critical | All + Admin alert |

---

## 9. Implementation Requirements

### 9.1 Database Changes

```sql
-- Add review fields to contents
ALTER TABLE contents ADD COLUMN reviewer_id UUID REFERENCES users(id);
ALTER TABLE contents ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE contents ADD COLUMN review_feedback TEXT;

-- Add version tracking
ALTER TABLE content_versions ADD COLUMN change_summary TEXT;
ALTER TABLE content_versions ADD COLUMN diff JSONB;

-- Add bulk operation tracking
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY,
  operation_type VARCHAR(50),
  status VARCHAR(20),
  affected_ids UUID[],
  initiated_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  dry_run_result JSONB,
  execution_result JSONB,
  rollback_available_until TIMESTAMP,
  created_at TIMESTAMP,
  executed_at TIMESTAMP
);
```

### 9.2 API Endpoints

```
POST   /api/admin/content/:id/submit-review
POST   /api/admin/content/:id/approve
POST   /api/admin/content/:id/reject
POST   /api/admin/content/:id/publish
POST   /api/admin/content/:id/unpublish
POST   /api/admin/content/:id/archive
GET    /api/admin/content/:id/versions
POST   /api/admin/content/:id/rollback/:versionId
POST   /api/admin/bulk/dry-run
POST   /api/admin/bulk/execute
POST   /api/admin/bulk/:id/rollback
```

### 9.3 Frontend Components

```
ReviewSubmitDialog
ReviewApproveDialog
ReviewRejectDialog (with feedback form)
VersionHistoryPanel
VersionDiffViewer
BulkOperationWizard
BulkDryRunPreview
BulkProgressIndicator
```
