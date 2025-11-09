'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const themes = [
  {
    key: 'system',
    icon: Monitor,
    label: 'System theme',
  },
  {
    key: 'light',
    icon: Sun,
    label: 'Light theme',
  },
  {
    key: 'dark',
    icon: Moon,
    label: 'Dark theme',
  },
];

export type ThemeSwitcherProps = {
  value?: 'light' | 'dark' | 'system';
  onChange?: (theme: 'light' | 'dark' | 'system') => void;
  defaultValue?: 'light' | 'dark' | 'system';
  className?: string;
  requiresSubscription?: boolean;
  hasSubscription?: boolean;
  onUpgradeClick?: () => void;
  userId?: string;
  sessionId?: string;
  tier?: string;
};

export const ThemeSwitcher = ({
  value,
  onChange,
  defaultValue = 'light',
  className,
  requiresSubscription = false,
  hasSubscription = false,
  onUpgradeClick,
  userId,
  sessionId,
  tier,
}: ThemeSwitcherProps) => {
  const [theme, setTheme] = useControllableState({
    defaultProp: defaultValue,
    prop: value,
    onChange,
  });
  const [mounted, setMounted] = useState(false);

  const handleThemeClick = useCallback(
    async (themeKey: 'light' | 'dark' | 'system') => {
      // Check if dark mode or system theme requires subscription
      if (requiresSubscription && (themeKey === 'dark' || themeKey === 'system') && !hasSubscription) {
        onUpgradeClick?.();
        return;
      }

      const previousTheme = theme || defaultValue;
      
      // Track usage via server action
      if (previousTheme !== themeKey) {
        try {
          await fetch('/api/usage/dark-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromTheme: previousTheme,
              toTheme: themeKey,
              sessionId: sessionId
            })
          });
        } catch (error) {
        }
      }

      setTheme(themeKey);
    },
    [setTheme, requiresSubscription, hasSubscription, onUpgradeClick, theme, defaultValue, sessionId]
  );

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border',
        className
      )}
    >
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;
        const isRestrictedTheme = key === 'dark' || key === 'system';
        const isDisabled = requiresSubscription && isRestrictedTheme && !hasSubscription;

        return (
          <button
            aria-label={label}
            className={cn(
              'relative h-6 w-6 rounded-full',
              isDisabled && 'cursor-not-allowed'
            )}
            key={key}
            onClick={() => handleThemeClick(key as 'light' | 'dark' | 'system')}
            type="button"
            disabled={isDisabled}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-secondary"
                layoutId="activeTheme"
                transition={{ type: 'spring', duration: 0.5 }}
              />
            )}
            <Icon
              className={cn(
                'relative z-10 m-auto h-4 w-4',
                isActive ? 'text-foreground' : 'text-muted-foreground',
                isDisabled && 'opacity-30'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};