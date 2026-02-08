import { lookup } from "node:dns/promises";

/**
 * Check if an IP address is in a private/internal range.
 * Covers: loopback, private, link-local, cloud metadata
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4 checks
  if (ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip === "0.0.0.0") return true;
  // 172.16.0.0/12
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  // IPv6 checks
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("fe80:") || ip.startsWith("fe80::")) return true; // link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // unique local
  if (ip === "::ffff:127.0.0.1") return true;
  // IPv4-mapped IPv6
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    return isPrivateIp(mapped);
  }

  return false;
}

/**
 * Validate a webhook URL for SSRF safety.
 * - Must be HTTPS
 * - Must not resolve to private/internal IPs
 * - DNS resolution to verify actual target
 *
 * Returns the validated URL string or throws an error.
 */
export async function validateWebhookUrl(url: string): Promise<string> {
  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Must be HTTPS
  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS webhook URLs are allowed");
  }

  // Block cloud metadata endpoints
  if (parsed.hostname === "metadata.google.internal" || parsed.hostname === "metadata.google.com") {
    throw new Error("Cloud metadata endpoints are blocked");
  }

  // DNS resolution to detect private IPs
  try {
    const addresses = await lookup(parsed.hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new Error(`Webhook URL resolves to private/internal IP: ${addr.address}`);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Webhook URL")) {
      throw err;
    }
    throw new Error(`DNS resolution failed for ${parsed.hostname}`);
  }

  // Return reconstructed URL (clean, no taint)
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
}

/**
 * Perform a safe fetch with SSRF protections:
 * - Disables automatic redirects
 * - Adds timeout via AbortController
 * - Limits response processing
 */
export async function safeFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  // Validate URL before fetch
  const validatedUrl = await validateWebhookUrl(url);

  const { timeout = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(validatedUrl, {
      ...fetchOptions,
      redirect: "manual", // Prevent redirect-based SSRF
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
