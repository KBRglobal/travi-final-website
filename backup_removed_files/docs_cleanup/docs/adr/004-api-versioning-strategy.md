# ADR-004: API Versioning Strategy

## Status

**Accepted**

## Date

2024-09-01

---

## Context

As TRAVI CMS evolves, the API will need to change. Breaking changes are inevitable as we add features, improve designs, and fix issues. We need a versioning strategy that:

- Allows clients to migrate at their own pace
- Provides clear deprecation warnings
- Maintains backward compatibility during transition periods
- Is easy for developers to understand and use

### Requirements

- Support multiple API versions simultaneously
- Clear version identification in requests and responses
- Deprecation notices before removing endpoints
- Sunset dates for deprecated endpoints
- Minimal disruption to existing integrations
- Easy to implement and maintain

---

## Alternatives Considered

### Option 1: URL Path Versioning Only

**Description**: Include version in URL path (e.g., `/api/v1/contents`).

**Pros**:
- Highly visible and explicit
- Easy to understand
- Works with all clients
- Easy to route in server

**Cons**:
- URL structure changes between versions
- Can lead to duplicate route definitions
- Less RESTful (version isn't a resource)

### Option 2: Header-Based Versioning Only

**Description**: Use Accept header (e.g., `Accept: application/vnd.travi.v1+json`).

**Pros**:
- Clean URLs
- More RESTful approach
- Version is metadata, not resource

**Cons**:
- Less visible to developers
- Harder to test in browser
- Some clients may not support custom headers

### Option 3: Query Parameter Versioning

**Description**: Use query param (e.g., `/api/contents?version=1`).

**Pros**:
- Easy to add to any request
- Works with all clients

**Cons**:
- Pollutes URL
- Can be accidentally cached without version
- Non-standard approach

### Option 4: Combined URL + Header Versioning

**Description**: Support both URL prefix and Accept header, with URL taking precedence.

**Pros**:
- Flexibility for different client needs
- URL for simplicity, header for cleaner URLs
- Explicit priority rules eliminate ambiguity

**Cons**:
- Slightly more complex implementation
- Must document which takes precedence

---

## Decision

We implemented **combined URL prefix and Accept header versioning**:

### Version Detection Priority

1. **URL Prefix** (highest): `/api/v1/contents`
2. **Accept Header**: `Accept: application/vnd.travi.v1+json`
3. **Default**: Current version if neither specified

### Implementation

```typescript
// server/middleware/api-versioning.ts

export const API_VERSIONS = {
  V1: "v1",
} as const;

export const CURRENT_VERSION: ApiVersion = API_VERSIONS.V1;
export const SUPPORTED_VERSIONS: ApiVersion[] = [API_VERSIONS.V1];

export function apiVersioningMiddleware(
  req: VersionedRequest,
  res: Response,
  next: NextFunction
): void {
  // Extract version from URL
  const { version: urlVersion, cleanPath } = extractVersionFromUrl(req.path);
  
  // Extract version from Accept header
  const headerVersion = parseAcceptHeader(req.headers.accept);
  
  // URL takes precedence
  const detectedVersion = urlVersion || headerVersion || CURRENT_VERSION;
  
  req.apiVersion = detectedVersion;
  res.setHeader("X-API-Version", detectedVersion);
  
  next();
}
```

### Response Headers

| Header | Description |
|--------|-------------|
| `X-API-Version` | The API version used for this request |
| `Deprecation` | `true` if endpoint is deprecated |
| `Sunset` | ISO 8601 date when deprecated endpoint will be removed |
| `Link` | Link to replacement endpoint |
| `X-Deprecation-Notice` | Human-readable deprecation message |

### Response Body Enhancement

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

### Deprecation Management

```typescript
// Mark endpoint as deprecated
markEndpointDeprecated("/api/old-endpoint", {
  sunsetDate: "2025-06-01",
  replacement: "/api/v1/new-endpoint",
  message: "This endpoint is deprecated. Please use the new endpoint."
});

// Per-route deprecation middleware
app.get("/api/legacy-route", 
  deprecated({
    sunsetDate: "2025-06-01",
    replacement: "/api/v1/modern-route"
  }),
  handler
);
```

### Version Information Endpoint

```
GET /api/version

{
  "currentVersion": "v1",
  "supportedVersions": ["v1"],
  "deprecatedEndpoints": []
}
```

---

## Consequences

### Positive

- **Backward Compatibility**: Existing `/api/*` routes continue working
- **Flexibility**: Clients can use URL or header versioning
- **Clear Communication**: Deprecation headers provide advance warning
- **Easy Debugging**: `X-API-Version` header shows which version handled request
- **Graceful Migration**: Sunset dates give clients time to migrate

### Negative

- **Middleware Overhead**: Every API request goes through version detection
- **Documentation**: Must maintain docs for multiple versions
- **Testing**: Need to test both versioned and unversioned routes
- **Complexity**: Dual-support adds implementation complexity

### Neutral

- Version is automatically added to response metadata
- Clients not specifying version get current version (could be breaking in future)

---

## Mitigations

1. **Performance**: Middleware is lightweight, minimal overhead
2. **Documentation**: Swagger/OpenAPI spec includes version information
3. **Testing**: Integration tests cover version routing
4. **Breaking Changes**: Minimum 6-month deprecation period before removal

### Migration Guide for Clients

```typescript
// Recommended: Explicit URL versioning
const response = await fetch('/api/v1/contents');

// Alternative: Header versioning
const response = await fetch('/api/contents', {
  headers: {
    'Accept': 'application/vnd.travi.v1+json'
  }
});

// Check for deprecation
if (response.headers.get('Deprecation') === 'true') {
  console.warn('Endpoint deprecated:', 
    response.headers.get('X-Deprecation-Notice'));
}
```

---

## References

- [API Versioning Best Practices](https://www.postman.com/api-platform/api-versioning/)
- [REST API Versioning](https://restfulapi.net/versioning/)
- [RFC 6838 - Media Type Specifications](https://tools.ietf.org/html/rfc6838)
- [docs/API-VERSIONING.md](../API-VERSIONING.md)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-09-01 | Initial versioning strategy | TRAVI Team |
| 2024-10-15 | Added deprecation tracking | TRAVI Team |
