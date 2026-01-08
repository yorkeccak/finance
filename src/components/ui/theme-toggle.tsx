'use client';

import { useTheme } from 'next-themes';
import { ThemeSwitcher } from './theme-switcher';
import { useAuthStore } from '@/lib/stores/use-auth-store';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuthStore();

  // In valyu mode, require sign-in for theme switching
  // In self-hosted mode, always allow
  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';
  const hasAccess = isSelfHosted || !!user;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={!isSelfHosted}
      hasSubscription={hasAccess}
    />
  );
}

export function CompactThemeSelector({
  onUpgradeClick,
  sessionId
}: {
  onUpgradeClick?: () => void;
  sessionId?: string;
}) {
  const { setTheme, theme } = useTheme();
  const { user } = useAuthStore();

  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';
  const hasAccess = isSelfHosted || !!user;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      className="h-8 scale-75"
      requiresSubscription={!isSelfHosted}
      hasSubscription={hasAccess}
      onUpgradeClick={onUpgradeClick}
      userId={user?.id}
      sessionId={sessionId}
      tier={isSelfHosted ? 'unlimited' : (user ? 'valyu' : 'anonymous')}
    />
  );
}

export function ThemeMenuItem() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuthStore();

  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';
  const hasAccess = isSelfHosted || !!user;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={!isSelfHosted}
      hasSubscription={hasAccess}
    />
  );
}
