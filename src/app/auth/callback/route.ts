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
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.session.user.id,
          email: data.session.user.email,
          subscription_tier: 'free'
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError) {
        console.error('[Auth Callback] Profile creation error:', profileError);
      } else {
        console.log('[Auth Callback] User profile created/updated successfully');
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