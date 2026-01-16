# ADR-006: Optimistic Locking with ETags

## Status

**Accepted**

## Date

2024-11-01

---

## Context

TRAVI CMS supports multiple users editing content simultaneously. Without proper concurrency control, the following issues can occur:

- **Lost Updates**: User A and User B both edit the same content. User A saves first, then User B saves, unknowingly overwriting User A's changes.
- **Data Corruption**: Partial updates from concurrent edits can leave content in an inconsistent state.
- **User Frustration**: Users lose work without knowing it happened.

We needed a concurrency control mechanism that:

- Prevents lost updates
- Doesn't block concurrent reads
- Provides clear conflict resolution
- Works with RESTful API patterns

### Requirements

- Detect concurrent modifications before they overwrite data
- Provide meaningful error messages when conflicts occur
- Offer resolution options (refresh, force save, merge)
- Use standard HTTP patterns (ETags, If-Match)
- Backward compatible (existing clients without version headers still work)
- Minimal performance overhead

---

## Alternatives Considered

### Option 1: Pessimistic Locking

**Description**: Lock content when a user starts editing, preventing others from editing until the lock is released.

**Pros**:
- Guarantees no conflicts
- Simple mental model

**Cons**:
- Blocks other users
- Requires lock timeout handling
- Users might abandon sessions without releasing locks
- Doesn't work well with stateless REST APIs
- Complex to implement across server restarts

### Option 2: Last-Write-Wins

**Description**: Simply accept whatever update comes last, no conflict detection.

**Pros**:
- Simple implementation
- No extra headers or logic

**Cons**:
- Silent data loss
- User frustration when changes disappear
- No way to know a conflict occurred

### Option 3: Optimistic Locking with Version Numbers

**Description**: Use an integer version column that increments on each update.

**Pros**:
- Simple version comparison
- Clear ordering of versions

**Cons**:
- Extra column in database
- Version number gaps if updates fail
- Doesn't leverage HTTP caching standards

### Option 4: Optimistic Locking with ETags

**Description**: Use ETags based on `updatedAt` timestamp with `If-Match` header for conditional updates.

**Pros**:
- Standard HTTP pattern (RFC 7232)
- Works with HTTP caching
- Uses existing `updatedAt` column
- No extra database columns needed
- Clear 409 Conflict response

**Cons**:
- Clients must handle If-Match header
- Timestamp precision matters
- Slightly more complex client implementation

---

## Decision

We implemented **ETag-based optimistic locking** using HTTP conditional requests:

### How It Works

```
Client A                    Server                    Client B
   |                           |                           |
   |-- GET /content/123 ------>|                           |
   |<-- 200, ETag: "abc123" ---|                           |
   |                           |                           |
   |                           |<-- GET /content/123 ------|
   |                           |--- 200, ETag: "abc123" -->|
   |                           |                           |
   |-- PATCH, If-Match: "abc123"                           |
   |<-- 200, ETag: "def456" ---|                           |
   |                           |                           |
   |                           |<-- PATCH, If-Match: "abc123"
   |                           |--- 409 Conflict ---------->|
```

### ETag Generation

```typescript
// server/middleware/optimistic-locking.ts

export function generateETag(updatedAt: Date | string): string {
  const timestamp = updatedAt instanceof Date 
    ? updatedAt.toISOString() 
    : updatedAt;
  const hash = Buffer.from(timestamp).toString('base64').replace(/[=]/g, '');
  return `"${hash}"`;
}
```

### Middleware Implementation

