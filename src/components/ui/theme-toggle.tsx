'use client';

import { useTheme } from 'next-themes';
import { ThemeSwitcher } from './theme-switcher';
import { useAuthStore } from '@/lib/stores/use-auth-store';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuthStore();

  // In production, require sign-in for theme switching
  // In development, always allow
  const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
  const hasAccess = isDevelopment || !!user;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={!isDevelopment}
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

  const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
  const hasAccess = isDevelopment || !!user;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      className="h-8 scale-75"
      requiresSubscription={!isDevelopment}
      hasSubscription={hasAccess}
      onUpgradeClick={onUpgradeClick}
      userId={user?.id}
      sessionId={sessionId}
      tier={isDevelopment ? 'unlimited' : (user ? 'valyu' : 'anonymous')}
    />
  );
}

export function ThemeMenuItem() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuthStore();

  const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
  const hasAccess = isDevelopment || !!user;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={!isDevelopment}
      hasSubscription={hasAccess}
    />
  );
}
