# ADR-005: IDOR Protection Middleware

## Status

**Accepted**

## Date

2024-10-01

---

## Context

TRAVI CMS is a multi-user content management system where different users have different permissions and own different content. Insecure Direct Object Reference (IDOR) vulnerabilities occur when:

- Users can access other users' content by guessing/manipulating IDs
- Authorization checks are inconsistent across endpoints
- Role-based permissions are not enforced uniformly

We needed a systematic approach to prevent unauthorized access to resources.

### Requirements

- Prevent users from accessing resources they don't own
- Enforce role-based permissions consistently
- Support "ownership OR permission" patterns (admins can access any content)
- Log authorization failures for security auditing
- Easy to apply to new endpoints
- Type-safe implementation

---

## Alternatives Considered

### Option 1: Per-Route Authorization Logic

**Description**: Implement authorization checks inline in each route handler.

**Pros**:
- Explicit control per endpoint
- No middleware abstraction to learn

**Cons**:
- Code duplication across routes
- Easy to forget checks on new endpoints
- Inconsistent implementation patterns
- No centralized logging

### Option 2: Database-Level Row Security

**Description**: Use PostgreSQL Row Level Security (RLS) policies.

**Pros**:
- Enforced at database level
- Impossible to bypass in application code
- Works for all queries

**Cons**:
- Complex to implement and debug
- Requires passing user context to all queries
- Difficult to implement "ownership OR permission" patterns
- Less flexible for complex business rules

### Option 3: Middleware-Based Authorization

**Description**: Create reusable Express middleware that enforces ownership and permission checks.

**Pros**:
- DRY - apply once, works everywhere
- Centralized logging
- Consistent patterns across routes
- Easy to apply to new endpoints
- Type-safe with TypeScript

**Cons**:
- Must remember to apply middleware
- Additional database queries for checks
- Abstraction can hide authorization logic

---

## Decision

We implemented **middleware-based IDOR protection** with three primary patterns:

### Middleware Functions

```typescript
// 1. Require resource ownership
requireOwnership(resourceType: 'content')

// 2. Require ownership OR a specific permission
requireOwnershipOrPermission(permission: PermissionKey, resourceType: 'content')

// 3. Require self-access for user operations
requireSelfAccess()
```

### Permission System

Permissions are defined in `ROLE_PERMISSIONS` constant:

```typescript
export const ROLE_PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit: true,
    canEditOwn: true,
    canDelete: true,
    canPublish: true,
    canManageUsers: true,
    canViewAll: true,
    // ...
  },
  editor: {
    canCreate: true,
    canEdit: true,
    canEditOwn: true,
    canDelete: false,
    canPublish: true,
    // ...
  },
  author: {
    canCreate: true,
    canEdit: false,
    canEditOwn: true,
    canPublish: false,
    // ...
  },
  // ...
};
```

### Implementation

```typescript
// server/middleware/idor-protection.ts

export function requireOwnershipOrPermission(
  permission: PermissionKey, 
  resourceType: 'content' = 'content'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authUser = await getAuthenticatedDbUser(req);
    
    if (!authUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { userId, userRole } = authUser;
    const resourceId = req.params.id;

    // Check if user has the permission (admins, editors, etc.)
    if (hasPermission(userRole, permission)) {
      return next();
    }

    // Otherwise, check ownership
    const content = await storage.getContent(resourceId);
    
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    if (content.authorId !== userId) {
      logAuthorizationFailure({
        type: 'ownership',
        userId,
        userRole,
        resourceType,
        resourceId,
        requiredPermission: permission,
        // ...
      });

      return res.status(403).json({
        error: "Access denied",
        message: "You do not own this resource",
      });
    }

    next();
  };
}
```

### Usage in Routes

```typescript
// Only the content owner can access
router.delete('/api/contents/:id', 
  requireOwnership('content'),
  deleteContentHandler
);

// Owner OR users with canEdit permission
router.patch('/api/contents/:id',
  requireOwnershipOrPermission('canEdit'),
  updateContentHandler
);

// Only the user themselves can access
router.get('/api/users/:id/settings',
  requireSelfAccess(),
  getUserSettingsHandler
);
```

### Authorization Failure Logging

```typescript
interface AuthorizationFailure {
  timestamp: string;
  type: 'ownership' | 'permission' | 'self_access';
  userId: string | undefined;
  userRole: UserRole | undefined;
  resourceType: string;
  resourceId: string;
  requiredPermission?: PermissionKey;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
}

// All failures are logged for security auditing
console.warn('[IDOR_PROTECTION]', JSON.stringify({
  ...failure,
  severity: 'WARNING',
  category: 'authorization_failure',
}));
```

---

## Consequences

### Positive

- **Consistent Security**: All protected routes use the same authorization logic
- **Audit Trail**: All authorization failures are logged with full context
- **Flexible Patterns**: Support for ownership, permission, and combined checks
- **Type Safety**: TypeScript ensures valid permission keys
- **Easy Adoption**: New routes can easily add protection
- **Role-Based**: Permissions are centrally defined and easy to modify

### Negative

- **Additional Queries**: Must fetch user and resource for each protected request
- **Middleware Order**: Must be applied after authentication middleware
- **Learning Curve**: Developers must understand which middleware to use
- **Not Automatic**: Must remember to add middleware to new routes

### Neutral

- Failed requests return generic "Access denied" (prevents information leakage)
- Middleware adds request processing overhead
- Must maintain `ROLE_PERMISSIONS` as roles evolve

---

## Mitigations

1. **Query Optimization**: Cache user lookups in request context
2. **Middleware Order**: Document and enforce middleware ordering
3. **Code Review**: PR checklist includes authorization verification
4. **Testing**: Integration tests verify authorization for all protected routes

### Testing Example

```typescript
describe('IDOR Protection', () => {
  it('prevents users from accessing other users\' content', async () => {
    const userA = await createTestUser({ role: 'author' });
    const userB = await createTestUser({ role: 'author' });
    const content = await createTestContent({ authorId: userA.id });

    // User B tries to access User A's content
    const response = await request(app)
      .patch(`/api/contents/${content.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ title: 'Hacked!' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Access denied');
  });

  it('allows admins to access any content', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const author = await createTestUser({ role: 'author' });
    const content = await createTestContent({ authorId: author.id });

    const response = await request(app)
      .patch(`/api/contents/${content.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'Admin Edit' });

    expect(response.status).toBe(200);
  });
});
```

---

## References

- [OWASP IDOR Prevention](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References)
- [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Express Middleware Best Practices](https://expressjs.com/en/guide/using-middleware.html)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-10-01 | Initial IDOR protection implementation | TRAVI Team |
| 2024-11-01 | Added authorization failure logging | TRAVI Team |
| 2024-12-01 | Added self-access pattern for user routes | TRAVI Team |
