# 🎯 System Design

> Detailed technical design of Traviapp

---

## 🏛️ Design Principles

### 1. Monolithic Architecture
- Single deployable unit
- Simpler operations
- Easier debugging
- Suitable for current scale

### 2. Type Safety
- TypeScript throughout
- Shared types between frontend/backend
- Zod validation at boundaries

### 3. Convention over Configuration
- Predictable file structure
- Consistent naming
- Standard patterns

---

## 📁 Module Structure

### Frontend Modules

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND MODULES                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Pages     │  │  Components  │  │    Hooks     │      │
│  │   (Routes)   │  │     (UI)     │  │   (Logic)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                    ┌──────▼───────┐                         │
│                    │   API Client │                         │
│                    │  (TanStack)  │                         │
│                    └──────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Backend Modules

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND MODULES                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Routes    │  │  Middleware  │  │   Services   │      │
│  │   (HTTP)     │  │  (Security)  │  │  (Business)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                    ┌──────▼───────┐                         │
│                    │  Database    │                         │
│                    │  (Drizzle)   │                         │
│                    └──────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Design

### Schema Organization

```sql
-- Core content
contents          -- Base content entity
attractions       -- Type-specific fields
hotels
dining
districts
events
itineraries
articles
transports

-- Content extensions
translations      -- Multi-language
content_versions  -- History
content_views     -- Analytics
content_tags      -- Tagging

-- User management
users             -- User accounts
sessions          -- Auth sessions
audit_logs        -- Activity log

-- Features
rss_feeds         -- RSS sources
topic_clusters    -- AI clustering
newsletter_*      -- Email system
media_files       -- Media library
```

### Key Design Decisions

#### 1. JSONB for Flexible Content

```sql
contents.body_blocks JSONB
-- Stores structured content blocks
-- Allows flexible content types
-- Queryable with PostgreSQL operators
```

#### 2. Separate Translation Table

```sql
translations (
  content_id  -- Reference to content
  locale      -- Language code
  title       -- Translated title
  content     -- Translated body
)
-- Keeps base content clean
-- Efficient locale queries
```

#### 3. Version History

```sql
content_versions (
  content_id
  version_number
  data JSONB    -- Complete snapshot
  created_at
)
-- Full history of changes
-- Easy restore functionality
```

---

## 🔌 API Design

### REST Conventions

```
GET    /api/contents          # List
GET    /api/contents/:id      # Read
POST   /api/contents          # Create
PATCH  /api/contents/:id      # Update
DELETE /api/contents/:id      # Delete
```

### Response Format

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

---

## 🔐 Authentication Design

### Session Flow

```
1. User submits credentials
           │
           ▼
2. Server validates
   - Check password hash
   - Verify 2FA if enabled
           │
           ▼
3. Create session
   - Generate session ID
   - Store in PostgreSQL
   - Set secure cookie
           │
           ▼
4. Subsequent requests
   - Read session cookie
   - Validate session
   - Attach user to request
```

### Role Hierarchy

```
Admin
  └── Editor
        └── Author
              └── Contributor
                    └── Viewer
```

---

## 🤖 AI Integration Design

### Content Generation Flow

```
┌─────────────────────────────────────────┐
│         AI Generation Pipeline           │
├─────────────────────────────────────────┤
│                                          │
│  1. Request received                     │
│     - Type, topic, options               │
│              │                           │
│              ▼                           │
│  2. Prompt construction                  │
│     - System prompt                      │
│     - Content rules                      │
│     - User instructions                  │
│              │                           │
│              ▼                           │
│  3. API call                             │
│     - OpenAI GPT-4o (standard)           │
│     - Claude Sonnet (premium)            │
│              │                           │
│              ▼                           │
│  4. Response processing                  │
│     - Parse JSON blocks                  │
│     - Validate structure                 │
│     - Generate SEO data                  │
│              │                           │
│              ▼                           │
│  5. Save content                         │
│     - Store in database                  │
│     - Create version                     │
│     - Log action                         │
│                                          │
└─────────────────────────────────────────┘
```

### Content Rules Engine

```typescript
interface ContentRule {
  minWords: 1800;
  maxWords: 3500;
  minFaqs: 6;
  maxFaqs: 10;
  minInternalLinks: 5;
  keywordDensity: '1-3%';
  requiredSections: string[];
}
```

---

## 📧 Newsletter Design

### Campaign Flow

```
1. Create campaign
   - Subject, content, audience
           │
           ▼
2. Send triggered
   - Queue emails
   - Rate limit sending
           │
           ▼
3. Delivery
   - Resend API
   - Track status
           │
           ▼
4. Tracking
   - Open pixel
   - Click redirects
   - Webhook events
```

---

## 🔄 RSS Processing Design

### Auto-Processing Flow

```
┌─────────────────────────────────────────┐
│           RSS Processing                 │
├─────────────────────────────────────────┤
│                                          │
│  Every 30 minutes:                       │
│                                          │
│  1. Fetch all active feeds               │
│              │                           │
│              ▼                           │
│  2. Parse new items                      │
│     - Extract content                    │
│     - Generate fingerprint               │
│              │                           │
│              ▼                           │
│  3. Deduplication                        │
│     - Check fingerprints                 │
│     - Skip duplicates                    │
│              │                           │
│              ▼                           │
│  4. AI Clustering                        │
│     - Group similar articles             │
│     - Score relevance                    │
│              │                           │
│              ▼                           │
│  5. Available for merge/publish          │
│                                          │
└─────────────────────────────────────────┘
```

---

## 📈 Performance Design

### Caching Strategy

| Data Type | Cache Location | TTL |
|-----------|----------------|-----|
| Session | PostgreSQL | 24h |
| API responses | Redis | 5min |
| Static assets | CDN | 1 year |
| Translations | Redis | 1h |

### Database Optimization

- Indexes on frequently queried columns
- Connection pooling
- Query result caching
- Pagination for large datasets

---

## 🔮 Future Considerations

### Potential Improvements

1. **Microservices** - Split AI/Email into separate services
2. **Message Queue** - RabbitMQ/Redis for background jobs
3. **Search** - Elasticsearch for full-text search
4. **CDN** - Cloudflare for global distribution
5. **Monitoring** - Prometheus + Grafana
