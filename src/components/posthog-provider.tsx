'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import posthog from 'posthog-js';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      // Identify user when logged in
      posthog.identify(user.id, {
        email: user.email,
      });
    } else {
      // Reset when logged out
      posthog.reset();
    }
  }, [user]);

  return <>{children}</>;
}
