# 🗄️ Database Schema

> Complete database schema documentation

---

## 📊 Overview

| Category | Tables |
|----------|--------|
| Content | 10 |
| Users | 4 |
| Translation | 2 |
| Newsletter | 4 |
| Media | 3 |
| Enterprise | 8 |
| RSS | 3 |
| SEO | 4 |
| Settings | 3 |
| **Total** | **45+** |

---

## 📝 Core Content Tables

### contents

Base table for all content types.

```sql
CREATE TABLE contents (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  type            content_type NOT NULL,
  status          content_status DEFAULT 'draft',
  body            TEXT,
  body_blocks     JSONB,
  excerpt         TEXT,
  featured_image  VARCHAR(500),
  seo_title       VARCHAR(255),
  seo_description TEXT,
  seo_keywords    TEXT[],
  author_id       INTEGER REFERENCES users(id),
  published_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Content Types

| Type | Description |
|------|-------------|
| `article` | Blog posts, guides |
| `attraction` | Tourist attractions |
| `hotel` | Hotel listings |
| `dining` | Restaurants, cafes |
| `district` | Area guides |
| `event` | Event listings |
| `itinerary` | Travel packages |
| `transport` | Transport guides |

### attractions

```sql
CREATE TABLE attractions (
  id              SERIAL PRIMARY KEY,
  content_id      INTEGER REFERENCES contents(id),
  category        VARCHAR(100),
  location        VARCHAR(255),
  opening_hours   JSONB,
  ticket_prices   JSONB,
  contact_info    JSONB,
  coordinates     POINT
);
```

### hotels

```sql
CREATE TABLE hotels (
  id              SERIAL PRIMARY KEY,
  content_id      INTEGER REFERENCES contents(id),
  star_rating     INTEGER,
  location        VARCHAR(255),
  amenities       TEXT[],
  room_types      JSONB,
  price_range     VARCHAR(50),
  booking_url     VARCHAR(500)
);
```

### articles

```sql
CREATE TABLE articles (
  id              SERIAL PRIMARY KEY,
  content_id      INTEGER REFERENCES contents(id),
  personality     VARCHAR(50),
  word_count      INTEGER,
  reading_time    INTEGER,
  category        VARCHAR(100)
);
```

---

## 👤 User Tables

### users

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(100) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE,
  password_hash   VARCHAR(255),
  role            user_role DEFAULT 'viewer',
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  avatar_url      VARCHAR(500),
  totp_secret     VARCHAR(255),
  totp_enabled    BOOLEAN DEFAULT FALSE,
  recovery_codes  TEXT[],
  last_login      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Roles: admin, editor, author, contributor, viewer
```

### sessions

```sql
CREATE TABLE sessions (
  sid             VARCHAR PRIMARY KEY,
  sess            JSONB NOT NULL,
  expire          TIMESTAMP NOT NULL
);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50),
  entity_id       INTEGER,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 🌐 Translation Tables

### translations

```sql
CREATE TABLE translations (
  id              SERIAL PRIMARY KEY,
  content_id      INTEGER REFERENCES contents(id),
  locale          locale_enum NOT NULL,
  title           VARCHAR(255),
  body            TEXT,
  body_blocks     JSONB,
  seo_title       VARCHAR(255),
  seo_description TEXT,
  is_manual       BOOLEAN DEFAULT FALSE,
  translated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_id, locale)
);
```

### Supported Locales

```sql
CREATE TYPE locale_enum AS ENUM (
  'en', 'ar', 'zh', 'ru', 'hi', 'fr', 'de',
  'fa', 'bn', 'fil', 'es', 'tr', 'it',
  'ja', 'ko', 'he', 'ur'
);
```

---

## 📧 Newsletter Tables

### newsletter_subscribers

```sql
CREATE TABLE newsletter_subscribers (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  status          subscriber_status DEFAULT 'pending',
  confirm_token   VARCHAR(255),
  preferences     JSONB,
  subscribed_at   TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### newsletter_campaigns

```sql
CREATE TABLE newsletter_campaigns (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  content         TEXT NOT NULL,
  status          campaign_status DEFAULT 'draft',
  sent_count      INTEGER DEFAULT 0,
  open_count      INTEGER DEFAULT 0,
  click_count     INTEGER DEFAULT 0,
  scheduled_at    TIMESTAMP,
  sent_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 📰 RSS Tables

### rss_feeds

```sql
CREATE TABLE rss_feeds (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  category        VARCHAR(100),
  is_active       BOOLEAN DEFAULT TRUE,
  last_fetched    TIMESTAMP,
  fetch_interval  INTEGER DEFAULT 30,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### topic_clusters

```sql
CREATE TABLE topic_clusters (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255),
  summary         TEXT,
  relevance_score DECIMAL(3,2),
  status          cluster_status DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 🖼️ Media Tables

### media_files

```sql
CREATE TABLE media_files (
  id              SERIAL PRIMARY KEY,
  filename        VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255),
  mime_type       VARCHAR(100),
  size            INTEGER,
  url             VARCHAR(500) NOT NULL,
  alt_text        VARCHAR(255),
  alt_text_he     VARCHAR(255),
  width           INTEGER,
  height          INTEGER,
  uploaded_by     INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 🏢 Enterprise Tables

### teams

```sql
CREATE TABLE teams (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### workflow_templates

```sql
CREATE TABLE workflow_templates (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  steps           JSONB NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### content_locks

```sql
CREATE TABLE content_locks (
  id              SERIAL PRIMARY KEY,
  content_id      INTEGER REFERENCES contents(id),
  user_id         INTEGER REFERENCES users(id),
  locked_at       TIMESTAMP DEFAULT NOW(),
  expires_at      TIMESTAMP
);
```

---

## 🔗 Relationships

```
users ─────────┬───── contents (author)
               ├───── audit_logs
               ├───── media_files
               └───── content_locks

contents ──────┬───── translations
               ├───── content_versions
               ├───── content_tags
               ├───── content_views
               └───── attractions/hotels/articles (type-specific)

rss_feeds ─────┬───── topic_clusters
               └───── topic_cluster_items

campaigns ─────┬───── campaign_events
               └───── subscribers (through sends)
```

---

## 📈 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_contents_type ON contents(type);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_slug ON contents(slug);
CREATE INDEX idx_contents_created ON contents(created_at DESC);

CREATE INDEX idx_translations_content ON translations(content_id);
CREATE INDEX idx_translations_locale ON translations(locale);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

## 🔄 Migrations

Managed via Drizzle Kit:

```bash
# Generate migration
npm run db:generate

# Push changes
npm run db:push

# View status
npm run db:studio
```
