# 🔧 Installation Guide

> Step-by-step guide to install Traviapp

---

## 📋 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime |
| PostgreSQL | 16+ | Database |
| npm | 9+ | Package manager |
| Git | 2.0+ | Version control |

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| Storage | 1 GB | 5 GB |
| CPU | 2 cores | 4 cores |

---

## 🚀 Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/KBRglobal/Traviapp.git
cd Traviapp
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs ~150 packages including:
- React 18 & Vite
- Express & TypeScript
- Drizzle ORM
- Radix UI components

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/traviapp
SESSION_SECRET=your-random-secret-min-32-chars
OPENAI_API_KEY=sk-your-openai-key

# Optional but recommended
DEEPL_API_KEY=your-deepl-key
RESEND_API_KEY=re_your-resend-key
```

### Step 4: Setup Database

```bash
# Create database
createdb traviapp

# Push schema
npm run db:push
```

### Step 5: Create Admin User

The first user is created via environment variables:

```bash
# In .env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$(npx bcrypt-cli hash 'your-password' 10)
```

### Step 6: Start Development Server

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

---

## ✅ Verify Installation

### Check Backend

```bash
curl http://localhost:5000/api/health
# Should return: {"status": "ok"}
```

### Check Frontend

Open browser to `http://localhost:5000`
- Should see login page
- No console errors

### Check Database

```bash
npm run db:push
# Should complete without errors
```

---

## 🐳 Docker Installation (Alternative)

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/traviapp
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=traviapp
      - POSTGRES_PASSWORD=postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker-compose up -d
```

---

## 🔧 Post-Installation

1. **Configure AI** - Add OpenAI API key for content generation
2. **Setup Email** - Add Resend API key for newsletters
3. **Enable Translation** - Add DeepL API key
4. **Configure Storage** - Setup media storage

See [Configuration Guide](./configuration.md) for details.

---

## ❓ Common Issues

### Port Already in Use

```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string format
postgresql://user:password@host:port/database
```

### npm Install Fails

```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

See [Troubleshooting](./troubleshooting.md) for more solutions.
