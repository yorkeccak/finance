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
            className="fixed inset-0 bg-foreground/50 z-50 backdrop-blur-sm"
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
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center border border-border">
                    <Sparkles className="h-8 w-8 text-foreground" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-center mb-2 text-foreground">
                  You&apos;re on a roll
                </h2>

                {/* Subtitle */}
                <p className="text-center text-muted-foreground mb-6">
                  You&apos;ve asked {messageCount} question{messageCount !== 1 ? 's' : ''}. Sign up to unlock the full potential of Finance by Valyu.
                </p>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
                      <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">
                        Save Your Chat History
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Never lose your research. Access all conversations anytime.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">
                        $10 Free Credits
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Get $10 free credits on signup. No credit card required.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">
                        Advanced Features
                      </h3>
                      <p className="text-xs text-muted-foreground">
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
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  >
                    Create Free Account
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="lg"
                    className="w-full text-muted-foreground hover:bg-accent"
                  >
                    Continue Without Account
                  </Button>
                </div>

                {/* Note */}
                <p className="text-center text-xs text-muted-foreground mt-4">
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
