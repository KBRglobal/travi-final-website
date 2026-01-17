# Security Controls Documentation

## Overview

This document details all security controls implemented in Travi CMS, providing a comprehensive reference for security operations and compliance.

---

## איך זה עובד | How It Works

> **עברית**: בקרות אבטחה הן המנגנונים שמגנים על המערכת מפני התקפות. המסמך מתאר את כל שכבות ההגנה: אימות, הרשאות, הגבלת קצב, אימות קלט, ועוד.

---

## 1. Authentication

### Replit OIDC Integration

**Implementation**: `server/replitAuth.ts`

```typescript
// OIDC flow with Replit
const { setupAuth } = require('@replit/replauth');

app.use(setupAuth({
  redirectUri: process.env.REPLIT_REDIRECT_URI,
  scopes: ['openid', 'email', 'profile']
}));
```

**Security Properties**:
- OAuth 2.0 / OpenID Connect standard
- Managed by Replit (delegated security)
- Short-lived access tokens
- Automatic token refresh

### Session Management

**Storage**: PostgreSQL via `connect-pg-simple`

| Property | Value |
|----------|-------|
| Session lifetime | 24 hours |
| Cookie flags | `httpOnly`, `secure`, `sameSite=strict` |
| Session ID entropy | 256 bits |
| Session fixation protection | Regenerate on auth |

---

## 2. Authorization (RBAC)

### Role Hierarchy

```
super_admin
    │
    ├── admin
    │       │
    │       ├── editor
    │       │       │
    │       │       └── writer
    │       │
    │       └── seo_specialist
    │
    └── developer
```

### Permission Matrix

| Resource | Writer | Editor | Admin | Super Admin |
|----------|--------|--------|-------|-------------|
| Create content | Yes | Yes | Yes | Yes |
| Edit own content | Yes | Yes | Yes | Yes |
| Edit all content | No | Yes | Yes | Yes |
| Publish content | No | Yes | Yes | Yes |
| Manage users | No | No | Yes | Yes |
| System settings | No | No | No | Yes |
| View audit logs | No | No | Yes | Yes |
| Delete content | No | Yes | Yes | Yes |

### Implementation

```typescript
// Role check middleware
function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/api/contents/:id', requireRole(['admin', 'super_admin']), ...);
```

---

## 3. Rate Limiting

### Implementation

**Package**: `express-rate-limit`
**File**: `server/routes.ts`

### Rate Limit Tiers

| Endpoint Pattern | Limit | Window | Penalty |
|------------------|-------|--------|---------|
| `/api/auth/*` | 10 | 15 min | Block 1 hour |
| `/api/upload` | 20 | 1 hour | Block 30 min |
| `/api/contents` (GET) | 100 | 1 min | Throttle |
| `/api/contents` (POST) | 30 | 1 hour | Block 30 min |
| `/api/ai/*` | 50 | 1 hour | Circuit breaker |
| Default | 200 | 1 min | Throttle |

### Abuse Detection

**File**: `server/security/abuse-detection.ts`

```typescript
// Pattern detection
interface AbusePattern {
  type: 'credential_stuffing' | 'api_abuse' | 'scraping';
  threshold: number;
  window: number;
  action: 'block' | 'captcha' | 'alert';
}

const patterns: AbusePattern[] = [
  { type: 'credential_stuffing', threshold: 5, window: 300, action: 'block' },
  { type: 'api_abuse', threshold: 1000, window: 3600, action: 'block' },
  { type: 'scraping', threshold: 500, window: 60, action: 'captcha' }
];
```

---

## 4. Input Validation

### Zod Schemas

**Location**: `shared/schema.ts`

```typescript
// Example: Content creation validation
const insertContentSchema = createInsertSchema(contents, {
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  blocks: z.array(blockSchema),
});
```

### Validation Rules

