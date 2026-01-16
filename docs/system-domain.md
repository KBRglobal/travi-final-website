# System Domain

The System Domain provides operational control surfaces for platform health, readiness, and diagnostics. It is the first domain migrated to the Foundation architecture and serves as a reference implementation.

## Endpoints

| Endpoint | Description | Feature Flag |
|----------|-------------|--------------|
| `GET /api/_foundation/_domain/health` | Domain metadata | Always on |
| `GET /api/_foundation/events/stats` | Event bus stats | Always on |
| `GET /api/_foundation/ping` | Smoke test ping | `ENABLE_FOUNDATION_PING` |
| `GET /api/_foundation/health` | Full health check | `ENABLE_FOUNDATION_HEALTH` |
| `GET /api/_foundation/health/live` | Liveness probe | `ENABLE_FOUNDATION_HEALTH` |
| `GET /api/_foundation/health/ready` | Readiness probe | `ENABLE_FOUNDATION_HEALTH` |
| `GET /api/_foundation/version` | API version info | `ENABLE_SYSTEM_CONFIG_STATUS` |
| `GET /api/_foundation/uptime` | Server uptime | `ENABLE_SYSTEM_CONFIG_STATUS` |
| `GET /api/_foundation/build-info` | Build information | `ENABLE_SYSTEM_CONFIG_STATUS` |
| `GET /api/_foundation/config/status` | Service config | `ENABLE_SYSTEM_CONFIG_STATUS` |
| `GET /api/_foundation/features` | Platform features | `ENABLE_SYSTEM_CONFIG_STATUS` |
| `GET /api/_foundation/domains` | Enabled domains | `ENABLE_SYSTEM_CONFIG_STATUS` |
| `GET /api/_foundation/flags` | Feature flags | `ENABLE_SYSTEM_FEATURE_FLAGS` |
| `GET /api/_foundation/diagnostics` | Aggregated diagnostics | `ENABLE_SYSTEM_DIAGNOSTICS` |

## Feature Flags

All flags default to `false`. To enable, set the environment variable to `"true"`.

### Master Switches

| Flag | Description |
|------|-------------|
| `ENABLE_FOUNDATION` | Master switch for all Foundation infrastructure |
| `ENABLE_FOUNDATION_DOMAINS` | Enable domain route registration |
| `ENABLE_DOMAIN_SYSTEM` | Enable System domain |

### System Domain Features

| Flag | Description |
|------|-------------|
| `ENABLE_FOUNDATION_PING` | Enable ping endpoint (smoke tests) |
| `ENABLE_FOUNDATION_HEALTH` | Enable health endpoints |
| `ENABLE_SYSTEM_DIAGNOSTICS` | Enable diagnostics aggregator |
| `ENABLE_SYSTEM_CONFIG_STATUS` | Enable config/status endpoints |
| `ENABLE_SYSTEM_FEATURE_FLAGS` | Enable feature flags endpoint |

## Enable Sequence

To enable the System domain in production:

```bash
# Step 1: Enable Foundation infrastructure
ENABLE_FOUNDATION=true
ENABLE_CORRELATION_ID=true

# Step 2: Enable domain routing
ENABLE_FOUNDATION_DOMAINS=true
ENABLE_DOMAIN_SYSTEM=true

# Step 3: Enable features incrementally
ENABLE_FOUNDATION_PING=true        # Test first
ENABLE_FOUNDATION_HEALTH=true       # Health checks
ENABLE_SYSTEM_CONFIG_STATUS=true    # Config visibility
ENABLE_SYSTEM_FEATURE_FLAGS=true    # Flags visibility
ENABLE_SYSTEM_DIAGNOSTICS=true      # Full diagnostics
```

## Legacy Mapping

The new endpoints mirror these legacy routes:

| Legacy Endpoint | Foundation Endpoint |
|-----------------|---------------------|
| `/api/health` | `/api/_foundation/health` |
| `/api/health/live` | `/api/_foundation/health/live` |
| `/api/health/ready` | `/api/_foundation/health/ready` |
| `/api/version` | `/api/_foundation/version` |
| `/api/system-status` | `/api/_foundation/config/status` |

**Note:** Legacy endpoints remain fully functional. Both systems can run simultaneously.

## Intended Consumers

| Consumer | Endpoints |
|----------|-----------|
| Kubernetes | `/health/live`, `/health/ready` |
| Load Balancers | `/health` |
| Ops Dashboards | `/diagnostics` |
| Monitoring Systems | `/health`, `/diagnostics` |
| CI/CD Pipelines | `/version`, `/build-info` |
| Feature Management | `/flags` |
| Admin UI | `/config/status`, `/features`, `/domains` |

## Response Examples

### GET /api/_foundation/diagnostics

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "cid_abc123",
  "health": {
    "status": "healthy",
    "checks": {
      "database": { "status": "healthy", "latencyMs": 5 },
      "memory": { "status": "healthy", "usagePercent": 45 }
    }
  },
  "system": {
    "version": "1.0.0",
    "nodeVersion": "v20.10.0",
    "environment": "production",
    "uptimeSeconds": 86400,
    "uptimeFormatted": "1d 0h 0m 0s",
    "startedAt": "2024-01-14T10:30:00.000Z"
  },
  "domains": [
    { "name": "system", "enabled": true },
    { "name": "content", "enabled": false }
  ],
  "featureFlags": {
    "total": 16,
    "enabled": 5,
    "disabled": 11,
    "foundation": {
      "foundation": true,
      "foundation.correlationId": true
    }
  },
  "services": {
    "activeAIProvider": "openai",
    "configured": {
      "ai": true,
      "imageGeneration": true,
      "translations": true,
      "email": false,
      "cloudStorage": true
    }
  }
}
```

### GET /api/_foundation/health

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "correlationId": "cid_abc123",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "memory": { "status": "healthy", "usage": 45 }
  }
}
```

## Architecture

```
server/domains/system/
├── dto/
│   ├── health.dto.ts           # Health check schemas
│   ├── system-info.dto.ts      # Version/uptime/build schemas
│   ├── config-status.dto.ts    # Config/flags schemas
│   ├── diagnostics.dto.ts      # Aggregated diagnostics schema
│   └── index.ts
├── services/
│   ├── health.service.ts       # Health check logic
│   ├── system-info.service.ts  # Version/uptime/build logic
│   ├── config-status.service.ts # Config/flags logic
│   ├── diagnostics.service.ts  # Aggregator logic
│   └── index.ts
├── controllers/
│   ├── health.controller.ts
│   ├── system-info.controller.ts
│   ├── config-status.controller.ts
│   ├── diagnostics.controller.ts
│   └── index.ts
└── index.ts                    # Routes + registration
```

## Tests

```bash
# Run all system domain tests
npm run test -- tests/server/foundation

# Tests include:
# - DTO validation tests
# - Service unit tests (happy + failure paths)
# - Integration tests for diagnostics
```

Test files:
- `tests/server/foundation/health-dto.test.ts`
- `tests/server/foundation/health-service.test.ts`
- `tests/server/foundation/system-info.test.ts`
- `tests/server/foundation/config-status.test.ts`
- `tests/server/foundation/diagnostics.test.ts`
- `tests/server/foundation/system-dto.test.ts`

## Safety

- All flags default to `false` (OFF)
- If a flag is OFF, endpoints return 404
- Legacy endpoints are unaffected
- No database migrations required
- Domain can be enabled/disabled at runtime
