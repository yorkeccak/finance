'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const STORAGE_KEY = 'valyu.hero.seen.v1';
const AUTO_DISMISS_MS = 2400;

/**
 * First-land intro. A restrained line-art skyline on the app's own background
 * with the wordmark in the homepage title's typography, fading and blending
 * straight into the app. Shows once per browser (localStorage), respects
 * reduced motion.
 */
export function HeroSplash() {
  // Render nothing until mounted to avoid SSR/window access mismatches.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const dismissedRef = useRef(false);

  // Persist the seen flag and trigger the exit animation. Idempotent.
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage may be unavailable (private mode, blocked); ignore.
    }
    setVisible(false);
  }, []);

  // Decide on mount whether the splash should show at all.
  useEffect(() => {
    setMounted(true);

    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReduced);
    setVisible(true);
  }, []);

  // Auto-dismiss timer and global dismiss listeners, active only while visible.
  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    const onKey = () => dismiss();
    const onPointer = () => dismiss();
    const onScroll = () => dismiss();

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('wheel', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('touchmove', onScroll);
    };
  }, [visible, dismiss]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="hero-splash"
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-[9999] overflow-hidden bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={
            reducedMotion
              ? { opacity: 0, transition: { duration: 0.25 } }
              : { opacity: 0, filter: 'blur(8px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
          }
        >
          {/* Full-bleed line-art skyline (its warm-white field matches the app
              background, so the splash blends seamlessly); slow settle-in.
              Inverted in dark mode so it reads light-on-dark. */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: reducedMotion ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/assets/hero/hero-illustration-a.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-bottom dark:invert dark:hue-rotate-180"
            />
          </motion.div>

          {/* Wordmark uses the homepage title's typography. */}
          <div className="absolute inset-x-0 top-[28%] flex flex-col items-center px-6 text-center">
            <motion.h1
              className="text-5xl sm:text-7xl font-light tracking-tight text-foreground"
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Finance
            </motion.h1>
            <motion.p
              className="mt-4 text-sm sm:text-base font-light text-muted-foreground"
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              Real-time financial research with deep, cited analysis
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