| Field Type | Validation |
|------------|------------|
| Email | RFC 5322 format |
| URL | Valid HTTP(S) URL |
| Slug | Lowercase alphanumeric + hyphens |
| HTML content | Sanitized via DOMPurify |
| File names | Alphanumeric + limited special chars |
| JSON | Schema validation |

---

## 5. Output Encoding

### XSS Prevention

**Package**: `isomorphic-dompurify`

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content before storage/display
const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
};
```

### Content Security Policy

```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    }
  }
}));
```

---

## 6. File Upload Security

### Validation Checks

| Check | Implementation |
|-------|----------------|
| File type | Magic bytes + MIME type |
| File size | 10MB limit |
| File name | Sanitized, UUID-based storage |
| Extension | Whitelist validation |
| Content scan | Malware check (planned) |

### Implementation

```typescript
// Multer configuration
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Magic bytes verification
import { fileTypeFromBuffer } from 'file-type';

async function verifyFileType(buffer: Buffer): Promise<boolean> {
  const type = await fileTypeFromBuffer(buffer);
  return type && ALLOWED_MIME_TYPES.includes(type.mime);
}
```

---

## 7. API Key Security

### Circuit Breaker Pattern

**File**: `server/ai/circuit-breaker.ts`

```typescript
// Circuit breaker states
enum CircuitState {
  CLOSED,      // Normal operation
  OPEN,        // Failing, reject requests
  HALF_OPEN    // Testing recovery
}

// Configuration
const config = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,        // 60 seconds
  resetTimeout: 30000    // 30 seconds
};
```

### Key Rotation

**File**: `server/security/key-rotation.ts`

| Key Type | Rotation Period | Alert Threshold |
|----------|-----------------|-----------------|
| API keys | 90 days | 80 days |
| Session secret | 30 days | 25 days |
| Database password | 90 days | 80 days |

---

## 8. Database Security

### Connection Security

- TLS 1.3 for connections
- Certificate verification enabled
- Connection pooling with limits
- Prepared statements (ORM-enforced)

### Query Safety

```typescript
// Drizzle ORM prevents SQL injection
const content = await db
  .select()
  .from(contents)
  .where(eq(contents.id, id)); // Parameterized
