# 👥 User Roles & Permissions

> Role-based access control (RBAC)

---

## 📋 Role Hierarchy

```
Admin (5)
   │
   └── Editor (4)
          │
          └── Author (3)
                 │
                 └── Contributor (2)
                        │
                        └── Viewer (1)
```

---

## 🔐 Role Permissions

### Admin

**Full system access**

| Permission | Access |
|------------|--------|
| View content | ✅ All |
| Create content | ✅ |
| Edit content | ✅ All |
| Delete content | ✅ All |
| Publish content | ✅ |
| Manage users | ✅ |
| System settings | ✅ |
| View analytics | ✅ |
| AI generation | ✅ |

### Editor

**Manage all content**

| Permission | Access |
|------------|--------|
| View content | ✅ All |
| Create content | ✅ |
| Edit content | ✅ All |
| Delete content | ✅ All |
| Publish content | ✅ |
| Manage users | ❌ |
| System settings | ❌ |
| View analytics | ✅ |
| AI generation | ✅ |

### Author

**Manage own content**

| Permission | Access |
|------------|--------|
| View content | ✅ All |
| Create content | ✅ |
| Edit content | ✅ Own only |
| Delete content | ✅ Own only |
| Publish content | ❌ (submit for review) |
| Manage users | ❌ |
| System settings | ❌ |
| View analytics | ✅ Own |
| AI generation | ✅ |

### Contributor

**Create drafts only**

| Permission | Access |
|------------|--------|
| View content | ✅ Published |
| Create content | ✅ Drafts only |
| Edit content | ✅ Own drafts |
| Delete content | ❌ |
| Publish content | ❌ |
| Manage users | ❌ |
| System settings | ❌ |
| View analytics | ❌ |
| AI generation | Limited |

### Viewer

**Read-only access**

| Permission | Access |
|------------|--------|
| View content | ✅ Published |
| Create content | ❌ |
| Edit content | ❌ |
| Delete content | ❌ |
| Publish content | ❌ |
| Manage users | ❌ |
| System settings | ❌ |
| View analytics | ❌ |
| AI generation | ❌ |

---

## 🔧 Managing Users

### Create User

```bash
POST /api/users
{
  "username": "newuser",
  "email": "user@example.com",
  "role": "author",
  "password": "temporary-password"
}
```

### Update Role

```bash
PATCH /api/users/:id
{
  "role": "editor"
}
```

### Deactivate User

```bash
DELETE /api/users/:id
```

---

## 🔒 Security Features

### Two-Factor Authentication

Available for all roles:
- TOTP-based (Google Authenticator)
- Recovery codes
- Optional/required by admin

### Session Management

- Session-based auth
- Secure cookies
- Auto-expiry (24h)

### Audit Logging

All actions tracked:
- Who did what
- When
- From where (IP)

---

## 👤 User Management UI

### Admin Dashboard

1. Go to **Settings → Users**
2. View all users
3. Add/edit/remove users
4. Assign roles

### User Profile

Users can:
- Update profile
- Change password
- Enable 2FA
- View activity

---

## 🔌 API Endpoints

```bash
GET    /api/users              # List users (admin)
GET    /api/users/:id          # Get user
POST   /api/users              # Create user (admin)
PATCH  /api/users/:id          # Update user
DELETE /api/users/:id          # Delete user (admin)
GET    /api/user/permissions   # Current user permissions
GET    /api/roles              # List available roles
```

---

## 🎯 Best Practices

### Role Assignment

- Minimum required permissions
- Review roles regularly
- Document role decisions
- Require 2FA for admins

### User Onboarding

1. Create with temporary password
2. Assign appropriate role
3. Send welcome email
4. Require password change

---

## 📚 Related

- [Authentication API](../api/authentication.md)
- [Security Policy](../../SECURITY.md)
