'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const MIGRATION_STORAGE_KEY = 'finance-migration-banner-dismissed';
const DISCORD_STORAGE_KEY = 'finance-discord-banner-dismissed';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

export function MigrationBanner() {
  const [showMigration, setShowMigration] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);

  useEffect(() => {
    const migrationDismissed = localStorage.getItem(MIGRATION_STORAGE_KEY);
    const discordDismissed = localStorage.getItem(DISCORD_STORAGE_KEY);

    if (!migrationDismissed) {
      // Show migration banner first
      setShowMigration(true);

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        dismissMigration();
      }, 10000);

      return () => clearTimeout(timer);
    } else if (!discordDismissed) {
      // Migration already dismissed, show Discord banner
      setShowDiscord(true);
    }
  }, []);

  const dismissMigration = () => {
    setShowMigration(false);
    localStorage.setItem(MIGRATION_STORAGE_KEY, 'true');

    // Show Discord banner after migration banner is dismissed
    const discordDismissed = localStorage.getItem(DISCORD_STORAGE_KEY);
    if (!discordDismissed) {
      setShowDiscord(true);
    }
  };

  const dismissDiscord = () => {
    setShowDiscord(false);
    localStorage.setItem(DISCORD_STORAGE_KEY, 'true');
  };

  if (showMigration) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
        <div className="bg-muted/80 backdrop-blur-sm border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              This app now uses <span className="font-medium text-foreground">Sign in with Valyu</span>.
              If you had an account, sign in with Valyu to access your chat history.
            </p>
            <button
              onClick={dismissMigration}
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

  if (showDiscord) {
    return (
      <div className="fixed top-3 left-3 z-50 animate-in slide-in-from-left duration-300">
        <div className="bg-[#5865F2] text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2">
          <a
            href="https://discord.gg/BhUWrFbHRa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            <DiscordIcon className="h-3.5 w-3.5" />
            Join the Valyu Discord
          </a>
          <button
            onClick={dismissDiscord}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
