import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's Polar customer ID from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData } = await supabase
      .from('users')
      .select('polar_customer_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (!userData?.polar_customer_id) {
      return NextResponse.json({
        error: 'No billing account found. Please contact support.'
      }, { status: 404 });
    }

    // Allow any user with a Polar customer ID to access billing portal
    // This includes active, cancelled, and unlimited users for plan management
    console.log('[Customer Portal] User billing data:', {
      tier: userData.subscription_tier,
      status: userData.subscription_status,
      polar_customer_id: userData.polar_customer_id
    });

    // Create customer session for billing portal access
    const polar = new Polar({ 
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      server: process.env.NEXT_PUBLIC_APP_MODE === 'development' ? 'sandbox' : 'production'
    });

    console.log('[Customer Portal] Creating session for customer:', userData.polar_customer_id);

    const session = await polar.customerSessions.create({
      customerId: userData.polar_customer_id
    });

    console.log('[Customer Portal] ✅ Created session, redirecting to:', session.customerPortalUrl);

    return NextResponse.json({
      redirectUrl: session.customerPortalUrl
    });

  } catch (error: any) {
    console.error('[Customer Portal] Error creating session:', error);
    
    return NextResponse.json({
      error: 'Failed to access billing portal. Please try again later.'
    }, { status: 500 });
  }
}