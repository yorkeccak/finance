'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getRateLimitDisplay } from '@/lib/rate-limit';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: Date;
  tier: string;
  used: number;
}

export interface UseRateLimitReturn extends Partial<RateLimitResult> {
  isLoading: boolean;
  isAuthenticated: boolean;
  displayText: string;
  hasPolarCustomer: boolean;
  userId?: string;
  refresh: () => Promise<void>;
  increment: () => Promise<RateLimitResult | null>;
  transferAnonymousUsage: () => Promise<void>;
}

const fetchRateLimit = async () => {
  const response = await fetch('/api/rate-limit');
  if (!response.ok) {
    throw new Error('Failed to fetch rate limit');
  }
  return response.json();
};

/**
 * Simple TanStack Query-based rate limit hook
 */
export function useRateLimit(): UseRateLimitReturn {
  const queryClient = useQueryClient();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rateLimit'],
    queryFn: fetchRateLimit,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
  });

  const processRateLimit = (data: any) => {
    if (!data) return null;

    if (!data.isAuthenticated) {
      // Anonymous user - handle cookies client-side
      const today = new Date().toISOString().split('T')[0];
      const COOKIE_NAME = '$dekcuf_teg';
      const ANONYMOUS_LIMIT = 3;
      
      const getCookie = (name: string): string | null => {
        if (typeof window === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || null;
        }
        return null;
      };
      
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
      
      const getNextMidnight = (): Date => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      };
      
      const storedData = decodeCookieData(getCookie(COOKIE_NAME));
      const used = storedData.date === today ? storedData.count : 0;
      const remaining = Math.max(0, ANONYMOUS_LIMIT - used);
      const allowed = used < ANONYMOUS_LIMIT;
      
      return {
        allowed,
        remaining,
        limit: ANONYMOUS_LIMIT,
        resetTime: getNextMidnight(),
        tier: 'anonymous',
        used,
      };
    } else {
      // Authenticated user - use server data
      return {
        allowed: data.allowed,
        remaining: data.remaining,
        limit: data.limit,
        resetTime: new Date(data.resetTime),
        tier: data.tier,
        used: data.used,
      };
    }
  };

  const rateLimit = processRateLimit(data);

  const increment = async (): Promise<RateLimitResult | null> => {
    if (!data?.isAuthenticated) {
      // Anonymous users - handle cookies client-side and invalidate query
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      if (isDevelopment) return rateLimit;
      
      const today = new Date().toISOString().split('T')[0];
      const COOKIE_NAME = '$dekcuf_teg';
      const ANONYMOUS_LIMIT = 3;
      
      // Cookie handling functions
      const getCookie = (name: string): string | null => {
        if (typeof window === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        return parts.length === 2 ? parts.pop()?.split(';').shift() || null : null;
      };
      
      const setCookie = (name: string, value: string): void => {
        if (typeof window === 'undefined') return;
        const expires = new Date();
        expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      };
      
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
      const newCount = storedData.date === today ? storedData.count + 1 : 1;
      const encodedData = btoa(`${newCount}|${today}`);
      setCookie(COOKIE_NAME, encodedData);
      
      // Invalidate query to refresh UI
      queryClient.invalidateQueries({ queryKey: ['rateLimit'] });
      return null;
    }
    
    // Authenticated users - increment handled server-side, just invalidate cache
    return null;
  };

  const transferAnonymousUsage = async (): Promise<void> => {
    try {
      const response = await fetch('/api/rate-limit?transfer=true', {
        method: 'POST',
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['rateLimit'] });
      }
    } catch (error) {
      console.error('Failed to transfer usage:', error);
    }
  };

  const refresh = async () => {
    queryClient.invalidateQueries({ queryKey: ['rateLimit'] });
  };

  // Listen for sign out events to clear cache
  useEffect(() => {
    const handleSignOut = () => {
      console.log('[useRateLimit] Sign out detected, clearing rate limit cache');
      queryClient.removeQueries({ queryKey: ['rateLimit'] });
    };
    
    window.addEventListener('auth:signout', handleSignOut);
    return () => window.removeEventListener('auth:signout', handleSignOut);
  }, [queryClient]);

  const displayText = getRateLimitDisplay(rateLimit);
  
  return {
    allowed: rateLimit?.allowed,
    remaining: rateLimit?.remaining,
    limit: rateLimit?.limit,
    resetTime: rateLimit?.resetTime,
    tier: rateLimit?.tier,
    used: rateLimit?.used,
    isLoading,
    isAuthenticated: data?.isAuthenticated || false,
    hasPolarCustomer: data?.hasPolarCustomer || false,
    userId: data?.userId,
    displayText,
    refresh,
    increment,
    transferAnonymousUsage,
  };
}