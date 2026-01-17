# TRAVI CMS - GDPR API Documentation

## Overview

TRAVI CMS provides GDPR-compliant APIs for data export and deletion, supporting users' rights under the General Data Protection Regulation.

## Endpoints

### GET /api/gdpr/export/:userId

Export all data associated with a user.

**Authorization**: Admin or self (user can only export their own data)

**Response**: JSON file with all user data

```json
{
  "exportDate": "2025-01-15T10:30:00Z",
  "dataSubject": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "author",
    "createdAt": "2024-06-01T00:00:00Z"
  },
  "content": [
    {
      "id": "content-uuid",
      "type": "article",
      "title": "My Article",
      "status": "published",
      "createdAt": "2024-07-15T00:00:00Z"
    }
  ],
  "sessions": [
    {
      "loginAt": "2025-01-14T09:00:00Z",
      "ipHash": "a1b2c3...",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "consent": {
    "analytics": true,
    "marketing": false,
    "recordedAt": "2024-06-01T00:00:00Z"
  }
}
```

### DELETE /api/gdpr/delete/:userId

Delete user account and anonymize associated content.

**Authorization**: Admin only (users must request deletion through admin)

**Request Body** (optional):
```json
{
  "reason": "User requested account deletion",
  "anonymizeContent": true
}
```

**Response**:
```json
{
  "success": true,
  "deletedAt": "2025-01-15T10:30:00Z",
  "actions": {
    "userDeleted": true,
    "contentAnonymized": 15,
    "sessionsCleared": 3
  },
  "auditId": "audit-uuid"
}
```

### POST /api/gdpr/consent

Record user consent preferences.

**Authorization**: Authenticated user

**Request Body**:
```json
{
  "analytics": true,
  "marketing": false,
  "necessary": true
}
```

**Response**:
```json
{
  "success": true,
  "recordedAt": "2025-01-15T10:30:00Z",
  "preferences": {
    "analytics": true,
    "marketing": false,
    "necessary": true
  }
}
```

## Data Included in Export

| Category | Fields Included | Notes |
|----------|-----------------|-------|
| **User Profile** | id, email, name, role, createdAt | No password hash |
| **Content** | id, type, title, status, dates | Titles only, not full content |
| **Sessions** | login times, hashed IPs, user agents | IPs are hashed |
| **Consent** | preferences, timestamp | Current consent state |

## Anonymization Approach

When a user is deleted:

1. **User record**: Completely removed from database
2. **Content**: `authorId` changed to `"deleted-user"`, name anonymized
3. **Sessions**: Completely removed
4. **Audit logs**: User ID replaced with hash, preserved for compliance

### Example Anonymized Content

Before:
```json
{
  "id": "content-123",
  "title": "10 Best Hotels in Dubai",
  "authorId": "user-456",
  "authorName": "John Smith"
}
```

After anonymization:
```json
{
  "id": "content-123",
  "title": "10 Best Hotels in Dubai",
  "authorId": "deleted-user",
  "authorName": "Deleted User"
}
```

## Audit Logging

All GDPR operations are logged:

```json
{
  "auditId": "audit-uuid",
  "action": "gdpr_deletion",
  "targetUserId": "[HASH]",
  "performedBy": "admin-uuid",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "contentAnonymized": 15,
    "reason": "User requested"
  }
}
```

## Client Implementation

### Request Data Export

```typescript
async function requestDataExport(userId: string): Promise<Blob> {
  const response = await fetch(`/api/gdpr/export/${userId}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  return response.blob();
}

// Download as file
const blob = await requestDataExport(currentUser.id);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `my-data-${new Date().toISOString()}.json`;
a.click();
```

### Request Account Deletion

```typescript
async function requestAccountDeletion(
  userId: string, 
  reason: string
): Promise<void> {
  const response = await fetch(`/api/gdpr/delete/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, anonymizeContent: true }),
  });
  
  if (!response.ok) {
    throw new Error('Deletion failed');
  }
  
  // Redirect to goodbye page
  window.location.href = '/account-deleted';
}
```

## Compliance Notes

### Right to Access (Article 15)
- `/api/gdpr/export/:userId` provides complete data export
- Machine-readable JSON format

### Right to Erasure (Article 17)
- `/api/gdpr/delete/:userId` removes personal data
- Content preserved in anonymized form for public benefit
- Audit trail maintained for legal compliance

### Right to Data Portability (Article 20)
- Export format is standard JSON
- All personal data included in export

### Consent Management (Article 7)
- `/api/gdpr/consent` records explicit consent
- Consent can be withdrawn at any time
- Preference changes are logged

## Response Times

Per GDPR requirements:
- **Export requests**: Must be fulfilled within 30 days
- **Deletion requests**: Must be completed within 30 days
- **Consent changes**: Immediate effect

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | Cannot access other user's data |
| 404 | Not Found | User does not exist |
| 429 | Too Many Requests | Rate limited (1 export per day) |
