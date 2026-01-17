# API Versioning Strategy

This document describes the API versioning strategy for TRAVI CMS.

## Overview

TRAVI CMS uses a flexible API versioning approach that supports both URL-based and header-based version detection. This allows clients to gradually migrate to new API versions while maintaining backward compatibility.

## Version Detection

The API supports two methods for specifying the desired version:

### 1. URL Prefix (Recommended)

Include the version in the URL path:

```
GET /api/v1/contents
POST /api/v1/articles
```

### 2. Accept Header

Use the `Accept` header with a vendor-specific media type:

```
Accept: application/vnd.travi.v1+json
```

## Version Priority

When both URL and header versions are provided, URL version takes precedence:

1. URL prefix (`/api/v1/*`) - highest priority
2. Accept header (`application/vnd.travi.v1+json`)
3. Default to current version if neither is specified

## Current Version

- **Current Version**: `v1`
- **Supported Versions**: `v1`

## Response Headers

All API responses include version information in the headers:

| Header | Description |
|--------|-------------|
| `X-API-Version` | The API version used for this request |
| `Deprecation` | Set to `true` if the endpoint is deprecated |
| `Sunset` | ISO 8601 date when a deprecated endpoint will be removed |
| `Link` | Link to the replacement endpoint (rel="successor-version") |
| `X-Deprecation-Notice` | Human-readable deprecation message |

## Response Body

API responses include a `_meta` object with version information:

```json
{
  "data": [...],
  "_meta": {
    "apiVersion": "v1",
    "deprecated": false
  }
}
```

For deprecated endpoints:

```json
{
  "data": [...],
  "_meta": {
    "apiVersion": "v1",
    "deprecated": true,
    "sunsetDate": "2025-06-01",
    "replacement": "/api/v2/new-endpoint"
  }
}
```

## Backward Compatibility

The existing `/api/*` routes continue to work without modification. The versioning layer is additive:

- `/api/contents` - Works (uses current version)
- `/api/v1/contents` - Works (explicit v1)

Both routes map to the same handlers, ensuring no breaking changes.

## Deprecation Process

When deprecating an endpoint:

1. Mark the endpoint as deprecated using `markEndpointDeprecated()`
2. Set a sunset date (minimum 6 months from announcement)
3. Document the replacement endpoint
4. Add deprecation warnings to API responses
5. After sunset date, return 410 Gone status

### Marking an Endpoint as Deprecated

```typescript
import { markEndpointDeprecated } from "./middleware/api-versioning";

markEndpointDeprecated("/api/old-endpoint", {
  sunsetDate: "2025-06-01",
  replacement: "/api/v1/new-endpoint",
  message: "This endpoint is deprecated. Please use the new endpoint."
});
```

### Per-Route Deprecation Middleware

```typescript
import { deprecated } from "./middleware/api-versioning";

app.get("/api/legacy-route", 
  deprecated({
    sunsetDate: "2025-06-01",
    replacement: "/api/v1/modern-route",
    message: "Use the modern route instead"
  }),
  handler
);
```

## Version Information Endpoint

Get information about API versions:

```
GET /api/version
```

Response:

```json
{
  "currentVersion": "v1",
  "supportedVersions": ["v1"],
  "deprecatedEndpoints": []
}
```

## Best Practices

### For API Consumers

1. Always specify an explicit version in production
2. Monitor `Deprecation` headers in responses
3. Plan migration before sunset dates
4. Use URL versioning for clarity

### For API Developers

1. Never remove endpoints without deprecation period
2. Maintain backward compatibility within a major version
3. Document all breaking changes in version changelogs
4. Use semantic versioning for API changes

## Migration Guide

When a new version is released:

1. Review the changelog for breaking changes
2. Test your integration against the new version
3. Update your version specification
4. Remove deprecated code after migration

## Example Usage

### JavaScript/TypeScript

```typescript
// URL-based versioning (recommended)
const response = await fetch('/api/v1/contents');

// Header-based versioning
const response = await fetch('/api/contents', {
  headers: {
    'Accept': 'application/vnd.travi.v1+json'
  }
});
```

### cURL

```bash
# URL-based
curl https://api.travi.world/api/v1/contents

# Header-based
curl -H "Accept: application/vnd.travi.v1+json" \
  https://api.travi.world/api/contents
```

## Changelog

### v1 (Current)

- Initial versioned API
- All existing endpoints available under `/api/v1/*`
- No breaking changes from unversioned API
