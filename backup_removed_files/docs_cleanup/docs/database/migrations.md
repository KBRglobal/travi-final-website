# 🔄 Database Migrations

> Managing database schema changes

---

## 🛠️ Migration Tools

Traviapp uses **Drizzle Kit** for migrations.

### Commands

```bash
# Push schema to database (dev)
npm run db:push

# Generate migration files
npx drizzle-kit generate:pg

# Apply migrations
npx drizzle-kit push:pg

# Open Drizzle Studio
npx drizzle-kit studio
```

---

## 📁 Migration Structure

```
migrations/
├── 0000_initial.sql
├── 0001_add_translations.sql
├── 0002_add_newsletters.sql
└── meta/
    └── _journal.json
```

---

## 🚀 Creating Migrations

### 1. Modify Schema

Edit `shared/schema.ts`:

```typescript
// Add new column
export const contents = pgTable('contents', {
  // existing columns...
  newColumn: varchar('new_column', { length: 255 }),
});
```

### 2. Generate Migration

```bash
npx drizzle-kit generate:pg
```

### 3. Review Generated SQL

Check `migrations/` folder for new file.

### 4. Apply Migration

```bash
npm run db:push
```

---

## 📝 Schema Definition

### Table Example

```typescript
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Relationships

```typescript
export const contents = pgTable('contents', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id').references(() => users.id),
});

export const contentsRelations = relations(contents, ({ one }) => ({
  author: one(users, {
    fields: [contents.authorId],
    references: [users.id],
  }),
}));
```

### Enums

```typescript
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
]);

export const contents = pgTable('contents', {
  status: contentStatusEnum('status').default('draft'),
});
```

---

## ⚠️ Migration Best Practices

### DO

- ✅ Test migrations on copy of production data
- ✅ Make small, incremental changes
- ✅ Add columns as nullable first
- ✅ Create indexes concurrently
- ✅ Backup before major migrations

### DON'T

- ❌ Drop columns without deprecation period
- ❌ Rename columns directly (add new, migrate data, drop old)
- ❌ Run migrations during peak hours
- ❌ Modify migration files after applying

---

## 🔙 Rollback Strategies

### Manual Rollback

Create reverse migration:

```sql
-- 0003_rollback_feature.sql
ALTER TABLE contents DROP COLUMN new_column;
```

### Data Backup

Before risky migrations:

```bash
pg_dump -h localhost -U user -d traviapp > backup.sql
```

### Restore

```bash
psql -h localhost -U user -d traviapp < backup.sql
```

---

## 🧪 Testing Migrations

### Local Testing

```bash
# Create test database
createdb traviapp_test

# Apply migrations
DATABASE_URL=postgresql://user:pass@localhost/traviapp_test npm run db:push

# Run tests
npm test

# Cleanup
dropdb traviapp_test
```

### Staging Environment

Always test on staging before production.

---

## 📊 Common Migrations

### Add Column

```typescript
// schema.ts
export const contents = pgTable('contents', {
  // Add new column
  viewCount: integer('view_count').default(0),
});
```

### Add Index

```typescript
// In schema or raw SQL
export const contentsSlugIdx = index('contents_slug_idx')
  .on(contents.slug);
```

### Add Table

```typescript
export const newFeature = pgTable('new_feature', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
});
```

### Modify Column

```sql
-- Migration file
ALTER TABLE contents
ALTER COLUMN title TYPE varchar(500);
```

---

## 🔍 Troubleshooting

### Migration Failed

1. Check error message
2. Verify database connection
3. Check for conflicting data
4. Rollback if needed

### Duplicate Key Error

```sql
-- Check for duplicates
SELECT slug, COUNT(*)
FROM contents
GROUP BY slug
HAVING COUNT(*) > 1;

-- Fix duplicates before adding unique constraint
```

### Column Already Exists

Migration already applied. Skip or reset:

```bash
# Reset migration tracking (careful!)
DELETE FROM drizzle_migrations
WHERE name = '0005_add_column';
```
