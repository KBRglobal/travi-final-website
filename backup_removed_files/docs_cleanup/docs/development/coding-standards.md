# 📝 Coding Standards

> Code style and conventions

---

## 🎯 General Principles

1. **Readability** over cleverness
2. **Consistency** across codebase
3. **Type Safety** with TypeScript
4. **Simplicity** - avoid over-engineering

---

## 📘 TypeScript

### Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Types

```typescript
// ✅ Good - explicit types
function getUser(id: number): Promise<User | null> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

// ❌ Bad - any type
function getUser(id: any): any {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
```

### Interfaces vs Types

```typescript
// Use interface for objects
interface User {
  id: number;
  name: string;
  email: string;
}

// Use type for unions, primitives
type Status = 'draft' | 'published' | 'archived';
type ID = number | string;
```

### Null Handling

```typescript
// ✅ Good - explicit null check
const user = await getUser(id);
if (!user) {
  throw new Error('User not found');
}
return user.name;

// ❌ Bad - optional chaining without handling
return user?.name; // Could return undefined
```

---

## ⚛️ React

### Functional Components

```typescript
// ✅ Good
interface Props {
  title: string;
  onClick: () => void;
}

export function Button({ title, onClick }: Props) {
  return <button onClick={onClick}>{title}</button>;
}

// ❌ Bad - class components
class Button extends React.Component { ... }
```

### Hooks

```typescript
// ✅ Good - custom hooks for logic
function useContentList() {
  const { data, isLoading } = useQuery({
    queryKey: ['contents'],
    queryFn: fetchContents,
  });
  return { contents: data, isLoading };
}

// ❌ Bad - logic in component
function ContentList() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/contents')
      .then(r => r.json())
      .then(setContents)
      .finally(() => setLoading(false));
  }, []);
  // ...
}
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types
interface Props {
  id: number;
}

// 3. Component
export function MyComponent({ id }: Props) {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Handlers
  const handleClick = () => {};

  // 6. Render
  return <div>...</div>;
}
```

---

## 🗄️ Database

### Drizzle Queries

```typescript
// ✅ Good - use Drizzle query builder
const contents = await db.query.contents.findMany({
  where: eq(contents.status, 'published'),
  orderBy: desc(contents.createdAt),
  limit: 10,
});

// ❌ Bad - raw SQL
const contents = await db.execute(sql`
  SELECT * FROM contents WHERE status = 'published'
`);
```

### Transactions

```typescript
// ✅ Good - use transactions for multiple operations
await db.transaction(async (tx) => {
  await tx.insert(contents).values(contentData);
  await tx.insert(auditLogs).values(logData);
});
```

---

## 🔌 API Routes

### Handler Structure

```typescript
app.get('/api/contents', async (req, res) => {
  try {
    // 1. Validate input
    const { page, limit } = validateQuery(req.query);

    // 2. Check authorization
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 3. Business logic
    const contents = await getContents({ page, limit });

    // 4. Return response
    res.json({ data: contents });
  } catch (error) {
    // 5. Error handling
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

### Validation

```typescript
// ✅ Good - Zod validation
import { z } from 'zod';

const createContentSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['article', 'hotel', 'attraction']),
  status: z.enum(['draft', 'published']).default('draft'),
});

// In handler
const data = createContentSchema.parse(req.body);
```

---

## 🎨 Styling

### Tailwind CSS

```tsx
// ✅ Good - Tailwind classes
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <h1 className="text-xl font-bold text-gray-900">Title</h1>
</div>

// ❌ Bad - inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

### Component Variants

```typescript
// Use CVA for variants
import { cva } from 'class-variance-authority';

const button = cva('rounded font-medium', {
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-gray-200 text-gray-900',
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
```

---

## 📁 File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ContentCard.tsx` |
| Hooks | camelCase with `use` | `useContent.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase | `Content.ts` |
| Routes | kebab-case | `content-routes.ts` |

---

## 📝 Comments

```typescript
// ✅ Good - explain WHY
// Cache for 5 minutes to reduce API calls during high traffic
const CACHE_TTL = 5 * 60 * 1000;

// ❌ Bad - explain WHAT (obvious from code)
// Set cache TTL to 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
```

### JSDoc for Public APIs

```typescript
/**
 * Generates AI content for the given topic.
 * @param topic - The subject to write about
 * @param options - Generation options
 * @returns Generated content with metadata
 * @throws {AIError} When generation fails
 */
export async function generateContent(
  topic: string,
  options: GenerateOptions
): Promise<GeneratedContent> {
  // ...
}
```

---

## 🚫 Anti-Patterns

### Avoid

```typescript
// ❌ Magic numbers
if (role === 5) { ... }

// ✅ Use constants
const ADMIN_ROLE = 5;
if (role === ADMIN_ROLE) { ... }
```

```typescript
// ❌ Nested callbacks
fetch(url).then(r => {
  r.json().then(data => {
    process(data).then(result => {
      // ...
    });
  });
});

// ✅ Async/await
const response = await fetch(url);
const data = await response.json();
const result = await process(data);
```

```typescript
// ❌ Mutation
users.push(newUser);

// ✅ Immutable
const updatedUsers = [...users, newUser];
```
