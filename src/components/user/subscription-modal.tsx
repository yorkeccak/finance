'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Infinity } from 'lucide-react';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      limits: '5 queries/day',
      features: [
        'Chat history (requires signup)',
        'Basic financial search',
        'Simple charts',
        'Email support'
      ],
      icon: null
    },
    {
      id: 'pay_per_use',
      name: 'Pay-per-use',
      price: 'Usage-based',
      period: '+ 20% markup',
      limits: '5 queries/day (but charged per use)',
      features: [
        'All financial tools',
        'Python code execution',
        'Advanced charts',
        'Priority support',
        'Pay only for what you use',
        'Same rate limits as free (cost control)'
      ],
      icon: <Zap className="h-5 w-5 text-yellow-500" />
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      price: '$200',
      period: '/month',
      limits: 'Unlimited everything',
      features: [
        'All features included',
        'Unlimited queries',
        'No usage charges',
        'Priority support',
        'Early access to new features'
      ],
      icon: <Infinity className="h-5 w-5 text-purple-500" />
    }
  ];

  const handleUpgrade = async (planId: string) => {
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
        body: JSON.stringify({ planId })
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <Card key={plan.id} className={`relative ${
              currentTier === plan.id ? 'ring-2 ring-blue-500' : ''
            }`}>
              {currentTier === plan.id && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Current Plan
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {plan.icon}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <div className="text-2xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-500">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{plan.limits}</p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={currentTier === plan.id ? 'outline' : 'default'}
                  disabled={loading || currentTier === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {currentTier === plan.id ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}