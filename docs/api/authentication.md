# 🔐 Authentication

> API authentication guide

---

## 🔑 Authentication Methods

### 1. Session-Based (Primary)

```bash
# Login
POST /api/auth/login
{
  "username": "admin",
  "password": "your-password"
}

# Response
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
# + Set-Cookie: connect.sid=...
```

### 2. Replit OAuth (Optional)

```bash
# Redirect to Replit login
GET /__replit/login

# Callback handles session creation
```

---

## 🛡️ Two-Factor Authentication (2FA)

### Setup 2FA

```bash
# Get setup data
POST /api/totp/setup

# Response
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "recoveryCodes": ["abc123", "def456", ...]
}
```

### Verify Setup

```bash
POST /api/totp/verify
{
  "code": "123456"
}
```

### Login with 2FA

```bash
# Step 1: Normal login
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

# Response (2FA required)
{
  "requiresTwoFactor": true,
  "userId": 1
}

# Step 2: Validate TOTP
POST /api/totp/validate
{
  "userId": 1,
  "code": "123456"
}
```

### Recovery Codes

```bash
POST /api/totp/validate-recovery
{
  "userId": 1,
  "recoveryCode": "abc123"
}
```

---

## 👤 User Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `admin` | 5 | Full access |
| `editor` | 4 | Manage all content |
| `author` | 3 | Create/edit own content |
| `contributor` | 2 | Create drafts |
| `viewer` | 1 | Read only |

### Check Permissions

```bash
GET /api/user/permissions

# Response
{
  "role": "editor",
  "permissions": {
    "canCreate": true,
    "canEdit": true,
    "canPublish": true,
    "canDelete": false,
    "canManageUsers": false
  }
}
```

---

## 🔄 Session Management

### Get Current User

```bash
GET /api/auth/user

# Response
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "email": "admin@example.com"
}
```

### Logout

```bash
POST /api/auth/logout

# Clears session cookie
```

### Session Duration

- Default: 24 hours
- Stored in PostgreSQL
- Secure, HTTP-only cookies

---

## 🚫 Authorization Errors

### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Causes:**
- Missing session cookie
- Expired session
- Invalid session

### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**Causes:**
- Role lacks required permission
- Accessing another user's content (for authors)

---

## 🔒 Security Features

### Rate Limiting

```
Authentication endpoints: 5 requests/minute
```

### IP Blocking

- 10 failed attempts = temporary block
- Blocks logged in audit_logs

### Audit Logging

All auth events logged:
- Login attempts
- Logout
- 2FA setup/verify
- Password changes

---

## 📝 Best Practices

1. **Use HTTPS** in production
2. **Enable 2FA** for admin accounts
3. **Rotate sessions** regularly
4. **Review audit logs** for suspicious activity
5. **Use strong passwords** (12+ characters)

---

## 🔧 Troubleshooting

### "Authentication required" after login

1. Check cookies are enabled
2. Verify SESSION_SECRET is set
3. Check for CORS issues

### "Invalid credentials"

1. Verify username in .env
2. Regenerate password hash
3. Check for trailing spaces

### 2FA not working

1. Check device time is synced
2. Try recovery code
3. Contact admin to reset
