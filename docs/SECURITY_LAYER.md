# Enterprise Security Layer Documentation

## Overview

The Enterprise Security Layer provides comprehensive security features for Traviapp CMS, including rate limiting, input validation, password security, file upload protection, and audit logging.

## Quick Start

The security layer is automatically initialized when the server starts. No additional configuration is required for basic functionality.

```typescript
import { setupSecurityMiddleware } from './security/index';

// Security middleware is automatically applied in server/index.ts
setupSecurityMiddleware(app);
```

## Rate Limiting

### Available Rate Limiters

```typescript
import { getRateLimiter } from './security/index';

// Apply to routes
app.post('/api/login', getRateLimiter('login'), loginHandler);
app.use('/api', getRateLimiter('api'));
app.post('/api/ai/generate', getRateLimiter('ai'), generateHandler);
app.use('/api', getRateLimiter('write')); // Auto-skips GET requests
```

### Rate Limits

- **Login**: 5 attempts per 15 minutes
- **API**: 100 requests per minute
- **AI**: 50 requests per hour
- **Write Operations**: 30 per minute

## Input Validation

### HTML Sanitization

```typescript
import { sanitizeHtml, sanitizeText } from './security/validators';

// Sanitize rich HTML content (uses whitelist)
const cleanHtml = sanitizeHtml(userInput);

// Escape text for display
const safeText = sanitizeText(userInput);
```

### URL Validation

```typescript
import { sanitizeUrl } from './security/validators';

const url = sanitizeUrl(userUrl);
if (!url) {
  throw new Error('Invalid URL');
}
```

### Attack Detection

```typescript
import { detectSqlInjection, detectXss } from './security/validators';

if (detectSqlInjection(input)) {
  // Log and block request
}

if (detectXss(input)) {
  // Log and block request
}
```

### Zod Schemas

```typescript
import { contentValidationSchema } from './security/validators';

const validatedContent = contentValidationSchema.parse({
  title: 'My Article',
  body: '<p>Content</p>',
  excerpt: 'Summary',
});
```

## Password Security

### Password Validation

```typescript
import { validatePasswordStrength } from './security/password-policy';

const result = validatePasswordStrength(password, [user.email, user.name]);
if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}
```

### Password Requirements

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Minimum strength score of 3/4 (zxcvbn)

### Account Lockout

```typescript
import {
  recordFailedLogin,
  isAccountLocked,
  clearFailedLogins,
} from './security/password-policy';

// Check if account is locked
const lockStatus = isAccountLocked(email);
if (lockStatus.locked) {
  return res.status(403).json({
    error: 'Account locked',
    remainingTime: lockStatus.remainingTime,
  });
}

// Record failed login
if (!validPassword) {
  recordFailedLogin(email);
}

// Clear on successful login
clearFailedLogins(email);
```

### Password Hashing

```typescript
import { hashPassword, verifyPassword } from './security/password-policy';

// Hash password
const hash = await hashPassword(password);

// Verify password
const valid = await verifyPassword(password, hash);
```

## File Upload Security

### Validate File Upload

```typescript
import { validateUploadedFile } from './security/file-upload';

const result = await validateUploadedFile(
  fileBuffer,
  filename,
  mimeType,
  maxSize
);

if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}

// Use the safe filename
const safeName = result.safeFilename;
```

### File Type Configuration

```typescript
import { ALLOWED_FILE_TYPES } from './security/file-upload';

// Images: JPEG, PNG, WebP, GIF (max 10MB)
// Documents: PDF (max 25MB)
```

## Security Audit Logging

### Log Security Events

```typescript
import {
  logSecurityEvent,
  logSecurityEventFromRequest,
  SecurityEventType,
} from './security/audit-logger';

// Log from request object
await logSecurityEventFromRequest(req, SecurityEventType.LOGIN_SUCCESS, {
  success: true,
  resource: 'user',
});

// Log manually
await logSecurityEvent({
  type: SecurityEventType.LOGIN_FAILED,
  severity: SecuritySeverity.MEDIUM,
  userId: user.id,
  ipAddress: req.ip,
  success: false,
  errorMessage: 'Invalid credentials',
});
```

### Security Event Types

