# Third-Party Integrations | שילובי צד שלישי

> Documentation for all external services used by TRAVI CMS

---

## Table of Contents | תוכן עניינים

- [AI Providers | ספקי בינה מלאכותית](#ai-providers--ספקי-בינה-מלאכותית)
- [Email Service | שירות דוא"ל](#email-service--שירות-דואל)
- [Translation Service | שירות תרגום](#translation-service--שירות-תרגום)
- [RSS Feeds | הזנות RSS](#rss-feeds--הזנות-rss)
- [Object Storage | אחסון אובייקטים](#object-storage--אחסון-אובייקטים)
- [Support Contacts | אנשי קשר לתמיכה](#support-contacts--אנשי-קשר-לתמיכה)

---

## AI Providers | ספקי בינה מלאכותית

TRAVI uses a multi-provider AI system with automatic failover for content generation.

### Provider Priority Order

| Priority | Provider | Model | Purpose |
|----------|----------|-------|---------|
| 1 | Anthropic | claude-sonnet-4-5 | Primary content generation |
| 2 | OpenRouter | anthropic/claude-3.5-sonnet | Fallback with broad model access |
| 3 | DeepSeek | deepseek-chat | Cost-effective fallback |
| 4 | OpenAI | gpt-4o-mini | Final fallback |
| - | Gemini | *Disabled* | Incompatible with Replit AI Integrations |
| 5 | Replit AI | gpt-4o-mini | Free tier via Replit Integrations |

### Anthropic (Primary)

**Purpose**: Primary AI provider for content generation, SEO optimization, and article writing.

**Configuration**:
```bash
AI_INTEGRATIONS_ANTHROPIC_API_KEY=<managed by Replit>
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=<managed by Replit>
```

**Rate Limits**:
| Tier | Requests/min | Tokens/min |
|------|--------------|------------|
| API | 50 | 40,000 |

**SLA Expectations**:
- Response Time: < 30s for typical content generation
- Availability: 99.9% uptime

**Fallback Strategy**: Automatic failover to OpenRouter if request fails.

**Credential Rotation**: Managed by Replit AI Integrations (automatic).

---

### OpenRouter

**Purpose**: Secondary provider with access to multiple models including Claude.

**Configuration**:
```bash
OPENROUTER_API_KEY=<your-key>
# Alternative: openrouterapi (secret) or travisite
```

**Rate Limits**:
| Limit | Value |
|-------|-------|
| Requests/min | Varies by model |
| Concurrent | 10 |

**SLA Expectations**:
- Response Time: < 45s
- Availability: 99.5% uptime

**Fallback Strategy**: Automatic failover to DeepSeek.

**Credential Rotation**: Every 90 days recommended.

---

### DeepSeek

**Purpose**: Cost-effective AI provider for bulk operations.

**Configuration**:
```bash
DEEPSEEK_API_KEY=<your-key>
```

**Rate Limits**:
| Limit | Value |
|-------|-------|
| max_tokens | 8,192 |
| Requests/min | 60 |

**SLA Expectations**:
- Response Time: < 60s
- Availability: 99% uptime

**Fallback Strategy**: Automatic failover to OpenAI.

**Credential Rotation**: Every 90 days recommended.

---

### OpenAI

**Purpose**: Final fallback provider with proven reliability.

**Configuration**:
```bash
OPENAI_API_KEY=<your-key>
# Or: AI_INTEGRATIONS_OPENAI_API_KEY (managed by Replit)
```

**Rate Limits**:
| Tier | Requests/min | Tokens/min |
|------|--------------|------------|
| Free | 3 | 40,000 |
| Tier 1 | 500 | 200,000 |

**SLA Expectations**:
- Response Time: < 30s
- Availability: 99.9% uptime

**Fallback Strategy**: None (final provider in chain).

**Credential Rotation**: Every 90 days recommended.

---

## Email Service | שירות דוא"ל

### Resend

**Purpose**: Transactional and marketing email delivery.

**Use Cases**:
- Newsletter campaigns
- Subscription confirmations
- Lead notifications
- System alerts

**Configuration**:
```bash
RESEND_API_KEY=re_your-api-key
LEAD_NOTIFICATION_EMAIL=admin@example.com
```

**Rate Limits**:
| Limit | Value |
|-------|-------|
| Emails/second | 10 |
| Batch size | 100 |

**Pricing**:
| Plan | Emails/Month | Price |
|------|--------------|-------|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20/month |
| Scale | Unlimited | Custom |

**SLA Expectations**:
- Delivery Rate: > 98%
- Response Time: < 2s API response
- Availability: 99.9% uptime

**Fallback Strategy**: Queue emails and retry with exponential backoff. No secondary email provider configured.

**Credential Rotation**: Every 90 days recommended.

**Webhook Events**:
| Event | Description |
|-------|-------------|
| `email.sent` | Email sent successfully |
| `email.delivered` | Email delivered to recipient |
| `email.opened` | Email opened (tracking pixel) |
| `email.clicked` | Link clicked |
| `email.bounced` | Email bounced |

---

## Translation Service | שירות תרגום

### DeepL

**Purpose**: High-quality content translation for internationalization.

**Configuration**:
```bash
DEEPL_API_KEY=your-deepl-api-key
```

**Supported Languages (DeepL)**:
| Code | Language |
|------|----------|
| ar | Arabic |
| zh | Chinese |
| ru | Russian |
| fr | French |
| de | German |
| es | Spanish |
| tr | Turkish |
| it | Italian |
| ja | Japanese |
| ko | Korean |
| en | English |

**Claude Fallback Languages**:
| Code | Language |
|------|----------|
| hi | Hindi |
| ur | Urdu |
| bn | Bengali |
| fa | Persian |
| fil | Filipino |
| he | Hebrew |

**Rate Limits**:
| Limit | Value |
|-------|-------|
| Requests/second | 5 |
| Characters/request | 128,000 |

**Pricing**:
| Plan | Characters/Month | Price |
|------|------------------|-------|
| Free | 500,000 | $0 |
| Pro | Unlimited | $25/month + $20/1M chars |

**SLA Expectations**:
- Response Time: < 5s per request
- Translation Quality: Professional grade
- Availability: 99.9% uptime

**Fallback Strategy**: Automatic fallback to Claude AI for unsupported languages (Hindi, Urdu, Bengali, Persian, Filipino, Hebrew).

**Credential Rotation**: Every 90 days recommended.

---

## RSS Feeds | הזנות RSS

**Purpose**: Automated content aggregation from news and travel sources.

### Configuration

**Fetch Interval**: Every 30 minutes

**Supported Formats**:
- RSS 2.0
- Atom
- RSS 1.0

### Processing Pipeline

```
1. Fetch RSS XML
       │
       ▼
2. Parse items
       │
       ▼
3. Generate fingerprint (deduplication)
       │
       ▼
4. Check duplicates
       │
       ▼
5. Store new items
       │
       ▼
6. AI clustering
       │
       ▼
7. Ready for editorial review
```

### Feed Management

| Feature | Description |
|---------|-------------|
| Add/Remove | Dynamic feed management |
| Categories | Organize by topic |
| Active/Inactive | Toggle feed processing |
| History | Track fetch results |

**Rate Limits**: Configurable per feed source. Default politeness delay: 1 second between requests to same domain.

**SLA Expectations**:
- Fetch Success Rate: > 95%
- Processing Delay: < 5 minutes from fetch to availability
- Deduplication Accuracy: > 99%

**Fallback Strategy**: Skip failed feeds and continue with others. Retry failed feeds on next interval.

---

## Object Storage | אחסון אובייקטים

### Replit Object Storage

**Purpose**: Media file storage for images, documents, and uploads.

**Configuration**:
```bash
DEFAULT_OBJECT_STORAGE_BUCKET_ID=<managed by Replit>
```

**Use Cases**:
- Hero images
- Article media
- User uploads
- AI-generated images
- Document attachments

**Features**:
- Automatic CDN distribution
- Secure access controls
- Unlimited storage (usage-based pricing)

**Rate Limits**:
| Operation | Limit |
|-----------|-------|
| Uploads/minute | 100 |
| Max file size | 100MB |

**SLA Expectations**:
- Availability: 99.9% uptime
- Upload Response: < 5s for typical images
- Download Response: < 500ms (CDN cached)

**Fallback Strategy**: Local filesystem fallback for development. No secondary object storage configured for production.

**Credential Rotation**: Managed by Replit (automatic).

---

## Internal Rate Limiting | הגבלת קצב פנימית

TRAVI implements rate limiting to protect against abuse:

### Endpoint Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Login | 5 requests | 15 minutes |
| General API | 100 requests | 1 minute |
| AI Endpoints | 50 requests | 1 hour |
| Write Operations | 30 requests | 1 minute |

### Rate Limit Response

```json
{
  "error": "Too many requests from this IP, please try again later"
}
```

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time when limit resets

---

## Support Contacts | אנשי קשר לתמיכה

### Provider Support

| Provider | Support URL | Response Time |
|----------|-------------|---------------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | 24-48 hours |
| OpenAI | [help.openai.com](https://help.openai.com) | 24-48 hours |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | 24-48 hours |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | 24-48 hours |
| Resend | [resend.com/support](https://resend.com/support) | 24 hours |
| DeepL | [support.deepl.com](https://support.deepl.com) | 24-48 hours |
| Replit | [replit.com/support](https://replit.com/support) | 24 hours |

### Internal Escalation

For production issues:
1. Check provider status pages
2. Review application logs
3. Escalate to engineering team
4. Engage provider support if needed

---

## Credential Rotation Schedule | לוח זמנים לסיבוב אישורים

| Service | Rotation Interval | Last Rotation | Next Due |
|---------|-------------------|---------------|----------|
| Anthropic | Automatic (Replit) | - | - |
| OpenRouter | 90 days | Manual | Check secrets |
| DeepSeek | 90 days | Manual | Check secrets |
| OpenAI | 90 days | Manual | Check secrets |
| Resend | 90 days | Manual | Check secrets |
| DeepL | 90 days | Manual | Check secrets |
| Object Storage | Automatic (Replit) | - | - |

---

## Related Documentation | תיעוד קשור

- [SLA Definitions](./SLA-DEFINITIONS.md)
- [Incident Playbook](./INCIDENT-PLAYBOOK.md)
- [Security Documentation](./SECURITY.md)
- [Runbook](./RUNBOOK.md)
