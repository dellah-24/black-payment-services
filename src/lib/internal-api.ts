/**
 * First-party server-side self-request helper.
 *
 * The payment/escrow/invoice monitors run inside the Next.js server and call
 * the app's own API routes (e.g. /api/escrow/:id/settle, /api/payments/:id/forward)
 * to reuse the same business logic as the public HTTP API.
 *
 * In production those self-calls were being routed to the PUBLIC origin
 * (NEXT_PUBLIC_APP_URL / APP_URL, i.e. the Cloudflare-fronted domain). Cloudflare's
 * Super Bot Fight Mode classifies the undici/Node fetch client as automated traffic
 * and returns a 301/403, which silently broke the monitor's internal actions.
 *
 * Fix:
 *  1. Prefer INTERNAL_APP_URL — a direct, non-proxied origin (http://localhost:3000
 *     or the server's private address) so traffic never traverses the Cloudflare edge.
 *  2. Always send a descriptive first-party User-Agent + X-Internal-Request header so
 *     that, if a request does reach the edge, it is not flagged as an anonymous bot and
 *     can be allow-listed by a WAF rule.
 */

const INTERNAL_USER_AGENT =
  'TempestTouch-InternalMonitor/1.0 (+https://tempesttouch.com; first-party server-side request)';

/**
 * Resolve the origin used for first-party server-side self-calls.
 *
 * Priority: INTERNAL_APP_URL (direct, bypasses Cloudflare) → APP_URL →
 * NEXT_PUBLIC_APP_URL → http://localhost:3000.
 */
export function internalAppUrl(): string {
  const raw =
    process.env.INTERNAL_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/**
 * Headers that identify a request as a trusted first-party internal call.
 * The descriptive User-Agent prevents Cloudflare SBFM from classifying the
 * request as an anonymous/automated bot, and X-Internal-Request can be used
 * as an allow-list signal at the edge.
 */
export const INTERNAL_REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': INTERNAL_USER_AGENT,
  Accept: 'application/json',
  'X-Internal-Request': 'true',
};

/**
 * fetch() wrapper for first-party internal API calls. Builds the URL from
 * internalAppUrl() and merges the first-party headers with any caller-supplied
 * headers (caller headers win on conflict).
 */
export async function internalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = internalAppUrl();
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  const headers: Record<string, string> = {
    ...INTERNAL_REQUEST_HEADERS,
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetch(url, { ...init, headers });
}
