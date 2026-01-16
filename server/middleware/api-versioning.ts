import type { Request, Response, NextFunction } from "express";

export const API_VERSIONS = {
  V1: "v1",
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

export const CURRENT_VERSION: ApiVersion = API_VERSIONS.V1;
export const SUPPORTED_VERSIONS: ApiVersion[] = [API_VERSIONS.V1];

export interface VersionedRequest extends Request {
  apiVersion?: ApiVersion;
  isVersionedRoute?: boolean;
  originalApiPath?: string;
}

export interface DeprecationInfo {
  deprecated: boolean;
  sunsetDate?: string;
  replacement?: string;
  message?: string;
}

const deprecatedEndpoints = new Map<string, DeprecationInfo>();

export function markEndpointDeprecated(
  path: string,
  info: Omit<DeprecationInfo, "deprecated">
): void {
  deprecatedEndpoints.set(path, {
    deprecated: true,
    ...info,
  });
}

export function isEndpointDeprecated(path: string): DeprecationInfo | null {
  for (const [pattern, info] of deprecatedEndpoints) {
    if (path.startsWith(pattern) || path === pattern) {
      return info;
    }
  }
  return null;
}

export function clearDeprecatedEndpoints(): void {
  deprecatedEndpoints.clear();
}

function parseAcceptHeader(acceptHeader: string | undefined): ApiVersion | null {
  if (!acceptHeader) return null;

  const versionMatch = acceptHeader.match(
    /application\/vnd\.travi\.v(\d+)\+json/i
  );
  if (versionMatch) {
    const version = `v${versionMatch[1]}` as ApiVersion;
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version;
    }
  }

  return null;
}

function extractVersionFromUrl(path: string): {
  version: ApiVersion | null;
  cleanPath: string;
} {
  const versionMatch = path.match(/^\/api\/v(\d+)(\/.*)?$/);
  if (versionMatch) {
    const version = `v${versionMatch[1]}` as ApiVersion;
    const remainingPath = versionMatch[2] || "";
    if (SUPPORTED_VERSIONS.includes(version)) {
      return {
        version,
        cleanPath: `/api${remainingPath}`,
      };
    }
  }

  return {
    version: null,
    cleanPath: path,
  };
}

export function apiVersioningMiddleware(
  req: VersionedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  const { version: urlVersion, cleanPath } = extractVersionFromUrl(req.path);
  const headerVersion = parseAcceptHeader(req.headers.accept);

  let detectedVersion: ApiVersion = CURRENT_VERSION;
  let isVersionedRoute = false;

  if (urlVersion) {
    detectedVersion = urlVersion;
    isVersionedRoute = true;
    req.url = cleanPath;
    req.originalApiPath = req.path;
  } else if (headerVersion) {
    detectedVersion = headerVersion;
    isVersionedRoute = true;
  }

  req.apiVersion = detectedVersion;
  req.isVersionedRoute = isVersionedRoute;

  res.setHeader("X-API-Version", detectedVersion);

  const deprecationInfo = isEndpointDeprecated(req.path);
  if (deprecationInfo) {
    res.setHeader("Deprecation", "true");
    if (deprecationInfo.sunsetDate) {
      res.setHeader("Sunset", deprecationInfo.sunsetDate);
    }
    if (deprecationInfo.replacement) {
      res.setHeader("Link", `<${deprecationInfo.replacement}>; rel="successor-version"`);
    }
    if (deprecationInfo.message) {
      res.setHeader("X-Deprecation-Notice", deprecationInfo.message);
    }
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const enhancedBody = {
        ...body,
        _meta: {
          apiVersion: detectedVersion,
          ...(deprecationInfo?.deprecated && {
            deprecated: true,
            sunsetDate: deprecationInfo.sunsetDate,
            replacement: deprecationInfo.replacement,
          }),
        },
      };
      return originalJson(enhancedBody);
    }
    return originalJson(body);
  };

  next();
}

export function requireApiVersion(version: ApiVersion) {
  return (req: VersionedRequest, res: Response, next: NextFunction): void => {
    if (req.apiVersion !== version) {
      res.status(400).json({
        error: "API Version Mismatch",
        message: `This endpoint requires API version ${version}`,
        currentVersion: req.apiVersion,
        requiredVersion: version,
      });
      return;
    }
    next();
  };
}

export function deprecated(info: Omit<DeprecationInfo, "deprecated">) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Deprecation", "true");
    if (info.sunsetDate) {
      res.setHeader("Sunset", info.sunsetDate);
    }
    if (info.replacement) {
      res.setHeader("Link", `<${info.replacement}>; rel="successor-version"`);
    }
    if (info.message) {
      res.setHeader("X-Deprecation-Notice", info.message);
    }
    next();
  };
}

export function getVersionInfo(): {
  currentVersion: ApiVersion;
  supportedVersions: ApiVersion[];
  deprecatedEndpoints: Array<{ path: string; info: DeprecationInfo }>;
} {
  const deprecatedList: Array<{ path: string; info: DeprecationInfo }> = [];
  for (const [path, info] of deprecatedEndpoints) {
    deprecatedList.push({ path, info });
  }

  return {
    currentVersion: CURRENT_VERSION,
    supportedVersions: SUPPORTED_VERSIONS,
    deprecatedEndpoints: deprecatedList,
  };
}
