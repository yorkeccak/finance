'use client';

import { useTheme } from 'next-themes';
import { ThemeSwitcher } from './theme-switcher';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const { tier, hasPolarCustomer } = useRateLimit();
  
  const hasSubscription = tier !== 'free' && tier !== 'anonymous';

  return (
    <ThemeSwitcher 
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={true}
      hasSubscription={hasSubscription}
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
  const { tier, hasPolarCustomer, userId } = useRateLimit();
  
  const hasSubscription = tier !== 'free' && tier !== 'anonymous';

  return (
    <ThemeSwitcher 
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      className="h-8 scale-75"
      requiresSubscription={true}
      hasSubscription={hasSubscription}
      onUpgradeClick={onUpgradeClick}
      userId={userId}
      sessionId={sessionId}
      tier={tier}
    />
  );
}

export function ThemeMenuItem() {
  const { setTheme, theme } = useTheme();
  const { tier, hasPolarCustomer } = useRateLimit();
  
  const hasSubscription = tier !== 'free' && tier !== 'anonymous';

  return (
    <ThemeSwitcher 
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={true}
      hasSubscription={hasSubscription}
    />
  );
}