- `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`
- `PASSWORD_CHANGE`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_SUCCESS`
- `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`
- `PERMISSION_DENIED`, `UNAUTHORIZED_ACCESS`
- `SQL_INJECTION_ATTEMPT`, `XSS_ATTEMPT`
- `FILE_UPLOAD_REJECTED`
- `BRUTE_FORCE_ATTEMPT`, `IP_BLOCKED`
- `RATE_LIMIT_EXCEEDED`
- And more...

### PII Masking

```typescript
import { maskPii } from './security/audit-logger';

const maskedEmail = maskPii('user@example.com', 'email'); // us***@example.com
const maskedPhone = maskPii('1234567890', 'phone'); // ***7890
const maskedIp = maskPii('192.168.1.100', 'ip'); // 192.168.1.***
```

### Get Security Statistics

```typescript
import { getSecuritySummary } from './security/audit-logger';

const summary = await getSecuritySummary('day');
console.log(summary.totalEvents);
console.log(summary.criticalEvents);
console.log(summary.failedLogins);
```

## Attack Detection Middleware

The attack detection middleware automatically checks all requests for:

- SQL injection patterns
- XSS patterns
- Malicious content

It's automatically applied to all routes and will return 400 Bad Request if an attack is detected.

## Best Practices

### 1. Always Validate Input

```typescript
// Bad
const content = req.body.content;
db.insert({ content });

// Good
import { sanitizeHtml } from './security/validators';
const content = sanitizeHtml(req.body.content);
db.insert({ content });
```

### 2. Use Rate Limiters on Sensitive Endpoints

```typescript
// Login endpoint
app.post('/api/login', getRateLimiter('login'), loginHandler);

// AI endpoints
app.post('/api/ai/generate', getRateLimiter('ai'), generateHandler);
```

### 3. Log Security Events

```typescript
// Always log security-relevant events
await logSecurityEventFromRequest(req, SecurityEventType.LOGIN_SUCCESS, {
  success: true,
});
```

### 4. Validate Files

```typescript
// Always validate uploaded files
const validation = await validateUploadedFile(buffer, filename, mimetype);
if (!validation.valid) {
  await logSecurityEventFromRequest(req, SecurityEventType.FILE_UPLOAD_REJECTED, {
    success: false,
    details: { errors: validation.errors },
  });
  return res.status(400).json({ errors: validation.errors });
}
```

### 5. Check Account Lockout

```typescript
// Check before authentication
const lockStatus = isAccountLocked(email);
if (lockStatus.locked) {
  return res.status(403).json({ error: 'Account locked' });
}
```

## Configuration

### Environment Variables

The security layer respects these environment variables:

- `NODE_ENV`: Set to `production` for stricter security
- `REPLIT_DEV_DOMAIN`: Automatically allowed origin

### Customization

To customize rate limits or other settings, modify the constants in the respective modules:

- `server/security/rate-limiter.ts`: Rate limit configurations
- `server/security/password-policy.ts`: Password policy settings
- `server/security/file-upload.ts`: File type and size limits
- `server/security/validators.ts`: Allowed HTML tags and attributes

## Troubleshooting

### Rate Limit Exceeded

If you're hitting rate limits during development:

1. Clear your IP from the rate limit store
2. Increase the limits in development mode
3. Use different IP addresses or user accounts

### File Upload Rejected

Common reasons:

1. File size exceeds limit
2. File type not allowed
3. MIME type mismatch
4. Malicious content detected

Check the validation errors for specific details.

### Account Locked

To unlock an account:

```typescript
import { clearFailedLogins } from './security/password-policy';
clearFailedLogins(email);
```

## Production Considerations

### 1. Use Redis for Rate Limiting

Replace in-memory stores with Redis for distributed deployments:

```typescript
import RedisStore from 'rate-limit-redis';

// In rate-limiter.ts
const store = new RedisStore({
  client: redisClient,
  prefix: 'rl:',
});
```

### 2. Monitor Security Events

Set up alerts for critical security events:

```typescript
const summary = await getSecuritySummary('hour');
if (summary.criticalEvents > 10) {
  // Alert security team
}
```

### 3. Regular Security Audits

Review security logs regularly:

```typescript
const events = await getSecurityEvents({
  severity: SecuritySeverity.CRITICAL,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});
```

## Support

For issues or questions:

1. Check the test files for usage examples
2. Review the inline documentation in source files
3. Contact the development team

## License

Part of Traviapp CMS - All rights reserved
