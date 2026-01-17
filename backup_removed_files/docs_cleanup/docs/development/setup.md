# 💻 Development Setup

> Setting up your development environment

---

## 🛠️ Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 16+ | [postgresql.org](https://postgresql.org) |
| Git | 2.0+ | [git-scm.com](https://git-scm.com) |
| VS Code | Latest | [code.visualstudio.com](https://code.visualstudio.com) |

---

## 🚀 Quick Setup

```bash
# Clone repository
git clone https://github.com/KBRglobal/Traviapp.git
cd Traviapp

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Setup database
createdb traviapp
npm run db:push

# Start development server
npm run dev
```

---

## 📁 Project Structure

```
Traviapp/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Route components
│       ├── components/     # UI components
│       │   └── ui/         # Base components
│       ├── hooks/          # Custom hooks
│       ├── lib/            # Utilities
│       └── locales/        # i18n files
│
├── server/                 # Express backend
│   ├── index.ts            # Entry point
│   ├── routes.ts           # API routes
│   ├── db.ts               # Database
│   ├── auth.ts             # Authentication
│   └── services/           # External services
│
├── shared/                 # Shared code
│   └── schema.ts           # DB schema
│
├── docs/                   # Documentation
├── migrations/             # DB migrations
└── uploads/                # File uploads
```

---

## ⚙️ Environment Variables

### Required

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/traviapp
SESSION_SECRET=your-32-char-secret-minimum
OPENAI_API_KEY=sk-your-key
```

### Optional

```bash
# Translation
DEEPL_API_KEY=your-deepl-key

# Email
RESEND_API_KEY=re_your-key

# AI Premium
ANTHROPIC_API_KEY=sk-ant-your-key

# Cache
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 🖥️ IDE Setup

### VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

---

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push DB schema |

---

## 🌐 Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5000 |
| API | http://localhost:5000/api |
| Drizzle Studio | http://localhost:4983 |

---

## 🔄 Development Workflow

### 1. Start Server

```bash
npm run dev
```

### 2. Make Changes

- Frontend: `client/src/`
- Backend: `server/`
- Schema: `shared/schema.ts`

### 3. Hot Reload

- Frontend changes reload automatically
- Backend restarts on save

### 4. Test Changes

```bash
npm run check  # Type check
```

---

## 🐛 Debugging

### VS Code Launch Config

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Browser DevTools

1. Open http://localhost:5000
2. Press F12
3. Use React DevTools extension
4. Check Network tab for API calls

### Logging

```typescript
// Server-side
console.log('Debug:', data);

// Enable verbose
DEBUG=* npm run dev
```

---

## 🧪 Testing Locally

### Database

```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# View tables
npm run db:studio
```

### API

```bash
# Test endpoint
curl http://localhost:5000/api/health

# With auth
curl http://localhost:5000/api/contents \
  -H "Cookie: connect.sid=..."
```

### Frontend

1. Open browser
2. Check console for errors
3. Test user flows

---

## 📱 Mobile Testing

### Local Network

```bash
# Find your IP
hostname -I  # Linux
ipconfig     # Windows

# Access from phone
http://YOUR_IP:5000
```

### Device Emulation

Use Chrome DevTools > Toggle Device Toolbar

---

## ⚠️ Common Issues

### Port in Use

```bash
lsof -i :5000
kill -9 <PID>
```

### Node Modules Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Database Connection

```bash
# Check PostgreSQL running
pg_isready

# Check connection string
psql $DATABASE_URL
```

---

## 📚 Next Steps

- [Coding Standards](./coding-standards.md)
- [Git Workflow](./git-workflow.md)
- [Testing Guide](./testing.md)
