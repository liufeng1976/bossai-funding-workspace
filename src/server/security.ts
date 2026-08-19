import type { IncomingHttpHeaders } from "node:http";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface BrowserRequestIntegrityDecision {
  allowed: boolean;
  status: 200 | 403 | 415;
  code: "OK" | "CROSS_SITE_REQUEST_BLOCKED" | "ORIGIN_MISMATCH" | "JSON_CONTENT_TYPE_REQUIRED";
  reason: string;
}

export function isLoopbackBindHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return LOOPBACK_HOSTS.has(normalized);
}

export function assertLoopbackBindHost(host: string): void {
  if (!isLoopbackBindHost(host)) {
    throw new Error(
      "Remote network binding is blocked until approved production identity verification, authorization, security review, and explicit remote-bind approval are complete. Use 127.0.0.1, localhost, or ::1.",
    );
  }
}

export function isAllowedRequestHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  const raw = hostHeader.trim().toLowerCase();
  if (raw.startsWith("[")) {
    const closing = raw.indexOf("]");
    if (closing < 0) return false;
    return isLoopbackBindHost(raw.slice(1, closing));
  }
  const host = raw.split(":", 1)[0] ?? "";
  return isLoopbackBindHost(host);
}

export function securityHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "origin-agent-cluster": "?1",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  if (contentType) headers["content-type"] = contentType;
  return headers;
}

function normalizedHostHeader(hostHeader: string | undefined): string | null {
  const host = hostHeader?.trim().toLowerCase();
  return host ? host : null;
}

function originMatchesHost(originHeader: string, hostHeader: string | undefined): boolean {
  const host = normalizedHostHeader(hostHeader);
  if (!host) return false;
  try {
    const origin = new URL(originHeader);
    if (origin.protocol !== "http:") return false;
    return origin.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function evaluateBrowserRequestIntegrity(
  method: string,
  pathname: string,
  headers: IncomingHttpHeaders,
): BrowserRequestIntegrityDecision {
  const normalizedMethod = method.toUpperCase();
  if (!pathname.startsWith("/api/") || !MUTATING_METHODS.has(normalizedMethod)) {
    return { allowed: true, status: 200, code: "OK", reason: "Request does not mutate the BossAI Funding API." };
  }

  const fetchSite = typeof headers["sec-fetch-site"] === "string" ? headers["sec-fetch-site"].toLowerCase() : null;
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return {
      allowed: false,
      status: 403,
      code: "CROSS_SITE_REQUEST_BLOCKED",
      reason: `Browser fetch metadata reports ${fetchSite}; BossAI Funding mutations require same-origin browser requests.`,
    };
  }

  const fetchMode = typeof headers["sec-fetch-mode"] === "string" ? headers["sec-fetch-mode"].toLowerCase() : null;
  if (fetchMode === "no-cors" || fetchMode === "navigate") {
    return {
      allowed: false,
      status: 403,
      code: "CROSS_SITE_REQUEST_BLOCKED",
      reason: `Browser fetch mode ${fetchMode} is not permitted for BossAI Funding API mutations.`,
    };
  }

  const origin = typeof headers.origin === "string" ? headers.origin : null;
  if (origin && !originMatchesHost(origin, headers.host)) {
    return {
      allowed: false,
      status: 403,
      code: "ORIGIN_MISMATCH",
      reason: "The browser Origin does not match the current BossAI Funding loopback Host.",
    };
  }

  const contentType = typeof headers["content-type"] === "string" ? headers["content-type"].toLowerCase() : "";
  if (!contentType.startsWith("application/json")) {
    return {
      allowed: false,
      status: 415,
      code: "JSON_CONTENT_TYPE_REQUIRED",
      reason: "BossAI Funding API mutations require application/json so browser simple-request form/text payloads cannot mutate localhost state.",
    };
  }

  return { allowed: true, status: 200, code: "OK", reason: "Mutation request satisfies the local browser request-integrity boundary." };
}

export function requestHostAllowed(headers: IncomingHttpHeaders): boolean {
  return isAllowedRequestHost(headers.host);
}
