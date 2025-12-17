/**
 * Valyu OAuth 2.1 PKCE Client
 *
 * Implements OAuth 2.1 Authorization Code Flow with PKCE for
 * "Sign in with Valyu" functionality.
 *
 * PKCE (Proof Key for Code Exchange) is required for public clients
 * to protect against authorization code interception attacks.
 *
 * Required Environment Variables:
 * - NEXT_PUBLIC_VALYU_SUPABASE_URL: Valyu Platform's Supabase URL (e.g., https://xxx.supabase.co)
 * - NEXT_PUBLIC_VALYU_CLIENT_ID: OAuth Client ID from Valyu Platform
 * - VALYU_CLIENT_SECRET: OAuth Client Secret (server-side only)
 * - VALYU_APP_URL: Valyu Platform URL (e.g., https://platform.valyu.ai)
 *
 * NOTE: No anon key is needed - OAuth flow uses client_id/client_secret
 */

// Environment configuration
// VALYU_SUPABASE_URL: Valyu Platform's Supabase project URL for OAuth endpoints
// e.g., https://abc123.supabase.co (used for /auth/v1/oauth/*)
const VALYU_SUPABASE_URL = process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL || '';

// VALYU_APP_URL: Valyu Platform app URL for platform-specific endpoints
// e.g., https://platform.valyu.ai (used for /api/oauth/*)
// Check both VALYU_APP_URL (server) and NEXT_PUBLIC_VALYU_APP_URL (client) for flexibility
const VALYU_APP_URL = process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || 'https://platform.valyu.ai';

// VALYU_CLIENT_ID: OAuth Client ID (safe for client-side)
const VALYU_CLIENT_ID = process.env.NEXT_PUBLIC_VALYU_CLIENT_ID || '';

/**
 * OAuth 2.1 Endpoints
 *
 * Two base URLs are used:
 * 1. Valyu Supabase URL (NEXT_PUBLIC_VALYU_SUPABASE_URL) - for standard OAuth endpoints:
 *    - /auth/v1/oauth/authorize - Authorization endpoint
 *    - /auth/v1/oauth/token - Token exchange endpoint
 *
 * 2. Valyu App URL (VALYU_APP_URL) - for platform-specific endpoints:
 *    - /api/oauth/userinfo - User profile information
 *    - /api/oauth/apikey - API key status check
 *    - /api/oauth/proxy - Proxied Valyu API calls (bills to user's org)
 */
export const VALYU_OAUTH_ENDPOINTS = {
  // Supabase OAuth 2.1 endpoints (standard OAuth flow)
  authorize: `${VALYU_SUPABASE_URL}/auth/v1/oauth/authorize`,
  token: `${VALYU_SUPABASE_URL}/auth/v1/oauth/token`,
  // Valyu Platform app endpoints (platform-specific)
  userinfo: `${VALYU_APP_URL}/api/oauth/userinfo`,
  apikey: `${VALYU_APP_URL}/api/oauth/apikey`,
  proxy: `${VALYU_APP_URL}/api/oauth/proxy`,
} as const;

// Storage keys for PKCE flow
const PKCE_VERIFIER_KEY = 'valyu_pkce_verifier';
const OAUTH_STATE_KEY = 'valyu_oauth_state';

/**
 * Generate a cryptographically random string for PKCE
 * Uses Web Crypto API for secure random generation
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('');
}

/**
 * Generate PKCE code verifier
 * Must be 43-128 characters (RFC 7636)
 */
export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Generate PKCE code challenge from verifier using S256 method
 * S256: Base64URL(SHA256(code_verifier))
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url (no padding, URL-safe characters)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate state parameter for CSRF protection
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Store PKCE verifier in localStorage
 * Using localStorage instead of sessionStorage to persist across tabs
 * (needed when email confirmation opens in a new tab)
 */
export function storeCodeVerifier(verifier: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  }
}

/**
 * Retrieve and clear PKCE verifier from localStorage
 */
export function retrieveCodeVerifier(): string | null {
  if (typeof window === 'undefined') return null;
  const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  return verifier;
}

/**
 * Store OAuth state in localStorage
 * Using localStorage instead of sessionStorage to persist across tabs
 * (needed when email confirmation opens in a new tab)
 */
export function storeOAuthState(state: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(OAUTH_STATE_KEY, state);
  }
}

/**
 * Retrieve and clear OAuth state from localStorage
 */
export function retrieveOAuthState(): string | null {
  if (typeof window === 'undefined') return null;
  const state = localStorage.getItem(OAUTH_STATE_KEY);
  localStorage.removeItem(OAUTH_STATE_KEY);
  return state;
}