```typescript
export function checkOptimisticLock() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const contentId = req.params.id;
    const ifMatch = req.headers['if-match'];
    
    // Backward compatibility: skip check if no If-Match header
    if (!ifMatch) {
      return next();
    }
    
    const [content] = await db
      .select({ updatedAt: contents.updatedAt })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const currentETag = generateETag(content.updatedAt);
    const clientETag = parseETag(ifMatch);
    const serverETag = parseETag(currentETag);
    
    if (clientETag !== serverETag) {
      return res.status(409).json({
        error: 'Conflict: Content has been modified',
        code: 'VERSION_CONFLICT',
        currentVersion: currentETag,
        clientVersion: ifMatch,
        message: 'The content was modified by another user. Please refresh and try again.',
        resolution: {
          options: ['refresh', 'force_save', 'merge'],
          refreshUrl: `/api/contents/${contentId}`,
        }
      });
    }
    
    next();
  };
}
```

### Adding ETag to Responses

```typescript
export function addETagHeader() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(body: unknown) {
      if (body && typeof body === 'object') {
        const data = body as Record<string, unknown>;
        if (data.updatedAt) {
          const etag = generateETag(data.updatedAt as Date | string);
          res.setHeader('ETag', etag);
        }
      }
      return originalJson(body);
    };
    
    next();
  };
}
```

### Conflict Response

```json
{
  "error": "Conflict: Content has been modified",
  "code": "VERSION_CONFLICT",
  "currentVersion": "\"def456\"",
  "clientVersion": "\"abc123\"",
  "message": "The content was modified by another user. Please refresh and try again.",
  "resolution": {
    "options": ["refresh", "force_save", "merge"],
    "refreshUrl": "/api/contents/123"
  }
}
```

### Resolution Options

| Option | Description | Use Case |
|--------|-------------|----------|
| `refresh` | Discard local changes, reload latest | User wants to see what changed |
| `force_save` | Overwrite server version | User is confident their changes should win |
| `merge` | Show both versions for manual merge | Complex changes that need review |

---

## Consequences

### Positive

- **Standard Pattern**: Uses well-established HTTP conditional request standards
- **No Extra Schema**: Reuses existing `updatedAt` column
- **Backward Compatible**: Clients without If-Match still work (no version check)
- **Clear Errors**: 409 response includes resolution options
- **Cache-Friendly**: ETags work with HTTP caching infrastructure
- **Conflict Prevention**: Users are warned before overwriting others' changes

### Negative

- **Client Complexity**: Clients must handle ETags and 409 responses
- **Timestamp Dependency**: Relies on `updatedAt` being updated on every change
- **Clock Precision**: Very rapid updates might have same timestamp
- **Extra Query**: Must fetch current version to compare

### Neutral

- ETags are opaque tokens (clients shouldn't parse them)
- Force save option allows bypassing checks when needed
- No real-time collaboration (just conflict detection)

---

## Mitigations

1. **Client Libraries**: Provide client utilities for ETag handling
2. **Timestamp Precision**: PostgreSQL timestamp has microsecond precision
3. **UI Guidance**: Frontend shows clear conflict resolution dialog
4. **Documentation**: Clear examples for handling 409 responses

### Client Usage Example

```typescript
// Fetch content and store ETag
const response = await fetch('/api/contents/123');
const content = await response.json();
const etag = response.headers.get('ETag');

// Update with version check
const updateResponse = await fetch('/api/contents/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'If-Match': etag, // Send the stored ETag
  },
  body: JSON.stringify(updatedContent),
});

if (updateResponse.status === 409) {
  const conflict = await updateResponse.json();
  
  // Show resolution dialog
  showConflictDialog({
    message: conflict.message,
    options: conflict.resolution.options,
    onRefresh: () => window.location.reload(),
    onForceSave: () => saveWithoutVersionCheck(),
    onMerge: () => showMergeUI(),
  });
}
```

---

## References

- [RFC 7232 - Conditional Requests](https://tools.ietf.org/html/rfc7232)
- [Optimistic Concurrency Control](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [HTTP ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
- [docs/CONFLICT-RESOLUTION.md](../CONFLICT-RESOLUTION.md)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-11-01 | Initial optimistic locking implementation | TRAVI Team |
| 2024-12-01 | Added resolution options in conflict response | TRAVI Team |
