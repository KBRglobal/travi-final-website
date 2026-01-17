# Legacy Endpoint Mapping

## Status: CONSOLIDATION PHASE

This document maps legacy system/health/config/version endpoints to their Foundation replacements.

---

## Legend

| Status | Meaning |
|--------|---------|
| **ACTIVE** | Currently serving production traffic |
| **DEPRECATED** | Has Foundation replacement, awaiting migration |
| **FLAGGED** | Safe to remove when flag enabled |

---

## System Health Endpoints

| Legacy Endpoint | Foundation Replacement | Status | Notes |
|-----------------|------------------------|--------|-------|
| `GET /api/health` | `GET /api/_foundation/health` | DEPRECATED | Full health check with DB + memory |
| `GET /api/health/live` | `GET /api/_foundation/health/live` | DEPRECATED | Kubernetes liveness probe |
| `GET /api/health/ready` | `GET /api/_foundation/health/ready` | DEPRECATED | Kubernetes readiness probe |

**Location**: `server/routes.ts:2033-2089`
**Required Flag**: `ENABLE_FOUNDATION_HEALTH=true`

---

## Version / System Info Endpoints

| Legacy Endpoint | Foundation Replacement | Status | Notes |
|-----------------|------------------------|--------|-------|
| `GET /api/version` | `GET /api/_foundation/version` | DEPRECATED | API version info |
| N/A | `GET /api/_foundation/uptime` | NEW | Server uptime (no legacy) |
| N/A | `GET /api/_foundation/build-info` | NEW | Build metadata (no legacy) |

**Location**: `server/routes.ts:2092-2098`
**Required Flag**: `ENABLE_SYSTEM_CONFIG_STATUS=true`

---

## Configuration Status Endpoints

| Legacy Endpoint | Foundation Replacement | Status | Notes |
|-----------------|------------------------|--------|-------|
| `GET /api/system-status` | `GET /api/_foundation/config/status` | DEPRECATED | Requires auth in legacy |
| N/A | `GET /api/_foundation/features` | NEW | Platform features |
| N/A | `GET /api/_foundation/domains` | NEW | Enabled domains |
| N/A | `GET /api/_foundation/flags` | NEW | Feature flags status |

**Location**: `server/routes.ts:2101-2146`
**Required Flag**: `ENABLE_SYSTEM_CONFIG_STATUS=true` + `ENABLE_SYSTEM_FEATURE_FLAGS=true`

---

## System Monitoring Endpoints (NOT MIGRATED)

These endpoints remain in legacy and are NOT part of Foundation migration scope:

| Legacy Endpoint | Status | Notes |
|-----------------|--------|-------|
| `GET /api/system/workers` | ACTIVE | Octopus worker health, requires auth |
| `GET /api/system/load` | ACTIVE | AI orchestrator load metrics |
| `GET /api/system/alerts` | ACTIVE | Operational alerting system |

**Location**:
- `server/routes.ts:2149+` (workers)
- `server/routes/ai-metrics.ts` (load, alerts)

**Reason**: These are AI-orchestrator specific and should remain separate from foundation system domain.

---

## Domain-Specific Status Endpoints (NOT IN SCOPE)

The following `/status` and `/health` endpoints are domain-specific and NOT part of system domain consolidation:

| Module | Endpoint | Notes |
|--------|----------|-------|
| chat | `/api/chat/health` | Chat subsystem health |
| governance | `/api/governance/health` | Governance engine health |
| ops | `/api/ops/health` | Operations health |
| traffic-intel | `/api/traffic-intel/status` | Traffic intelligence status |
| go-live | `/api/go-live/status` | Go-live system status |
| experimentation | `/api/experimentation/status` | Experiment system status |
| audit-v2 | `/api/audit-v2/status` | Audit system status |
| ... | (40+ more) | Domain-specific, not system-level |

These remain untouched - they are domain concerns, not system infrastructure.

---

## Response Parity Analysis

### `/api/health` vs `/api/_foundation/health`

**Legacy Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345.67,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "memory": { "status": "healthy", "usage": 45 }
  }
}
```

**Foundation Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345.67,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "memory": { "status": "healthy", "usage": 45 }
  },
  "correlationId": "req-xxx" // ADDITIONAL
}
```

**Parity**: ✅ COMPATIBLE (Foundation adds correlationId, backwards compatible)

---

### `/api/health/live` vs `/api/_foundation/health/live`

**Legacy Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Foundation Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "req-xxx" // ADDITIONAL
}
```

**Parity**: ✅ COMPATIBLE

---

### `/api/health/ready` vs `/api/_foundation/health/ready`

**Legacy Response (healthy):**
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Foundation Response (healthy):**
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "req-xxx" // ADDITIONAL
}
```

**Parity**: ✅ COMPATIBLE

---

### `/api/version` vs `/api/_foundation/version`

**Legacy Response:**
```json
{
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Foundation Response:**
```json
{
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "req-xxx" // ADDITIONAL
}
```

**Parity**: ✅ COMPATIBLE

---

### `/api/system-status` vs `/api/_foundation/config/status`

**Key Differences:**
- Legacy requires `requireAuth` middleware
- Foundation currently does NOT require auth (by design, for ops dashboards)
- Response structure is identical

**Security Note**: Foundation config/status intentionally mirrors legacy response but without auth requirement. This is a conscious design decision for ops tooling. Sensitive data (API keys) are NEVER exposed - only `configured: true/false` booleans.

**Parity**: ✅ COMPATIBLE (auth policy differs, response identical)

---

## Migration Path

### Phase 1: Foundation Running (CURRENT)
- All Foundation endpoints are OFF by default
- Legacy endpoints continue to serve traffic
- Zero behavior change

### Phase 2: Parallel Running
1. Enable Foundation flags one at a time
2. Monitor both endpoints for parity
3. Update monitoring to use Foundation endpoints

### Phase 3: Traffic Migration
1. Update Kubernetes probes to use `/_foundation/health/*`
2. Update monitoring dashboards
3. Update any client code

### Phase 4: Legacy Deprecation
1. Add deprecation headers to legacy endpoints
2. Log usage of legacy endpoints
3. Plan removal timeline

### Phase 5: Legacy Removal (FUTURE)
- Only after all consumers migrated
- Requires explicit approval
- Remove legacy endpoint code

---

## DO NOT DELETE YET

The following legacy endpoints are marked for future removal but MUST NOT be deleted until:

1. ✅ All Kubernetes probes updated
2. ✅ All monitoring dashboards updated
3. ✅ All client applications migrated
4. ✅ Foundation endpoints running stable for 30+ days
5. ✅ Explicit stakeholder approval

**Current Status**: Phase 1 - Foundation available but OFF

---

*Last Updated: Auto-generated during stabilization mission*
*Branch: claude/backend-domain-architecture-9A7sf*
