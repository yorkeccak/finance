'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client';

export type SubscriptionTier = 'anonymous' | 'free' | 'pay_per_use' | 'unlimited';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: string;
  isAnonymous: boolean;
  isFree: boolean;
  isPaid: boolean;
  canDownloadReports: boolean;
  canAccessHistory: boolean;
}

export function useSubscription(): UserSubscription {
  const user = useAuthStore((state) => state.user);

  const { data } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) {
        return null;
      }

      const supabase = createClient();
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single();

      return userData;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Anonymous user
  if (!user) {
    return {
      tier: 'anonymous',
      status: 'inactive',
      isAnonymous: true,
      isFree: false,
      isPaid: false,
      canDownloadReports: false,
      canAccessHistory: false,
    };
  }

  // Authenticated user
  const tier: SubscriptionTier =
    data?.subscription_status === 'active' && data?.subscription_tier
      ? (data.subscription_tier as SubscriptionTier)
      : 'free';

  const isPaid = tier === 'pay_per_use' || tier === 'unlimited';

  return {
    tier,
    status: data?.subscription_status || 'inactive',
    isAnonymous: false,
    isFree: tier === 'free',
    isPaid,
    canDownloadReports: true, // All signed-in users can download
    canAccessHistory: true,   // All signed-in users can access history
  };
}
