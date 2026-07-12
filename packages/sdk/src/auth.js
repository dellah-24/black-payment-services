/**
 * Auth SDK Module
 *
 * Authentication functions for registration, login, and merchant management.
 *
 * @example
 * import { TempestTouchClient } from '@profullstack/tempesttouch';
 * import { registerMerchant, loginMerchant, getMe } from '@profullstack/tempesttouch/auth';
 */

/**
 * Register a new merchant account
 * @param {import('./client.js').TempestTouchClient} client - Tempest Touch client (can be unauthenticated)
 * @param {Object} params
 * @param {string} params.email - Merchant email
 * @param {string} params.password - Account password
 * @param {string} [params.name] - Optional merchant name
 * @returns {Promise<Object>} { success: boolean, merchant: Object, token: string }
 */
export async function registerMerchant(client, { email, password, name }) {
  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');

  return client.requestUnauthenticated('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name,
    }),
  });
}

/**
 * Login to merchant account
 * @param {import('./client.js').TempestTouchClient} client - Tempest Touch client (can be unauthenticated)
 * @param {Object} params
 * @param {string} params.email - Merchant email
 * @param {string} params.password - Account password
 * @returns {Promise<Object>} { success: boolean, merchant: Object, token: string }
 */
export async function loginMerchant(client, { email, password }) {
  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');

  return client.requestUnauthenticated('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

/**
 * Get current authenticated merchant info
 * @param {import('./client.js').TempestTouchClient} client - Authenticated Tempest Touch client
 * @returns {Promise<Object>} Merchant information
 */
export async function getMe(client) {
  return client.request('/auth/me', {
    method: 'POST',
  });
}