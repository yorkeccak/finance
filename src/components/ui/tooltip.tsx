'use client';

import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProviderProps {
  children: React.ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

interface TooltipProps {
  children: React.ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && child.type === TooltipTrigger
          ? child
          : React.isValidElement(child) && child.type === TooltipContent
          ? React.cloneElement(child, { isVisible } as any)
          : child
      )}
    </div>
  );
}

interface TooltipTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  TooltipTriggerProps
>(({ asChild, children }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref } as any);
  }
  
  return <div ref={ref}>{children}</div>;
});
TooltipTrigger.displayName = 'TooltipTrigger';

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  isVisible?: boolean;
}

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ children, className, isVisible }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap pointer-events-none',
        isVisible ? 'opacity-100 visible' : 'opacity-0 invisible',
        className
      )}
    >
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
    </div>
  );
});
TooltipContent.displayName = 'TooltipContent';