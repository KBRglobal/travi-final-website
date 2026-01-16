# 🐛 TRAVI CMS Known Issues Registry
# רישום בעיות ידועות / Rishum Be'ayot Yadu'ot

> Tracking known issues, workarounds, and planned fixes

---

## 📋 Table of Contents | תוכן עניינים

1. [Issue Tracking Format](#issue-tracking-format)
2. [Current Known Issues](#current-known-issues)
3. [Planned Fixes](#planned-fixes)
4. [Recently Resolved](#recently-resolved)

---

## 📝 Issue Tracking Format | פורמט מעקב בעיות

### Issue Template

```markdown
### ISSUE-XXX: [Brief Title]

| Field | Value |
|-------|-------|
| **ID** | ISSUE-XXX |
| **Severity** | Critical / High / Medium / Low |
| **Status** | Open / In Progress / Scheduled / Resolved |
| **Component** | [e.g., AI, Database, Frontend, Auth] |
| **Discovered** | YYYY-MM-DD |
| **Updated** | YYYY-MM-DD |

**Description**: 
[Detailed description of the issue]

**Impact**:
[How this affects users/system]

**Workaround**:
[Temporary solution if available]

**Root Cause**:
[Known cause, if identified]

**Planned Fix**:
[Description of planned resolution and timeline]
```

### Severity Definitions

| Severity | Definition | Resolution Timeline |
|----------|------------|---------------------|
| Critical | System unusable, data at risk | 24 hours |
| High | Major feature broken | 1 week |
| Medium | Partial functionality impaired | 1 month |
| Low | Minor inconvenience | Backlog |

---

## 🔴 Current Known Issues | בעיות ידועות נוכחיות

### ISSUE-001: Gemini AI Provider Disabled

| Field | Value |
|-------|-------|
| **ID** | ISSUE-001 |
| **Severity** | Medium |
| **Status** | Open |
| **Component** | AI Providers |
| **Discovered** | 2024-12-15 |
| **Updated** | 2024-12-29 |

**Description**: 
The Gemini AI provider via Replit AI Integrations is currently disabled due to compatibility issues. The modelfarm endpoint doesn't support standard Gemini SDK endpoints or OpenAI-compatible endpoints.

**Impact**:
- Cannot use Gemini as an AI provider option
- Reduces provider redundancy (now: Anthropic → OpenRouter → DeepSeek → OpenAI)

**Workaround**:
System uses Anthropic Claude as primary provider with automatic fallback to other providers. No user action required.

**Root Cause**:
The `@replit/ai-modelfarm` package is archived and non-functional. The Replit AI Integrations Gemini endpoint at `localhost:1106/modelfarm/gemini` doesn't support the expected API format.

**Planned Fix**:
Awaiting Replit platform update for Gemini integration support. Will re-enable once compatible SDK approach is available.

---

### ISSUE-002: Bounce Rate and Exit Rate Not Calculated

| Field | Value |
|-------|-------|
| **ID** | ISSUE-002 |
| **Severity** | Low |
| **Status** | Scheduled |
| **Component** | Analytics |
| **Discovered** | 2024-12-20 |
| **Updated** | 2024-12-29 |

**Description**: 
Customer journey analytics returns 0 for bounce rate and exit rate metrics. The calculation from sessions is not yet implemented.

**Impact**:
- Analytics dashboard shows 0% for bounce/exit rates
- Incomplete customer journey analysis

**Workaround**:
Use external analytics (PostHog) for accurate bounce/exit rate data.

**Root Cause**:
Implementation incomplete - marked as TODO in `server/customer-journey.ts:456-457`

**Planned Fix**:
Implement session-based bounce/exit rate calculation. Scheduled for Q1 2025.

---

### ISSUE-003: Newsletter Drip Campaign Emails Not Sending

| Field | Value |
|-------|-------|
| **ID** | ISSUE-003 |
| **Severity** | Medium |
| **Status** | Open |
| **Component** | Newsletter |
| **Discovered** | 2024-12-22 |
| **Updated** | 2024-12-29 |

**Description**: 
Drip campaign and behavioral trigger emails are not actually sending. The email sending logic is stubbed.

**Impact**:
- Automated email sequences don't send
- Behavioral triggers (cart abandonment, etc.) don't trigger emails

**Workaround**:
Use manual newsletter sends via the admin panel for time-sensitive communications.

**Root Cause**:
Implementation incomplete - marked as TODO in:
- `server/newsletter/drip-campaigns.ts:167`
- `server/newsletter/drip-campaigns.ts:292`

**Planned Fix**:
Integrate with Resend API for actual email sending. Scheduled for Q1 2025.

---

### ISSUE-004: BigQuery and Snowflake Integrations Not Complete

| Field | Value |
|-------|-------|
| **ID** | ISSUE-004 |
| **Severity** | Low |
| **Status** | Scheduled |
| **Component** | Analytics Integrations |
| **Discovered** | 2024-12-20 |
| **Updated** | 2024-12-29 |

**Description**: 
Analytics export to BigQuery and Snowflake data warehouses is not fully implemented.

**Impact**:
- Cannot export analytics data to enterprise data warehouses
- Enterprise analytics features unavailable

**Workaround**:
Use PostgreSQL direct queries or export to CSV for external analysis.

**Root Cause**:
Placeholder implementation - marked as TODO in `server/analytics/integrations.ts:220-246`

**Planned Fix**:
Complete BigQuery and Snowflake API integrations. Scheduled for Q2 2025.

---

### ISSUE-005: Affiliate Payouts Not Integrated

| Field | Value |
|-------|-------|
| **ID** | ISSUE-005 |
| **Severity** | Medium |
| **Status** | Open |
| **Component** | Monetization |
| **Discovered** | 2024-12-25 |
| **Updated** | 2024-12-29 |

**Description**: 
Partner payout methods (PayPal, Stripe, Bank Transfer, Check) are not integrated with actual payment APIs.

**Impact**:
- Cannot automatically process affiliate/partner payouts
- Manual payout processing required

**Workaround**:
Process payouts manually through respective payment platforms.

**Root Cause**:
API integrations not implemented - marked as TODO in `server/monetization/payouts.ts:211-238`

**Planned Fix**:
Integrate PayPal and Stripe payout APIs. Scheduled for Q1 2025.

---

### ISSUE-006: Workflow Notifications Not Implemented

| Field | Value |
|-------|-------|
| **ID** | ISSUE-006 |
| **Severity** | Low |
| **Status** | Open |
| **Component** | Enterprise Workflows |
| **Discovered** | 2024-12-20 |
| **Updated** | 2024-12-29 |

**Description**: 
Workflow engine email and notification actions are stubbed and don't send actual notifications.

**Impact**:
- Workflow automation emails don't send
- Push notifications not delivered
- Users don't receive workflow status updates

**Workaround**:
Use manual notification through admin panel or external communication.

**Root Cause**:
Implementation incomplete - marked as TODO in:
- `server/workflows/workflow-engine.ts:250`
- `server/workflows/workflow-engine.ts:284`

**Planned Fix**:
Implement notification system with Resend and push notification services. Scheduled for Q2 2025.

---

### ISSUE-007: Social Media Post Generation Stubbed

| Field | Value |
|-------|-------|
| **ID** | ISSUE-007 |
| **Severity** | Low |
| **Status** | Open |
| **Component** | Social |
| **Discovered** | 2024-12-28 |
| **Updated** | 2024-12-29 |

**Description**: 
AI-generated social media posts are not yet integrated with the AI content generation system.

**Impact**:
- Social media post generation returns placeholder content
- Cannot auto-generate social posts from articles

**Workaround**:
Manually write social media posts or use the general AI content generator.

**Root Cause**:
Integration not complete - marked as TODO in `server/social-routes.ts:241`

**Planned Fix**:
Integrate social post generation with Octopus content generator. Scheduled for Q1 2025.

---

### ISSUE-008: CSP Uses Unsafe-Inline and Unsafe-Eval

| Field | Value |
|-------|-------|
| **ID** | ISSUE-008 |
| **Severity** | Medium |
| **Status** | Scheduled |
| **Component** | Security |
| **Discovered** | 2024-12-28 |
| **Updated** | 2024-12-29 |

**Description**: 
Content Security Policy includes 'unsafe-inline' and 'unsafe-eval' directives which weaken XSS protection.

**Impact**:
- Reduced protection against XSS attacks
- Security audit warnings
- May fail strict security compliance requirements

**Workaround**:
Monitor for XSS attempts through audit logging. Application uses input sanitization as additional protection.

**Root Cause**:
CSP nonces not yet implemented - marked as TODO in `server/security.ts:798`

**Planned Fix**:
Implement CSP nonces for inline scripts and remove unsafe directives. Scheduled for Q1 2025.

---

### ISSUE-009: Revenue Tracking for Automation Not Implemented

| Field | Value |
|-------|-------|
| **ID** | ISSUE-009 |
| **Severity** | Low |
| **Status** | Open |
| **Component** | Automation |
| **Discovered** | 2024-12-20 |
| **Updated** | 2024-12-29 |

**Description**: 
Automation system revenue tracking for A/B test variants is not implemented.

**Impact**:
- Cannot track revenue impact of automation experiments
- A/B test ROI analysis incomplete

**Workaround**:
Use external analytics for revenue tracking correlation.

**Root Cause**:
Implementation incomplete - marked as TODO in `server/automation/automation-system.ts:128`

**Planned Fix**:
Implement revenue event tracking. Scheduled for Q2 2025.

---

### ISSUE-010: Session History for Enterprise Security

| Field | Value |
|-------|-------|
| **ID** | ISSUE-010 |
| **Severity** | Low |
| **Status** | Open |
| **Component** | Security |
| **Discovered** | 2024-12-28 |
| **Updated** | 2024-12-29 |

**Description**: 
Enterprise security session history feature is not yet implemented.

**Impact**:
- Cannot view historical session data for security audits
- Limited session forensics capability

**Workaround**:
Use audit logs for security event tracking.

**Root Cause**:
Feature not implemented - marked as TODO in `server/enterprise-security.ts:389`

**Planned Fix**:
Implement session history tracking table and API. Scheduled for Q2 2025.

---

## 📅 Planned Fixes | תיקונים מתוכננים

### Q1 2025 (January - March)

| Issue | Component | Priority |
|-------|-----------|----------|
| ISSUE-003 | Newsletter drip campaigns | High |
| ISSUE-005 | Affiliate payouts | High |
| ISSUE-007 | Social post generation | Medium |
| ISSUE-008 | CSP nonces | Medium |
| ISSUE-002 | Bounce/Exit rate | Low |

### Q2 2025 (April - June)

| Issue | Component | Priority |
|-------|-----------|----------|
| ISSUE-004 | BigQuery/Snowflake | Medium |
| ISSUE-006 | Workflow notifications | Medium |
| ISSUE-009 | Revenue tracking | Low |
| ISSUE-010 | Session history | Low |

### Pending Platform Updates

| Issue | Dependency |
|-------|------------|
| ISSUE-001 | Replit Gemini AI Integrations update |

---

## ✅ Recently Resolved | נפתר לאחרונה

### RESOLVED-001: AI Provider Failover Not Working

| Field | Value |
|-------|-------|
| **Resolved Date** | 2024-12-20 |
| **Resolution** | Implemented automatic provider failover chain |

**Original Issue**: When primary AI provider failed, system would return errors instead of trying alternatives.

**Resolution**: Implemented `failedProviders` tracking with 5-minute cool-off period. System now automatically cycles through providers: Anthropic → OpenRouter → DeepSeek → OpenAI.

---

### RESOLVED-002: SSR Not Working for Search Engines

| Field | Value |
|-------|-------|
| **Resolved Date** | 2024-12-25 |
| **Resolution** | Implemented SSR middleware with bot detection |

**Original Issue**: Search engine crawlers received empty HTML with just React app shell.

**Resolution**: Added `ssrMiddleware` that detects approved bots and serves pre-rendered HTML with full meta tags, structured data, and content.

---

## 📊 Issue Statistics | סטטיסטיקת בעיות

### Current Status Summary

| Status | Count |
|--------|-------|
| Open | 8 |
| Scheduled | 2 |
| In Progress | 0 |
| Resolved (Last 30 days) | 2 |

### By Severity

| Severity | Open | Scheduled |
|----------|------|-----------|
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 3 | 1 |
| Low | 5 | 1 |

### By Component

| Component | Issues |
|-----------|--------|
| AI Providers | 1 |
| Analytics | 2 |
| Newsletter | 1 |
| Monetization | 1 |
| Security | 2 |
| Enterprise | 2 |
| Social | 1 |

---

## 🔔 Reporting New Issues | דיווח על בעיות חדשות

### How to Report

1. **Check existing issues** - Search this document first
2. **Gather information**:
   - Steps to reproduce
   - Error messages/logs
   - Browser/environment details
   - Screenshot if applicable
3. **Create issue** - Use the template above
4. **Notify team** - Tag in relevant channel

### Issue Submission Checklist

- [ ] Verified issue not already reported
- [ ] Included reproduction steps
- [ ] Attached relevant logs
- [ ] Assigned appropriate severity
- [ ] Identified affected component

---

*Last updated: December 29, 2024*
*Document owner: Engineering Team*
