import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  checkAnonymousRateLimit, 
  checkUserRateLimit, 
  incrementRateLimit
} from '@/lib/rate-limit';

/**
 * GET /api/rate-limit - Fetch current rate limit status
 */
export async function GET(request: NextRequest) {
  try {
    // Check if development mode (consistent with spec)
    const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
    
    if (isDevelopment) {
      return NextResponse.json({
        allowed: true,
        remaining: 999999,
        limit: 999999,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tier: 'development',
        used: 0,
        isAuthenticated: false,
      });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let rateLimitResult;

    if (user) {
      // Authenticated user - use database-based rate limiting
      rateLimitResult = await checkUserRateLimit(user.id);
      console.log('[Rate Limit API] Authenticated user rate limit result:', rateLimitResult);
      
      // Get user's polar customer ID for billing portal access
      const { data: userData } = await supabase
        .from('users')
        .select('polar_customer_id')
        .eq('id', user.id)
        .single();
      
      return NextResponse.json({
        ...rateLimitResult,
        resetTime: rateLimitResult.resetTime.toISOString(),
        isAuthenticated: true,
        userId: user.id,
        hasPolarCustomer: !!userData?.polar_customer_id,
      });
    } else {
      // Anonymous user - use cookie-based rate limiting
      rateLimitResult = await checkAnonymousRateLimit();
      
      return NextResponse.json({
        ...rateLimitResult,
        resetTime: rateLimitResult.resetTime.toISOString(),
        isAuthenticated: false,
      });
    }
  } catch (error) {
    console.error('[Rate Limit API] GET error:', error);
    
    // Fallback to safe defaults
    return NextResponse.json({
      allowed: true,
      remaining: 5,
      limit: 5,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      tier: 'anonymous',
      used: 0,
      isAuthenticated: false,
    }, { status: 500 });
  }
}

/**
 * POST /api/rate-limit - Increment usage count OR transfer anonymous usage
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isTransfer = url.searchParams.get('transfer') === 'true';

    // Check if development mode
    const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
    
    if (isDevelopment) {
      if (isTransfer) {
        return NextResponse.json({ 
          success: true, 
          message: 'Transfer skipped in development mode' 
        });
      }
      
      return NextResponse.json({
        allowed: true,
        remaining: 999999,
        limit: 999999,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tier: 'development',
        used: 0,
      });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (isTransfer) {
      // POST /api/rate-limit?transfer=true - Transfer anonymous usage to user
      if (!user) {
        return NextResponse.json(
          { error: 'User must be authenticated for transfer' },
          { status: 401 }
        );
      }

      // Transfer anonymous usage directly here instead of calling the function
      try {
        // Get current anonymous usage from request cookies
        const cookieName = 'rl_data';
        const cookieValue = request.cookies.get(cookieName)?.value;
        
        let anonymousUsage = { used: 0, remaining: 5 };
        
        if (cookieValue) {
          try {
            const decoded = atob(cookieValue);
            const [count, date] = decoded.split('|');
            const today = new Date().toISOString().split('T')[0];
            
            if (date === today) {
              anonymousUsage.used = parseInt(count) || 0;
            }
          } catch (e) {
            console.log('[Rate Limit API] Error decoding cookie:', e);
          }
        }
        
        if (anonymousUsage.used === 0) {
          return NextResponse.json({ 
            success: true,
            message: 'No anonymous usage to transfer',
            userId: user.id
          });
        }

        console.log(`[Rate Limit API] Transferring ${anonymousUsage.used} queries to user ${user.id}`);
        
        // Use the server-side supabase client that already has the service role key
        const today = new Date().toISOString().split('T')[0];

        // Get existing record
        const { data: existingRecord } = await supabase
          .from('user_rate_limits')
          .select('*')
          .eq('user_id', user.id)
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
            .eq('user_id', user.id);

          console.log(`[Rate Limit API] Updated user ${user.id}: ${existingRecord.usage_count} + ${anonymousUsage.used} = ${newUsageCount}`);
        } else {
          // Create new record with transferred usage
          await supabase
            .from('user_rate_limits')
            .insert({
              user_id: user.id,
              usage_count: anonymousUsage.used,
              reset_date: today,
              last_request_at: new Date().toISOString(),
              tier: 'free',
            });

          console.log(`[Rate Limit API] Created new record for user ${user.id} with ${anonymousUsage.used} usage`);
        }

        // Return success response and let client clear cookies
        return NextResponse.json({ 
          success: true,
          message: `Successfully transferred ${anonymousUsage.used} queries to user account`,
          userId: user.id,
          transferred: anonymousUsage.used
        });
        
      } catch (error) {
        console.error('[Rate Limit API] Error transferring usage:', error);
        return NextResponse.json(
          { error: 'Failed to transfer anonymous usage' },
          { status: 500 }
        );
      }
    } else {
      // POST /api/rate-limit - Increment usage count
      const rateLimitResult = await incrementRateLimit(user?.id);
      
      return NextResponse.json({
        ...rateLimitResult,
        resetTime: rateLimitResult.resetTime.toISOString(),
        isAuthenticated: !!user,
        userId: user?.id,
      });
    }
  } catch (error) {
    console.error('[Rate Limit API] POST error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process rate limit request' },
      { status: 500 }
    );
  }
}