/**
 * Simplified access validation using Polar Customer State API
 * Replaces the complex 140-line payment-validation.ts
 * Following POLAR_BILLING_SYSTEM_REDESIGN_V2.md specification
 */

import { Polar } from '@polar-sh/sdk';

export interface AccessValidationResult {
  hasAccess: boolean;
  tier: 'free' | 'pay_per_use' | 'unlimited';
  usageBalance?: number;
  requiresPaymentSetup?: boolean;
}

export async function validateAccess(userId: string): Promise<AccessValidationResult> {
  // Development mode bypass
  if (process.env.NEXT_PUBLIC_APP_MODE === 'development') {
    return { hasAccess: true, tier: 'unlimited' };
  }

  try {
    // Use database subscription state (updated by webhooks) instead of Polar API
    // This is more reliable and faster than calling Polar API
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single();

    // Determine access based on database subscription state
    const isActive = user?.subscription_status === 'active';
    const tier = (isActive && user?.subscription_tier) ? user.subscription_tier : 'free';

    console.log('[Access Validation] Database state:', {
      userId,
      subscription_tier: user?.subscription_tier,
      subscription_status: user?.subscription_status,
      computed_tier: tier,
      hasAccess: isActive || tier === 'free'
    });

    // Unlimited and pay_per_use users have access when active
    // Free users always have access (but with rate limits)
    const hasAccess = isActive || tier === 'free';

    // Only require payment setup for free users who want to upgrade
    const requiresPaymentSetup = tier === 'free';

    return { 
      hasAccess, 
      tier: tier as 'free' | 'pay_per_use' | 'unlimited',
      requiresPaymentSetup 
    };
    
  } catch (error: any) {
    console.error('[Access Validation] Error checking database state:', error);
    
    // Safe default: allow access as free tier
    return { 
      hasAccess: true, 
      tier: 'free',
      requiresPaymentSetup: false 
    };
  }
}