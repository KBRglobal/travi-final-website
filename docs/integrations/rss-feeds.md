# 📰 RSS Feeds Integration

> Automated content aggregation from RSS feeds

---

## 📋 Overview

Traviapp aggregates content from multiple RSS sources:
- Auto-fetch every 30 minutes
- AI-powered topic clustering
- Content deduplication
- Smart merging for publishing

---

## 🔧 Features

### Feed Management

- Add/remove RSS sources
- Category organization
- Active/inactive toggle
- Fetch history

### Auto-Processing

- Scheduled fetching
- Content extraction
- Fingerprint deduplication
- AI clustering

---

## 🔌 Usage

### Add Feed

```bash
POST /api/rss-feeds
{
  "name": "Dubai News",
  "url": "https://example.com/feed.xml",
  "category": "news",
  "isActive": true
}
```

### List Feeds

```bash
GET /api/rss-feeds
```

### Fetch Feed

```bash
POST /api/rss-feeds/:id/fetch
```

---

## 🔄 Processing Flow

```
1. Fetch RSS XML
       │
       ▼
2. Parse items
       │
       ▼
3. Generate fingerprint
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
7. Ready for review
```

---

## 🧠 Topic Clustering

### How It Works

1. AI analyzes article content
2. Groups similar articles
3. Assigns relevance score
4. Creates cluster summary

### Cluster Actions

| Action | Description |
|--------|-------------|
| Merge | Combine into single article |
| Publish | Publish best article |
| Dismiss | Skip cluster |
| Delete | Remove cluster |

---

## 📊 API Endpoints

### Feeds

```bash
GET    /api/rss-feeds           # List feeds
POST   /api/rss-feeds           # Add feed
PATCH  /api/rss-feeds/:id       # Update feed
DELETE /api/rss-feeds/:id       # Remove feed
POST   /api/rss-feeds/:id/fetch # Fetch now
```

### Clusters

```bash
GET    /api/topic-clusters            # List clusters
GET    /api/topic-clusters/:id        # Get cluster
POST   /api/topic-clusters/:id/merge  # Merge articles
POST   /api/topic-clusters/:id/dismiss
DELETE /api/topic-clusters/:id
```

---

## 🔧 Configuration

### Fetch Interval

```typescript
// Default: 30 minutes
const FETCH_INTERVAL = 30 * 60 * 1000;
```

### Deduplication

```typescript
// Content fingerprinting
function generateFingerprint(content) {
  // Normalize text
  // Remove common words
  // Generate hash
}
```

---

## 📋 Feed Requirements

### Supported Formats

- RSS 2.0
- Atom
- RSS 1.0

### Required Fields

- Title
- Link
- Description/Content

### Optional Fields

- Published date
- Author
- Categories
- Media

---

## 🔧 Troubleshooting

### Feed Not Fetching

1. Check URL is accessible
2. Verify valid RSS/Atom format
3. Check for rate limiting
4. Review fetch logs

### Duplicates Appearing

1. Check fingerprint logic
2. Verify content similarity threshold
3. Clear old fingerprints

### Clustering Issues

1. Review cluster threshold
2. Check AI API connectivity
3. Verify content language

---

## 📚 Related

- [Content Management](../features/content-management.md)
- [AI Generation](../features/ai-generation.md)
