import { createClient } from '@supabase/supabase-js';

export interface UserRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  tier: string;
}

export async function checkUserRateLimit(userId: string): Promise<UserRateLimitResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user subscription tier
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  const tier = user?.subscription_tier || 'free';

  // Only unlimited tiers have no limits - pay_per_use and free have same limits
  if (tier === 'unlimited') {
    return {
      allowed: true,
      remaining: -1, // Unlimited
      resetTime: new Date(),
      tier
    };
  }

  // Free tier AND pay_per_use tier: check daily usage (same 5 query limit)
  // pay_per_use gets charged but still has the 5/day limit for cost control
  const today = new Date().toISOString().split('T')[0];
  
  // Count today's queries (user messages only)
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)
    .in('session_id', 
      // Subquery to get user's sessions
      await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .then(({ data }) => data?.map(s => s.id) || [])
    );

  const used = count || 0;
  const limit = 5; // Same limit for free and pay_per_use
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    remaining,
    resetTime: new Date(new Date().setHours(23, 59, 59, 999)),
    tier
  };
}