/**
 * OAuth scopes we request from Valyu
 */
export const VALYU_SCOPES = ['openid', 'email', 'profile'] as const;

/**
 * Build the authorization URL for Valyu OAuth
 */
export async function buildAuthorizationUrl(redirectUri: string): Promise<string> {
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store for callback verification
  storeCodeVerifier(codeVerifier);
  storeOAuthState(state);

  // Build URL parameters
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: VALYU_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: VALYU_SCOPES.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${VALYU_OAUTH_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 *
 * For confidential clients, this calls our server-side API route
 * which includes the client_secret (kept secure on server).
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<TokenResponse> {
  // Call our server-side token exchange endpoint
  // This keeps the client_secret secure on the server
  const response = await fetch('/api/auth/valyu/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'token_exchange_failed' }));
    throw new OAuthError(error.error || 'token_exchange_failed', error.error_description);
  }

  return response.json();
}

/**
 * Fetch user info from Valyu
 */
export async function fetchValyuUserInfo(accessToken: string): Promise<ValyuUserInfo> {
  const response = await fetch(VALYU_OAUTH_ENDPOINTS.userinfo, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OAuthError('userinfo_failed', 'Failed to fetch user info');
  }

  return response.json();
}

/**
 * Fetch API key info from Valyu
 */
export async function fetchValyuApiKeyInfo(accessToken: string): Promise<ValyuApiKeyInfo> {
  const response = await fetch(VALYU_OAUTH_ENDPOINTS.apikey, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OAuthError('apikey_failed', 'Failed to fetch API key info');
  }

  return response.json();
}

/**
 * Token response from OAuth token endpoint
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

/**
 * User info from Valyu's userinfo endpoint
 */
export interface ValyuUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  valyu_user_type?: 'buyer' | 'seller';
  valyu_organisation_id?: string;
  valyu_organisation_name?: string;
}

/**
 * API key info from Valyu
 */
export interface ValyuApiKeyInfo {
  has_api_key: boolean;
  api_keys: Array<{
    id: string;
    name: string;
    key_preview: string;
    created_at: string;
  }>;
  credits_available: boolean;
  organisation_id?: string;
}

/**
 * Custom OAuth error class
 */
export class OAuthError extends Error {
  constructor(
    public code: string,
    public description?: string
  ) {
    super(description || code);
    this.name = 'OAuthError';
  }
}

/**
 * Validate OAuth callback parameters
 */
export function validateCallback(
  code: string | null,
  state: string | null,
  error: string | null
): { valid: boolean; error?: string } {
  // Check for OAuth error
  if (error) {
    return { valid: false, error };
  }

  // Verify code is present
  if (!code) {
    return { valid: false, error: 'missing_code' };
  }

  // Verify state matches (CSRF protection)
  const storedState = retrieveOAuthState();
  if (!state || state !== storedState) {
    return { valid: false, error: 'invalid_state' };
  }

  return { valid: true };
}

/**
 * Make a proxied Valyu API call using the user's OAuth token
 * The proxy validates the token and uses the user's org API key server-side
 *
 * @param accessToken - User's Valyu OAuth access token
 * @param path - Valyu API path (e.g., "/v1/search", "/v1/deepsearch")
 * @param body - Request body to send to the API
 * @param method - HTTP method (default: POST)
 */
export async function proxyValyuApi<T = unknown>(
  accessToken: string,
  path: string,
  body?: Record<string, unknown>,
  method: string = 'POST'
): Promise<T> {
  const response = await fetch(VALYU_OAUTH_ENDPOINTS.proxy, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      method,
      body,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'proxy_failed' }));
    throw new OAuthError(error.error || 'proxy_failed', error.error_description);
  }

  return response.json();
}

/**
 * Convenience function to search via proxy
 */
export async function proxyValyuSearch(
  accessToken: string,
  query: string,
  options?: {
    maxNumResults?: number;
    includedSources?: string[];
    searchType?: string;
  }
): Promise<ValyuSearchResponse> {
  return proxyValyuApi<ValyuSearchResponse>(accessToken, '/v1/search', {
    query,
    maxNumResults: options?.maxNumResults || 10,
    includedSources: options?.includedSources,
    searchType: options?.searchType || 'all',
  });
}

/**
 * Valyu search response structure
 */
export interface ValyuSearchResponse {
  results: Array<{
    title: string;
    content: string;
    url: string;
    source: string;
    relevance_score: number;
    data_type?: string;
    [key: string]: unknown;
  }>;
  total_deduction_dollars?: number;
  [key: string]: unknown;
}
