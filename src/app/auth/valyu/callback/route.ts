import { NextRequest, NextResponse } from 'next/server';

/**
 * Valyu OAuth 2.1 Callback Handler
 *
 * This route handles the OAuth callback from Valyu after user authorization.
 * It redirects to a client page that will complete the token exchange using PKCE.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from the authorization server
  if (error) {
    console.error('[Valyu OAuth] Authorization error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/?error=valyu_auth_failed&message=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Validate callback parameters (checks state for CSRF)
  // Note: State validation happens client-side since state is stored in localStorage
  if (!code) {
    console.error('[Valyu OAuth] No authorization code received');
    return NextResponse.redirect(`${origin}/?error=valyu_auth_failed&message=no_code`);
  }

  // We need to pass data to the client to complete the flow
  // Since PKCE verifier is in localStorage (client-side), we redirect to a client page
  // that will complete the token exchange
  const clientCallbackUrl = new URL(`${origin}/auth/valyu/complete`);
  clientCallbackUrl.searchParams.set('code', code);
  clientCallbackUrl.searchParams.set('state', state || '');

  return NextResponse.redirect(clientCallbackUrl.toString());
}
