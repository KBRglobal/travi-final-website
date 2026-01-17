# ADR-001: Monorepo Structure with React, Express, and PostgreSQL

## Status

**Accepted**

## Date

2024-01-01

---

## Context

TRAVI CMS required a robust architecture that could support a feature-rich content management system with AI-powered content generation, multi-language support, and real-time collaboration features. The architecture needed to:

- Support rapid development and iteration
- Enable type-safe communication between frontend and backend
- Provide a reliable data persistence layer
- Scale for a growing content platform
- Be maintainable by a small team

### Requirements

- Single codebase for easier deployment and development
- Shared types between frontend and backend
- Full-stack TypeScript support
- Rich ecosystem for UI components
- Reliable database with ACID compliance
- Easy local development setup

---

## Alternatives Considered

### Option 1: Microservices Architecture

**Description**: Separate services for API, content processing, AI, etc.

**Pros**:
- Independent scaling of services
- Technology flexibility per service
- Isolated failure domains

**Cons**:
- Significant operational overhead
- Complex deployment and monitoring
- Overkill for current team size and needs
- Increased latency from service communication

### Option 2: Next.js Full-Stack

**Description**: Use Next.js for both frontend and backend with API routes.

**Pros**:
- Unified framework
- Built-in SSR/SSG support
- Simplified deployment

**Cons**:
- Less flexibility for complex backend logic
- API routes have limitations for complex scenarios
- Tighter coupling between frontend and backend
- Learning curve for team familiar with Express

### Option 3: Monorepo with React + Express + PostgreSQL

**Description**: Single repository containing React frontend, Express backend, and PostgreSQL database with shared TypeScript types.

**Pros**:
- Type safety across the entire stack
- Simplified dependency management
- Easy code sharing between frontend and backend
- Familiar technologies for the team
- Flexible backend architecture

**Cons**:
- Manual SSR setup if needed
- More configuration required
- Single repository can become large

---

## Decision

We chose a **monorepo structure** with the following stack:

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + Vite | Rich interactive UI |
| Routing | Wouter | Lightweight client-side routing |
| State | TanStack Query | Server state management |
| UI | Radix UI + Tailwind CSS | Accessible component library |
| Backend | Express + TypeScript | RESTful API server |
| ORM | Drizzle ORM | Type-safe database access |
| Database | PostgreSQL | ACID-compliant data storage |
| Validation | Zod | Schema validation |
| Types | Shared TypeScript | Type safety across stack |

### Project Structure

```
travi-cms/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilities
├── server/               # Express backend
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   └── ai/               # AI integrations
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle schema + types
├── docs/                 # Documentation
└── migrations/           # Database migrations
```

### Key Decisions

1. **Shared Schema**: The `shared/schema.ts` file contains Drizzle ORM table definitions and Zod validation schemas, ensuring type consistency.

2. **Vite for Frontend**: Fast HMR and modern build tooling for better developer experience.

3. **Express for Backend**: Mature ecosystem, extensive middleware support, and team familiarity.

4. **Drizzle ORM**: Type-safe queries with excellent TypeScript integration and minimal runtime overhead.

---

## Consequences

### Positive

- **Type Safety**: Shared types eliminate API contract mismatches
- **Developer Experience**: Single repo, single `npm install`, unified tooling
- **Code Sharing**: Validation schemas and types are shared between frontend and backend
- **Fast Iteration**: Changes to API and frontend can be made in a single PR
- **Simplified Deployment**: Single build and deploy process
- **Team Efficiency**: Small team can work across the full stack easily

### Negative

- **Repository Size**: Can grow large with assets and generated files
- **Build Complexity**: Need custom Vite configuration for development mode
- **No Built-in SSR**: Must implement server-side rendering manually if needed
- **Coupling**: Changes to shared types require coordinated updates

### Neutral

- Developers need full-stack knowledge to be effective
- Single CI/CD pipeline for all changes
- Deployment is all-or-nothing

---

## Mitigations

1. **Repository Size**: Use `.gitignore` effectively, store media in object storage
2. **Build Complexity**: `server/vite.ts` handles dev server integration seamlessly
3. **SSR**: Implemented custom SSR middleware for SEO-critical pages
4. **Coupling**: Zod schemas provide runtime validation as a safety net

---

## References

- [React Documentation](https://react.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [Vite](https://vitejs.dev)
- [TanStack Query](https://tanstack.com/query)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-01-01 | Initial decision | TRAVI Team |
