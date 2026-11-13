/*
  💡 REACT LESSON: The Main Dashboard Layout
  
  This is the "shell" of your app — sidebar navigation + content area.
  It uses:
  - useState for which section is active
  - Context providers (HabitsProvider, NotificationProvider) to share data
  - AnimatedSection for smooth transitions between sections
  - CelebrationOverlay for level-up and badge unlock celebrations
  - framer-motion for sidebar & page animations
*/

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, User } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useTheme } from "@/hooks/use-theme";
import { useNotifications } from "@/hooks/use-notifications";
import { useProfile } from "@/hooks/use-profile";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { useReminderScheduler } from "@/hooks/use-reminder-scheduler";
import { DashboardProviders } from "@/providers/AppProviders";
import RitualOverlay from "@/components/RitualOverlay";
import { Navigate, Link, useLocation } from "react-router-dom";
import AiChatWidget from "@/components/ui/AiChatWidget";
import VoiceControlModal from "@/components/ui/VoiceControlModal";
import {
  Mic, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Sparkles, X, Flame, Layers, Bell, Trash2,
  LayoutDashboard, Sliders, Calendar, Target, Users, BarChart3, Award, BookOpen, FileText, Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HABIT_TEMPLATES } from "@/lib/habitTemplates";

import AnimatedSection from "@/components/AnimatedSection";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import FloatingMiniTimer from "@/components/FloatingMiniTimer";
import GuestTrialBanner from "@/components/ui/GuestTrialBanner";
import GuestTrialExpiredModal from "@/components/GuestTrialExpiredModal";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { ActiveCallProvider } from "@/context/ActiveCallContext";
import { FloatingCallPiP } from "@/components/focus-rooms/FloatingCallPiP";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { NotificationBar } from "@/components/dashboard/NotificationBar";
import { InteractiveOnboardingModal } from "@/components/onboarding/InteractiveOnboardingModal";
import { BrandLogo } from "@/components/BrandLogo";



import { lazy, Suspense } from "react";
import DashboardSection from "@/components/sections/DashboardSection";
import DailyTrackerSection from "@/components/sections/DailyTrackerSection";
import CalendarSection from "@/components/sections/CalendarSection";
const AnalyticsSection = lazy(() => import("@/components/sections/AnalyticsSection").then(m => ({ default: m.default })));
const StreakSection = lazy(() => import("@/components/sections/StreakSection").then(m => ({ default: m.default })));
const ReflectionSection = lazy(() => import("@/components/sections/ReflectionSection").then(m => ({ default: m.default })));
const HabitManagerSection = lazy(() => import("@/components/sections/HabitManagerSection").then(m => ({ default: m.default })));
const ReminderSection = lazy(() => import("@/components/sections/ReminderSection").then(m => ({ default: m.default })));
const AchievementsSection = lazy(() => import("@/components/sections/AchievementsSection").then(m => ({ default: m.default })));
const SocialSection = lazy(() => import("@/components/sections/SocialSection").then(m => ({ default: m.default })));
const ReportsSection = lazy(() => import("@/components/sections/ReportsSection").then(m => ({ default: m.default })));
const SettingsSection = lazy(() => import("@/components/sections/SettingsSection").then(m => ({ default: m.default })));

export interface NavItemConfig {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  category: "Core Workspace" | "Focus & Social" | "Growth & Stats" | "System";
}

const NAV_ITEMS: NavItemConfig[] = [
  // Core Workspace
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard", category: "Core Workspace" },
  { key: "habits", icon: Sliders, label: "Habit Architect", category: "Core Workspace" },
  { key: "calendar", icon: Calendar, label: "Calendar", category: "Core Workspace" },
  
  // Focus & Social
  { key: "tracker", icon: Target, label: "Focus Studio", category: "Focus & Social" },
  { key: "social", icon: Users, label: "Study Squads", category: "Focus & Social" },
  { key: "streak", icon: Flame, label: "Streak Engine", category: "Focus & Social" },

  // Growth & Intelligence
  { key: "analytics", icon: BarChart3, label: "Analytics", category: "Growth & Stats" },
  { key: "achievements", icon: Award, label: "Achievements", category: "Growth & Stats" },
  { key: "reflections", icon: BookOpen, label: "Reflections", category: "Growth & Stats" },
  { key: "reports", icon: FileText, label: "Reports", category: "Growth & Stats" },

  // System
  { key: "reminders", icon: Bell, label: "Reminders", category: "System" },
  { key: "settings", icon: Settings, label: "Settings", category: "System" },
];

