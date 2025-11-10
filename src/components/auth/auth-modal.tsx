'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FaGoogle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSignUpSuccess?: (message: string) => void;
}

export function AuthModal({ open, onClose, onSignUpSuccess }: AuthModalProps) {
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const authLoading = useAuthStore((state) => state.loading);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [authData, setAuthData] = useState({
    email: '',
    password: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, check if user exists by trying to sign in with a dummy request
      // We'll use the actual password they provided
      const { error: signInError } = await signIn(authData.email, authData.password);

      if (signInError) {
        // Email not confirmed - user exists but hasn't verified
        if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your inbox and confirm your email first.');
          setLoading(false);
          return;
        }

        // Invalid credentials could mean: user exists with wrong password, OR user doesn't exist
        // We need to check if the user actually exists
        if (signInError.message.includes('Invalid login credentials')) {
          // Try a password reset request to check if email exists
          // This won't actually send an email, just checks if user exists
          const supabase = (await import('@/utils/supabase/client')).createClient();

          // Check if user exists by attempting signup - but check the response carefully
          const { data: signUpData, error: signUpError } = await signUp(authData.email, authData.password);

          // If signup returns a user but with identities = [], it means user already exists
          // Supabase doesn't send confirmation email again for existing users
          if (signUpData?.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
            // User exists, wrong password
            setError('Incorrect email or password.');
          } else if (signUpError) {
            // Signup failed for some other reason
            setError('Incorrect email or password.');
          } else if (signUpData?.user && signUpData.user.identities && signUpData.user.identities.length > 0) {
            // New user created successfully
            setUserEmail(authData.email);
            setShowSuccess(true);
            onSignUpSuccess?.('Check your email to confirm your account!');
          } else {
            // Unexpected case
            setError('Incorrect email or password.');
          }
        } else {
          // Other sign-in errors
          setError(signInError.message);
        }
      } else {
        // Sign in successful
        onClose();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
      // Don't close here as OAuth will redirect
      // Don't set googleLoading false here as user will be redirected
    } catch (err) {
      setError('An unexpected error occurred');
      setGoogleLoading(false);
    }
  };

  const isLoading = loading || authLoading;

  const handleClose = () => {
    setShowSuccess(false);
    setError(null);
    setAuthData({ email: '', password: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs border-0 shadow-2xl bg-white dark:bg-gray-950 p-8">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-xl font-normal text-gray-900 dark:text-gray-100">
            Finance.
          </DialogTitle>
        </DialogHeader>

        {/* Success Message */}
        {showSuccess ? (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Check your inbox
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We sent a confirmation email to
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                {userEmail}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full p-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unified Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={authData.email}
              onChange={(e) => setAuthData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="w-full p-3 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={authData.password}
              onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
              required
              className="w-full p-3 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3 mt-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : 'Continue'}
            </button>
          </form>

          {/* Divider with better text */}
          <div className="relative text-center py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-950 px-3 text-xs text-gray-500 dark:text-gray-400">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignIn}
            disabled={isLoading || googleLoading}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AnimatePresence mode="wait">
              {googleLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FaGoogle className="h-4 w-4" />
                  </motion.div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Connecting...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="normal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2"
                >
                  <FaGoogle className="h-4 w-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Google</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-sm text-red-500 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}