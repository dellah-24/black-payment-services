import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimiterSupabase';
import { logger } from '@/lib/logger';
import { generateCSRFToken, validateCSRFToken, cleanupCSRFTokens } from '@/lib/csrf';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

// Rate limiting constants
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window

export async function middleware(request: NextRequest) {
  try {
    // Get client IP
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '';
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

    // Apply rate limiting in production
    if (isSupabaseConfigured()) {
      try {
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
      } catch (rateLimitError) {
        // Log but don't block the request if rate limiting fails
        logger.error('Rate limit check failed in middleware', rateLimitError as Error, { ip });
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
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-elem 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.infura.io https://*.alchemy.com https://cloudflare-eth.com https://eth.drpc.org https://rpc.ankr.com https://*.ankr.com https://*.drpc.org https://api.coingecko.com;",
    );

    return response;
  } catch (error) {
    // Log the error but allow the request to proceed
    // This prevents middleware errors from causing 500s on page loads
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (RSC data requests - must be excluded to avoid 500 errors)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico).*)',
  ],
};
