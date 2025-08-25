'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}