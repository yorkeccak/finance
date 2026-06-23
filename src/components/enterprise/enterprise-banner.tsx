'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { EnterpriseContactModal } from './enterprise-contact-modal';

export function EnterpriseBanner() {
  const [showModal, setShowModal] = useState(false);

  // Hide in self-hosted mode or if enterprise features disabled
  if (process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted' || process.env.NEXT_PUBLIC_ENTERPRISE !== 'true') {
    return null;
  }

  return (
    <>
      {/* Subtle top-right banner */}
      <div className="fixed top-6 right-6 z-40 max-w-xs">
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground mb-0.5">
                Enterprise AI Search
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground mb-2">
                Deploy Valyu&apos;s enterprise-grade infrastructure in your organization
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

      <EnterpriseContactModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
