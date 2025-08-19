'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Check, Github } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';

interface RateLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetTime: Date;
}

export function RateLimitDialog({ open, onOpenChange, resetTime }: RateLimitDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
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
      
      if (open) { // Only track if dialog is actually open
        track('Language Selection', {
          source: 'rate_limit_dialog',
          language: activeTab
        });
      }
    }
  }, [activeTab, open]);

  useEffect(() => {
    if (open) {
      // Track rate limit hit
      track('Rate Limit Hit', {
        resetTime: resetTime.toISOString(),
        remainingQueries: 0
      });
      
      setShowBadge(true);
      const timer = setTimeout(() => {
        setShowBadge(false);
      }, 3000);
      return () => clearTimeout(timer);
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
    // Track code copy from rate limit dialog
    track('Code Copy', {
      source: 'rate_limit_dialog',
      language: activeTab,
      codeLength: code.length
    });
    
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuildYourOwn = () => {
    // Track platform clickthrough from rate limit dialog
    track('Platform Clickthrough', {
      source: 'rate_limit_dialog',
      action: 'build_your_own',
      url: 'https://platform.valyu.network/?utm_source=finance.valyu.network&utm_medium=rate_limit_dialog'
    });
    
    window.open('https://platform.valyu.network/?utm_source=finance.valyu.network&utm_medium=rate_limit_dialog', '_blank');
  };

  // Code snippets for display (with dynamic typing animation)
  const codeSnippets = {
    Python: `# Install Valyu
pip install valyu-js

# Search financial data
from valyu import Valyu

valyu = Valyu(api_key="your_api_key")
result = await valyu.search("${currentText}")
print(result)`,
    
    TypeScript: `// Install Valyu
npm install valyu-js

// Search financial data
import { Valyu } from 'valyu-js';

const valyu = new Valyu('your_api_key');
const result = await valyu.search('${currentText}');
console.log(result);`,
    
    cURL: `# Search financial data
curl -X POST "https://api.valyu.network/v1/search" \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "${currentText}",
    "max_results": 10
  }'`
  };

  // Full code snippets for copying (with current complete example)
  const currentExample = exampleQueries[currentExampleIndex];
  const copyableSnippets = {
    Python: `# Install Valyu
pip install valyu-js

# Search financial data
from valyu import Valyu

valyu = Valyu(api_key="your_api_key")
result = await valyu.search("${currentExample}")
print(result)`,
    
    TypeScript: `// Install Valyu
npm install valyu-js

// Search financial data
import { Valyu } from 'valyu-js';

const valyu = new Valyu('your_api_key');
const result = await valyu.search('${currentExample}');
console.log(result);`,
    
    cURL: `# Search financial data
curl -X POST "https://api.valyu.network/v1/search" \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "${currentExample}",
    "max_results": 10
  }'`
  };

  // Create enhanced code snippets with cursor
  const getCodeSnippetWithCursor = (snippet: string) => {
    if (!currentText) return snippet;
    
    const parts = snippet.split(currentText);
    if (parts.length === 2) {
      const cursor = isTyping && currentText.length > 0 ? '|' : '';
      return parts[0] + currentText + cursor + parts[1];
    }
    return snippet;
  };

  const activeSnippet = codeSnippets[activeTab as keyof typeof codeSnippets];

  return (
    <AnimatePresence>
        {open && (
          <Dialog open={open} onOpenChange={onOpenChange}>
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm"
            onClick={() => {
              track('Rate Limit Dialog Closed', {
                action: 'backdrop_click'
              });
              onOpenChange(false);
            }}
          />
          <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-2xl sm:!w-[40vw] sm:!max-w-[40vw] translate-x-[-50%] translate-y-[-50%] p-0 border-0 bg-transparent shadow-none">
            <DialogTitle className="sr-only">Daily Rate Limit Reached</DialogTitle>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-2">
                    You&apos;ve reached your daily limit
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    5 free queries used • Resets in <span className="font-medium text-blue-600 dark:text-blue-400">{formatResetTime(resetTime)}</span>
                  </p>
                  
                  {/* Valyu Branding */}
                  <div className="flex items-center justify-center gap-2">
                    <Image 
                      src="/valyu.svg" 
                      alt="Valyu"
                      width={48}
                      height={48}
                      className="h-12 w-12 opacity-60 mt-1"
                    />
                    <span className="text-sm font-light text-gray-600 dark:text-gray-400">
                      the information layer for AI
                    </span>
                  </div>
                  {/* Options */}
                  <div className="flex flex-col sm:flex-row items-center justify-center mt-6 gap-4 text-sm">
                    <a
                      href="https://platform.valyu.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      onClick={() => {
                        track('Signup CTA Click', {
                          source: 'rate_limit_dialog',
                          url: 'https://platform.valyu.network'
                        });
                      }}
                    >
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        Sign up for Valyu
                      </span>
                    </a>
                    
                    <span className="text-gray-400 hidden sm:block">or</span>
                    
                    <a
                      href="https://github.com/yorkeccak/finance/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label="View on GitHub"
                      onClick={() => {
                        track('GitHub CTA Click', {
                          source: 'rate_limit_dialog',
                          url: 'https://github.com/yorkeccak/finance/'
                        });
                      }}
                    >
                      <Github className="h-4 w-4" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Run it yourself
                      </span>
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-light text-gray-900 dark:text-gray-100">
                      Build your own with Valyu
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Use our API to create unlimited financial applications
                    </p>
                  </div>
                </div>
              </div>

              {/* Language Tabs */}
              <div className="px-6 pt-4">
                <div className="flex space-x-1">
                  {['Python', 'TypeScript', 'cURL'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`px-3 py-1.5 text-sm font-light transition-colors ${
                        activeTab === lang
                          ? 'text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-100'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Block */}
              <div className="relative p-6 pt-4 min-w-0">
                <div className="relative group">
                  <button
                    onClick={() => handleCopy(copyableSnippets[activeTab as keyof typeof copyableSnippets])}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>

                  <pre className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 overflow-x-auto scrollbar-hide min-h-[120px] whitespace-pre-wrap break-words">
                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre block w-full">
                      <span dangerouslySetInnerHTML={{
                        __html: getCodeSnippetWithCursor(activeSnippet)
                          .replace('|', '<span class="animate-pulse text-blue-500 font-bold">|</span>')
                      }} />
                    </code>
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 pb-6">
                <div className="relative">
                  <button
                    onClick={handleBuildYourOwn}
                    className="text-sm font-light text-gray-900 dark:text-gray-100 hover:underline relative group"
                  >
                    Get $10 Free Credits →
                    
                    {/* Animated free credits badge */}
                    <AnimatePresence>
                      {showBadge && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0, opacity: 0, y: -10 }}
                          transition={{ 
                            delay: 0.8, 
                            duration: 0.4, 
                            ease: [0.23, 1, 0.32, 1],
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                          }}
                          className="absolute -top-8 left-0 whitespace-nowrap"
                        >
                          <div className="relative">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg">
                              Ready to start!
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-green-500"></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    track('Rate Limit Dialog Closed', {
                      action: 'close_button',
                      timeOpen: Date.now() - (typeof window !== 'undefined' ? window.performance.now() : 0)
                    });
                    onOpenChange(false);
                  }}
                  className="text-sm font-light text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}