# Data Retention Policy

## Overview

This document defines retention periods, deletion procedures, and compliance requirements for all data within Travi CMS.

---

## איך זה עובד | How It Works

> **עברית**: מדיניות שמירת נתונים קובעת כמה זמן לשמור כל סוג של מידע ומתי למחוק אותו. זה חשוב לציות לחוקי פרטיות (GDPR/CCPA) ולניהול אחסון יעיל.

---

## Retention Schedule

### User Data

| Data Type | Retention Period | Trigger | Deletion Method |
|-----------|-----------------|---------|-----------------|
| Active user account | Account lifetime | N/A | N/A |
| Deleted user account | 30 days | Deletion request | Hard delete |
| User PII after deletion | 3 years (legal hold) | Account deletion | Anonymize |
| Session data | 24 hours after logout | Session end | Auto-purge |
| Password reset tokens | 1 hour | Token creation | Auto-expire |
| Failed login attempts | 24 hours | Attempt timestamp | Auto-purge |

### Content Data

| Data Type | Retention Period | Trigger | Deletion Method |
|-----------|-----------------|---------|-----------------|
| Published content | Indefinite | N/A | Manual only |
| Draft content | 1 year inactive | Last edit date | Soft delete → Archive |
| Deleted content | 90 days | Deletion date | Hard delete |
| Content versions | 6 months | Version creation | FIFO (keep latest 10) |
| Media files | Until unused | Reference count = 0 | Mark for cleanup |
| Orphaned media | 30 days | No references | Hard delete |

### System Data

| Data Type | Retention Period | Trigger | Deletion Method |
|-----------|-----------------|---------|-----------------|
| Application logs | 90 days | Log timestamp | Rolling deletion |
| Error logs | 180 days | Log timestamp | Rolling deletion |
| Audit logs | 2 years | Log timestamp | Archive then delete |
| Security logs | 3 years | Log timestamp | Secure archive |
| Performance metrics | 30 days | Metric timestamp | Auto-aggregation |

### Analytics Data

| Data Type | Retention Period | Trigger | Deletion Method |
|-----------|-----------------|---------|-----------------|
| Page views | 2 years | Event timestamp | Aggregate then delete |
| User sessions | 90 days | Session end | Hard delete |
| A/B test results | 1 year after test end | Test completion | Archive |
| Heatmaps | 6 months | Collection date | Hard delete |

### Marketing Data

| Data Type | Retention Period | Trigger | Deletion Method |
|-----------|-----------------|---------|-----------------|
| Newsletter subscribers | Until unsubscribe | Subscription | Soft delete |
| Unsubscribed users | 30 days | Unsubscribe date | Hard delete |
| Email campaign history | 2 years | Send date | Archive |
| Social media posts | Indefinite | N/A | Manual only |

---

## Deletion Procedures

### 1. User Account Deletion

```
Trigger: User requests account deletion
Timeline: 30 days to complete

Day 0:  Mark account as "pending_deletion"
        Send confirmation email
        Disable login access
        
Day 7:  Send reminder if user hasn't cancelled
        
Day 30: Execute deletion:
        - Remove PII (anonymize to user_XXXX)
        - Delete session data
        - Delete personal preferences
        - Retain anonymized content attributions
        - Log deletion in audit trail
```

### 2. Content Deletion

```
Trigger: Admin deletes content
Timeline: Immediate soft delete, 90 days to hard delete

Step 1: Set status = "deleted", deletedAt = NOW()
Step 2: Remove from public API responses
Step 3: Remove from search indexes
Step 4: After 90 days, permanently delete from database
Step 5: Clean up associated media (if orphaned)
```

### 3. Automated Log Rotation

```sql
-- Daily job: Delete logs older than retention period
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM application_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

---

## Legal Hold Requirements

When litigation or regulatory investigation is anticipated:

1. **Identify scope**: Determine which data is relevant
2. **Suspend deletion**: Pause automated deletion for affected data
3. **Document hold**: Record hold details in legal hold register
4. **Notify stakeholders**: Inform relevant data custodians
5. **Preserve**: Ensure data cannot be modified or deleted
6. **Release**: Only release hold upon legal counsel approval

### Legal Hold Register

| Hold ID | Start Date | Reason | Data Scope | Status |
|---------|------------|--------|------------|--------|
| LH-001 | 2025-01-01 | [Example] | User ID 123 | Active |

---

## GDPR Compliance

### Data Subject Rights Implementation

| Right | Implementation | Timeline |
|-------|---------------|----------|
| Right to Access | Export user data via API | 30 days |
| Right to Rectification | User profile edit | Immediate |
| Right to Erasure | Account deletion workflow | 30 days |
| Right to Portability | JSON/CSV export | 30 days |
| Right to Restrict | Suspend processing flag | Immediate |

### Breach Notification

- **Internal**: Notify security team within 24 hours
- **Authority**: Notify data protection authority within 72 hours
- **Users**: Notify affected users without undue delay

---

## CCPA Compliance

### Consumer Rights

| Right | Implementation |
|-------|---------------|
| Right to Know | Privacy policy + data inventory on request |
| Right to Delete | Same as GDPR erasure |
| Right to Opt-Out | Cookie consent banner + preference center |
| Right to Non-Discrimination | No service degradation for rights exercise |

---

## Implementation Checklist

- [ ] Implement automated deletion jobs for each data type
- [ ] Create data export functionality for user requests
- [ ] Set up legal hold workflow
- [ ] Configure log rotation in production
- [ ] Implement anonymization instead of hard delete for user content
- [ ] Create audit trail for all deletions
- [ ] Test deletion procedures quarterly

---

## Monitoring

### Retention Metrics Dashboard

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Logs older than 90 days | 0 | > 1000 records |
| Deleted users pending cleanup | < 100 | > 500 |
| Orphaned media files | < 50 | > 200 |
| Legal holds active | Track only | N/A |

---

*Last updated: December 2025*
*Owner: Data Governance Team*
*Next review: June 2026*
