/**
 * Client-side CSRF token management
 * Stores the current CSRF token in memory
 */

let csrfToken: string | null = null;

/**
 * Set the CSRF token (called after fetching from /api/csrf)
 */
export function setCsrfToken(token: string): void {
  csrfToken = token;
}

/**
 * Get the current CSRF token
 */
export function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}
