# 📅 First Day Checklist

> Everything you need on day one

---

## ✅ Access Setup

### Accounts Needed

- [ ] GitHub access to repository
- [ ] Replit team access
- [ ] Slack workspace
- [ ] Email account
- [ ] Password manager

### Request Access

Contact your manager for:
- Repository access
- Environment secrets
- Tool licenses

---

## 💻 Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/KBRglobal/Traviapp.git
cd Traviapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Get values from team lead
```

### 4. Setup Database

```bash
createdb traviapp
npm run db:push
```

### 5. Start Development

```bash
npm run dev
```

### 6. Verify

- [ ] http://localhost:5000 loads
- [ ] Can login with test credentials
- [ ] No console errors

---

## 🛠️ IDE Setup

### VS Code Extensions

Install these extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript
- GitLens

### Settings

See [IDE Setup](../development/setup.md#ide-setup)

---

## 📚 Reading List

### Priority 1 (Today)

- [ ] [Project README](../../README.md)
- [ ] [Quick Start](../getting-started/quick-start.md)
- [ ] [Architecture Overview](../architecture/overview.md)

### Priority 2 (This Week)

- [ ] [API Overview](../api/overview.md)
- [ ] [Database Schema](../database/schema.md)
- [ ] [Coding Standards](../development/coding-standards.md)

---

## 👥 Meet the Team

### Schedule

| Time | Activity |
|------|----------|
| 10:00 | Team standup |
| 11:00 | 1:1 with manager |
| 14:00 | Buddy pairing |
| 16:00 | Q&A session |

### Your Buddy

You'll be paired with a team member who will:
- Answer questions
- Review your first PRs
- Help you navigate

---

## 🔑 Credentials

### Get From Team Lead

- [ ] Database URL
- [ ] OpenAI API key (dev)
- [ ] Admin test credentials
- [ ] Other API keys as needed

### Security

- Never commit secrets
- Use password manager
- Enable 2FA on all accounts

---

## 📝 Tasks

### Explore the App

1. Login as admin
2. Create a test article
3. Try AI generation
4. Browse content list
5. Check translations

### Read Some Code

1. Look at a page component
2. Trace an API endpoint
3. Check database schema
4. Review a recent PR

---

## ❓ Questions to Ask

- What are the current priorities?
- What should I know about the codebase?
- What are common pitfalls?
- Who should I ask about X?
- What's the code review process?

---

## 🏁 End of Day

### Checklist

- [ ] Development environment working
- [ ] Can run the application
- [ ] Understand project structure
- [ ] Met key team members
- [ ] Know where to ask questions

### Tomorrow

Continue with [First Week](./first-week.md) guide.

---

Welcome to day one! 🎉
