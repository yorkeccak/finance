import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { transferAnonymousToUser } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session?.user) {
      console.log('[Auth Callback] OAuth successful for user:', data.session.user.email);
      
      // Create or update user profile
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, subscription_tier')
        .eq('id', data.session.user.id)
        .single();

      // Only create/update if user doesn't exist, or update email without touching subscription
      if (!existingUser) {
        // New user - set default free tier
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.session.user.id,
            email: data.session.user.email,
            subscription_tier: 'free'
          });

        if (profileError) {
          console.error('[Auth Callback] Profile creation error:', profileError);
        } else {
          console.log('[Auth Callback] New user profile created successfully');
        }
      } else {
        // Existing user - only update email if changed, preserve subscription
        const { error: profileError } = await supabase
          .from('users')
          .update({
            email: data.session.user.email
          })
          .eq('id', data.session.user.id);

        if (profileError) {
          console.error('[Auth Callback] Profile update error:', profileError);
        } else {
          console.log('[Auth Callback] Existing user email updated, subscription preserved');
        }
      }

      // Transfer anonymous usage to user account
      try {
        await transferAnonymousToUser(data.session.user.id);
        console.log('[Auth Callback] Anonymous usage transferred successfully');
      } catch (transferError) {
        console.error('[Auth Callback] Failed to transfer anonymous usage:', transferError);
      }

      // Success - redirect to app
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // OAuth failed - redirect with error
  console.error('[Auth Callback] OAuth failed or no code provided');
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}