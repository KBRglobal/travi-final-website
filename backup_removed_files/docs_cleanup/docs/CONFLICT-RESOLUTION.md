# TRAVI CMS - Conflict Resolution

## Overview

TRAVI CMS uses optimistic locking to prevent data loss when multiple users edit the same content simultaneously.

## How It Works

### ETag-Based Versioning

1. **Read**: When you fetch content, the response includes an `ETag` header
2. **Write**: Send the ETag in the `If-Match` header when updating
3. **Conflict**: If the content changed since you read it, you get a 409 error

### Example Flow

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

## Client Implementation

### JavaScript/TypeScript

```typescript
// Fetch content and get ETag
const response = await fetch('/api/contents/123');
const content = await response.json();
const etag = response.headers.get('ETag');

// Update with version check
const updateResponse = await fetch('/api/contents/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'If-Match': etag, // Send the ETag
  },
  body: JSON.stringify(updatedContent),
});

if (updateResponse.status === 409) {
  // Handle conflict
  const conflict = await updateResponse.json();
  console.log('Conflict detected:', conflict.message);
  // Show user options: refresh, force save, or merge
}
```

### React Query Integration

```typescript
const updateContent = useMutation({
  mutationFn: async ({ id, data, etag }) => {
    const res = await fetch(`/api/contents/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': etag,
      },
      body: JSON.stringify(data),
    });
    
    if (res.status === 409) {
      const conflict = await res.json();
      throw new ConflictError(conflict);
    }
    
    return res.json();
  },
  onError: (error) => {
    if (error instanceof ConflictError) {
      // Show conflict resolution dialog
      showConflictDialog(error.data);
    }
  },
});
```

## Conflict Response Format

When a conflict occurs, the server returns:

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

## Resolution Options

### 1. Refresh (Recommended)

Discard local changes and reload the latest version.

```typescript
// Fetch fresh content
const fresh = await fetch(conflict.resolution.refreshUrl);
const content = await fresh.json();
// Re-apply user's changes if possible
```

### 2. Force Save

Override the server version with local changes. Use with caution.

```typescript
// Remove If-Match header to bypass check
const res = await fetch(`/api/contents/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(localData),
});
```

### 3. Merge (Advanced)

Show both versions and let user manually merge changes.

```typescript
// Fetch both versions
const serverVersion = await fetch(`/api/contents/${id}`).then(r => r.json());
const localVersion = getLocalDraft();

// Show diff UI for manual merge
showMergeDialog({
  server: serverVersion,
  local: localVersion,
  onMerge: (merged) => saveContent(merged),
});
```

## Best Practices

1. **Always send If-Match** when updating content
2. **Store ETag** alongside content in your state
3. **Handle 409 gracefully** with user-friendly messaging
4. **Auto-refresh option** for non-critical changes
5. **Warn before force save** to prevent data loss

## Headers Reference

| Header | Direction | Description |
|--------|-----------|-------------|
| `ETag` | Response | Current version token |
| `If-Match` | Request | Expected version token |
| `Last-Modified` | Response | Last update timestamp |

## Backward Compatibility

If no `If-Match` header is sent, the update proceeds without version checking. This maintains backward compatibility with older clients but loses conflict protection.
