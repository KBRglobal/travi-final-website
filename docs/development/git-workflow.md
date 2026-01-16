# 🔀 Git Workflow

> Git branching and commit conventions

---

## 🌳 Branch Strategy

### Main Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |

### Feature Branches

```
feature/description
fix/description
docs/description
refactor/description
```

---

## 🔄 Workflow

### 1. Start New Feature

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-newsletter
```

### 2. Work on Feature

```bash
# Make changes
# Stage changes
git add .

# Commit
git commit -m "feat: add newsletter subscription form"
```

### 3. Push & Create PR

```bash
# Push branch
git push -u origin feature/add-newsletter

# Create PR on GitHub
```

### 4. After Review

```bash
# Merge via GitHub PR
# Delete branch
git branch -d feature/add-newsletter
```

---

## 📝 Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance |

### Examples

```bash
# Feature
git commit -m "feat(newsletter): add subscription form"

# Bug fix
git commit -m "fix(auth): resolve session expiry issue"

# Documentation
git commit -m "docs: update API documentation"

# Refactor
git commit -m "refactor(api): simplify content routes"
```

### Good vs Bad

```bash
# ✅ Good
git commit -m "feat(content): add bulk delete functionality"

# ❌ Bad
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "updates"
```

---

## 🔍 Code Review

### Before Submitting PR

- [ ] Code compiles (`npm run check`)
- [ ] No console errors
- [ ] Self-reviewed changes
- [ ] Updated documentation if needed
- [ ] Meaningful commit messages

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- Added X
- Fixed Y
- Updated Z

## Testing
- [ ] Tested locally
- [ ] API endpoints verified
- [ ] UI tested in browser

## Screenshots
(if applicable)
```

### Reviewing PRs

1. Check code quality
2. Verify functionality
3. Test edge cases
4. Provide constructive feedback

---

## 🔀 Merging

### Merge Strategies

| Strategy | When to Use |
|----------|-------------|
| Squash | Feature branches |
| Merge | Release branches |
| Rebase | Cleanup before PR |

### Before Merging

```bash
# Update from develop
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# Resolve any conflicts
# Force push if rebased
git push --force-with-lease
```

---

## 🏷️ Tags & Releases

### Create Release

```bash
# Tag release
git tag -a v1.0.0 -m "Release 1.0.0"

# Push tag
git push origin v1.0.0
```

### Version Format

```
v<major>.<minor>.<patch>

v1.0.0 - Initial release
v1.1.0 - New features
v1.1.1 - Bug fixes
```

---

## 🚨 Emergency Fixes

### Hotfix Process

```bash
# Create from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix issue
git commit -m "fix: resolve critical security issue"

# Push and create PR to main
git push -u origin hotfix/critical-bug

# After merge, also merge to develop
git checkout develop
git merge main
git push origin develop
```

---

## 🧹 Cleanup

### Delete Merged Branches

```bash
# Local
git branch -d feature/old-feature

# Remote
git push origin --delete feature/old-feature
```

### Prune Remote Branches

```bash
git fetch --prune
```

---

## ⚠️ Rules

### DO

- ✅ Write clear commit messages
- ✅ Keep commits focused
- ✅ Update branch before PR
- ✅ Request reviews

### DON'T

- ❌ Commit to main directly
- ❌ Force push to shared branches
- ❌ Merge without review
- ❌ Commit secrets or .env files
