'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, TrendingUp, Clock, Shield, Sparkles, Check, Crown, BarChart3 } from 'lucide-react';
import { track } from '@vercel/analytics';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const user = useAuthStore((state) => state.user);
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planType: string) => {
    // Track plan selection
    track('Plan Selected', {
      plan: planType,
      source: 'subscription_modal'
    });

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Create Polar checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ plan: planType })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();

        // Track checkout started
        track('Checkout Started', {
          plan: planType,
          source: 'subscription_modal'
        });

        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  // If user has an active subscription, show current plan info
  if (subscription.isPaid) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
              Your Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 dark:bg-blue-700 rounded-lg">
                    {subscription.tier === 'unlimited' ? (
                      <Crown className="h-6 w-6 text-white" />
                    ) : (
                      <Zap className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {subscription.tier === 'unlimited' ? 'Pro Unlimited' : 'Pay-As-You-Go'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status: <span className="font-semibold text-green-600 dark:text-green-400">Active</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Unlimited queries</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Full tool access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Download reports</span>
                </div>
                {subscription.tier === 'unlimited' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-700 dark:text-gray-300">Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-700 dark:text-gray-300">Early access to features</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Manage Subscription Button */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.open('https://polar.sh/dashboard', '_blank')}
                className="w-full"
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Manage Subscription on Polar
              </Button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                View billing history, update payment method, or cancel subscription
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show upgrade options for free users
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-5xl sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl !w-[95vw] sm:!w-[90vw] md:!w-[85vw] lg:!w-[1000px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
            Unlock Professional-Grade Financial Intelligence
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-lg mx-auto">
            Access institutional-quality research tools that save hours of analysis time. Choose the plan that fits your workflow.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Value Props Banner */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex flex-col items-center text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="h-5 w-5 text-slate-700 dark:text-slate-400 mb-1.5" />
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Save 100+ hrs/month</p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400">On research & analysis</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <TrendingUp className="h-5 w-5 text-slate-700 dark:text-slate-400 mb-1.5" />
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Instant insights</p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400">From multiple sources</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Shield className="h-5 w-5 text-slate-700 dark:text-slate-400 mb-1.5" />
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Data accuracy</p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400">Verified sources only</p>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-4 items-stretch">
            {/* Pay Per Use - For Occasional Users */}
            <motion.div
              className="relative group cursor-pointer"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleUpgrade('pay_per_use')}
            >
              <div className="h-full border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 rounded-xl p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 dark:bg-blue-700 rounded-lg">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Pay-As-You-Go</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Perfect for ad-hoc research</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 min-h-[180px]">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Unlimited queries</span> – No daily caps</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Full tool access</span> – Financial data, charts, analysis</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Predictable costs</span> – Only pay for actual usage</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Download reports</span> – Export as PDF</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usage-based</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Model costs + 20% platform fee</p>

                  <button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group">
                    <span>Start with Pay-As-You-Go</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Unlimited - For Power Users */}
            <motion.div
              className="relative group cursor-pointer"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleUpgrade('unlimited')}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 dark:bg-emerald-700 text-white text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                <Crown className="h-3 w-3" />
                <span>Most Popular</span>
              </div>

              <div className="h-full border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-2xl transition-all duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 dark:bg-emerald-700 rounded-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Pro Unlimited</h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">For serious analysts</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 min-h-[180px]">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Everything in Pay-As-You-Go</span>, plus:</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Fixed monthly cost</span> – No surprise bills</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Priority support</span> – Dedicated assistance</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Early access</span> – New features first</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Best for power users</span> – Heavy usage = big savings</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">$200</span>
                    <span className="text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">~$6.67/day for unlimited research</p>

                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg">
                    <span>Upgrade to Pro Unlimited</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Trust Signals */}
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Secure checkout via Polar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}