// Rate limiting utilities with obscure cookie names
export const RATE_LIMIT_CONFIG = {
  maxRequests: 5,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  cookieName: '_vl_sess_ctx', // Obscure cookie name (Valyu session context)
  dateCookieName: '_vl_sess_ts', // Timestamp cookie (Valyu session timestamp)
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalRequests: number;
}

export function getRateLimitStatus(): RateLimitResult {
  if (typeof window === 'undefined') {
    // Server-side: assume allowed
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests,
      resetTime: new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs),
      totalRequests: 0,
    };
  }

  const now = Date.now();
  const today = new Date().toDateString();
  
  // Get stored data
  const storedDate = getCookie(RATE_LIMIT_CONFIG.dateCookieName);
  const storedRequests = decodeCounter(getCookie(RATE_LIMIT_CONFIG.cookieName) || '');
  
  // Check if it's a new day
  if (storedDate !== today) {
    // Reset counters for new day
    setCookie(RATE_LIMIT_CONFIG.dateCookieName, today, 1);
    setCookie(RATE_LIMIT_CONFIG.cookieName, encodeCounter(0), 1);
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests,
      resetTime: getNextMidnight(),
      totalRequests: 0,
    };
  }
  
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - storedRequests);
  const allowed = storedRequests < RATE_LIMIT_CONFIG.maxRequests;
  
  console.log("[Rate Limit] Client check - storedRequests:", storedRequests, "maxRequests:", RATE_LIMIT_CONFIG.maxRequests, "allowed:", allowed, "remaining:", remaining);
  
  return {
    allowed,
    remaining,
    resetTime: getNextMidnight(),
    totalRequests: storedRequests,
  };
}

export function incrementRequestCount(): RateLimitResult {
  if (typeof window === 'undefined') {
    // Server-side: return current status
    return getRateLimitStatus();
  }

  const today = new Date().toDateString();
  const currentRequests = decodeCounter(getCookie(RATE_LIMIT_CONFIG.cookieName) || '');
  const newCount = currentRequests + 1;
  
  // Update cookies
  setCookie(RATE_LIMIT_CONFIG.dateCookieName, today, 1);
  setCookie(RATE_LIMIT_CONFIG.cookieName, encodeCounter(newCount), 1);
  
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - newCount);
  const allowed = newCount <= RATE_LIMIT_CONFIG.maxRequests;
  
  return {
    allowed,
    remaining,
    resetTime: getNextMidnight(),
    totalRequests: newCount,
  };
}

export function checkServerRateLimit(request: Request): RateLimitResult {
  const cookies = request.headers.get('cookie') || '';
  const cookieMap = parseCookies(cookies);
  
  const today = new Date().toDateString();
  const storedDate = cookieMap[RATE_LIMIT_CONFIG.dateCookieName];
  const storedRequests = decodeCounter(cookieMap[RATE_LIMIT_CONFIG.cookieName] || '');
  
  // Check if it's a new day
  if (storedDate !== today) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests,
      resetTime: getNextMidnight(),
      totalRequests: 0,
    };
  }
  
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - storedRequests);
  const allowed = storedRequests < RATE_LIMIT_CONFIG.maxRequests;
  
  console.log("[Rate Limit] Server check - storedRequests:", storedRequests, "maxRequests:", RATE_LIMIT_CONFIG.maxRequests, "allowed:", allowed, "remaining:", remaining);
  
  return {
    allowed,
    remaining,
    resetTime: getNextMidnight(),
    totalRequests: storedRequests,
  };
}

export function incrementServerRateLimit(request: Request): { rateLimitResult: RateLimitResult; cookies: string[] } {
  const cookies = request.headers.get('cookie') || '';
  const cookieMap = parseCookies(cookies);
  
  const today = new Date().toDateString();
  const storedDate = cookieMap[RATE_LIMIT_CONFIG.dateCookieName];
  const currentRequests = decodeCounter(cookieMap[RATE_LIMIT_CONFIG.cookieName] || '');
  
  // If it's a new day, reset the counter
  const isNewDay = storedDate !== today;
  const newCount = isNewDay ? 1 : currentRequests + 1;
  
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - newCount);
  const allowed = newCount <= RATE_LIMIT_CONFIG.maxRequests;
  
  console.log("[Rate Limit] Server increment - currentRequests:", currentRequests, "newCount:", newCount, "maxRequests:", RATE_LIMIT_CONFIG.maxRequests, "allowed:", allowed, "remaining:", remaining);
  
  const rateLimitResult: RateLimitResult = {
    allowed,
    remaining,
    resetTime: getNextMidnight(),
    totalRequests: newCount,
  };
  
  const cookiesToSet = [
    `${RATE_LIMIT_CONFIG.dateCookieName}=${today}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax; Secure`,
    `${RATE_LIMIT_CONFIG.cookieName}=${encodeCounter(newCount)}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax; Secure`,
  ];
  
  return {
    rateLimitResult,
    cookies: cookiesToSet,
  };
}

// Helper functions
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

// Simple encoding/decoding to make counter less obvious
function encodeCounter(count: number): string {
  // Simple obfuscation: multiply by 7, add 23, then base64 encode
  const obfuscated = count * 7 + 23;
  if (typeof window !== 'undefined') {
    // Client-side: use btoa
    return btoa(obfuscated.toString()).replace(/=/g, '');
  } else {
    // Server-side: use Buffer
    return Buffer.from(obfuscated.toString()).toString('base64').replace(/=/g, '');
  }
}

function decodeCounter(encoded: string): number {
  try {
    if (!encoded) return 0;
    
    // Add padding back for base64 decoding
    const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4);
    
    let decoded: number;
    if (typeof window !== 'undefined') {
      // Client-side: use atob
      decoded = parseInt(atob(padded));
    } else {
      // Server-side: use Buffer
      decoded = parseInt(Buffer.from(padded, 'base64').toString());
    }
    
    return Math.max(0, (decoded - 23) / 7);
  } catch (e) {
    return 0; // Return 0 if decoding fails
  }
}

function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });
  
  return cookies;
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