```

### Access Controls

| Principal | Permissions |
|-----------|-------------|
| App service | SELECT, INSERT, UPDATE, DELETE |
| Backup service | SELECT only |
| Admin (manual) | Full + DDL |

---

## 9. Logging & Monitoring

### Audit Log Schema

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

### Security Events Logged

| Event | Log Level | Alert |
|-------|-----------|-------|
| Failed login | WARN | After 5 attempts |
| Role change | INFO | Always |
| Admin action | INFO | None |
| Rate limit hit | WARN | After 10 hits |
| Circuit breaker open | ERROR | Always |
| Suspicious pattern | WARN | Always |

---

## 10. Network Security

### TLS Configuration

- Minimum version: TLS 1.2
- Preferred version: TLS 1.3
- Strong cipher suites only
- HSTS enabled

### Headers

```typescript
// Security headers via Helmet
app.use(helmet());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.frameguard({ action: 'deny' }));
```

---

## Security Checklist

### Pre-Deployment

- [x] All secrets in environment variables
- [x] Debug mode disabled
- [x] Error messages sanitized
- [x] Rate limiting active
- [x] Input validation complete
- [x] Output encoding active
- [x] TLS enforced
- [ ] Penetration test completed
- [x] Security headers configured

### Ongoing

- [ ] Weekly vulnerability scans
- [ ] Monthly access reviews
- [ ] Quarterly penetration tests
- [x] Real-time monitoring
- [x] Incident response plan

---

## 11. IDOR (Insecure Direct Object Reference) Protection

### Overview

IDOR protection prevents users from accessing or modifying resources they don't own by enforcing authorization checks at the route level.

**Implementation**: `server/middleware/idor-protection.ts`

### Middleware Functions

| Middleware | Purpose | Usage |
|------------|---------|-------|
| `requireOwnership` | Verifies user owns the resource | Content author verification |
| `requireOwnershipOrPermission` | Allows ownership OR role permission | Content edit/delete |
| `requireSelfOrAdmin` | User can only access their own profile | User profile access |
| `requireAdmin` | Restricts to admin role only | Critical operations |
| `requirePermissionWithAudit` | Permission check with audit logging | Enhanced security |

### Protected Routes

| Route | Method | Protection | Description |
|-------|--------|------------|-------------|
| `/api/contents/:id` | DELETE | `requireOwnershipOrPermission("canDelete")` | Authors can delete their own content, admins can delete any |
| `/api/contents/:id` | PATCH | `requireOwnContentOrPermission("canEdit")` | Authors can edit their own content, editors/admins can edit any |
| `/api/users/:id` | GET | `requireSelfOrAdmin()` | Users can only view their own profile, admins can view any |
| `/api/users/:id` | DELETE | `requireAdmin()` | Only admins can delete users |

### Implementation Example

```typescript
// Ownership OR permission check
export function requireOwnershipOrPermission(permission: PermissionKey, resourceType: 'content' = 'content') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authUser = await getAuthenticatedDbUser(req);
    
    if (!authUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { userId, userRole } = authUser;

    // Admin or user with permission can access any resource
    if (hasPermission(userRole, permission)) {
      return next();
    }

    // Check ownership for content resources
    const content = await storage.getContent(req.params.id);
    if (content?.authorId === userId) {
      return next();
    }

    // Log authorization failure
    logAuthorizationFailure({
      type: 'permission',
      userId,
      userRole,
      resourceType,
      resourceId: req.params.id,
      requiredPermission: permission,
    });

    return res.status(403).json({ error: "Access denied" });
  };
}
```

### Audit Logging

All authorization failures are logged with:

| Field | Description |
|-------|-------------|
| `timestamp` | When the failure occurred |
| `type` | Type of check (ownership, permission, self_access) |
| `userId` | ID of the user attempting access |
| `userRole` | Role of the user |
| `resourceType` | Type of resource (content, user) |
| `resourceId` | ID of the resource being accessed |
| `requiredPermission` | Permission that was required |
| `ip` | Client IP address |
| `userAgent` | Browser/client user agent |
| `path` | Request path |
| `method` | HTTP method |

### Log Format

```json
{
  "timestamp": "2025-12-29T15:30:00.000Z",
  "type": "permission",
  "userId": "user-123",
  "userRole": "author",
  "resourceType": "content",
  "resourceId": "content-456",
  "requiredPermission": "canDelete",
  "ip": "192.168.1.1",
  "path": "/api/contents/content-456",
  "method": "DELETE",
  "severity": "WARNING",
  "category": "authorization_failure"
}
```

### Permission Matrix (ROLE_PERMISSIONS)

```typescript
// From shared/schema.ts
export const ROLE_PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit: true,
    canEditOwn: true,
    canDelete: true,
    canPublish: true,
    canManageUsers: true,
    canViewAll: true,
  },
  editor: {
    canCreate: true,
    canEdit: true,
    canEditOwn: true,
    canDelete: false,
    canPublish: true,
    canManageUsers: false,
    canViewAll: true,
  },
  author: {
    canCreate: true,
    canEdit: false,
    canEditOwn: true,
    canDelete: false,
    canPublish: false,
    canManageUsers: false,
    canViewAll: false,
  },
  // ... other roles
};
```

### Security Properties

- **Defense in Depth**: Multiple layers of authorization checks
- **Least Privilege**: Users only access what they own or are permitted
- **Audit Trail**: All authorization failures are logged
- **Consistent Enforcement**: Centralized middleware for uniform protection
- **Fail-Safe**: Errors result in access denial, not access grant

---

*Last updated: December 2025*
*Owner: Security Team*
*Compliance: SOC 2 Type I (in progress)*
