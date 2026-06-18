import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';

export const runtime = 'edge';

async function randomHex(byteLength: number): Promise<string> {
  const crypto = globalThis.crypto;

  if (!crypto?.getRandomValues) {
    throw new Error('Web Crypto API is not available in this runtime.');
  }

  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * CSRF Token Endpoint
 * GET /api/csrf
 * Generates a new CSRF token and sets a session-id cookie.
 * The token should be included in subsequent state-changing requests
 * via the 'x-csrf-token' header.
 */
export async function GET() {
  // Generate a unique session ID
  const sessionId = await randomHex(16);
  
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
