'use client';

import { useEffect, useState } from 'react';
import { Building2, X } from 'lucide-react';
import { EnterpriseContactModal } from './enterprise-contact-modal';

const DISMISSED_KEY = 'valyu.enterprise.dismissed.v1';

export function EnterpriseBanner() {
  const [showModal, setShowModal] = useState(false);
  // Hidden until mounted so a dismissed banner never flashes on load.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(DISMISSED_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // localStorage may be unavailable (private mode, blocked); ignore.
    }
  };

  // Hide in self-hosted mode or if enterprise features disabled
  if (process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted' || process.env.NEXT_PUBLIC_ENTERPRISE !== 'true') {
    return null;
  }

  return (
    <>
      {/* Subtle top-right banner */}
      {visible && (
        <div className="fixed top-6 right-6 z-40 hidden max-w-xs md:block">
          <div className="relative bg-card border border-border rounded-lg shadow-lg p-3 pr-8">
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-2 right-2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground mb-0.5">
                  Search and research for your AI
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground mb-2">
                  The search, data and deep research behind this app, available to your own agents and workflows.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                >
                  Book a call →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EnterpriseContactModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
