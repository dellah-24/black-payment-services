import { NextResponse, type NextRequest } from "next/server";

// This single Edge middleware replaces both the previous Edge `middleware.ts`
// (referral cookie tracking) and the Node.js-runtime `src/proxy.ts` (CORS,
// security headers, rate limiting). OpenNext Cloudflare does not support
// Next.js Node.js middleware (`proxy.ts`), so that logic is merged here and
// the `setInterval` cleanup (not available on the Edge runtime) was removed —
// stale rate-limit entries are still discarded via the `resetAt` check.

// ── Referral tracking (inlined from @profullstack/referrals/next) ──
const REF_PARAM = "ref";
const REFERRAL_COOKIE = "referral_code";
const REFERRAL_MAX_AGE = 60 * 60 * 24 * 30;

// ── CORS Configuration ──
const PRODUCTION_ORIGINS = new Set([
  "https://coinpayportal.com",
  "https://www.coinpayportal.com",
]);

function getExtraOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  if (getExtraOrigins().includes(origin)) return true;
  return false;
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, x-api-key, X-CoinPay-Signature",
    "Access-Control-Max-Age": "86400",
  };

  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

// ── Rate Limiting (per Edge isolate; best-effort) ──
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const GENERAL_LIMIT = 60;
const AUTH_LIMIT = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(
  ip: string,
  isAuth: boolean
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  const key = isAuth ? `auth:${ip}` : `api:${ip}`;
  const limit = isAuth ? AUTH_LIMIT : GENERAL_LIMIT;
  const now = Date.now();
  let entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    rateLimitMap.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed: entry.count <= limit,
    limit,
    remaining,
    resetAt: entry.resetAt,
  };
}

// ── Security headers ──
function addSecurityHeaders(
  response: NextResponse,
  isApiRoute: boolean,
  requestOrigin: string | null
) {
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // CSP is configured in next.config.mjs headers() to avoid duplication.

  if (isApiRoute) {
    const corsHeaders = getCorsHeaders(requestOrigin);
    if (corsHeaders["Access-Control-Allow-Origin"]) {
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
    }
  }
}

function setReferralCookie(response: NextResponse, request: NextRequest) {
  const code = request.nextUrl.searchParams.get(REF_PARAM);
  if (code) {
    response.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: false, // readable by client JS for prefill
      sameSite: "lax",
      maxAge: REFERRAL_MAX_AGE,
      path: "/",
    });
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const requestOrigin = request.headers.get("origin");

  // Handle CORS preflight for API routes
  if (isApiRoute && request.method === "OPTIONS") {
    const corsHeaders = getCorsHeaders(requestOrigin);
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  if (isApiRoute) {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const isAuthEndpoint = pathname.startsWith("/api/auth/");

    // Skip rate limiting if we can't identify the client
    if (!clientIp) {
      const response = NextResponse.next();
      addSecurityHeaders(response, isApiRoute, requestOrigin);
      setReferralCookie(response, request);
      return response;
    }

    const rl = checkRateLimit(clientIp, isAuthEndpoint);
    const corsHeaders = getCorsHeaders(requestOrigin);

    if (!rl.allowed) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({ success: false, error: "Too many requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
            ...corsHeaders,
          },
        }
      );
    }

    const response = NextResponse.next();
    addSecurityHeaders(response, isApiRoute, requestOrigin);
    response.headers.set("X-RateLimit-Limit", String(rl.limit));
    response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(rl.resetAt / 1000))
    );
    setReferralCookie(response, request);
    return response;
  }

  const response = NextResponse.next();
  addSecurityHeaders(response, isApiRoute, requestOrigin);
  setReferralCookie(response, request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
