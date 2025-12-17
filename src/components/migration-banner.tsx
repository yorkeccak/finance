'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'finance-migration-banner-dismissed';

export function MigrationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Show banner
    setVisible(true);

    // Auto-hide after 10 seconds
    const timer = setTimeout(() => {
      dismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-muted/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            This app now uses <span className="font-medium text-foreground">Sign in with Valyu</span>.
            If you had an account, sign in with Valyu to access your chat history.
          </p>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
