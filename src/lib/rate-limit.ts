import { createClient } from '@supabase/supabase-js';

// Consistent environment check as per spec
const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: Date;
  tier: string;
  used: number;
}

// Constants for rate limiting
const ANONYMOUS_LIMIT = 3;
const FREE_LIMIT = 5;
const UNLIMITED_LIMIT = 999999;

// Obfuscated cookie name
const COOKIE_NAME = '$dekcuf_teg';

/**
 * Anonymous users (before signup) - Cookie-based rate limiting
 */
export async function checkAnonymousRateLimit(): Promise<RateLimitResult> {
  if (isDevelopment) {
    return {
      allowed: true,
      remaining: UNLIMITED_LIMIT,
      limit: UNLIMITED_LIMIT,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      tier: 'development',
      used: 0
    };
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Decode cookie data
  const decodeCookieData = (encoded: string | null): { count: number; date: string } => {
    if (!encoded) return { count: 0, date: '' };
    try {
      const decoded = atob(encoded);
      const [count, date] = decoded.split('|');
      return { count: parseInt(count) || 0, date: date || '' };
    } catch {
      return { count: 0, date: '' };
    }
  };
  
  const storedData = decodeCookieData(getCookie(COOKIE_NAME));
  
  // Reset if new day
  if (storedData.date !== today) {
    return {
      allowed: true,
      remaining: ANONYMOUS_LIMIT,
      limit: ANONYMOUS_LIMIT,
      resetTime: getNextMidnight(),
      tier: 'anonymous',
      used: 0
    };
  }

  const used = storedData.count;
  const remaining = Math.max(0, ANONYMOUS_LIMIT - used);
  const allowed = used < ANONYMOUS_LIMIT;

  return {
    allowed,
    remaining,
    limit: ANONYMOUS_LIMIT,
    resetTime: getNextMidnight(),
    tier: 'anonymous',
    used
  };
}

/**
 * Authenticated users - Database-based rate limiting
 */
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
  if (isDevelopment) {
    return {
      allowed: true,
      remaining: UNLIMITED_LIMIT,
      limit: UNLIMITED_LIMIT,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      tier: 'development',
      used: 0
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user subscription info from database
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();

  // Determine tier from database subscription info
  const tier = (user?.subscription_status === 'active' && user?.subscription_tier) 
    ? user.subscription_tier 
    : 'free';
  const today = new Date().toISOString().split('T')[0];
  
  const { data: rateLimitRecord } = await supabase
    .from('user_rate_limits')
    .select('usage_count, reset_date')
    .eq('user_id', userId)
    .single();

  // Calculate used first
  const used = (rateLimitRecord && tier === 'free') ? (rateLimitRecord.reset_date === today ? rateLimitRecord.usage_count || 0 : 0) : rateLimitRecord?.usage_count || 0;
  const limit = tier === 'free' ? FREE_LIMIT : UNLIMITED_LIMIT;
  const remaining = tier === 'free' ? Math.max(0, limit - used) : UNLIMITED_LIMIT;
  const allowed = used < limit;

  console.log('[Rate Limit] User rate limit result:', {
    allowed,
    remaining,
    limit,
    resetTime: getNextMidnight(),
    tier,
    used
  });

  return {
    allowed,
    remaining,
    limit,
    resetTime: getNextMidnight(),
    tier,
    used
  };
}

/**
 * Transfer anonymous usage to user account (called once on signup)
 */
export async function transferAnonymousToUser(userId: string): Promise<void> {
  if (isDevelopment) {
    console.log('[Rate Limit] Skipping transfer in development mode');
    return;
  }

  try {
    // Get current anonymous usage from cookies
    const anonymousUsage = getAnonymousUsage();
    
    if (anonymousUsage.used === 0) {
      console.log('[Rate Limit] No anonymous usage to transfer');
      return;
    }

    console.log(`[Rate Limit] Transferring ${anonymousUsage.used} queries to user ${userId}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split('T')[0];

    // Get existing record
    const { data: existingRecord } = await supabase
      .from('user_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingRecord) {
      // Update existing record - add anonymous usage
      const newUsageCount = (existingRecord.usage_count || 0) + anonymousUsage.used;
      
      await supabase
        .from('user_rate_limits')
        .update({
          usage_count: newUsageCount,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`[Rate Limit] Updated user ${userId}: ${existingRecord.usage_count} + ${anonymousUsage.used} = ${newUsageCount}`);
    } else {
      // Create new record with transferred usage
      await supabase
        .from('user_rate_limits')
        .insert({
          user_id: userId,
          usage_count: anonymousUsage.used,
          reset_date: today,
          last_request_at: new Date().toISOString(),
          tier: 'free',
        });

      console.log(`[Rate Limit] Created new record for user ${userId} with ${anonymousUsage.used} usage`);
    }

    // Clear anonymous cookies
    clearAnonymousCookies();
    console.log('[Rate Limit] Successfully transferred anonymous usage and cleared cookies');

  } catch (error) {
    console.error('[Rate Limit] Error transferring usage:', error);
    throw error;
  }
}

/**
 * Increment usage (handles both anonymous and authenticated)
 */
export async function incrementRateLimit(userId?: string): Promise<RateLimitResult> {
  if (isDevelopment) {
    console.log('[Rate Limit] Skipping increment in development mode');
    return userId 
      ? await checkUserRateLimit(userId)
      : await checkAnonymousRateLimit();
  }

  if (userId) {
    // Authenticated user - increment in database
    return await incrementUserRateLimit(userId);
  } else {
    // Anonymous user - increment cookies
    return await incrementAnonymousRateLimit();
  }
}

/**
 * Increment user rate limit in database
 */
async function incrementUserRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];

  // Get current record
  const { data: existingRecord } = await supabase
    .from('user_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  let newUsageCount: number;

  if (existingRecord) {
    // Check if it's a new day
    if (existingRecord.reset_date !== today) {
      // Reset for new day
      newUsageCount = 1;
      await supabase
        .from('user_rate_limits')
        .update({
          usage_count: newUsageCount,
          reset_date: today,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // Increment existing usage
      newUsageCount = (existingRecord.usage_count || 0) + 1;
      await supabase
        .from('user_rate_limits')
        .update({
          usage_count: newUsageCount,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }
  } else {
    // Create new record
    newUsageCount = 1;
    await supabase
      .from('user_rate_limits')
      .insert({
        user_id: userId,
        usage_count: newUsageCount,
        reset_date: today,
        last_request_at: new Date().toISOString(),
        tier: 'free',
      });
  }

  // Return updated rate limit status
  return await checkUserRateLimit(userId);
}

/**
 * Increment anonymous rate limit in cookies
 */
async function incrementAnonymousRateLimit(): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0];
  
  // Decode cookie data using the same encoding as checkAnonymousRateLimit
  const decodeCookieData = (encoded: string | null): { count: number; date: string } => {
    if (!encoded) return { count: 0, date: '' };
    try {
      const decoded = atob(encoded);
      const [count, date] = decoded.split('|');
      return { count: parseInt(count) || 0, date: date || '' };
    } catch {
      return { count: 0, date: '' };
    }
  };

  const encodeCookieData = (count: number, date: string): string => {
    return btoa(`${count}|${date}`);
  };

  const storedData = decodeCookieData(getCookie(COOKIE_NAME));

  // Reset if new day
  const isNewDay = storedData.date !== today;
  const newCount = isNewDay ? 1 : storedData.count + 1;

  // Update cookie with encoded data
  const encodedData = encodeCookieData(newCount, today);
  setCookie(COOKIE_NAME, encodedData);

  const remaining = Math.max(0, ANONYMOUS_LIMIT - newCount);
  const allowed = newCount <= ANONYMOUS_LIMIT;

  return {
    allowed,
    remaining,
    limit: ANONYMOUS_LIMIT,
    resetTime: getNextMidnight(),
    tier: 'anonymous',
    used: newCount
  };
}

/**
 * Get current anonymous usage from cookies
 */
function getAnonymousUsage(): { used: number; remaining: number } {
  if (typeof window === 'undefined') {
    return { used: 0, remaining: ANONYMOUS_LIMIT };
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Decode cookie data
  const decodeCookieData = (encoded: string | null): { count: number; date: string } => {
    if (!encoded) return { count: 0, date: '' };
    try {
      const decoded = atob(encoded);
      const [count, date] = decoded.split('|');
      return { count: parseInt(count) || 0, date: date || '' };
    } catch {
      return { count: 0, date: '' };
    }
  };
  
  const storedData = decodeCookieData(getCookie(COOKIE_NAME));

  // If new day, no usage to transfer
  if (storedData.date !== today) {
    return { used: 0, remaining: ANONYMOUS_LIMIT };
  }

  const used = storedData.count;
  const remaining = Math.max(0, ANONYMOUS_LIMIT - used);

  return { used, remaining };
}

/**
 * Clear anonymous rate limit cookies
 */
function clearAnonymousCookies(): void {
  if (typeof window === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Helper functions for cookie management
 */
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Rate limit display helper
 */
export function getRateLimitDisplay(rateLimit: RateLimitResult | null): string {
  if (!rateLimit) return 'Loading...';
  
  if (isDevelopment) return 'Dev Mode';
  
  if (rateLimit.tier === 'unlimited' || rateLimit.tier === 'pay_per_use') {
    return `${rateLimit.used}/∞ queries`;
  }
  
  return `${rateLimit.used}/${rateLimit.limit} queries`;
}