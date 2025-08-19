'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { track } from '@vercel/analytics';

interface CodeSnippet {
  language: string;
  code: string;
}

interface CodeSnippetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  snippets: CodeSnippet[];
}

export default function CodeSnippetDialog({
  isOpen,
  onClose,
  title,
  snippets,
}: CodeSnippetDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || 'Python';
    }
    return 'Python';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', activeTab);
      
      if (snippets.length > 0) { // Only track if dialog is actually shown
        track('Language Selection', {
          source: 'data_source_dialog',
          dataSource: title,
          language: activeTab
        });
      }
    }
  }, [activeTab, title, snippets.length]);

  useEffect(() => {
    if (isOpen) {
      // Track data source code example click
      track('Data Source Code Example Click', {
        dataSource: title,
        logoSrc: getLogoSrc(title)
      });
      
      setShowBadge(true);
      const timer = setTimeout(() => {
        setShowBadge(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, title]);

  const handleCopy = async (code: string) => {
    // Track code copy from data source dialog
    track('Code Copy', {
      source: 'data_source_dialog',
      dataSource: title,
      language: activeTab,
      codeLength: code.length
    });
    
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeSnippet = snippets.find(s => s.language === activeTab);

  // Get logo source for the title
  const getLogoSrc = (title: string) => {
    const logoMap: { [key: string]: string } = {
      'SEC Filings': '/sec.svg',
      'arXiv Papers': '/arxiv.svg',
      'Web Search': '/web.svg',
      'Balance Sheets': '/balancesheet.svg',
      'Stock Market Data': '/stocks.svg',
      'Wiley Research': '/wy.svg'
    };
    return logoMap[title] || '/valyu.svg';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm'
            onClick={() => {
              track('Data Source Dialog Closed', {
                dataSource: title,
                action: 'backdrop_click'
              });
              onClose();
            }}
          />
          <DialogContent className='fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-2xl sm:w-[90vw] translate-x-[-50%] translate-y-[-50%] p-0 border-0 bg-transparent shadow-none overflow-hidden'>
            {/* Hidden DialogTitle for accessibility */}
            <DialogTitle className='sr-only'>{title}</DialogTitle>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className='bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 relative'
            >
              {/* Header */}
              <div className='p-4 sm:p-6 pb-0'>
                <div className='flex items-center gap-3'>
                  <Image
                    src={getLogoSrc(title)}
                    alt={title}
                    width={24}
                    height={24}
                    className='h-6 w-6 opacity-60'
                  />
                  <div>
                    <h2 className='text-lg font-light text-gray-900 dark:text-gray-100'>
                      {title}
                    </h2>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                      Integration snippet for Valyu API
                    </p>
                  </div>
                </div>
              </div>

              {/* Language Tabs */}
              <div className='px-4 sm:px-6 pt-4'>
                <div className='flex space-x-1'>
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
              <div className='relative p-4 sm:p-6 pt-4'>
                <div className='relative group'>
                  <button
                    onClick={() => activeSnippet && handleCopy(activeSnippet.code)}
                    className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    {copied ? (
                      <Check className='h-4 w-4 text-green-600 dark:text-green-400' />
                    ) : (
                      <Copy className='h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300' />
                    )}
                  </button>

                  {activeSnippet && (
                    <pre className='bg-gray-50 dark:bg-gray-900 rounded-md p-3 sm:p-4 overflow-x-auto scrollbar-hide max-w-full'>
                      <code className='text-[10px] sm:text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre break-all sm:break-normal'>
                        {activeSnippet.code}
                      </code>
                    </pre>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 px-4 sm:px-6 pb-4 sm:pb-6'>
                <div className='relative'>
                  <a
                    href='https://platform.valyu.network'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm font-light text-gray-900 dark:text-gray-100 hover:underline relative group'
                    onClick={() => {
                      track('Platform Clickthrough', {
                        source: 'data_source_dialog',
                        dataSource: title,
                        action: 'get_api_key',
                        url: 'https://platform.valyu.network'
                      });
                    }}
                  >
                    Get API Key &rarr;

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
                            type: 'spring',
                            stiffness: 300,
                            damping: 20
                          }}
                          className='absolute -top-8 left-0 whitespace-nowrap'
                        >
                          <div className='relative'>
                            <div className='bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg'>
                              $10 free credits
                            </div>
                            {/* Small arrow pointing down */}
                            <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-green-500'></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </a>
                </div>

                <a
                  href='https://docs.valyu.network'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-sm font-light text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                >
                  Documentation
                </a>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}