'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import {
  MessagesSquare,
  MessageCirclePlus,
  FileText,
  Settings,
  LogOut,
  LogIn,
  Trash2,
  BarChart3,
  Plus,
  Building2,
  Menu,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { apiListReports, apiReportHistory, apiDeleteReport } from '@/lib/report-client';
import { unseenCompletedCount } from '@/lib/report-notify';
import { isTerminal, type ReportDTO } from '@/lib/reports';
import { SettingsModal } from '@/components/user/settings-modal';
import { EnterpriseContactModal } from '@/components/enterprise/enterprise-contact-modal';

interface SidebarProps {
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onNewChat?: () => void;
  hasMessages?: boolean;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-positive',
  failed: 'bg-destructive',
  cancelled: 'bg-muted-foreground',
  running: 'bg-primary',
  queued: 'bg-muted-foreground',
};

/** Tiny status indicator for a report row (pulses while in-flight). */
function ReportStatusDot({ status }: { status: string }) {
  const color = STATUS_DOT[status] || 'bg-muted-foreground';
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {!isTerminal(status) && (
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${color}`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

export function Sidebar({
  currentSessionId,
  onSessionSelect,
  onNewChat,
  hasMessages = false,
}: SidebarProps) {
  const { user } = useAuthStore();
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';

  // Reports badge: count of completed runs the user hasn't acknowledged yet.
  const { data: reportsForBadge = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: apiListReports,
    refetchInterval: 10000,
    enabled: !!user,
  });
  const unseenReports = unseenCompletedCount(reportsForBadge);

  // Keep dock open by default for everyone
  const [isOpen, setIsOpen] = useState(true);
  const [alwaysOpen, setAlwaysOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  // History = the user's DeepResearch runs, reconciled against Valyu's
  // canonical task index (list + hydrate for auto-generated titles).
  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['report-history'],
    queryFn: apiReportHistory,
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Delete a report (also drops it from Valyu's index).
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiDeleteReport(reportId);
      return reportId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  // Open a report: the homepage research surface renders any run by id.
  const handleReportSelect = useCallback((reportId: string) => {
    setShowHistory(false);
    setShowMobileHistory(false);
    setShowMobileDrawer(false);
    router.push(`/?research=${reportId}`);
  }, [router]);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
    setShowHistory(false);
    setShowMobileDrawer(false);
    setShowMobileHistory(false);
  }, [onNewChat]);

  const toggleSidebar = () => {
    if (alwaysOpen) return; // Don't allow closing if always open is enabled
    setIsOpen(!isOpen);
    if (isOpen) {
      setShowHistory(false); // Close history when closing sidebar
    }
  };

  // Keep sidebar open if alwaysOpen is enabled
  useEffect(() => {
    if (alwaysOpen) {
      setIsOpen(true);
    }
  }, [alwaysOpen]);

  const handleLogoClick = () => {
    // Everything is persisted (research runs + reports), so there's nothing to
    // lose — just go to a fresh homepage. router.push('/') also clears any
    // active ?research run so Home always lands on the input.
    if (!alwaysOpen) {
      setIsOpen(false);
    }
    setShowHistory(false);
    if (pathname === '/') {
      // Already home: reset to a clean input (drop ?research / ?chatId).
      onNewChat?.();
    }
    router.push('/');
  };

  const handleViewCredits = () => {
    // Open Valyu Platform for credit management
    window.open('https://platform.valyu.ai', '_blank');
  };

  // Shared history list component
  const HistoryList = ({ onClose }: { onClose: () => void }) => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">History</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Reports list */}
      <ScrollArea className="flex-1 px-2">
        {loadingReports ? (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-muted-foreground text-center">
              No research yet
            </p>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {reports.map((report: ReportDTO) => (
              <div
                key={report.id}
                onClick={() => handleReportSelect(report.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent hover:text-accent-foreground group cursor-pointer transition-colors"
              >
                <ReportStatusDot status={report.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {report.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {!isTerminal(report.status) ? `${cap(report.status)} · ` : ''}
                    {timeAgo(report.created_at)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(report.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
                  title="Delete report"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  return (
    <>
      {/* ==================== MOBILE TOP BAR ==================== */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
          {/* Left: Hamburger */}
          <button
            onClick={() => setShowMobileDrawer(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          {/* Center: Logo */}
          <button onClick={handleLogoClick} className="flex items-center gap-2">
            <Image
              src="/nabla.png"
              alt="Finance"
              width={24}
              height={24}
              className="rounded-md"
            />
            <span className="text-sm font-semibold text-foreground">Finance</span>
          </button>

          {/* Right: User avatar or login */}
          {user ? (
            <button
              onClick={() => setShowMobileDrawer(true)}
              className="w-10 h-10 flex items-center justify-center"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('show-auth-modal'))}
              className="px-3 py-1.5 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors"
            >
              Log in
            </button>
          )}
        </div>
      </div>

      {/* ==================== MOBILE DRAWER ==================== */}
      <AnimatePresence>
        {showMobileDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-[60] md:hidden backdrop-blur-sm"
              onClick={() => {
                setShowMobileDrawer(false);
                setShowMobileHistory(false);
              }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-card z-[70] md:hidden flex flex-col shadow-2xl"
            >
              {showMobileHistory ? (
                <HistoryList onClose={() => setShowMobileHistory(false)} />
              ) : (
                <>
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/nabla.png"
                        alt="Finance"
                        width={28}
                        height={28}
                        className="rounded-lg"
                      />
                      <span className="font-semibold text-foreground">Finance</span>
                    </div>
                    <button
                      onClick={() => setShowMobileDrawer(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent hover:text-accent-foreground"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Drawer Menu Items */}
                  <div className="flex-1 overflow-y-auto py-2">
                    {/* New Chat */}
                    {user && (
                      <button
                        onClick={handleNewChat}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <MessageCirclePlus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">New Chat</span>
                      </button>
                    )}

                    {/* History */}
                    <button
                      onClick={() => {
                        if (!user) {
                          setShowMobileDrawer(false);
                          window.dispatchEvent(new CustomEvent('show-auth-modal'));
                        } else {
                          setShowMobileHistory(true);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors ${
                        !user ? 'opacity-50' : ''
                      }`}
                    >
                      <MessagesSquare className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {!user ? 'Sign up for history' : 'Chat History'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-border my-2 mx-4" />

                    {/* View Credits */}
                    {user && !isSelfHosted && (
                      <button
                        onClick={() => {
                          setShowMobileDrawer(false);
                          handleViewCredits();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Valyu Credits</span>
                      </button>
                    )}

                    {/* Enterprise */}
                    {user && process.env.NEXT_PUBLIC_APP_MODE !== 'self-hosted' && process.env.NEXT_PUBLIC_ENTERPRISE === 'true' && (
                      <button
                        onClick={() => {
                          setShowMobileDrawer(false);
                          setShowEnterpriseModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Enterprise Solutions</span>
                      </button>
                    )}

                    {/* Settings */}
                    {user && (
                      <button
                        onClick={() => {
                          setShowMobileDrawer(false);
                          setShowSettings(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Settings</span>
                      </button>
                    )}
                  </div>

                  {/* Drawer Footer */}
                  <div className="border-t border-border p-4">
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowMobileDrawer(false);
                            const confirmed = window.confirm('Are you sure you want to sign out?');
                            if (confirmed) {
                              signOut();
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="font-medium">Sign out</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMobileDrawer(false);
                          window.dispatchEvent(new CustomEvent('show-auth-modal'));
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium text-sm transition-colors"
                      >
                        <LogIn className="h-4 w-4" />
                        Log in
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==================== DESKTOP: Chevron Toggle Button ==================== */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={toggleSidebar}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-10 h-16 hidden md:flex items-center justify-center bg-card border-r-2 border-t-2 border-b-2 border-border hover:border-border rounded-r-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:w-12 group"
          title="Open Menu"
        >
          <svg
            className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </motion.button>
      )}

      {/* ==================== DESKTOP: macOS Dock-Style Navigation ==================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300
            }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-40 bg-card/80 backdrop-blur-2xl border border-border rounded-[32px] shadow-2xl py-4 px-3 hidden md:block"
          >
            <div className="flex flex-col items-center gap-2">
              {/* Always Open Toggle */}
              <div className="relative group/tooltip">
                <button
                  onClick={() => setAlwaysOpen(!alwaysOpen)}
                  className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                    alwaysOpen
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <svg
                    className={`w-6 h-6 transition-colors ${
                      alwaysOpen
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {alwaysOpen ? 'Always Open (On)' : 'Always Open (Off)'}
                </div>
              </div>

              {/* Divider */}
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Logo */}
              <div className="relative group/tooltip">
                <button
                  onClick={handleLogoClick}
                  className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <Image
                    src="/nabla.png"
                    alt="Home"
                    width={28}
                    height={28}
                    className="rounded-lg"
                  />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Home
                </div>
              </div>

              {/* Divider */}
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* New Chat */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={handleNewChat}
                    className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <MessageCirclePlus className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    New Chat
                  </div>
                </div>
              )}

              {/* Reports */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => router.push('/reports')}
                    className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                      pathname?.startsWith('/reports')
                        ? 'bg-primary shadow-lg'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <FileText className={`h-6 w-6 transition-colors ${
                      pathname?.startsWith('/reports')
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                    {unseenReports > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none ring-2 ring-background">
                        {unseenReports > 9 ? '9+' : unseenReports}
                      </span>
                    )}
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Reports
                  </div>
                </div>
              )}

                      {/* History */}
              <div className="relative group/tooltip">
                <button
                  onClick={() => {
                    if (!user) {
                      window.dispatchEvent(new CustomEvent('show-auth-modal'));
                    } else {
                      setShowHistory(!showHistory);
                    }
                  }}
                  className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                    !user
                      ? 'opacity-50 cursor-not-allowed hover:bg-accent hover:text-accent-foreground'
                      : showHistory
                        ? 'bg-primary shadow-lg'
                        : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <MessagesSquare className={`h-6 w-6 transition-colors ${
                    !user
                      ? 'text-muted-foreground'
                      : showHistory
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                  }`} />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {!user ? 'Sign up (free) for history' : 'History'}
                </div>
              </div>

              {/* Divider */}
              {user && !isSelfHosted && <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />}

              {/* View Credits - Link to Valyu Platform (Hidden in self-hosted mode) */}
              {user && !isSelfHosted && (
                <div className="relative group/tooltip">
                  <button
                    onClick={handleViewCredits}
                    className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <BarChart3 className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Valyu Credits
                  </div>
                </div>
              )}

              {/* Enterprise */}
              {user && process.env.NEXT_PUBLIC_APP_MODE !== 'self-hosted' && process.env.NEXT_PUBLIC_ENTERPRISE === 'true' && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => setShowEnterpriseModal(true)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Enterprise Solutions
                  </div>
                </div>
              )}

              {/* Settings */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <Settings className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Settings
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent mt-1" />

              {/* Log In Button for unauthenticated users */}
              {!user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('show-auth-modal'));
                    }}
                    className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <LogIn className="h-6 w-6 text-muted-foreground" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Log in
                  </div>
                </div>
              )}

              {/* User Avatar with Dropdown */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-border transition-all">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  {/* Only show tooltip when menu is NOT open */}
                  {!showProfileMenu && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Account
                    </div>
                  )}

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <>
                        {/* Backdrop to close on click away */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowProfileMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, x: -10, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-full ml-4 bottom-0 bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl py-2 px-1 min-w-[220px] z-50"
                        >
                        {/* User Email */}
                        <div className="px-3 py-2.5 mb-1">
                          <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.email}
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border my-1" />

                        {/* Sign Out */}
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            const confirmed = window.confirm('Are you sure you want to sign out?');
                            if (confirmed) {
                              signOut();
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="font-medium">Sign out</span>
                        </button>
                      </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Close Dock Button - Only show if not always open */}
              {!alwaysOpen && (
                <>
                  <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent mt-2" />
                  <div className="relative group/tooltip">
                    <button
                      onClick={toggleSidebar}
                      className="w-12 h-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 mt-2"
                    >
                      <svg
                        className="w-5 h-5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Close
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DESKTOP: History Panel ==================== */}
      <AnimatePresence>
        {showHistory && user && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 z-40 backdrop-blur-sm hidden md:block"
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
              className="fixed left-20 top-4 bottom-4 w-64 bg-card rounded-3xl z-50 shadow-xl ml-2 hidden md:flex flex-col border border-border"
            >
              <HistoryList onClose={() => setShowHistory(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <EnterpriseContactModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
      />
    </>
  );
}
