# ADR-002: Use PostgreSQL for Database

## Status
**Accepted**

## Date
2024-01-01

---

## Context

We needed a database solution that could handle:

- Complex relational data (content, users, translations)
- JSONB for flexible content blocks
- Full-text search capabilities
- Good performance at scale
- Reliable transactions

### Options Considered

1. **PostgreSQL** - Full-featured relational database
2. **MySQL** - Popular alternative
3. **MongoDB** - Document database
4. **SQLite** - Embedded database

---

## Decision

We will use **PostgreSQL 16** with:

- **Drizzle ORM** for type-safe queries
- **JSONB columns** for flexible content
- **Connection pooling** for performance
- **Native full-text search**

---

## Consequences

### Positive

- JSONB allows flexible content structures
- Strong ACID compliance
- Excellent performance
- Rich feature set (CTEs, window functions)
- Good ecosystem (pg_dump, replication)
- Native on Replit

### Negative

- More complex than SQLite
- Requires server management
- Learning curve for advanced features

### Mitigations

- Use Drizzle ORM for simpler queries
- Use Replit's managed PostgreSQL
- Document database patterns

---

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)
