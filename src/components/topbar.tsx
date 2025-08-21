'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { createClient } from '@/utils/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShareButton } from '@/components/share-button';
import { OllamaStatusIndicator } from '@/components/ollama-status-indicator';
import { SubscriptionModal } from './user/subscription-modal';
import { SettingsModal } from './user/settings-modal';
import { 
  Settings, 
  CreditCard, 
  LogOut, 
  User, 
  Plus,
  MessageSquare,
  Trash2,
  History,
  X
} from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

interface TopbarProps {
  hasMessages: boolean;
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onAuthClick: () => void;
}

export function Topbar({ 
  hasMessages, 
  currentSessionId, 
  onSessionSelect, 
  onNewChat, 
  onAuthClick 
}: TopbarProps) {
  const { user, signOut } = useAuth();
  const [showSubscription, setShowSubscription] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingSessions(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const { sessions } = await response.json();
        setSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        {/* Left side - New Chat button when user is authenticated and has messages */}
        <div className="flex items-center gap-3">
          {user && hasMessages && (
            <Button
              onClick={onNewChat}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>

        {/* Right side - Status indicators and profile */}
        <div className="flex items-center gap-2">
          <OllamaStatusIndicator hasMessages={hasMessages} />
          <ShareButton />
          
          {user ? (
            <DropdownMenu onOpenChange={(open) => {
              if (open) loadSessions();
            }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-80">
                {/* User Info Section */}
                <div className="p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>
                        {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {user.user_metadata?.name || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Free
                        </Badge>
                        <span className="text-xs text-gray-500">3/5 queries</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat History Section */}
                <div className="border-b">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Chat History
                  </DropdownMenuLabel>
                  <ScrollArea className="max-h-60">
                    {loadingSessions ? (
                      <div className="p-3">
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-500">
                        No chat history yet
                      </div>
                    ) : (
                      <div className="p-1">
                        {sessions.map(session => (
                          <div
                            key={session.id}
                            className={`group flex items-center gap-2 p-2 rounded-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              currentSessionId === session.id ? 'bg-gray-50 dark:bg-gray-800' : ''
                            }`}
                            onClick={() => onSessionSelect(session.id)}
                          >
                            <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">
                                {session.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(session.last_message_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex-shrink-0"
                              onClick={(e) => deleteSession(session.id, e)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Menu Actions */}
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => setShowSubscription(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscription
                </DropdownMenuItem>
                
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={onAuthClick} size="sm">
              Sign In
            </Button>
          )}
        </div>
      </div>

      <SubscriptionModal
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
      
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}