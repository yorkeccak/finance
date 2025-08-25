'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const authLoading = useAuthStore((state) => state.loading);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('signin');

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      if (error) {
        setError(error.message);
      } else {
        onClose();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password);
      if (error) {
        setError(error.message);
      } else {
        setError(null);
        setActiveTab('signin');
        // Show success message instead of closing
        alert('Check your email to confirm your account!');
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs border-0 shadow-2xl bg-white dark:bg-gray-950 p-8">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-xl font-normal text-gray-900 dark:text-gray-100">
            Finance.
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Simple Tab Toggle */}
          <div className="flex text-center border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 pb-2 text-sm transition-colors ${
                activeTab === 'signin' 
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 pb-2 text-sm transition-colors ${
                activeTab === 'signup' 
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={signInData.email}
                onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="w-full p-3 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={signInData.password}
                onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="w-full p-3 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full p-3 mt-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={signUpData.email}
                onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="w-full p-3 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={signUpData.password}
                onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="w-full p-3 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full p-3 mt-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

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
      </DialogContent>
    </Dialog>
  );
}