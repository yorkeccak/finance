import { NextRequest, NextResponse } from 'next/server';

/**
 * Valyu OAuth Token Exchange (Server-side)
 *
 * This endpoint handles the OAuth token exchange for confidential clients.
 * The client_secret is kept server-side and never exposed to the browser.
 *
 * Security:
 * - Validates redirect_uri against allowlist
 * - Sanitizes error messages
 * - Rate limiting handled by Vercel WAF / firewall rules
 */

const VALYU_SUPABASE_URL = process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL || '';
const VALYU_CLIENT_ID = process.env.NEXT_PUBLIC_VALYU_CLIENT_ID || '';
const VALYU_CLIENT_SECRET = process.env.VALYU_CLIENT_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// Allowed redirect URIs - must match exactly
const ALLOWED_REDIRECT_URIS = [
  `${APP_URL}/auth/valyu/callback`,
  'http://localhost:3000/auth/valyu/callback',
  'http://127.0.0.1:3000/auth/valyu/callback',
].filter(Boolean); // Remove empty strings if APP_URL not set

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirect_uri, code_verifier } = body;

    if (!code || !redirect_uri || !code_verifier) {
      return NextResponse.json(
        { error: 'missing_parameters', error_description: 'code, redirect_uri, and code_verifier are required' },
        { status: 400 }
      );
    }

    // Validate redirect_uri against allowlist
    if (!ALLOWED_REDIRECT_URIS.includes(redirect_uri)) {
      console.warn('[Valyu Token] Invalid redirect_uri attempted:', redirect_uri);
      return NextResponse.json(
        { error: 'invalid_redirect_uri', error_description: 'Redirect URI not allowed' },
        { status: 400 }
      );
    }

    if (!VALYU_SUPABASE_URL || !VALYU_CLIENT_ID || !VALYU_CLIENT_SECRET) {
      console.error('[Valyu Token] Missing OAuth configuration');
      return NextResponse.json(
        { error: 'server_error', error_description: 'OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange code for tokens at Supabase OAuth token endpoint
    const tokenEndpoint = `${VALYU_SUPABASE_URL}/auth/v1/oauth/token`;

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: VALYU_CLIENT_ID,
        client_secret: VALYU_CLIENT_SECRET,
        code: code,
        redirect_uri: redirect_uri,
        code_verifier: code_verifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      // Log error server-side for debugging
      console.error('[Valyu Token] Token exchange failed:', tokenData.error || tokenData.msg || 'Unknown error');

      // Sanitize error messages - don't leak internal Supabase errors
      const SAFE_ERROR_MESSAGES: Record<string, string> = {
        'invalid_grant': 'Authorization code is invalid or expired. Please try again.',
        'invalid_client': 'OAuth configuration error. Please contact support.',
        'invalid_request': 'Invalid request. Please try again.',
      };

      return NextResponse.json(
        {
          error: tokenData.error || 'token_exchange_failed',
          error_description: SAFE_ERROR_MESSAGES[tokenData.error] || 'Failed to exchange authorization code. Please try again.'
        },
        { status: 400 } // Always return 400 for token errors, don't leak Supabase status codes
      );
    }

    // Return tokens to client
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('[Valyu Token] Unexpected error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
