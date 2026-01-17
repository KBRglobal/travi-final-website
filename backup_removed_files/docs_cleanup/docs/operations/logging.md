# 📝 Logging

> Application logging guide

---

## 📊 Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `error` | Errors requiring action | Database connection failed |
| `warn` | Potential issues | Slow query detected |
| `info` | Normal operations | User logged in |
| `debug` | Development details | Request payload |

---

## 📁 Log Sources

### Application Logs

```typescript
// Server-side logging
console.log('INFO: User logged in', { userId: 1 });
console.error('ERROR: Database connection failed', error);
```

### Audit Logs

Stored in `audit_logs` table:

```sql
SELECT * FROM audit_logs
WHERE action = 'content.create'
ORDER BY created_at DESC
LIMIT 10;
```

### Access Logs

- HTTP requests
- Response times
- Status codes
- User agents

---

## 🔍 Log Format

### Standard Format

```json
{
  "timestamp": "2024-12-23T00:00:00Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "userId": 1,
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Audit Log Format

```json
{
  "id": 1,
  "userId": 1,
  "action": "content.create",
  "entityType": "contents",
  "entityId": 42,
  "oldValues": null,
  "newValues": { "title": "New Article" },
  "ipAddress": "192.168.1.1",
  "createdAt": "2024-12-23T00:00:00Z"
}
```

---

## 🔧 Viewing Logs

### Replit Console

```bash
# View live logs
# Available in Replit console
```

### Database Audit Logs

```bash
# Via API
GET /api/audit-logs?limit=50

# Via SQL
psql $DATABASE_URL -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10"
```

### Filter Logs

```sql
-- By user
SELECT * FROM audit_logs WHERE user_id = 1;

-- By action
SELECT * FROM audit_logs WHERE action LIKE 'content.%';

-- By date range
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 day';
```

---

## 📊 Log Analysis

### Common Queries

```sql
-- Actions per user
SELECT user_id, COUNT(*)
FROM audit_logs
GROUP BY user_id
ORDER BY COUNT(*) DESC;

-- Actions per day
SELECT DATE(created_at), COUNT(*)
FROM audit_logs
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Most common actions
SELECT action, COUNT(*)
FROM audit_logs
GROUP BY action
ORDER BY COUNT(*) DESC;
```

---

## 🚨 Important Actions

Always log:

- Authentication events
- Content modifications
- User management
- Permission changes
- API errors
- Security events

---

## 🔒 Log Security

### Best Practices

- ❌ Don't log passwords
- ❌ Don't log API keys
- ❌ Don't log PII unnecessarily
- ✅ Hash sensitive IDs
- ✅ Rotate logs regularly
- ✅ Restrict access

---

## 📋 Log Retention

| Log Type | Retention |
|----------|-----------|
| Application | 30 days |
| Audit | 1 year |
| Security | 1 year |
| Access | 90 days |
