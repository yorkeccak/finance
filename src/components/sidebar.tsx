'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client';
import {
  MessageSquare,
  History,
  Settings,
  LogOut,
  Trash2,
  CreditCard,
  BarChart3,
  Plus,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/user/settings-modal';
import { SubscriptionModal } from '@/components/user/subscription-modal';

interface SidebarProps {
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onNewChat?: () => void;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export function Sidebar({
  currentSessionId,
  onSessionSelect,
  onNewChat,
}: SidebarProps) {
  const { user } = useAuthStore();
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  // Fetch chat sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      const { sessions } = await response.json();
      return sessions;
    },
    enabled: !!user
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (currentSessionId === sessionId) {
        onNewChat?.();
      }
    }
  });

  const handleSessionSelect = useCallback((sessionId: string) => {
    onSessionSelect?.(sessionId);
    setShowHistory(false);
  }, [onSessionSelect]);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
    setShowHistory(false);
  }, [onNewChat]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setShowHistory(false); // Close history when closing sidebar
    }
  };

  const handleLogoClick = () => {
    // If in a chat session, warn before leaving
    if (currentSessionId) {
      const confirmed = window.confirm(
        'Leave this conversation? Your chat history will be saved.'
      );

      if (confirmed) {
        setIsOpen(false);
        setShowHistory(false);
        onNewChat?.(); // Call onNewChat to properly reset the chat interface
      }
      return;
    }

    // If on homepage without active chat, just collapse the sidebar
    if (pathname === '/') {
      setIsOpen(false);
      setShowHistory(false);
      return;
    }

    // If on other pages, warn before leaving
    const confirmed = window.confirm(
      'Leave this page? Your current session will be saved, but any unsaved changes will be lost.'
    );

    if (confirmed) {
      setIsOpen(false);
      setShowHistory(false);
      router.push('/');
    }
  };

  const handleViewUsage = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/customer-portal', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        window.open(redirectUrl, '_blank');
      }
    } catch (error) {
      console.error('[Sidebar] Error accessing billing portal:', error);
    }
  };

  // Check if user has Polar customer account
  const hasPolarCustomer = user?.user_metadata?.polar_customer_id;
  const tier = user?.user_metadata?.subscription_tier || 'free';

  // Don't render sidebar for non-logged-in users
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Collapsed Logo Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300
            }}
            onClick={toggleSidebar}
            className="fixed left-6 top-6 z-50 w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200"
          >
            <Image
              src="/nabla.png"
              alt="Open Menu"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            className="fixed left-4 top-4 bottom-4 w-16 bg-white dark:bg-gray-900 rounded-full shadow-lg flex flex-col items-center py-4 z-40 border border-gray-200 dark:border-gray-800"
          >
            {/* Logo Button - handles close/home navigation */}
            <button
              onClick={handleLogoClick}
              className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2"
              title={pathname === '/' ? 'Close Sidebar' : 'Go to Home'}
            >
              <Image
                src="/nabla.png"
                alt="Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </button>

            {/* New Chat Button */}
            {user && (
              <button
                onClick={handleNewChat}
                className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2 group"
                title="New Chat"
              >
                <Plus className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
              </button>
            )}

            {/* History Button */}
            {user && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2 ${
                  showHistory ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
                title="Chat History"
              >
                <History className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Subscription/Billing Button */}
            {user && (
              <>
                {tier === 'free' && !hasPolarCustomer ? (
                  <button
                    onClick={() => setShowSubscription(true)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2 group"
                    title="Subscription"
                  >
                    <CreditCard className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                  </button>
                ) : hasPolarCustomer ? (
                  <button
                    onClick={handleViewUsage}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2 group"
                    title="View Usage & Billing"
                  >
                    <BarChart3 className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                  </button>
                ) : null}
              </>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2 group"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
            </button>

            {/* User Avatar with Logout */}
            {user && (
              <div className="relative group">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                {/* Hover Logout Button */}
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="absolute left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 whitespace-nowrap"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Logout</span>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && user && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300
              }}
              className="fixed left-20 top-4 bottom-4 w-64 bg-white dark:bg-gray-900 rounded-3xl z-50 shadow-xl ml-2 flex flex-col border border-gray-200 dark:border-gray-800"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Chat History</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sessions List */}
              <ScrollArea className="flex-1 px-2">
                {loadingSessions ? (
                  <div className="space-y-2 p-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      No chat history yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 py-2">
                    {sessions.map((session: ChatSession) => (
                      <div
                        key={session.id}
                        onClick={() => handleSessionSelect(session.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group cursor-pointer transition-colors ${
                          currentSessionId === session.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                      >
                        <MessageSquare className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {session.title}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                            {new Date(session.last_message_at || session.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <SubscriptionModal
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </>
  );
}
