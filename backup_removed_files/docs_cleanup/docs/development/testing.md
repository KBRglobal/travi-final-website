# 🧪 Testing Guide

> Testing strategies and practices

---

## 📋 Testing Strategy

### Test Pyramid

```
        /\
       /  \      E2E Tests (Few)
      /----\
     /      \    Integration Tests
    /--------\
   /          \  Unit Tests (Many)
  /------------\
```

---

## 🔧 Testing Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| React Testing Library | Component testing |
| Playwright | E2E testing |
| Supertest | API testing |

---

## 📦 Unit Tests

### Example: Utility Function

```typescript
// utils/formatDate.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// utils/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-12-23T10:00:00Z');
    expect(formatDate(date)).toBe('2024-12-23');
  });

  it('handles midnight', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(formatDate(date)).toBe('2024-01-01');
  });
});
```

### Example: Hook

```typescript
// hooks/useToggle.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('starts with initial value', () => {
    const { result } = renderHook(() => useToggle(false));
    expect(result.current[0]).toBe(false);
  });

  it('toggles value', () => {
    const { result } = renderHook(() => useToggle(false));
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
```

---

## ⚛️ Component Tests

### Example: Button Component

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Example: Form Component

```typescript
// components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits with valid data', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password',
      });
    });
  });

  it('shows validation error', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
  });
});
```

---

## 🔌 API Tests

### Example: API Route

```typescript
// routes/contents.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../db';

describe('GET /api/contents', () => {
  beforeEach(async () => {
    // Seed test data
    await db.insert(contents).values([
      { title: 'Test 1', type: 'article', status: 'published' },
      { title: 'Test 2', type: 'article', status: 'draft' },
    ]);
  });

  it('returns published contents', async () => {
    const response = await request(app)
      .get('/api/contents?status=published')
      .set('Cookie', 'connect.sid=valid-session');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Test 1');
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/contents');
    expect(response.status).toBe(401);
  });
});
```

---

## 🌐 E2E Tests

### Example: Login Flow

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('successful login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('failed login shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="username"]', 'wrong');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('Invalid credentials');
  });
});
```

---

## 🏃 Running Tests

### Commands

```bash
# Run all tests
npm test

# Run with watch
npm test -- --watch

# Run specific file
npm test -- utils/formatDate.test.ts

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

---

## 📊 Test Coverage

### Goals

| Type | Target |
|------|--------|
| Unit | 80% |
| Integration | 60% |
| E2E | Critical paths |

### View Coverage

```bash
npm test -- --coverage
```

---

## 💡 Best Practices

### DO

- ✅ Test behavior, not implementation
- ✅ Use meaningful test names
- ✅ Keep tests independent
- ✅ Mock external services

### DON'T

- ❌ Test implementation details
- ❌ Share state between tests
- ❌ Write flaky tests
- ❌ Ignore failing tests
