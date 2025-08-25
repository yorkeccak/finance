import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PolarEventTracker } from '@/lib/polar-events';

export async function POST(request: NextRequest) {
  try {
    const { fromTheme, toTheme, sessionId } = await request.json();

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user's subscription tier and polar customer ID
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, polar_customer_id')
      .eq('id', user.id)
      .single();

    const tier = userData?.subscription_tier || 'free';
    const polarCustomerId = userData?.polar_customer_id;

    console.log('[Dark Mode Usage API] User data:', {
      userId: user.id,
      tier,
      polarCustomerId,
      hasCustomerId: !!polarCustomerId
    });

    // Only track usage for pay-per-use customers with a polar customer ID
    if (tier === 'pay_per_use' && polarCustomerId) {
      const polarTracker = new PolarEventTracker();
      
      await polarTracker.trackDarkModeSwitch(
        user.id,
        sessionId || 'no-session',
        fromTheme,
        toTheme,
        {
          component: 'theme_switcher',
          user_tier: tier,
          supabase_user_id: user.id
        }
      );
    } else {
      console.log('[Dark Mode Usage API] Skipping tracking - tier:', tier, 'has polar ID:', !!polarCustomerId);
    }

    return NextResponse.json({ success: true, tracked: tier === 'pay_per_use' });
  } catch (error) {
    console.error('[Dark Mode Usage API] Error:', error);
    return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
  }
}