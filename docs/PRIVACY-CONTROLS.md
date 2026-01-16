# Privacy Controls Documentation

## Overview

This document describes privacy controls implemented in Travi CMS, including consent management, user data rights, and third-party data sharing policies.

---

## איך זה עובד | How It Works

> **עברית**: בקרות פרטיות מבטיחות שהמשתמשים שולטים בנתונים שלהם. זה כולל הסכמה לעוגיות, יכולת לייצא נתונים, ואפשרות למחוק את החשבון. המערכת עומדת בדרישות GDPR ו-CCPA.

---

## Cookie Consent Implementation

### Architecture

```
client/src/contexts/cookie-consent-context.tsx
    └── CookieConsentProvider
        ├── Manages consent state
        ├── Stores preferences in localStorage
        └── Controls conditional script loading

client/src/components/cookie-consent-banner.tsx
    └── Cookie consent UI
        ├── Accept All / Reject All buttons
        ├── Manage Preferences option
        └── Cookie category toggles
```

### Storage Keys

| Key | Purpose | Values |
|-----|---------|--------|
| `travi_cookie_consent` | Consent status | `accepted`, `rejected`, `pending` |
| `travi_cookie_prefs` | Detailed preferences | JSON object |

### Cookie Categories

| Category | Purpose | Default | Required |
|----------|---------|---------|----------|
| Essential | Site functionality | ON | Yes |
| Analytics | Usage tracking | OFF | No |
| Marketing | Targeted ads | OFF | No |
| Personalization | User preferences | OFF | No |

### GTM Integration

```typescript
// Google Tag Manager loads only after analytics consent
if (cookieConsent.analytics) {
  loadGTM('GTM-WVXXVS6L');
}
```

### User Controls

- **Footer Link**: "Cookie Settings" opens preference modal
- **Banner**: Appears on first visit
- **Expiration**: Consent valid for 12 months
- **Revocation**: User can change preferences anytime

---

## User Data Rights

### Right to Access (Data Export)

**Endpoint**: `GET /api/user/export` (to be implemented)

**Exported Data**:
```json
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "createdAt": "2025-01-01T00:00:00Z",
    "profile": { ... }
  },
  "content": [
    { "type": "article", "title": "...", "createdAt": "..." }
  ],
  "preferences": {
    "cookieConsent": { ... },
    "notifications": { ... }
  },
  "activity": [
    { "action": "login", "timestamp": "..." }
  ]
}
```

**Format Options**: JSON, CSV
**Timeline**: Within 30 days of request

### Right to Rectification

**Implementation**: User profile edit functionality
- Users can update their name, email, preferences
- Changes take effect immediately
- Audit trail maintained

### Right to Erasure (Account Deletion)

**Endpoint**: `DELETE /api/user/account` (to be implemented)

**Deletion Process**:
1. User initiates deletion request
2. Confirmation email sent
3. 7-day grace period (cancellation allowed)
4. 30 days: Execute deletion
   - Remove PII
   - Anonymize content attributions
   - Delete session data
   - Purge from backups (within 90 days)

**Retention Exceptions**:
- Legal compliance requirements
- Ongoing transactions
- Active legal holds

### Right to Data Portability

**Format**: Machine-readable JSON
**Includes**: All user-generated content and personal data
**Excludes**: System-generated analytics, derived data

### Right to Restrict Processing

**Implementation**: Account suspension flag
- User can request processing suspension
- Data retained but not processed
- No marketing communications
- Limited system access

---

## Consent Management

### Types of Consent

| Consent Type | Collection Point | Revocation | Storage |
|--------------|-----------------|------------|---------|
| Terms of Service | Registration | Account deletion | Database |
| Cookie consent | Banner | Cookie settings | localStorage |
| Newsletter | Subscribe form | Unsubscribe link | Database |
| Marketing emails | Preference center | Preference center | Database |

### Consent Records

```typescript
interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  ipAddress: string; // Anonymized
  userAgent: string;
  version: string; // Policy version
}
```

### Double Opt-In (Newsletter)

1. User submits email
2. Verification email sent
3. User clicks confirmation link
4. Subscription activated
5. Consent recorded with timestamp

---

## Third-Party Data Sharing

### Current Integrations

| Service | Data Shared | Purpose | DPA Signed |
|---------|-------------|---------|------------|
| Google Analytics | Page views, user flow | Analytics | Yes |
| OpenAI | Content text | AI generation | Yes |
| Anthropic | Content text | AI generation | Yes |
| DeepL | Content text | Translation | Yes |
| Resend | User emails | Email delivery | Yes |

### Data Processing Agreements (DPAs)

All third-party processors have signed DPAs covering:
- Data protection obligations
- Security requirements
- Breach notification
- Sub-processor restrictions
- Data return/deletion

### Cross-Border Transfers

| Provider | Location | Transfer Mechanism |
|----------|----------|-------------------|
| OpenAI | USA | Standard Contractual Clauses |
| Anthropic | USA | Standard Contractual Clauses |
| Google | USA | Standard Contractual Clauses |
| DeepL | Germany | EU (no transfer needed) |

---

## Privacy by Design

### Data Minimization

- Collect only necessary data
- Use anonymized IDs where possible
- Aggregate analytics data
- Limit third-party data sharing

### Purpose Limitation

- Use data only for stated purposes
- Obtain new consent for new uses
- Document all processing activities

### Storage Limitation

- Follow data retention policy
- Implement automated deletion
- Regular data audits

### Security Measures

- Encryption at rest and in transit
- Access controls (RBAC)
- Audit logging
- Regular security reviews

---

## Privacy Compliance Checklist

### GDPR Requirements

- [x] Cookie consent banner
- [x] Privacy policy published
- [ ] Data export functionality
- [ ] Account deletion workflow
- [x] DPAs with third parties
- [x] Breach notification procedure
- [ ] Data Protection Impact Assessment
- [x] Record of processing activities

### CCPA Requirements

- [x] "Do Not Sell" opt-out option
- [x] Privacy notice at collection
- [ ] Consumer request handling
- [x] Non-discrimination policy
- [x] Verification procedures

---

## Implementation Roadmap

### Phase 1 (Completed)
- [x] Cookie consent banner
- [x] Cookie preference storage
- [x] GTM conditional loading
- [x] Privacy policy page

### Phase 2 (In Progress)
- [ ] User data export API
- [ ] Account deletion workflow
- [ ] Preference center UI
- [ ] Consent record storage

### Phase 3 (Planned)
- [ ] Automated consent expiration
- [ ] DPIA documentation
- [ ] Privacy dashboard for admins
- [ ] Consent analytics

---

## Contact

**Data Protection Officer**: [To be assigned]
**Privacy Inquiries**: privacy@travi.travel (to be configured)

---

*Last updated: December 2025*
*Owner: Legal & Compliance Team*
*Next review: March 2026*
