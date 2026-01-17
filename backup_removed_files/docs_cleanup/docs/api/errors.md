# 🚨 API Errors

> Error codes and handling guide

---

## 📋 Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [...]
  }
}
```

---

## 🔢 HTTP Status Codes

### 4xx Client Errors

| Code | Name | Description |
|------|------|-------------|
| `400` | Bad Request | Invalid request format |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource conflict |
| `422` | Unprocessable | Validation failed |
| `429` | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors

| Code | Name | Description |
|------|------|-------------|
| `500` | Internal Error | Server error |
| `502` | Bad Gateway | Upstream error |
| `503` | Service Unavailable | Maintenance |

---

## 📝 Error Codes

### Authentication Errors

| Code | Message | Solution |
|------|---------|----------|
| `UNAUTHORIZED` | Authentication required | Login first |
| `INVALID_CREDENTIALS` | Wrong username/password | Check credentials |
| `SESSION_EXPIRED` | Session timed out | Re-login |
| `2FA_REQUIRED` | Two-factor required | Provide TOTP code |
| `INVALID_TOTP` | Wrong 2FA code | Check code |

### Authorization Errors

| Code | Message | Solution |
|------|---------|----------|
| `FORBIDDEN` | Insufficient permissions | Contact admin |
| `NOT_OWNER` | Not content owner | Use own content |

### Validation Errors

| Code | Message | Details |
|------|---------|---------|
| `VALIDATION_ERROR` | Invalid input | Field-specific errors |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "title",
        "message": "Required"
      },
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Resource Errors

| Code | Message | Solution |
|------|---------|----------|
| `NOT_FOUND` | Resource not found | Check ID |
| `ALREADY_EXISTS` | Duplicate entry | Use different slug |
| `CONTENT_LOCKED` | Content locked by another user | Wait or force unlock |

### Rate Limit Errors

| Code | Message | Headers |
|------|---------|---------|
| `RATE_LIMITED` | Too many requests | Check X-RateLimit-Reset |

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

### AI/External Service Errors

| Code | Message | Solution |
|------|---------|----------|
| `AI_GENERATION_FAILED` | AI generation failed | Retry or simplify request |
| `TRANSLATION_FAILED` | Translation failed | Check language support |
| `EMAIL_SEND_FAILED` | Email delivery failed | Check email config |

---

## 🛠️ Error Handling

### JavaScript/TypeScript

```typescript
try {
  const response = await fetch('/api/contents', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();

    switch (error.error.code) {
      case 'VALIDATION_ERROR':
        // Handle validation
        break;
      case 'UNAUTHORIZED':
        // Redirect to login
        break;
      default:
        // Generic error
    }
  }
} catch (e) {
  // Network error
}
```

### React Query

```typescript
const { mutate } = useMutation({
  mutationFn: createContent,
  onError: (error) => {
    if (error.code === 'VALIDATION_ERROR') {
      setErrors(error.details);
    } else {
      toast.error(error.message);
    }
  }
});
```

---

## 🔄 Retry Logic

### When to Retry

| Error | Retry? | Backoff |
|-------|--------|---------|
| `429` | Yes | Exponential |
| `500` | Yes | 3 attempts |
| `502/503` | Yes | 3 attempts |
| `400` | No | - |
| `401` | No | - |
| `403` | No | - |
| `404` | No | - |

### Example Retry

```typescript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await sleep(parseInt(retryAfter) * 1000);
        continue;
      }

      if (response.status >= 500) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }

      return response; // Client error, don't retry
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## 📊 Common Scenarios

### Invalid Content Creation

```bash
POST /api/contents
{
  "type": "invalid_type"
}

# Response 422
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "type",
        "message": "Must be one of: article, attraction, hotel, ..."
      }
    ]
  }
}
```

### AI Generation Limit

```bash
POST /api/ai/generate-article
# After 10 requests/minute

# Response 429
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "AI generation rate limit exceeded",
    "retryAfter": 45
  }
}
```
