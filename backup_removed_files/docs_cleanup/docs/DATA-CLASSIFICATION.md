# Data Classification Policy

## Overview

This document defines data classification levels for Travi CMS and establishes handling requirements for each category.

---

## איך זה עובד | How It Works

> **עברית**: מדיניות סיווג נתונים מגדירה כיצד לטפל במידע רגיש. כל נתון מסווג לאחת מארבע רמות: ציבורי, פנימי, סודי, או מוגבל. הסיווג קובע מי יכול לגשת לנתון ואיך הוא צריך להיות מוגן.

---

## Classification Levels

### Level 1: Public
**Definition**: Information intended for public access with no confidentiality requirements.

| Data Type | Examples | Storage | Access |
|-----------|----------|---------|--------|
| Published content | Articles, attractions, hotels | Database | Public API |
| Content slugs | URL paths | Database | Public |
| Static pages | Terms, Privacy Policy | Database | Public |
| SEO metadata | Meta titles, descriptions | Database | Public |

**Handling Requirements**:
- No encryption required for storage
- Can be cached at CDN
- No access logging required

---

### Level 2: Internal
**Definition**: Information for internal use only, not intended for public disclosure.

| Data Type | Examples | Storage | Access |
|-----------|----------|---------|--------|
| Draft content | Unpublished articles | Database | Authenticated users |
| Analytics data | Page views, user behavior | Database | Admin users |
| System logs | Application logs | Log files | DevOps team |
| Content metadata | Author assignments | Database | Editors |

**Handling Requirements**:
- Encrypt at rest (database encryption)
- Require authentication for access
- Log access for audit purposes
- Retain per data retention policy

---

### Level 3: Confidential
**Definition**: Sensitive information requiring protection from unauthorized access.

| Data Type | Examples | Storage | Access |
|-----------|----------|---------|--------|
| User PII | Email, name, profile | Database (encrypted) | User + Admin |
| Session data | Auth tokens, session IDs | Redis/Memory | System only |
| User preferences | Cookie consents, settings | Database | User only |
| Subscriber lists | Newsletter subscribers | Database | Marketing team |

**Handling Requirements**:
- Encrypt at rest AND in transit (TLS 1.3)
- Implement access controls (RBAC)
- Mask in logs (no PII in logs)
- Subject to GDPR/CCPA rights
- Audit all access

---

### Level 4: Restricted
**Definition**: Highly sensitive information requiring maximum protection.

| Data Type | Examples | Storage | Access |
|-----------|----------|---------|--------|
| API keys | OpenAI, Anthropic, DeepL | Environment secrets | System only |
| Database credentials | DATABASE_URL | Environment secrets | System only |
| Encryption keys | Session secrets | Environment secrets | System only |
| Payment data | Stripe credentials | Stripe vault | Payment system |

**Handling Requirements**:
- Never log or expose
- Store in secure vault (Replit Secrets)
- Rotate periodically (see key-rotation.ts)
- Access only via environment variables
- Implement circuit breakers for API keys
- Alert on unauthorized access attempts

---

## Data Inventory

| Category | Data Element | Classification | Owner | Retention |
|----------|-------------|----------------|-------|-----------|
| **User** | Email address | Confidential | User | Account + 3 years |
| **User** | Password hash | Restricted | System | Account lifetime |
| **User** | Session token | Confidential | System | Session + 24h |
| **Content** | Published articles | Public | Content team | Indefinite |
| **Content** | Draft content | Internal | Author | Until published/deleted |
| **System** | API keys | Restricted | DevOps | Rotate every 90 days |
| **System** | Access logs | Internal | Security | 90 days |
| **Analytics** | Page views | Internal | Analytics team | 2 years |
| **Marketing** | Subscriber emails | Confidential | Marketing | Until unsubscribe + 30 days |

---

## Handling Matrix

| Action | Public | Internal | Confidential | Restricted |
|--------|--------|----------|--------------|------------|
| Store unencrypted | YES | NO | NO | NO |
| Log in plaintext | YES | YES | NO | NO |
| Cache at CDN | YES | NO | NO | NO |
| Email externally | YES | NO | Encrypted only | NEVER |
| Backup | YES | YES | Encrypted | Encrypted + secure |
| Share with 3rd party | YES | With NDA | With consent | NEVER |

---

## Compliance Requirements

### GDPR (EU)
- Confidential and Restricted data subject to data subject rights
- Right to access, rectification, erasure, portability
- 72-hour breach notification requirement

### CCPA (California)
- Right to know, delete, opt-out
- Must disclose data collection practices
- Cannot discriminate against users exercising rights

---

## Review Schedule

| Review Type | Frequency | Responsible |
|-------------|-----------|-------------|
| Classification audit | Quarterly | Security team |
| Access review | Monthly | Data owners |
| Policy update | Annually | Compliance team |

---

*Last updated: December 2025*
*Owner: Security Team*
*Next review: March 2026*
