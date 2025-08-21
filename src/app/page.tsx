'use client';

import { ChatInterface } from '@/components/chat-interface';
import { RateLimitDialog } from '@/components/rate-limit-dialog';
import { Topbar } from '@/components/topbar';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomBar from '@/components/bottom-bar';
import Image from 'next/image';
import { track } from '@vercel/analytics';

export default function Home() {
  const { user, loading } = useAuth();
  const [hasMessages, setHasMessages] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(new Date());
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Handle rate limit errors from chat interface
  const handleRateLimitError = useCallback((resetTime: string) => {
    setRateLimitResetTime(new Date(resetTime));
    setShowRateLimitDialog(true);
  }, []);

  const handleMessagesChange = useCallback((hasMessages: boolean) => {
    setHasMessages(hasMessages);
  }, []);

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

  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Load session messages here
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined);
    // Clear current messages
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white dark:bg-gray-950 flex flex-col'>
      {/* Topbar */}
      <Topbar
        hasMessages={hasMessages}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        onAuthClick={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
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
                    className="h-5 opacity-80"
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
              sessionId={currentSessionId}
              onMessagesChange={handleMessagesChange} 
              onRateLimitError={handleRateLimitError}
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
      />
      
      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}