'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Check, Github, CreditCard, Code, ChartLine, Building2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';
import { createClient } from '@/utils/supabase/client-wrapper';
import { EnterpriseContactModal } from '@/components/enterprise/enterprise-contact-modal';

interface RateLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetTime: Date;
  onShowAuth?: () => void;
}

export function RateLimitDialog({ open, onOpenChange, resetTime, onShowAuth }: RateLimitDialogProps) {
  const user = useAuthStore((state) => state.user);
  const { tier, hasPolarCustomer } = useRateLimit();

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || 'Python';
    }
    return 'Python';
  });
  
  // Dynamic example queries
  const exampleQueries = useMemo(() => [
    "Apple earnings Q4 2024",
    "Tesla latest news and developments", 
    "Bitcoin price trends and analysis",
    "Microsoft SEC 10-K filing",
    "Market sentiment on AI stocks",
    "Fed interest rate decisions",
    "Amazon revenue breakdown by segment",
    "Oil prices and energy market outlook",
    "Google antitrust case updates",
    "S&P 500 performance metrics"
  ], []);

  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (open) {
      // Track rate limit hit
      track('Rate Limit Hit', {
        resetTime: resetTime.toISOString(),
        remainingQueries: 0
      });
    }
  }, [open, resetTime]);

  // Typing animation effect
  useEffect(() => {
    if (!open) return;

    let timeout: NodeJS.Timeout;
    const currentExample = exampleQueries[currentExampleIndex];
    
    if (isTyping) {
      // Typing forward
      if (currentText.length < currentExample.length) {
        timeout = setTimeout(() => {
          setCurrentText(currentExample.slice(0, currentText.length + 1));
        }, 50); // Typing speed
      } else {
        // Finished typing, wait then start erasing
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000); // Pause after finishing
      }
    } else {
      // Erasing
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 30); // Erasing speed (faster)
      } else {
        // Finished erasing, move to next example
        setCurrentExampleIndex((prev) => (prev + 1) % exampleQueries.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [open, currentText, isTyping, currentExampleIndex, exampleQueries]);

  // Reset animation when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentExampleIndex(0);
      setCurrentText('');
      setIsTyping(true);
    }
  }, [open]);

  const formatResetTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleCopy = async (code: string) => {
    track('Code Copy', {
      source: 'rate_limit_dialog',
      language: activeTab,
      codeLength: code.length
    });
    
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        
        // Track checkout initiation
        track('Checkout Started', {
          source: 'rate_limit_dialog',
          plan: planType
        });
        
        window.location.href = checkoutUrl;
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleBuildYourOwn = () => {
    track('Platform Clickthrough', {
      source: 'rate_limit_dialog',
      action: 'build_your_own',
      url: 'https://platform.valyu.ai/?utm_source=finance.valyu.ai&utm_medium=rate_limit_dialog'
    });
    
    window.open('https://platform.valyu.ai/?utm_source=finance.valyu.ai&utm_medium=rate_limit_dialog', '_blank');
  };

  const handleCreateAccount = () => {
    track('Auth Modal Opened', {
      source: 'rate_limit_dialog',
      trigger: 'create_account'
    });
    
    onShowAuth?.();
    onOpenChange(false);
  };

  const codeSnippet = `curl -X POST "https://api.valyu.ai/v1/search" \\
  -H "Authorization: x-api-key your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "latest tesla MD&A 10-k", "max_results": 2}'`;

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%]">
            <DialogTitle className="sr-only">Daily Rate Limit Reached</DialogTitle>
            
            <div className="text-center space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-2">
                  Daily limit reached
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Resets in <span className="font-medium">{formatResetTime(resetTime)}</span>
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {!user ? (
                  <Button
                    onClick={handleCreateAccount}
                    disabled={loading}
                    className="w-full"
                  >
                    Create Account
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleUpgrade('pay_per_use')}
                      disabled={loading}
                      className="w-full"
                    >
                      <ChartLine className="mr-2 h-4 w-4" />
                      Can&apos;t wait? Pay Per Use
                    </Button>
                    <Button
                      onClick={() => handleUpgrade('unlimited')}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Unlimited - $200/month
                    </Button>
                  </div>
                )}

                {/* Enterprise Option */}
                {user && process.env.NEXT_PUBLIC_APP_MODE !== 'development' && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-3 mb-3">
                      <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                          Need enterprise deployment?
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Deploy Valyu's infrastructure in your organization with custom data integrations and AI agents
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setShowEnterpriseModal(true);
                        track('Enterprise CTA Clicked', { source: 'rate_limit_dialog' });
                      }}
                      variant="outline"
                      className="w-full text-sm border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Book a Demo
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      track('GitHub CTA Click', {
                        source: 'rate_limit_dialog',
                        url: 'https://github.com/yorkeccak/finance/'
                      });
                      window.open('https://github.com/yorkeccak/finance/', '_blank');
                    }}
                    variant="ghost"
                    className="flex-1 text-sm"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Host Yourself
                  </Button>
                  <Button
                    onClick={handleBuildYourOwn}
                    variant="ghost"
                    className="flex-1 text-sm"
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Build with Valyu
                  </Button>
                </div>
              </div>

              {/* Simple code example */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">API Example</span>
                  <Button
                    onClick={() => handleCopy(codeSnippet)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {codeSnippet}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <EnterpriseContactModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
      />
    </AnimatePresence>
  );
}