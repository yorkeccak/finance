'use client';

import { ChatInterface } from '@/components/chat-interface';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomBar from '@/components/bottom-bar';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Sidebar } from '@/components/sidebar';
import { SignupPrompt } from '@/components/signup-prompt';
import { EnterpriseBanner } from '@/components/enterprise/enterprise-banner';

function HomeContent() {
  const { user, loading } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasMessages, setHasMessages] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Get chatId from URL params
  const chatIdParam = searchParams.get('chatId');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(chatIdParam || undefined);
  const [chatKey, setChatKey] = useState(0); // Force remount key
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  const handleMessagesChange = useCallback((hasMessages: boolean) => {
    setHasMessages(hasMessages);

    // Track message count for non-logged-in users
    if (!user && hasMessages) {
      const newCount = messageCount + 1;
      setMessageCount(newCount);

      // Show signup prompt after 3 messages
      if (newCount === 3) {
        setTimeout(() => {
          setShowSignupPrompt(true);
        }, 2000); // Show after 2 seconds
      }
    }
  }, [user, messageCount]);


  // Sync currentSessionId with URL param on mount and URL changes
  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    // Always sync from URL to state (URL is source of truth)
    setCurrentSessionId(chatIdFromUrl || undefined);
  }, [searchParams]); // Only watch searchParams, not currentSessionId to avoid loops

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
            setNotification({ 
              type: 'error', 
              message: `Failed to complete upgrade: ${result.error || 'Unknown error'}` 
            });
          }
        } catch (error) {
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
    // Increment key to force ChatInterface remount
    setChatKey(prev => prev + 1);

    // Clear the local state
    setCurrentSessionId(undefined);

    // Update URL (which will trigger useEffect to sync state)
    updateUrlWithSession(null);
  }, [updateUrlWithSession]);

  const handleSessionCreated = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    updateUrlWithSession(sessionId);
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [queryClient, updateUrlWithSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#F5F5F5] dark:bg-gray-950 flex overflow-x-hidden'>
      {/* Enterprise Banner */}
      <EnterpriseBanner />

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

      {/* Sidebar */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        hasMessages={hasMessages}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        {/* Header - Animate out when messages appear */}
        <AnimatePresence mode="wait">
            {!hasMessages && (
              <motion.div
                className="text-center pt-8 md:pt-16 pb-6 md:pb-4 px-4 md:px-0"
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
                  className={`text-3xl sm:text-5xl font-light text-gray-900 dark:text-gray-100 tracking-tight relative z-10 ${
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
                className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto px-4 sm:px-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              >
                Powered by Valyu&apos;s enterprise-grade search infrastructure for real-time financial analysis
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Chat Interface */}
        <motion.div 
          className="flex-1 px-0 md:px-4 overflow-x-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <ChatInterface
              key={chatKey}
              sessionId={currentSessionId}
              onMessagesChange={handleMessagesChange}
              onSessionCreated={handleSessionCreated}
              onNewChat={handleNewChat}
            />
          </Suspense>
        </motion.div>
        
        <BottomBar />
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Signup Prompt for non-logged-in users */}
      {!user && (
        <SignupPrompt
          open={showSignupPrompt}
          onClose={() => setShowSignupPrompt(false)}
          onSignUp={() => {
            setShowSignupPrompt(false);
            setShowAuthModal(true);
          }}
          messageCount={messageCount}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}