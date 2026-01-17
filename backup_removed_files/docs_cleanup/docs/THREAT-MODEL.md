# Threat Model Documentation

## Overview

This document provides a comprehensive threat model for Travi CMS, identifying attack surfaces, threat actors, and security controls.

---

## איך זה עובד | How It Works

> **עברית**: מודל איומים מזהה את הסיכונים האפשריים למערכת ומגדיר כיצד להתגונן מפניהם. המסמך מתאר גבולות אמון, משטחי התקפה אפשריים, וניתוח STRIDE לכל רכיב.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
│                    (Untrusted Zone)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY 1                            │
│                     (CDN / Edge Layer)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  DDoS Prot  │  │  WAF Rules  │  │  TLS Term   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY 2                            │
│                    (Application Layer)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Express   │  │  Auth/OIDC  │  │ Rate Limit  │             │
│  │   Server    │  │  Middleware │  │  Middleware │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────┐            │
│  │              API Routes                          │            │
│  │   /api/contents   /api/auth   /api/admin        │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY 3                            │
│                       (Data Layer)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  PostgreSQL │  │   Object    │  │    Redis    │             │
│  │   (Neon)    │  │   Storage   │  │  (Session)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY 4                            │
│                    (External Services)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   OpenAI    │  │  Anthropic  │  │    DeepL    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Threat Actors

| Actor | Motivation | Capability | Target |
|-------|-----------|------------|--------|
| Script Kiddie | Curiosity, vandalism | Low | Public-facing endpoints |
| Automated Bot | Spam, credential stuffing | Medium | Login, forms, comments |
| Competitor | Business intelligence | Medium | Content, user data |
| Insider Threat | Financial gain, revenge | High | All systems |
| APT | Espionage, disruption | Very High | Infrastructure, data |

---

## Attack Surface Analysis

### 1. Authentication System

**Entry Points**:
- `/api/login` - Replit OIDC flow
- Session cookies
- API tokens

**Threats (STRIDE)**:
| Threat | Description | Risk | Mitigation |
|--------|-------------|------|------------|
| Spoofing | Session hijacking | HIGH | Secure cookies, HTTPS only |
| Tampering | Token manipulation | MEDIUM | JWT signature verification |
| Repudiation | Deny actions | LOW | Audit logging |
| Info Disclosure | Token leakage | HIGH | Short token lifetime |
| DoS | Login flood | MEDIUM | Rate limiting |
| Elevation | Privilege escalation | HIGH | Role-based access |

---

### 2. API Endpoints

**Entry Points**:
- `/api/*` - All REST endpoints
- WebSocket connections

**Threats (STRIDE)**:
| Threat | Description | Risk | Mitigation |
|--------|-------------|------|------------|
| Spoofing | Unauthorized API access | HIGH | Auth middleware |
| Tampering | Request manipulation | MEDIUM | Input validation (Zod) |
| Repudiation | Deny API calls | LOW | Request logging |
| Info Disclosure | Data leakage | HIGH | Response filtering |
| DoS | API flooding | MEDIUM | Rate limiting |
| Elevation | Admin API access | CRITICAL | Role checks |

---

### 3. File Upload System

**Entry Points**:
- `/api/upload` - Media uploads
- Object storage access

**Threats (STRIDE)**:
| Threat | Description | Risk | Mitigation |
|--------|-------------|------|------------|
| Spoofing | Malicious file attribution | LOW | User tracking |
| Tampering | Malware upload | HIGH | File type validation |
| Repudiation | Deny upload | LOW | Audit trail |
| Info Disclosure | Path traversal | MEDIUM | Filename sanitization |
| DoS | Large file upload | MEDIUM | Size limits (10MB) |
| Elevation | Script execution | CRITICAL | Content-Type enforcement |

**File Validation Controls**:
```typescript
// Allowed types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
```

---

### 4. AI Integration

**Entry Points**:
- OpenAI API calls
- Anthropic API calls
- DeepL translation

**Threats (STRIDE)**:
| Threat | Description | Risk | Mitigation |
|--------|-------------|------|------------|
| Spoofing | API key theft | HIGH | Key rotation, secrets |
| Tampering | Prompt injection | HIGH | Input sanitization |
| Repudiation | Deny AI usage | LOW | Usage logging |
| Info Disclosure | Data in prompts | MEDIUM | PII filtering |
| DoS | Rate limit exhaustion | HIGH | Circuit breakers |
| Elevation | System prompt override | MEDIUM | Prompt hardening |

---

### 5. Admin Panel

**Entry Points**:
- `/admin/*` - All admin routes
- Admin API endpoints

**Threats (STRIDE)**:
| Threat | Description | Risk | Mitigation |
|--------|-------------|------|------------|
| Spoofing | Admin impersonation | CRITICAL | MFA (planned) |
| Tampering | Config manipulation | HIGH | Audit logging |
| Repudiation | Admin action denial | MEDIUM | Immutable audit log |
| Info Disclosure | Admin data leakage | HIGH | Admin-only routes |
| DoS | Admin lockout | MEDIUM | Backup access |
| Elevation | User → Admin | CRITICAL | Strict role validation |

---

## Threat Matrix

| Component | S | T | R | I | D | E | Overall Risk |
|-----------|---|---|---|---|---|---|--------------|
| Authentication | H | M | L | H | M | H | **HIGH** |
| API Endpoints | H | M | L | H | M | C | **HIGH** |
| File Uploads | L | H | L | M | M | C | **HIGH** |
| AI Integration | H | H | L | M | H | M | **HIGH** |
| Admin Panel | C | H | M | H | M | C | **CRITICAL** |
| Database | M | H | L | H | M | H | **HIGH** |
| Object Storage | M | M | L | M | L | M | **MEDIUM** |

---

## Security Controls Summary

### Preventive Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Authentication | Replit OIDC | Active |
| Authorization | Role-based (RBAC) | Active |
| Input Validation | Zod schemas | Active |
| Rate Limiting | express-rate-limit | Active |
| TLS Encryption | HTTPS enforced | Active |
| API Key Security | Circuit breakers | Active |

### Detective Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Audit Logging | audit_logs table | Active |
| Error Monitoring | Error tracking | Active |
| Abuse Detection | Pattern analysis | Active |
| Performance Monitoring | Latency tracker | Active |

### Corrective Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Incident Response | Playbook defined | Active |
| Circuit Breakers | Auto-recovery | Active |
| Key Rotation | Automated | Planned |
| Backup/Restore | Database backups | Active |

---

## Risk Register

| ID | Risk | Likelihood | Impact | Score | Mitigation Status |
|----|------|------------|--------|-------|-------------------|
| R1 | Admin account compromise | Medium | Critical | 15 | Partial (MFA pending) |
| R2 | API key exposure | Low | High | 8 | Mitigated |
| R3 | SQL injection | Low | Critical | 10 | Mitigated (ORM) |
| R4 | XSS attack | Medium | Medium | 9 | Mitigated (DOMPurify) |
| R5 | DDoS attack | Medium | High | 12 | Partial (rate limits) |
| R6 | Prompt injection | Medium | Medium | 9 | Partial |
| R7 | Data breach | Low | Critical | 10 | Partial |

---

## Recommendations

### Immediate (P0)
1. Implement MFA for admin accounts
2. Add Content Security Policy headers
3. Implement request signing for internal APIs

### Short-term (P1)
1. Regular penetration testing
2. Automated vulnerability scanning
3. Security awareness training

### Long-term (P2)
1. Bug bounty program
2. SOC 2 compliance
3. Zero-trust architecture migration

---

*Last updated: December 2025*
*Owner: Security Team*
*Next review: Quarterly*