type SectionKey = string;


/* Persistent Must-Dismiss Alarm Overlay */
function AlarmOverlay({ alarm, onDismiss, onSnooze, onComplete }: {
  alarm: any;
  onDismiss: () => void;
  onSnooze: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-destructive/30 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        className="bg-card border-2 border-destructive/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-destructive animate-pulse" />
        <div className="text-6xl mb-4 animate-bounce">⏰</div>
        <h2 className="text-2xl font-bold text-destructive mb-2">Habit Alarm!</h2>
        <p className="text-sm font-semibold mb-6 text-foreground">{alarm.message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onComplete}
            className="w-full bg-pps-green text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-pps-green/90 transition-colors"
          >
            ✓ Complete Habit Now
          </button>
          <div className="flex gap-3">
            <button
              onClick={onSnooze}
              className="flex-1 bg-surface border border-border py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors text-foreground"
            >
              💤 Snooze (10m)
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 py-2.5 rounded-xl text-sm font-semibold hover:bg-destructive/20 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardInner({ user }: { user: User }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<SectionKey>(() => {
    try {
      const path = location.pathname.toLowerCase();
      if (path === "/analytics" || path.endsWith("/analytics")) return "analytics";
      if (path === "/social" || path.endsWith("/social") || path === "/focus-rooms") return "social";
      const hash = window.location.hash;
      const searchIdx = hash.indexOf("?");
      if (searchIdx !== -1) {
        const params = new URLSearchParams(hash.slice(searchIdx));
        const sec = params.get("section");
        if (sec && NAV_ITEMS.some((n) => n.key === sec)) return sec;
      }
    } catch {}
    return "dashboard";
  });

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path === "/analytics" || path.endsWith("/analytics")) {
      setActiveSection("analytics");
      return;
    } else if (path === "/social" || path.endsWith("/social") || path === "/focus-rooms") {
      setActiveSection("social");
      return;
    }

    try {
      const searchParams = new URLSearchParams(location.search);
      const sec = searchParams.get("section");
      if (sec && NAV_ITEMS.some((n) => n.key === sec)) {
        setActiveSection(sec);
        return;
      }
      const hash = window.location.hash;
      const searchIdx = hash.indexOf("?");
      if (searchIdx !== -1) {
        const hashParams = new URLSearchParams(hash.slice(searchIdx));
        const hashSec = hashParams.get("section");
        if (hashSec && NAV_ITEMS.some((n) => n.key === hashSec)) {
          setActiveSection(hashSec);
          return;
        }
      }
    } catch {}
  }, [location.pathname, location.search]);

  // Synchronize hash changes and browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash;
        const searchIdx = hash.indexOf("?");
        if (searchIdx !== -1) {
          const params = new URLSearchParams(hash.slice(searchIdx));
          const sec = params.get("section");
          if (sec && NAV_ITEMS.some((n) => n.key === sec)) {
            setActiveSection(sec);
            return;
          }
        }
        if (hash === "#/dashboard" || hash === "#/" || !hash) {
          setActiveSection("dashboard");
        }
      } catch {}
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Hardware Back-Button hierarchical navigation from internal sub-sections
  useEffect(() => {
    const handleSubSectionBack = () => {
      if (activeSection !== "dashboard") {
        setActiveSection("dashboard");
      }
    };
    window.addEventListener("pps_sub_section_back", handleSubSectionBack);
    return () => window.removeEventListener("pps_sub_section_back", handleSubSectionBack);
  }, [activeSection]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const { calculateLevel, calculateTotalXP, habits, loading: habitsLoading, getTodayStr, isHabitDueToday, addHabit, toggleCompletion } = useHabits();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, dismissNotification } = useNotifications();
  const { profile } = useProfile();
  const { settings, loading: settingsLoading, completeOnboarding } = useUserSettings();
  const { isPro, refresh: refreshSub } = useSubscription();
  const focusTimer = useFocusTimer();

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);

  // Robust click/tap outside handler for notification dropdown
  useEffect(() => {
    if (!notifOpen) return;
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const isInsideDesktop = desktopNotifRef.current && desktopNotifRef.current.contains(target);
      const isInsideMobile = mobileNotifRef.current && mobileNotifRef.current.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [notifOpen]);

  // In-app reminder scheduler — checks every 60s for due reminders and habit time alerts
  useReminderScheduler();

  // Keyboard shortcut: Ctrl+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRitual, setShowRitual] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileMoreSheet, setShowMobileMoreSheet] = useState(false);

  // 7-day guest trial expiry — auto-logout expired guest users
  useEffect(() => {
    if (!user.isGuest) return;
    const createdAt = localStorage.getItem("pps_guest_created_at");
    if (!createdAt) return;
    const elapsed = Date.now() - new Date(createdAt).getTime();
    if (elapsed >= 7 * 24 * 60 * 60 * 1000) {
      // Clear guest data and force redirect to login
      localStorage.removeItem("pps_guest");
      localStorage.removeItem("pps_guest_created_at");
      try { sessionStorage.removeItem("pps_guest"); } catch {}
      window.location.hash = "#/login?tab=signup";
      window.location.reload();
    }
  }, [user.isGuest]);


  // Handle return from successful Stripe checkout (?upgraded=1)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("upgraded") === "1") {
      refreshSub();
      setCelebration({
        show: true,
        type: "levelup",
        title: "Welcome to PPS Pro! 👑",
        subtitle: "Your subscription is active. All premium features, unlimited habits & AI insights are unlocked!",
        icon: "👑",
      });
      toast.success("Welcome to PPS Pro! 👑 All premium features unlocked.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshSub]);

  useEffect(() => {
    if (!settingsLoading && settings) {
      setShowOnboarding(!settings.onboardingCompleted);
      const today = new Date().toISOString().split("T")[0];
      // Only prompt morning ritual on the primary daily dashboard overview, not when navigating to specific sub-sections
      setShowRitual(settings.ritualLastDone !== today && activeSection === "dashboard");
    }
  }, [settingsLoading, settings, activeSection]);

  const handleApplyTemplate = async (templateId: string) => {
    const template = HABIT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    let addedCount = 0;
    for (const h of template.habits) {
      if (!habits.some((existing) => existing.name === h.name)) {
        const err = await addHabit(h.name, h.category, h.period, h.priority);
        if (!err) addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`Starter pack applied! Added ${addedCount} habits.`);
    }
  };

  const activeAlarm = notifications?.find((n) => n.type === "alarm" && !n.read);

  const handleCompleteAlarm = async (alarm: any) => {
    const match = alarm.message.match(/"([^"]+)"/);
    const habitName = match ? match[1] : null;
    const linkedHabit = habits.find((h) => h.name === habitName);
    if (linkedHabit) {
      await toggleCompletion(linkedHabit.id);
      toast.success(`Completed "${linkedHabit.name}"!`);
    }
    await markAsRead(alarm.id);
  };

  const handleSnoozeAlarm = async (alarm: any) => {
    if (user.isGuest || user.id === "guest_local") {
      toast.success("Snoozed alarm for 10 minutes.");
      await markAsRead(alarm.id);
      return;
    }

    const match = alarm.message.match(/"([^"]+)"/);
    const habitName = match ? match[1] : null;
    const linkedHabit = habits.find((h) => h.name === habitName);

    try {
      const { data: reminderData } = await supabase
        .from("reminders")
        .select("id")
        .eq("habit_id", linkedHabit?.id || null)
        .eq("user_id", user.id!)
        .maybeSingle();

      if (reminderData) {
        const snoozeUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await supabase
          .from("reminders")
          .update({ snoozed_until: snoozeUntil })
          .eq("id", reminderData.id);
        toast.success("Snoozed alarm for 10 minutes.");
      } else {
        const { data: genericReminders } = await supabase
          .from("reminders")
          .select("id, label")
          .eq("user_id", user.id!);

        const matchedGeneric = genericReminders?.find((r) => alarm.message.includes(r.label));
        if (matchedGeneric) {
          const snoozeUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          await supabase
            .from("reminders")
            .update({ snoozed_until: snoozeUntil })
            .eq("id", matchedGeneric.id);
          toast.success("Snoozed alarm for 10 minutes.");
        }
      }
    } catch {
      toast.success("Snoozed alarm for 10 minutes.");
    }
    await markAsRead(alarm.id);
  };

  const handleDismissAlarm = async (alarm: any) => {
    await markAsRead(alarm.id);
    toast.info("Alarm dismissed.");
  };

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    await completeOnboarding();
  };

  // ── Celebration state ──
  const [celebration, setCelebration] = useState<{
    show: boolean;
    type: "levelup" | "badge";
    title: string;
    subtitle: string;
    icon: string;
  }>({ show: false, type: "levelup", title: "", subtitle: "", icon: "" });

  const isInitializedRef = useRef(false);
  const prevLevelRef = useRef<number | null>(null);
  const prevBadgeCountRef = useRef<number | null>(null);

  // Track badge unlocks
  const todayStr = getTodayStr();
  const getBadgeCount = useCallback(() => {
    const totalCompletions = habits.reduce((s, h) => s + h.completedDates.length, 0);
    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    const dueToday = habits.filter((h) => isHabitDueToday(h));
    const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
    const level = calculateLevel();

    let count = 0;
    if (totalCompletions >= 1) count++;
    if (maxStreak >= 3) count++;
    if (maxStreak >= 7) count++;
    if (maxStreak >= 30) count++;
    if (totalCompletions >= 10) count++;
    if (totalCompletions >= 50) count++;
    if (totalCompletions >= 100) count++;
    if (totalCompletions >= 500) count++;
    if (dueToday.length > 0 && doneToday.length === dueToday.length) count++;
    if (habits.length >= 5) count++;
    if (habits.length >= 10) count++;
    if (level >= 5) count++;
    if (level >= 10) count++;
    return count;
  }, [habits, todayStr, isHabitDueToday, calculateLevel]);

  // Persistent seen storage keys
  const seenBadgeKey = `pps_seen_badge_count_${user?.id || "guest"}`;
  const seenLevelKey = `pps_seen_level_${user?.id || "guest"}`;

  // Safe Initialization: Hydrate previous seen values WITHOUT triggering celebratory popups
  useEffect(() => {
    if (habitsLoading) return; // Wait until habits have finished loading from storage/backend

    const currentCount = getBadgeCount();
    const currentLevel = calculateLevel();

    // If not initialized yet, initialize refs from persistent storage or current state
    if (!isInitializedRef.current) {
      let savedSeenBadges = currentCount;
      let savedSeenLevel = currentLevel;

      try {
        const storedBadgeCount = localStorage.getItem(seenBadgeKey);
        if (storedBadgeCount !== null) {
          savedSeenBadges = Math.max(Number(storedBadgeCount), currentCount);
        } else {
          localStorage.setItem(seenBadgeKey, String(currentCount));
        }
        const storedLevel = localStorage.getItem(seenLevelKey);
        if (storedLevel !== null) {
          savedSeenLevel = Math.max(Number(storedLevel), currentLevel);
        } else {
          localStorage.setItem(seenLevelKey, String(currentLevel));
        }
      } catch {}

      prevBadgeCountRef.current = savedSeenBadges;
      prevLevelRef.current = savedSeenLevel;
      isInitializedRef.current = true;
      return;
    }

    // Active session Level Up detection (only when user actively levels up)
    if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current && !celebration.show) {
      const levelTitle =
        currentLevel >= 10
          ? "Legend"
          : currentLevel >= 7
          ? "Master"
          : currentLevel >= 5
          ? "Warrior"
          : currentLevel >= 3
          ? "Apprentice"
          : "Beginner";

      setCelebration({
        show: true,
        type: "levelup",
        title: `Level ${currentLevel} — ${levelTitle}`,
        subtitle: `You've earned ${calculateTotalXP()} XP total!`,
        icon: "⬆️",
      });

      prevLevelRef.current = currentLevel;
      try {
        localStorage.setItem(seenLevelKey, String(currentLevel));
      } catch {}
    }

    // Active session Badge Unlock detection (only when user actively unlocks a new badge)
    if (
      prevBadgeCountRef.current !== null &&
      currentCount > prevBadgeCountRef.current &&
      !celebration.show
    ) {
      setCelebration({
        show: true,
        type: "badge",
        title: "New Badge Unlocked!",
        subtitle: `You now have ${currentCount} badges. Keep going!`,
        icon: "🏅",
      });

      prevBadgeCountRef.current = currentCount;
      try {
        localStorage.setItem(seenBadgeKey, String(currentCount));
      } catch {}
    }
  }, [habitsLoading, getBadgeCount, calculateLevel, calculateTotalXP, celebration.show, seenBadgeKey, seenLevelKey]);

  const level = calculateLevel();
  const xp = calculateTotalXP();
  const displayName = profile?.displayName ||
    (user.email ? user.email.split("@")[0] : "Guest");

  // Navigation handler — allows sections to navigate to other sections safely
  const navigateToSection = useCallback((section: string) => {
    if (section === "focus" || section === "squad" || section === "study-squad") {
      setActiveSection("social");
      try { window.location.hash = "#/dashboard?section=social"; } catch {}
    } else if (section === "pomodoro" || section === "timer") {
      setActiveSection("tracker");
      try { window.location.hash = "#/dashboard?section=tracker"; } catch {}
    } else if (NAV_ITEMS.some((n) => n.key === section)) {
      setActiveSection(section as SectionKey);
      try {
        window.location.hash = section === "dashboard" ? "#/dashboard" : `#/dashboard?section=${section}`;
      } catch {}
    }
  }, []);

  const renderSection = () => {
    const LoadingFallback = () => (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-300">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-base font-mono font-black">⚡</span>
          </div>
        </div>
        <div className="space-y-2 text-center">
          <div className="h-2 w-32 bg-muted/60 rounded-full animate-pulse mx-auto" />
          <div className="h-2 w-24 bg-muted/40 rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    );

    switch (activeSection) {
      case "dashboard": return <DashboardSection onNavigate={navigateToSection} userEmail={user.email} />;
      case "tracker": return <DailyTrackerSection onNavigate={navigateToSection} />;
      case "calendar": return <CalendarSection />;
      case "analytics": return <Suspense fallback={<LoadingFallback />}><AnalyticsSection /></Suspense>;
      case "streak": return <Suspense fallback={<LoadingFallback />}><StreakSection /></Suspense>;
      case "achievements": return <Suspense fallback={<LoadingFallback />}><AchievementsSection /></Suspense>;
      case "social": return <Suspense fallback={<LoadingFallback />}><SocialSection /></Suspense>;
      case "reports": return <Suspense fallback={<LoadingFallback />}><ReportsSection /></Suspense>;
      case "reflections": return <Suspense fallback={<LoadingFallback />}><ReflectionSection /></Suspense>;
      case "habits": return <Suspense fallback={<LoadingFallback />}><HabitManagerSection /></Suspense>;
      case "reminders": return <Suspense fallback={<LoadingFallback />}><ReminderSection /></Suspense>;
      case "settings": return <Suspense fallback={<LoadingFallback />}><SettingsSection user={user} /></Suspense>;
    }
  };

  return (
    <>
      {/* Onboarding overlay for new users */}
      <AnimatePresence>
        {showOnboarding && (
          <InteractiveOnboardingModal
            onDismiss={dismissOnboarding}
            onApplyTemplate={handleApplyTemplate}
            onNavigateToSection={navigateToSection}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showRitual && !showOnboarding && <RitualOverlay onDismiss={() => setShowRitual(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {activeAlarm && (
          <AlarmOverlay
            alarm={activeAlarm}
            onDismiss={() => handleDismissAlarm(activeAlarm)}
            onSnooze={() => handleSnoozeAlarm(activeAlarm)}
            onComplete={() => handleCompleteAlarm(activeAlarm)}
          />
        )}
      </AnimatePresence>

      {/* Celebration overlay for level-ups and badge unlocks */}
      <CelebrationOverlay
        show={celebration.show}
        onClose={() => setCelebration((p) => ({ ...p, show: false }))}
        type={celebration.type}
        title={celebration.title}
        subtitle={celebration.subtitle}
        icon={celebration.icon}
      />

      {/* Guest Trial Expired Overlay */}
      <GuestTrialExpiredModal />

      {/* Mobile Header with Interactive Quick-Switch Dropdown */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-xl border-b border-border/80 sticky top-0 z-[1002] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded-xl bg-surface border border-border text-foreground hover:bg-muted cursor-pointer transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            <span className="text-base leading-none">{sidebarOpen ? "✕" : "☰"}</span>
          </button>

          <Link to="/" title="PPS Home" className="flex items-center">
            <BrandLogo size="xs" showText={false} variant="square" iconClassName="w-6 h-6" />
          </Link>

          {/* 🎯 Interactive Native Module Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-surface border border-border text-xs font-black text-foreground shadow-2xs hover:border-primary/40 transition-all cursor-pointer"
            >
              {(() => { const ActiveIcon = NAV_ITEMS.find((n) => n.key === activeSection)?.icon; return ActiveIcon ? <ActiveIcon className="w-3.5 h-3.5 text-primary" /> : null; })()}
              <span className="truncate max-w-[105px] font-mono">
                {NAV_ITEMS.find((n) => n.key === activeSection)?.label}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showMobileMenu ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showMobileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    className="absolute left-0 top-full mt-2 w-56 bg-card border border-border/80 rounded-2xl shadow-2xl z-50 p-1.5 space-y-0.5 max-h-80 overflow-y-auto backdrop-blur-2xl"
                  >
                    <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground px-2.5 py-1">
                      Quick Jump Studio
                    </div>
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveSection(item.key);
                          setShowMobileMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          activeSection === item.key
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </span>
                        {activeSection === item.key && <span>✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={toggleTheme} className="p-1.5 rounded-xl bg-surface border border-border text-foreground hover:bg-muted transition-colors cursor-pointer text-sm" title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div ref={mobileNotifRef} className="relative z-[1010]">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={`p-2 rounded-xl border transition-all cursor-pointer relative flex items-center justify-center ${
                notifOpen
                  ? "bg-primary/20 border-primary text-primary shadow-sm"
                  : "bg-surface border-border/80 text-foreground hover:bg-surface/80 hover:border-primary/40"
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-mono font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card border border-border rounded-2xl shadow-2xl z-[1020] overflow-hidden ring-1 ring-black/10 dark:ring-white/10 flex flex-col"
                >
                  <NotificationDropdown
                    notifications={notifications}
                    unreadCount={unreadCount}
                    notifFilter={notifFilter}
                    onFilterChange={setNotifFilter}
                    onMarkAllRead={markAllRead}
                    onClearAll={clearAll}
                    onMarkRead={markAsRead}
                    onDismiss={dismissNotification}
                    onNavigateReminders={() => {
                      setNotifOpen(false);
                      setActiveSection("reminders");
                    }}
                    maxListHeight="max-h-72"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            className="bg-transparent border-none text-muted-foreground hover:text-destructive cursor-pointer p-1.5 flex items-center justify-center transition-colors rounded-lg hover:bg-destructive/10"
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[1000] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex h-screen overflow-hidden bg-background relative selection:bg-primary selection:text-white transition-colors duration-500">
        {/* 🌌 Dynamic 3D Ambient Background Layer */}
        <ThreeDBackground />

        {/* Sidebar */}
        <aside
          className={`
            bg-card/90 backdrop-blur-xl border-r border-border/80 flex flex-col flex-shrink-0
            md:relative md:translate-x-0
            fixed top-0 bottom-0 left-0 z-[1001] transition-all duration-300
            ${sidebarCollapsed ? "md:w-[72px]" : "md:w-[240px]"}
            ${sidebarOpen ? "w-[240px] translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/80 min-h-[57px]">
            <Link to="/" className="flex items-center gap-2 overflow-hidden group">
              <BrandLogo
                size="sm"
                variant="square"
                showText={!sidebarCollapsed}
                iconClassName="w-6 h-6 flex-shrink-0"
                textClassName="text-base font-bold text-primary"
              />
            </Link>
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-all cursor-pointer shadow-2xs"
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nav List with Categorized Group Headers */}
          <nav className="py-3 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-3 px-3">
              {(["Core Workspace", "Focus & Social", "Growth & Stats", "System"] as const).map((categoryName) => {
                const categoryItems = NAV_ITEMS.filter((item) => item.category === categoryName);
                return (
                  <div key={categoryName} className="space-y-1">
                    {!sidebarCollapsed && (
                      <div className="px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between">
                        <span>{categoryName}</span>
                      </div>
                    )}
                    {sidebarCollapsed && (
                      <div className="w-5 h-[1px] bg-border/80 mx-auto my-1.5" />
                    )}
                    <ul className="list-none space-y-0.5 m-0 p-0">
                      {categoryItems.map((item, index) => {
                        const isActive = activeSection === item.key;
                        return (
                          <motion.li
                            key={item.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02, duration: 0.2 }}
                            onClick={() => {
                              setActiveSection(item.key);
                              setSidebarOpen(false);
                            }}
                            title={sidebarCollapsed ? item.label : undefined}
                            className={`
                              px-2.5 py-2 rounded-lg cursor-pointer text-xs flex items-center gap-2.5 transition-all relative group
                              ${
                                isActive
                                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-surface/70 font-medium"
                              }
                              ${sidebarCollapsed ? "justify-center px-0" : ""}
                            `}
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {!sidebarCollapsed && (
                              <span className="truncate flex-1">{item.label}</span>
                            )}
                            {/* Active Dot Indicator */}
                            {isActive && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full bg-primary-foreground flex-shrink-0 opacity-90 ${
                                  sidebarCollapsed ? "absolute top-1.5 right-1.5" : ""
                                }`}
                              />
                            )}
                            {!sidebarCollapsed && item.key === "tracker" && focusTimer.isRunning && !isActive && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                            )}
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </nav>


          {/* User & Pro Footer */}
          <div className="p-3 border-t border-border/80 bg-surface/40 flex-shrink-0">
            {!isPro && !user.isGuest && !sidebarCollapsed && (
              <Link
                to="/pricing"
                className="block mb-2.5 text-center text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 py-1.5 rounded-xl hover:bg-primary/20 transition-all shadow-2xs"
              >
                Upgrade to Pro ✨
              </Link>
            )}
            <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? "justify-center" : "px-1"}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-primary-foreground flex-shrink-0 shadow-xs">
                {displayName[0]?.toUpperCase() || "U"}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Lvl {level} • {xp} XP
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          <GuestTrialBanner />
          {/* Top bar — desktop only (GitHub-Style) */}
          <header
            className="hidden md:flex items-center justify-between px-6 py-2.5 border-b border-border/80 bg-card/95 backdrop-blur-xl gap-3 sticky top-0 z-[100] shadow-xs"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            {/* Breadcrumb / Workspace Header */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">workspace</span>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-bold text-foreground flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-lg border border-border/60">
                {(() => { const HeaderIcon = NAV_ITEMS.find((n) => n.key === activeSection)?.icon; return HeaderIcon ? <HeaderIcon className="w-3.5 h-3.5 text-primary" /> : null; })()}
                <span>{NAV_ITEMS.find((n) => n.key === activeSection)?.label}</span>
              </span>
            </div>

            {/* Right Tools: Theme + GitHub-Style Notifications + Logout */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="bg-surface border border-border/80 rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-surface/80 transition-colors flex items-center gap-1.5 text-foreground"
                title="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {/* GitHub-Style Notification Center */}
              <div ref={desktopNotifRef} className="relative z-[110]">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={`bg-surface border rounded-xl px-3 py-1.5 text-xs cursor-pointer transition-all flex items-center gap-1.5 relative ${
                    notifOpen
                      ? "border-primary bg-primary/15 text-primary shadow-sm"
                      : "border-border/80 hover:bg-surface/80 text-foreground"
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <span className="font-mono text-[11px] font-bold">{unreadCount > 0 ? unreadCount : ""}</span>
                </button>

                {/* Dropdown Card */}
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-[120] overflow-hidden ring-1 ring-black/10 dark:ring-white/10 flex flex-col"
                    >
                      <NotificationDropdown
                        notifications={notifications}
                        unreadCount={unreadCount}
                        notifFilter={notifFilter}
                        onFilterChange={setNotifFilter}
                        onMarkAllRead={markAllRead}
                        onClearAll={clearAll}
                        onMarkRead={markAsRead}
                        onDismiss={dismissNotification}
                        onNavigateReminders={() => {
                          setNotifOpen(false);
                          setActiveSection("reminders");
                        }}
                        maxListHeight="max-h-80"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={logout}
                className="bg-surface border border-border/80 rounded-xl px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                title="Log out"
              >
                <span>Logout</span>
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-3.5 md:px-7 md:py-4 md:pb-8 overflow-y-auto overflow-x-hidden max-w-full" style={{ paddingBottom: 'max(7rem, calc(7rem + env(safe-area-inset-bottom)))' }}>
            <NotificationBar onNavigate={navigateToSection} />
            <AnimatedSection sectionKey={activeSection}>
              {renderSection()}
            </AnimatedSection>
          </main>
        </div>
      </div>

      {/* 📱 NATIVE-STYLE MOBILE BOTTOM APP DOCK (md:hidden) */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] md:hidden bg-card/95 backdrop-blur-2xl border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        {/* Tab 1: Today */}
        <button
          onClick={() => setActiveSection("dashboard")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "dashboard" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1 h-1 rounded-full mb-0.5 ${activeSection === "dashboard" ? "bg-primary" : "bg-transparent"}`} />
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeSection === "dashboard" ? "text-primary" : "text-muted-foreground"}`} />
          <span>Today</span>
        </button>

        {/* Tab 2: Focus Pomodoro */}
        <button
          onClick={() => setActiveSection("tracker")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "tracker" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1 h-1 rounded-full mb-0.5 ${activeSection === "tracker" ? "bg-primary" : "bg-transparent"}`} />
          <Target className={`w-5 h-5 mb-0.5 ${activeSection === "tracker" ? "text-primary" : "text-muted-foreground"}`} />
          <span>Focus</span>
        </button>

        {/* Tab 3: Habit Architect */}
        <button
          onClick={() => setActiveSection("habits")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "habits" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1 h-1 rounded-full mb-0.5 ${activeSection === "habits" ? "bg-primary" : "bg-transparent"}`} />
          <Sliders className={`w-5 h-5 mb-0.5 ${activeSection === "habits" ? "text-primary" : "text-muted-foreground"}`} />
          <span>Habits</span>
        </button>

        {/* Tab 4: Analytics Stats */}
        <button
          onClick={() => setActiveSection("analytics")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "analytics" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1 h-1 rounded-full mb-0.5 ${activeSection === "analytics" ? "bg-primary" : "bg-transparent"}`} />
          <BarChart3 className={`w-5 h-5 mb-0.5 ${activeSection === "analytics" ? "text-primary" : "text-muted-foreground"}`} />
          <span>Stats</span>
        </button>

        {/* Tab 5: More Action Sheet Toggle */}
        <button
          onClick={() => setShowMobileMoreSheet(!showMobileMoreSheet)}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            showMobileMoreSheet ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>

      {/* 📱 MOBILE "MORE" ACTION BOTTOM SHEET */}
      <AnimatePresence>
        {showMobileMoreSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1001] md:hidden"
              onClick={() => setShowMobileMoreSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[1002] md:hidden bg-card border-t border-border rounded-t-3xl p-5 pb-8 shadow-2xl max-h-[80vh] overflow-y-auto space-y-4"
            >
              {/* Drag Handle & Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h3 className="text-xs font-mono font-black uppercase text-foreground">PPS Power Studio</h3>
                </div>
                <button
                  onClick={() => setShowMobileMoreSheet(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of Power Tools */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: "calendar", icon: "📅", label: "Calendar" },
                  { key: "streak", icon: "🔥", label: "Streak Engine" },
                  { key: "achievements", icon: "🏅", label: "Achievements" },
                  { key: "social", icon: "👥", label: "Study Rooms" },
                  { key: "reflections", icon: "📝", label: "Reflections" },
                  { key: "reports", icon: "📈", label: "Reports" },
                  { key: "reminders", icon: "🔔", label: "Circadian" },
                  { key: "settings", icon: "🛠️", label: "Settings" },
                ].map((tool) => (
                  <button
                    key={tool.key}
                    onClick={() => {
                      setActiveSection(tool.key as any);
                      setShowMobileMoreSheet(false);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs ${
                      activeSection === tool.key
                        ? "bg-primary text-primary-foreground border-primary font-black"
                        : "bg-surface/80 border-border/80 text-foreground hover:bg-card"
                    }`}
                  >
                    <span className="text-xl">{tool.icon}</span>
                    <span className="text-[11px] font-bold truncate max-w-full">{tool.label}</span>
                  </button>
                ))}
              </div>

              {/* Ecosystem Quick Links */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs font-bold">
                <Link
                  to="/marketplace"
                  onClick={() => setShowMobileMoreSheet(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-center font-mono hover:bg-amber-500/25"
                >
                  🎓 Mentors Hub
                </Link>
                <Link
                  to="/roadmap"
                  onClick={() => setShowMobileMoreSheet(false)}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-center font-mono hover:bg-cyan-500/25"
                >
                  🚀 Roadmap
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <FloatingMiniTimer activeSection={activeSection} onNavigate={(s) => setActiveSection(s as any)} />
      <FloatingCallPiP />
      <AiChatWidget />

      {/* Voice Commands FAB button (positioned above mobile dock on small screens) */}
      <button
        onClick={() => setShowVoiceModal(true)}
        className="fixed bottom-20 md:bottom-6 left-5 md:left-6 z-[999] w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer border border-primary/40"
        title="Voice Commands Studio"
      >
        <Mic className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <VoiceControlModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onNavigate={(s) => setActiveSection(s as any)}
      />

      {/* ⌨️ Power User Keyboard Shortcuts (?) */}
      <KeyboardShortcutsModal onNavigate={(s) => setActiveSection(s as any)} />
    </>
  );
}


const DashboardPage = () => {
  const { user, isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-1.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground font-mono">PPS Studio</div>
            <div className="text-xs text-muted-foreground mt-0.5">Loading your performance workspace...</div>
          </div>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardProviders user={user}>
      <ActiveCallProvider>
        <DashboardInner user={user} />
      </ActiveCallProvider>
    </DashboardProviders>
  );
};

export default DashboardPage;
