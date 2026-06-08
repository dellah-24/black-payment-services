import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { generateCSRFToken } from '@/lib/csrf';

/**
 * CSRF Token Endpoint
 * GET /api/csrf
 * Generates a new CSRF token and sets a session-id cookie.
 * The token should be included in subsequent state-changing requests
 * via the 'x-csrf-token' header.
 */
export async function GET() {
  // Generate a unique session ID
  const sessionId = randomBytes(16).toString('hex');
  
  // Generate CSRF token and store it server-side
  const token = generateCSRFToken(sessionId);
  
  // Create response with token in JSON body
  const response = NextResponse.json({ csrfToken: token });
  
  // Set session-id cookie (HttpOnly for security, not accessible to JS)
  response.cookies.set('session-id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 1 day in seconds
    path: '/',
  });
  
  // Optionally, also set a non-HttpOnly cookie with the CSRF token
  // This allows client to read it if needed, but we recommend storing in memory
  // Uncomment if you prefer cookie-based client storage:
  // response.cookies.set('csrf-token', token, {
  //   httpOnly: false,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'strict',
  //   maxAge: 60 * 60, // 1 hour
  //   path: '/',
  // });
  
  return response;
}
