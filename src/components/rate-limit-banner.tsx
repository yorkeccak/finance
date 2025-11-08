'use client';

import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Crown, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription';
import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';

export function RateLimitBanner() {
  const user = useAuthStore((state) => state.user);
  const subscription = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch rate limit data
  const { data: rateLimit } = useQuery({
    queryKey: ['rateLimit'],
    queryFn: async () => {
      const response = await fetch('/api/rate-limit');
      if (!response.ok) throw new Error('Failed to fetch rate limit');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (!rateLimit || isDismissed || subscription.isPaid) {
    return null;
  }

  const { remaining, limit, tier } = rateLimit;
  const percentRemaining = (remaining / limit) * 100;

  // Show banner when user has 2 or fewer queries remaining
  const shouldShow = remaining <= 2 && remaining > 0;

  // Last query warning - more prominent
  const isLastQuery = remaining === 1;

  // All queries used
  const noQueriesLeft = remaining === 0;

  if (!shouldShow && !noQueriesLeft) {
    return null;
  }

  // Track when rate limit warning is shown
  useEffect(() => {
    if (shouldShow || noQueriesLeft) {
      track('Rate Limit Warning Shown', {
        remaining,
        tier: subscription.tier,
        isLastQuery,
        noQueriesLeft
      });
    }
  }, [shouldShow, noQueriesLeft, remaining, subscription.tier, isLastQuery]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md"
      >
        <div
          className={`
            relative rounded-xl border shadow-lg backdrop-blur-sm px-4 py-3
            ${
              noQueriesLeft
                ? 'bg-red-50/95 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                : isLastQuery
                ? 'bg-orange-50/95 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
                : 'bg-yellow-50/95 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
            }
          `}
        >
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <AlertTriangle
              className={`
                w-5 h-5 mt-0.5 flex-shrink-0
                ${
                  noQueriesLeft
                    ? 'text-red-600 dark:text-red-400'
                    : isLastQuery
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }
              `}
            />

            <div className="flex-1 space-y-2">
              <div>
                <h3
                  className={`
                    text-sm font-semibold
                    ${
                      noQueriesLeft
                        ? 'text-red-900 dark:text-red-100'
                        : isLastQuery
                        ? 'text-orange-900 dark:text-orange-100'
                        : 'text-yellow-900 dark:text-yellow-100'
                    }
                  `}
                >
                  {noQueriesLeft
                    ? 'Daily limit reached'
                    : isLastQuery
                    ? 'Last query remaining!'
                    : `Only ${remaining} queries left`}
                </h3>
                <p
                  className={`
                    text-xs mt-1
                    ${
                      noQueriesLeft
                        ? 'text-red-700 dark:text-red-300'
                        : isLastQuery
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    }
                  `}
                >
                  {noQueriesLeft
                    ? subscription.isAnonymous
                      ? 'Sign in for more queries or wait until tomorrow.'
                      : 'Upgrade for unlimited queries or wait until tomorrow.'
                    : subscription.isAnonymous
                    ? 'Sign in to increase your daily limit.'
                    : 'Upgrade for unlimited queries.'}
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-2">
                {subscription.isAnonymous ? (
                  <button
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('show-auth-modal'))
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sign in</span>
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('show-upgrade-modal'))
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg transition-all shadow-sm"
                  >
                    <Crown className="w-3 h-3" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
