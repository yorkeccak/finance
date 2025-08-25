'use client';

import { ChatInterface } from '@/components/chat-interface';
import { RateLimitDialog } from '@/components/rate-limit-dialog';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomBar from '@/components/bottom-bar';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { createClient } from '@/utils/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShareButton } from '@/components/share-button';
import { OllamaStatusIndicator } from '@/components/ollama-status-indicator';
import { SubscriptionModal } from '@/components/user/subscription-modal';
import { SettingsModal } from '@/components/user/settings-modal';
import { 
  Settings, 
  CreditCard, 
  LogOut, 
  User, 
  MessageSquare,
  History,
  CheckCircle,
  AlertCircle,
  Trash2,
  Monitor,
  BarChart3
} from 'lucide-react';
import { ThemeSelector, CompactThemeSelector } from '@/components/ui/theme-toggle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';
import { useRouter, useSearchParams } from 'next/navigation';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

function HomeContent() {
  const { user, loading } = useAuthStore();
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const { displayText, tier, isAuthenticated, hasPolarCustomer, allowed, remaining, resetTime, increment } = useRateLimit();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasMessages, setHasMessages] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(new Date());
  
  // Get chatId from URL params
  const chatIdParam = searchParams.get('chatId');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(chatIdParam || undefined);
  const [chatKey, setChatKey] = useState(0); // Force remount key
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isHoveringTheme, setIsHoveringTheme] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle rate limit errors from chat interface
  const handleRateLimitError = useCallback((resetTime: string) => {
    setRateLimitResetTime(new Date(resetTime));
    setShowRateLimitDialog(true);
  }, []);

  const handleMessagesChange = useCallback((hasMessages: boolean) => {
    setHasMessages(hasMessages);
  }, []);

  const handleViewUsage = async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/customer-portal', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        window.open(redirectUrl, '_blank');
      } else {
        const error = await response.json();
        console.error('[User Menu] Failed to access billing portal:', error.error);
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('[User Menu] Error accessing billing portal:', error);
    }
  };

  // Sync currentSessionId with URL param on mount and URL changes
  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    // Only update if URL param is different from current state
    if (chatIdFromUrl !== currentSessionId) {
      console.log('[Home] URL chatId changed:', chatIdFromUrl, 'current:', currentSessionId);
      setCurrentSessionId(chatIdFromUrl || undefined);
    }
  }, [searchParams]); // Watch searchParams changes

  // Handle URL messages from auth callbacks
  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message === 'email_updated') {
      setNotification({ type: 'success', message: 'Email address successfully updated!' });
      router.replace('/'); // Remove URL params
    } else if (message === 'email_link_expired') {
      setNotification({ type: 'error', message: 'Email confirmation link has expired. Please request a new email change.' });
      router.replace('/'); // Remove URL params
    } else if (error === 'auth_failed') {
      setNotification({ type: 'error', message: 'Authentication failed. Please try again.' });
      router.replace('/'); // Remove URL params
    }

    // Handle checkout success
    const checkoutSuccess = searchParams.get('checkout');
    const checkoutPlan = searchParams.get('plan');
    const customerSessionToken = searchParams.get('customer_session_token');

    if (checkoutSuccess === 'success' && checkoutPlan && customerSessionToken && user) {
      console.log('[Home] Processing checkout success:', { checkoutPlan, customerSessionToken });
      
      // Call our checkout success API
      const processCheckout = async () => {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          const response = await fetch('/api/checkout/success', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              customerSessionToken,
              plan: checkoutPlan
            })
          });

          const result = await response.json();

          if (response.ok) {
            setNotification({ 
              type: 'success', 
              message: `Successfully upgraded to ${checkoutPlan} plan! You can now use the service.` 
            });
            // Refresh auth state to update subscription tier
            window.location.reload();
          } else {
            console.error('[Home] Checkout processing failed:', result);
            setNotification({ 
              type: 'error', 
              message: `Failed to complete upgrade: ${result.error || 'Unknown error'}` 
            });
          }
        } catch (error) {
          console.error('[Home] Checkout processing error:', error);
          setNotification({ 
            type: 'error', 
            message: 'Failed to process checkout. Please contact support.' 
          });
        }
      };

      processCheckout();
      router.replace('/'); // Remove checkout params from URL
    }

    // Auto-hide notifications after 5 seconds
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, notification, user]);

  // Detect mobile device for touch interactions
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle title click on mobile
  const handleTitleClick = useCallback(() => {
    if (isMobile) {
      track('Title Click', {
        trigger: 'mobile_touch'
      });
      setIsHoveringTitle(true);
      // Keep it tilted for 3 seconds then close
      setTimeout(() => {
        setIsHoveringTitle(false);
      }, 3000);
    }
  }, [isMobile]);

  
  // Auto-trigger tilt animation after 2 seconds
  useEffect(() => {
    if (!hasMessages && !autoTiltTriggered) {
      const timer = setTimeout(() => {
        track('Title Hover', {
          trigger: 'auto_tilt'
        });
        setIsHoveringTitle(true);
        setAutoTiltTriggered(true);
        
        // Keep it tilted for 2 seconds then close
        setTimeout(() => {
          setIsHoveringTitle(false);
        }, 2000);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [hasMessages, autoTiltTriggered]);

  const updateUrlWithSession = useCallback((sessionId: string | null) => {
    const url = new URL(window.location.href);
    if (sessionId) {
      url.searchParams.set('chatId', sessionId);
    } else {
      url.searchParams.delete('chatId');
      url.searchParams.delete('q'); // Also clear query parameter for clean new chat
    }
    // Use replace to avoid creating browser history entries
    window.history.replaceState(null, '', url.toString());
  }, []);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    updateUrlWithSession(sessionId);
  }, [updateUrlWithSession]);

  const handleNewChat = useCallback(() => {
    console.log('[Home] Starting new chat, clearing session and URL');
    
    // Clear the local state immediately for immediate UI feedback
    setCurrentSessionId(undefined);
    updateUrlWithSession(null);
    
    // Increment key to force ChatInterface remount
    setChatKey(prev => prev + 1);
    
    // Clean up URL
    const url = new URL(window.location.href);
    url.searchParams.delete('chatId');
    url.searchParams.delete('q');
    window.history.replaceState(null, '', url.toString());
  }, [updateUrlWithSession]);

  const handleSessionCreated = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    updateUrlWithSession(sessionId);
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [queryClient, updateUrlWithSession]);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      console.log(`sessions: ${JSON.stringify(response)}`)

      const { sessions } = await response.json();
      return sessions;
    },
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (currentSessionId === sessionId) {
        // Clear the URL and reset to new chat
        handleNewChat();
      }
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white dark:bg-gray-950 flex flex-col'>
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {notification.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Right Icons */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <OllamaStatusIndicator hasMessages={hasMessages} />
        <ShareButton />
        
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-80 max-h-[80vh] overflow-hidden">
              {/* User Info Section */}
              <div className="p-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {tier === 'anonymous' ? 'Guest' : tier === 'free' ? 'Free' : tier}
                      </Badge>
                      <span className="text-xs text-gray-500">{displayText}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat History Section */}
              <div className="border-b">
                <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2">
                  <History className="h-4 w-4" />
                  Chat History
                </DropdownMenuLabel>
                {loadingSessions ? (
                  <div className="h-[120px]">
                    <ScrollArea className="h-full">
                      <div className="p-2">
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-3 text-center text-sm text-gray-500 h-[60px] flex items-center justify-center">
                    No chat history yet
                  </div>
                ) : (
                  <div className="h-[120px]">
                    <div className="h-full overflow-y-auto">
                      <div className="p-1 space-y-1">
                        {sessions.map((session: any) => (
                          <div key={session.id} className="flex items-center gap-2 p-2 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleSessionSelect(session.id)}
                            >
                              <div className="text-sm truncate">
                                {session.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(session.last_message_at || session.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(session.id);
                              }}
                              title="Delete chat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Actions */}
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              
              {/* Show Subscription only for free users who have never had a Polar account */}
              {tier === 'free' && !hasPolarCustomer && (
                <DropdownMenuItem onClick={() => setShowSubscription(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscription
                </DropdownMenuItem>
              )}

              {/* Show Usage Dashboard for any user with a Polar customer account (including cancelled) */}
              {hasPolarCustomer && (
                <DropdownMenuItem onClick={handleViewUsage}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Usage & Billing
                </DropdownMenuItem>
              )}

              {/* Custom Theme Selector with Premium Feature */}
              <div className="relative">
                <div 
                  className={`px-2 py-1.5 cursor-pointer transition-all duration-200 ${
                    tier === 'free' || tier === 'anonymous' 
                      ? 'opacity-60 hover:opacity-80' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onMouseEnter={() => (tier === 'free' || tier === 'anonymous') && setIsHoveringTheme(true)}
                  onMouseLeave={() => setIsHoveringTheme(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center pb-1">
                      <Monitor className="mr-4 h-4 w-4" />
                      <span className="text-sm">Theme</span>
                    </div>
                    <CompactThemeSelector 
                      onUpgradeClick={() => setShowSubscription(true)}
                      sessionId={currentSessionId || undefined}
                    />
                  </div>
                  
                  {/* Expandable Premium Feature Teaser */}
                  <AnimatePresence>
                    {isHoveringTheme && (tier === 'free' || tier === 'anonymous') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          ease: [0.23, 1, 0.32, 1],
                          opacity: { duration: 0.2 }
                        }}
                        className="overflow-hidden mt-2"
                      >
                        <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-900/40 dark:to-slate-900/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <div className="text-lg">🌙</div>
                            <div>
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                You&apos;ve discovered dark mode!
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                A premium feature. Trust me, it&apos;s worth it. Available on the{' '}
                                <span className="font-medium">pay-per-use plan</span> for{' '}
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">$0.01 per toggle</span>, or{' '}
                                <span className="font-medium">unlimited plan</span> gives you{' '}
                                <span className="font-semibold">unlimited toggles</span>.
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSubscription(true);
                                  setIsHoveringTheme(false);
                                }}
                                className="mt-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 underline underline-offset-2 transition-colors"
                              >
                                Upgrade Now →
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => setShowAuthModal(true)} size="sm">
            Sign In
          </Button>
        )}
      </div>

      {/* Top Left - New Chat Button and Session Info */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        {/* Only show New Chat button when we have messages or are in a session */}
        {(hasMessages || currentSessionId) && (
          <Button 
            onClick={handleNewChat}
            variant="ghost"
            size="sm" 
            className="gap-2 h-8"
          >
            <MessageSquare className="h-4 w-4" />
            New Chat
          </Button>
        )}
        {currentSessionId && (
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded border">
            {sessions.find((s: any) => s.id === currentSessionId)?.title || 'Active Chat'}
          </div>
        )}
        {hasMessages && !currentSessionId && (
          <div className="text-xs text-gray-500 bg-white dark:bg-gray-900 px-2 py-1 rounded border">
            {displayText}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-0">
        {/* Header - Animate out when messages appear */}
        <AnimatePresence mode="wait">
            {!hasMessages && (
              <motion.div 
                className="text-center pt-12 sm:pt-16 pb-6 sm:pb-4 px-4 sm:px-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
              <motion.div 
                className="relative mb-10 inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                onHoverStart={() => {
                  if (!isMobile) {
                    track('Title Hover', {
                      trigger: 'user_hover'
                    });
                    setIsHoveringTitle(true);
                  }
                }}
                onHoverEnd={() => {
                  if (!isMobile) {
                    setIsHoveringTitle(false);
                  }
                }}
                onClick={handleTitleClick}
              >
                <motion.h1 
                  className={`text-4xl sm:text-5xl font-light text-gray-900 dark:text-gray-100 tracking-tight relative z-10 ${
                    isMobile ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  style={{ transformOrigin: '15% 100%' }}
                  animate={{ 
                    rotateZ: isHoveringTitle ? -8 : 0,
                  }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  Finance
                </motion.h1>
                
                {/* "By Valyu" that slides out from under */}
                <motion.div 
                  className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: isHoveringTitle ? 1 : 0,
                    y: isHoveringTitle ? 0 : -10,
                  }}
                  transition={{ 
                    opacity: { delay: isHoveringTitle ? 0.15 : 0, duration: 0.2 },
                    y: { delay: isHoveringTitle ? 0.1 : 0, duration: 0.3, ease: [0.23, 1, 0.32, 1] }
                  }}
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-light">By</span>
                  <Image 
                    src="/valyu.svg" 
                    alt="Valyu" 
                    width={60}
                    height={60}
                    className="h-5 opacity-80 dark:invert"
                  />
                </motion.div>
                
                {/* Mobile tap hint */}
                {isMobile && !isHoveringTitle && !hasMessages && (
                  <motion.div
                    className="absolute -bottom-8 left-0 right-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 3, duration: 0.5 }}
                  >
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Tap to reveal
                    </span>
                  </motion.div>
                )}

                {/* Hover area extender */}
                <div className="absolute inset-0 -bottom-10" />
              </motion.div>
              <motion.p 
                className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              >
                AI-powered financial analysis with real-time data, calculations, and interactive visualizations
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Chat Interface */}
        <motion.div 
          className="flex-1 px-0 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <ChatInterface 
              key={chatKey}
              sessionId={currentSessionId}
              onMessagesChange={handleMessagesChange} 
              onRateLimitError={handleRateLimitError}
              onSessionCreated={handleSessionCreated}
              onNewChat={handleNewChat}
              rateLimitProps={{
                allowed,
                remaining,
                resetTime,
                increment
              }}
            />
          </Suspense>
        </motion.div>
        
        <BottomBar />
      </div>
      
      {/* Rate Limit Dialog */}
      <RateLimitDialog
        open={showRateLimitDialog}
        onOpenChange={setShowRateLimitDialog}
        resetTime={rateLimitResetTime}
        onShowAuth={() => setShowAuthModal(true)}
      />
      
      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
      
      {/* Settings Modal */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}