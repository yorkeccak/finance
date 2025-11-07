'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, CheckCircle, Mail, Monitor } from 'lucide-react';
import { ThemeSelector } from '@/components/ui/theme-toggle';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const user = useAuthStore((state) => state.user);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim() || newEmail === user.email) {
      setMessage({ type: 'error', text: 'Please enter a different email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Email update initiated. Please check both your current and new email addresses for confirmation links.' 
        });
        setNewEmail('');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update email' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current User Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
            </div>
            <ThemeSelector />
          </div>

          {/* Email Update Form */}
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Change Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !newEmail.trim()}
                className="flex-1"
              >
                {loading ? 'Updating...' : 'Update Email'}
              </Button>
            </div>
          </form>

          <div className="text-xs text-gray-500 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <strong>Note:</strong> You&apos;ll receive confirmation emails at both your current and new email addresses. 
            You must confirm the change from both addresses for security.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}