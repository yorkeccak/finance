'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  exchangeCodeForTokens,
  fetchValyuApiKeyInfo,
  validateCallback,
  retrieveCodeVerifier,
  OAuthError,
} from '@/lib/valyu-oauth';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { track } from '@vercel/analytics';

function ValyuCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completeValyuAuth = useAuthStore((state) => state.completeValyuAuth);
  const setValyuTokens = useAuthStore((state) => state.setValyuTokens);
  const setApiKeyStatus = useAuthStore((state) => state.setApiKeyStatus);

  useEffect(() => {
    const completeOAuth = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        // Validate callback (checks CSRF state)
        const validation = validateCallback(code, state, null);
        if (!validation.valid) {
          throw new OAuthError('validation_failed', validation.error);
        }

        // Get PKCE verifier from localStorage
        const codeVerifier = retrieveCodeVerifier();
        if (!codeVerifier) {
          throw new OAuthError('missing_verifier', 'PKCE verifier not found. Please try signing in again.');
        }

        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/valyu/callback`;
        const tokens = await exchangeCodeForTokens(code!, redirectUri, codeVerifier);

        // Check if we have an ID token for Supabase OIDC flow
        if (tokens.id_token) {
          // Complete auth with Supabase (creates/links user in Finance DB)
          const result = await completeValyuAuth(
            tokens.id_token,
            tokens.access_token,
            tokens.refresh_token,
            tokens.expires_in
          );

          if (!result.success && result.error) {
            console.warn('[Valyu OAuth] Supabase auth failed, using Valyu-only mode:', result.error);
          }
        } else {
          // No ID token - just store Valyu tokens for API calls
          console.warn('[Valyu OAuth] No ID token received, using Valyu-only mode');
          setValyuTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
        }

        // Fetch API key info (optional - for credit status)
        try {
          const apiKeyInfo = await fetchValyuApiKeyInfo(tokens.access_token);
          setApiKeyStatus(apiKeyInfo.has_api_key, apiKeyInfo.credits_available);
        } catch (apiKeyError) {
          // API key fetch is optional - user might not have one yet
          console.warn('[Valyu OAuth] Could not fetch API key info:', apiKeyError);
          setApiKeyStatus(false, false);
        }

        setStatus('success');

        // Track successful sign in
        track('Sign In Complete', { method: 'valyu' });

        // Redirect to home after short delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (error) {
        console.error('[Valyu OAuth] Token exchange failed:', error);

        const message = error instanceof OAuthError
          ? error.description || error.code
          : 'An unexpected error occurred';

        setErrorMessage(message);
        setStatus('error');

        // Track failed sign in
        track('Sign In Failed', {
          method: 'valyu',
          error: message,
        });

        // Redirect to home with error after delay
        setTimeout(() => {
          router.push(`/?error=valyu_auth_failed&message=${encodeURIComponent(message)}`);
        }, 3000);
      }
    };

    completeOAuth();
  }, [searchParams, router, completeValyuAuth, setValyuTokens, setApiKeyStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-medium text-foreground">Connecting to Valyu...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we complete your sign in.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-foreground">Connected to Valyu!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you back to the app...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-foreground">Connection Failed</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <p className="text-xs text-muted-foreground">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ValyuCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ValyuCallbackContent />
    </Suspense>
  );
}
