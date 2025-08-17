'use client';

import { ChatInterface } from '@/components/chat-interface';
import { ShareButton } from '@/components/share-button';
import { RateLimitDialog } from '@/components/rate-limit-dialog';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomBar from '@/components/bottom-bar';
import { getRateLimitStatus } from '@/lib/rate-limit';
import Image from 'next/image';

export default function Home() {
  const [hasMessages, setHasMessages] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(new Date());

  // Handle rate limit errors from chat interface
  const handleRateLimitError = useCallback((resetTime: string) => {
    setRateLimitResetTime(new Date(resetTime));
    setShowRateLimitDialog(true);
  }, []);

  const handleMessagesChange = useCallback((hasMessages: boolean) => {
    setHasMessages(hasMessages);
  }, []);
  
  // Auto-trigger tilt animation after 2 seconds
  useEffect(() => {
    if (!hasMessages && !autoTiltTriggered) {
      const timer = setTimeout(() => {
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Share Button - Always visible in top right */}
      <motion.div 
        className="fixed top-3 sm:top-6 right-3 sm:right-6 z-50"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
      >
        <ShareButton />
      </motion.div>
      
      <BottomBar />
      
      <div className="max-w-4xl mx-auto">
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
                onHoverStart={() => setIsHoveringTitle(true)}
                onHoverEnd={() => setIsHoveringTitle(false)}
              >
                <motion.h1 
                  className="text-4xl sm:text-5xl font-light text-gray-900 dark:text-gray-100 tracking-tight cursor-default relative z-10"
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
          className="px-0 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <ChatInterface 
              onMessagesChange={handleMessagesChange} 
              onRateLimitError={handleRateLimitError}
            />
          </Suspense>
        </motion.div>
      </div>
      
      {/* Rate Limit Dialog */}
      <RateLimitDialog
        open={showRateLimitDialog}
        onOpenChange={setShowRateLimitDialog}
        resetTime={rateLimitResetTime}
      />
    </div>
  );
}