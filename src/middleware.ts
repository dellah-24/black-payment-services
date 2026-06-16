import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimiterSupabase';
import { logger } from '@/lib/logger';
import { generateCSRFToken, validateCSRFToken, cleanupCSRFTokens } from '@/lib/csrf';

// Rate limiting constants (legacy fallback only)
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window

// Legacy in-memory rate limiting (fallback only - Supabase is primary)
const legacyRateLimit = new Map<string, { count: number; startTime: number }>();



function cleanUpLegacyRateLimit(now: number): void {
  for (const [key, value] of legacyRateLimit.entries()) {
    if (now - value.startTime > WINDOW_MS) {
      legacyRateLimit.delete(key);
    }
  }
}

export async function middleware(request: NextRequest) {
  // Get client IP
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();

  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Clean up expired CSRF tokens periodically
  if (Math.random() < 0.01) { // 1% chance to clean up on each request
    cleanupCSRFTokens();
  }

   // CSRF protection for state-changing requests
   const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
   if (stateChangingMethods.includes(request.method)) {
     const sessionId = request.cookies.get('session-id')?.value || ip;
     const csrfToken = request.headers.get('x-csrf-token');

     if (!csrfToken || !validateCSRFToken(sessionId, csrfToken!)) {
       return NextResponse.json(
         { error: 'Invalid or missing CSRF token' },
         { status: 403 }
       );
     }
   }

// Skip rate limiting for localhost in development to avoid self-throttling
    const isLocalhost = ip === '127.0.0.1' || ip === '::1';
   if (!isLocalhost || process.env.NODE_ENV !== 'development') {
     // Check rate limit using Supabase (persistent across serverless instances)
     const rateLimit = await checkRateLimit(ip);
     if (!rateLimit.allowed) {
       return NextResponse.json(
         {
           error: 'Too many requests. Please try again later.',
           retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
         },
         { status: 429 }
       );
     }
   }
  
  // Legacy fallback: also check in-memory for backward compatibility during migration
  // This provides double-layer protection in development mode
  if (process.env.NODE_ENV === 'development') {
    cleanUpLegacyRateLimit(now);
    const legacyRecord = legacyRateLimit.get(ip);
    if (legacyRecord && now - legacyRecord.startTime < WINDOW_MS) {
      if (legacyRecord.count >= MAX_REQUESTS) {
        return NextResponse.json(
          { error: 'Rate limit exceeded (development mode)' },
          { status: 429 }
        );
      }
      legacyRecord.count++;
    } else {
      legacyRateLimit.set(ip, { count: 1, startTime: now });
    }
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.infura.io https://*.alchemy.com https://cloudflare-eth.com https://eth.drpc.org https://rpc.ankr.com https://*.ankr.com https://*.drpc.org https://api.coingecko.com;",
  );

  return response;
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
