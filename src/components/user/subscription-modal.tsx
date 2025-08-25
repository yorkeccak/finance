'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planType: string) => {
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
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-light underline">
            Upgrade Your Experience
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="text-center text-sm text-gray-500 mb-6">
            Currently on <span className="font-medium">Free Plan</span> • 5 queries per day
          </div>

          {/* Pay Per Use Option */}
          <motion.div 
            className="relative group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleUpgrade('pay_per_use')}
          >
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Pay Per Use</h3>
                  <p className="text-sm text-gray-500">Only pay for what you use</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p>• Unlimited queries per day</p>
                <p>• All financial tools & advanced features</p>
                <p>• Pay only for what you actually use</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Usage-based pricing</span>
                  <div className="text-xs text-gray-500">+ 20% markup on tool call costs</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
          </motion.div>

          {/* Unlimited Option */}
          <motion.div 
            className="relative group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleUpgrade('unlimited')}
          >
            <div className="border-2 border-purple-200 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg p-6 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-lg">∞</div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Unlimited</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Everything, unlimited</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p>• Unlimited queries per day</p>
                <p>• All features & priority support</p>
                <p>• Early access to new features</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">$200</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" />
              </div>
            </div>
          </motion.div>

          {/* Info Note */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-100 dark:border-gray-800">
            Secure payment powered by Polar • Cancel anytime
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}