'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Sparkles, History, Lock } from 'lucide-react';

interface SignupPromptProps {
  open: boolean;
  onClose: () => void;
  onSignUp: () => void;
  messageCount: number;
}

export function SignupPrompt({ open, onClose, onSignUp, messageCount }: SignupPromptProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>

              {/* Content */}
              <div className="p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    <Sparkles className="h-8 w-8 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
                  You&apos;re on a roll
                </h2>

                {/* Subtitle */}
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  You&apos;ve asked {messageCount} question{messageCount !== 1 ? 's' : ''}. Sign up to unlock the full potential of Finance by Valyu.
                </p>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <History className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        Save Your Chat History
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Never lose your research. Access all conversations anytime.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        $10 Free Credits
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Get $10 free credits on signup. No credit card required.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <Lock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        Advanced Features
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Access premium tools, deeper analysis, and priority support.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={onSignUp}
                    size="lg"
                    className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 font-medium"
                  >
                    Create Free Account
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="lg"
                    className="w-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Continue Without Account
                  </Button>
                </div>

                {/* Note */}
                <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-4">
                  Takes less than 30 seconds. No credit card required.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
