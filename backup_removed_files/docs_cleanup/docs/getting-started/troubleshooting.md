# 🔧 Troubleshooting Guide

> Solutions to common problems

---

## 🚨 Common Issues

### Installation Issues

#### `npm install` fails

**Symptoms:** Error during package installation

**Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Delete lock file and node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Node version mismatch

**Symptoms:** Syntax errors or missing features

**Solution:**

```bash
# Check version
node --version  # Should be 20+

# Use nvm to switch
nvm use 20
```

---

### Database Issues

#### Connection refused

**Symptoms:** `ECONNREFUSED` error

**Solutions:**

```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL
sudo systemctl start postgresql

# Verify connection string
psql $DATABASE_URL
```

#### Schema push fails

**Symptoms:** `npm run db:push` errors

**Solutions:**

```bash
# Check database exists
psql -l | grep traviapp

# Create if missing
createdb traviapp

# Check DATABASE_URL format
# postgresql://user:password@host:port/database
```

#### Migration conflicts

**Symptoms:** Duplicate column or table errors

**Solution:**

```bash
# Reset database (CAUTION: deletes data)
dropdb traviapp
createdb traviapp
npm run db:push
```

---

### Server Issues

#### Port already in use

**Symptoms:** `EADDRINUSE` error

**Solutions:**

```bash
# Find process using port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3000 npm run dev
```

#### Server crashes on start

**Symptoms:** Immediate exit after `npm run dev`

**Checklist:**

1. Check `.env` file exists
2. Verify DATABASE_URL is correct
3. Check required env vars are set
4. Look at error message for clues

```bash
# Run with debug
DEBUG=* npm run dev
```

---

### Authentication Issues

#### Can't login

**Symptoms:** Invalid credentials error

**Solutions:**

1. Verify `ADMIN_USERNAME` in `.env`
2. Regenerate password hash:

```bash
npx bcrypt-cli hash 'your-password' 10
# Put result in ADMIN_PASSWORD_HASH
```

3. Check for spaces in env values

#### Session expires immediately

**Symptoms:** Logged out after login

**Solutions:**

1. Check `SESSION_SECRET` is set
2. Verify it's 32+ characters
3. Check cookies are enabled in browser

---

### AI Features Issues

#### AI generation fails

**Symptoms:** "AI generation failed" error

**Checklist:**

1. Check `OPENAI_API_KEY` is set
2. Verify API key is valid
3. Check OpenAI account has credits
4. Try smaller content request

```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### Translation fails

**Symptoms:** Translation error or empty results

**Solutions:**

1. Verify `DEEPL_API_KEY` is set
2. Check language is supported
3. Check DeepL quota

---

### Frontend Issues

#### Blank page

**Symptoms:** White screen, no content

**Debug steps:**

1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Try hard refresh (Ctrl+Shift+R)

#### Styling broken

**Symptoms:** Unstyled content

**Solutions:**

```bash
# Rebuild CSS
npm run build

# Check Tailwind config
cat tailwind.config.ts
```

---

### Build Issues

#### Build fails

**Symptoms:** `npm run build` errors

**Solutions:**

```bash
# Check TypeScript errors
npm run check

# Fix type errors first
# Then rebuild
npm run build
```

#### Out of memory

**Symptoms:** JavaScript heap out of memory

**Solution:**

```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## 🔍 Debug Mode

### Enable verbose logging

```bash
DEBUG=* npm run dev
```

### Check application logs

```bash
# Replit
View logs in console

# Self-hosted
tail -f /var/log/traviapp.log
```

### Database debugging

```bash
# Log all queries
DEBUG=drizzle:* npm run dev
```

---

## 📊 Health Checks

### API Health

```bash
curl http://localhost:5000/api/health
```

### Database Health

```bash
npm run db:push  # Should complete without errors
```

### Frontend Health

Open http://localhost:5000 - should load without console errors

---

## 🆘 Getting Help

1. Check this troubleshooting guide
2. Search [existing issues](https://github.com/KBRglobal/Traviapp/issues)
3. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Logs
