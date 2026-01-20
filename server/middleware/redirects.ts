/**
 * 301 Redirects Middleware
 * 
 * Handles permanent redirects for SEO purposes:
 * - Travel style short URLs
 * - Privacy policy redirect
 * - Search query parameter stripping
 * - www to non-www domain redirect
 */

import { Request, Response, NextFunction } from 'express';

interface RedirectRule {
  from: string;
  to: string;
  exact?: boolean;
}

const STATIC_REDIRECTS: RedirectRule[] = [
  { from: '/adventure', to: '/travel-styles/adventure-outdoors-complete-guide', exact: true },
  { from: '/family', to: '/travel-styles/family-travel-complete-guide', exact: true },
  { from: '/romance', to: '/travel-styles/honeymoon-romance-complete-guide', exact: true },
  { from: '/privacy-policy', to: '/privacy', exact: true },
];

/**
 * Get the canonical protocol, respecting proxy headers
 */
function getProtocol(req: Request): string {
  const forwardedProto = req.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim();
  }
  return req.protocol || 'https';
}

/**
 * Get the canonical host without port (for production redirects)
 */
function getCanonicalHost(host: string): string {
  return host.replace(/^www\./, '').replace(/:\d+$/, '');
}

export function redirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  const host = req.get('host') || '';
  const path = req.path;
  const fullUrl = req.originalUrl;

  if (host.startsWith('www.')) {
    const canonicalHost = getCanonicalHost(host);
    const protocol = getProtocol(req);
    const newUrl = `${protocol}://${canonicalHost}${fullUrl}`;
    console.log(`[Redirects] www to non-www: ${host}${fullUrl} → ${newUrl}`);
    res.redirect(301, newUrl);
    return;
  }

  const normalizedSearchPath = path.toLowerCase().replace(/\/+$/, '') || '/';
  if (normalizedSearchPath === '/search' && req.query.q) {
    console.log(`[Redirects] Search query strip: ${fullUrl} → /search`);
    res.redirect(301, '/search');
    return;
  }

  for (const rule of STATIC_REDIRECTS) {
    const normalizedPath = path.toLowerCase().replace(/\/+$/, '') || '/';
    const normalizedFrom = rule.from.toLowerCase().replace(/\/+$/, '') || '/';
    
    if (rule.exact && normalizedPath === normalizedFrom) {
      console.log(`[Redirects] Static redirect: ${path} → ${rule.to}`);
      res.redirect(301, rule.to);
      return;
    }
  }

  next();
}

export function getRedirectRules(): RedirectRule[] {
  return [...STATIC_REDIRECTS];
}
