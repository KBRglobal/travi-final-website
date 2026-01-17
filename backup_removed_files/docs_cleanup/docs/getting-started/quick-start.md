# ⚡ Quick Start Guide

> Get Traviapp running in 5 minutes

---

## 🏃 TL;DR

```bash
git clone https://github.com/KBRglobal/Traviapp.git
cd Traviapp
npm install
cp .env.example .env
# Edit .env with DATABASE_URL and OPENAI_API_KEY
npm run db:push
npm run dev
```

Open http://localhost:5000

---

## Step 1: Clone & Install (1 min)

```bash
git clone https://github.com/KBRglobal/Traviapp.git
cd Traviapp
npm install
```

## Step 2: Configure (1 min)

```bash
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/traviapp
SESSION_SECRET=any-random-string-32-characters-min
OPENAI_API_KEY=sk-your-openai-key
```

## Step 3: Database (1 min)

```bash
# Create database
createdb traviapp

# Push schema
npm run db:push
```

## Step 4: Run (1 min)

```bash
npm run dev
```

## Step 5: Access (1 min)

Open http://localhost:5000

Login with admin credentials from `.env`

---

## 🎯 First Actions

### 1. Create Content

```
Dashboard → Content → New
```

Select type (Article, Attraction, Hotel, etc.)

### 2. Generate with AI

```
New Content → Generate with AI
```

Enter topic, click Generate

### 3. Publish

```
Content → Status → Published
```

---

## 🔗 Key URLs

| URL | Purpose |
|-----|---------|
| `/` | Public homepage |
| `/admin` | Admin dashboard |
| `/admin/contents` | Content management |
| `/admin/rss-feeds` | RSS feed manager |
| `/admin/newsletter` | Newsletter campaigns |

---

## 📚 Next Steps

- [Full Installation Guide](./installation.md)
- [Configuration Reference](./configuration.md)
- [API Documentation](../api/overview.md)
- [Feature Guides](../features/)
