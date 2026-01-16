# ⚙️ Configuration Guide

> Complete guide to configuring Traviapp

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/traviapp` |
| `SESSION_SECRET` | Session encryption key | Random 32+ chars |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

### Authentication

```bash
# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>

# Replit Auth (optional)
ISSUER_URL=https://replit.com
REPLIT_IDENTITY=<identity-token>
```

### AI Services

```bash
# OpenAI (required)
OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=  # Optional custom endpoint

# Anthropic Claude (premium content)
ANTHROPIC_API_KEY=sk-ant-...

# Image generation
REPLICATE_API_KEY=...
FREEPIK_API_KEY=...
```

### Translation

```bash
DEEPL_API_KEY=your-deepl-key
```

**Supported Languages via DeepL:**
- English, Arabic, Chinese, Russian, French
- German, Spanish, Turkish, Italian, Japanese, Korean

**Fallback to Claude Haiku:**
- Hindi, Urdu, Bengali, Persian, Filipino, Hebrew

### Email (Resend)

```bash
RESEND_API_KEY=re_...
LEAD_NOTIFICATION_EMAIL=admin@example.com
```

### Storage

```bash
DEFAULT_OBJECT_STORAGE_BUCKET_ID=<bucket-id>
OBJECT_STORAGE_URL=<storage-url>
```

### Cache (Upstash Redis)

```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Security (CAPTCHA)

Choose one:

```bash
# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=...
RECAPTCHA_SITE_KEY=...

# hCaptcha
HCAPTCHA_SECRET_KEY=...

# Cloudflare Turnstile
TURNSTILE_SECRET_KEY=...
```

### Server

```bash
PORT=5000
NODE_ENV=development  # or production
```

---

## 📁 Configuration Files

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  }
}
```

### Vite (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/public',
    sourcemap: true
  }
})
```

### Tailwind (`tailwind.config.ts`)

```typescript
export default {
  content: ['./client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Custom theme
    }
  },
  plugins: [typography]
}
```

### Drizzle (`drizzle.config.ts`)

```typescript
export default {
  schema: './shared/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL
  }
}
```

---

## 🎛️ Application Settings

Settings stored in `site_settings` table:

| Setting | Type | Default |
|---------|------|---------|
| `site_name` | string | Traviapp |
| `default_locale` | string | en |
| `items_per_page` | number | 20 |
| `enable_ai` | boolean | true |
| `enable_translation` | boolean | true |

Access via API:
```
GET /api/settings
POST /api/settings/bulk
```

---

## 🔒 Security Configuration

### Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5/min |
| API | 100/min |
| Newsletter | 2/min |
| AI Generation | 10/min |

### CORS

Configured in `server/security.ts`:

```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
})
```

### CSP Headers

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
```

---

## 🌐 Multi-Language Setup

### Supported Locales

```typescript
const locales = [
  'en', 'ar', 'zh', 'ru', 'hi', 'fr', 'de',
  'fa', 'bn', 'fil', 'es', 'tr', 'it',
  'ja', 'ko', 'he', 'ur'
]
```

### Adding New Language

1. Add to `localeEnum` in schema
2. Create translation file in `client/src/locales/`
3. Add to DeepL/Claude mapping

---

## 📊 Logging Configuration

### Log Levels

```bash
LOG_LEVEL=info  # debug, info, warn, error
```

### Audit Logging

All actions logged to `audit_logs` table:
- User actions
- Content changes
- Authentication events
- API requests

---

## ✅ Configuration Checklist

- [ ] Database URL set
- [ ] Session secret generated
- [ ] OpenAI API key added
- [ ] Admin credentials configured
- [ ] Email service configured (optional)
- [ ] Translation API configured (optional)
- [ ] Storage configured (optional)
- [ ] Cache configured (optional)
