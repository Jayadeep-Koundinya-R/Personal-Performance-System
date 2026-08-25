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
import { Navigate, Link } from "react-router-dom";
import AiChatWidget from "@/components/ui/AiChatWidget";
import VoiceControlModal from "@/components/ui/VoiceControlModal";
import { Mic, ChevronDown, MoreHorizontal, Sparkles, X, Flame, Layers, Bell, Trash2 } from "lucide-react";
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
import SocialSection from "@/components/sections/SocialSection";
const ReportsSection = lazy(() => import("@/components/sections/ReportsSection").then(m => ({ default: m.default })));
const SettingsSection = lazy(() => import("@/components/sections/SettingsSection").then(m => ({ default: m.default })));

const NAV_ITEMS = [
  { key: "dashboard", icon: "⚡", label: "Dashboard" },
  { key: "tracker", icon: "🎯", label: "Focus Studio" },
  { key: "calendar", icon: "📅", label: "Calendar" },
  { key: "analytics", icon: "📊", label: "Analytics" },
  { key: "streak", icon: "🔥", label: "Streak Engine" },
  { key: "achievements", icon: "🏅", label: "Achievements" },
  { key: "social", icon: "👥", label: "Social & Focus Hub" },
  { key: "reports", icon: "📈", label: "Reports" },
  { key: "reflections", icon: "📝", label: "Reflections" },
  { key: "habits", icon: "⚙️", label: "Habit Architect" },
  { key: "reminders", icon: "🔔", label: "Reminders" },
  { key: "settings", icon: "🛠", label: "Settings" },
] as const;

type SectionKey = (typeof NAV_ITEMS)[number]["key"];

/* Onboarding overlay for first-time users */
function OnboardingOverlay({ onDismiss, onApplyTemplate }: { onDismiss: () => void; onApplyTemplate: (templateId: string) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const steps = [
    { icon: "🎯", title: "Welcome to PPS!", desc: "Your Personal Performance System — track habits, earn XP, and level up your life." },
    { icon: "📋", title: "Add Your First Habit", desc: "Head to the Habit Manager to create habits. They'll appear in your Daily Tracker automatically." },
    { icon: "🔥", title: "Build Streaks & Earn XP", desc: "Complete habits daily to build streaks. Every completion earns 10 XP towards leveling up!" },
    { icon: "🏅", title: "Unlock Achievements", desc: "Hit milestones to unlock badges. Challenge friends on the leaderboard. You're ready!" },
    { icon: "🌱", title: "Choose a Starter Pack", desc: "Select a ready-made template pack to populate your habits on day 1 (optional)!" },
  ];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      if (selectedTemplate) {
        await onApplyTemplate(selectedTemplate);
      }
      onDismiss();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full text-center"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-4"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-3"
          >
            {steps[step].icon}
          </motion.div>
          <h2 className="text-lg font-bold mb-1.5">{steps[step].title}</h2>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-3">{steps[step].desc}</p>

          {step === 4 && (
            <div className="grid grid-cols-2 gap-2.5 my-3 max-h-[30vh] overflow-y-auto pr-1 text-left">
              {HABIT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.id === selectedTemplate ? null : tmpl.id)}
                  className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                    selectedTemplate === tmpl.id 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : "border-border bg-surface hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{tmpl.icon}</span>
                    <span className="text-[11.5px] font-bold text-foreground leading-tight">{tmpl.name}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2">{tmpl.description}</p>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-6" : "bg-border"}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-[13px] font-semibold hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-br from-primary to-accent text-primary-foreground py-2.5 rounded-xl text-[13px] font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
          >
            {step < steps.length - 1 ? "Next" : selectedTemplate ? "Add & Start! 🚀" : "Get Started! 🚀"}
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="mt-3 text-[11px] text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
        >
          Skip tutorial
        </button>
      </motion.div>
    </motion.div>
  );
}

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
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const { calculateLevel, calculateTotalXP, habits, getTodayStr, isHabitDueToday, addHabit, toggleCompletion } = useHabits();
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
      setShowRitual(settings.ritualLastDone !== today);
    }
  }, [settingsLoading, settings]);

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
        }
        const storedLevel = localStorage.getItem(seenLevelKey);
        if (storedLevel !== null) {
          savedSeenLevel = Math.max(Number(storedLevel), currentLevel);
        }
        localStorage.setItem(seenBadgeKey, String(savedSeenBadges));
        localStorage.setItem(seenLevelKey, String(savedSeenLevel));
      } catch {}

      prevBadgeCountRef.current = savedSeenBadges;
      prevLevelRef.current = savedSeenLevel;
      isInitializedRef.current = true;
      return;
    }

    // Active session Level Up detection (only when user actively levels up)
    if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
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
  }, [getBadgeCount, calculateLevel, calculateTotalXP, celebration.show, seenBadgeKey, seenLevelKey]);

  const level = calculateLevel();
  const xp = calculateTotalXP();
  const displayName = profile?.displayName ||
    (user.email ? user.email.split("@")[0] : "Guest");

  // Navigation handler — allows sections to navigate to other sections safely
  const navigateToSection = useCallback((section: string) => {
    if (section === "focus" || section === "squad" || section === "study-squad") {
      setActiveSection("social");
    } else if (section === "pomodoro" || section === "timer") {
      setActiveSection("tracker");
    } else if (NAV_ITEMS.some((n) => n.key === section)) {
      setActiveSection(section as SectionKey);
    }
  }, []);

  const renderSection = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading...</div>
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
        {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} onApplyTemplate={handleApplyTemplate} />}
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

          {/* 🎯 Interactive Native Module Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-surface border border-border text-xs font-black text-foreground shadow-2xs hover:border-primary/40 transition-all cursor-pointer"
            >
              <span>{NAV_ITEMS.find((n) => n.key === activeSection)?.icon}</span>
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
                          <span>{item.icon}</span>
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
                  {/* GitHub-Style Filter Ribbon */}
                  <div className="px-3 py-2 border-b border-border/80 bg-surface/90 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 bg-card p-0.5 rounded-xl border border-border/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifFilter("all");
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          notifFilter === "all"
                            ? "bg-primary text-primary-foreground font-black"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifFilter("unread");
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          notifFilter === "unread"
                            ? "bg-primary text-primary-foreground font-black"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>Unread</span>
                        {unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllRead();
                          }}
                          className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer"
                          title="Mark all as read"
                        >
                          ✓ Read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAll();
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface cursor-pointer"
                          title="Clear all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {notifications.filter((n) => (notifFilter === "unread" ? !n.read : true)).length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground bg-card">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shadow-inner">
                        ✨
                      </div>
                      <div className="text-xs font-bold text-foreground">
                        {notifFilter === "unread" ? "All Caught Up!" : "Inbox is Empty"}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] mx-auto">
                        {notifFilter === "unread" ? "No unread alerts waiting." : "No notifications yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 bg-card">
                      {notifications
                        .filter((n) => (notifFilter === "unread" ? !n.read : true))
                        .slice(0, 10)
                        .map((n, i) => {
                          const typeColor = 
                            n.type === "alarm" ? "text-rose-400 bg-rose-500/15 border-rose-500/30" :
                            n.type === "streak" ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
                            n.type === "levelup" ? "text-purple-400 bg-purple-500/15 border-purple-500/30" :
                            n.type === "achievement" ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
                            n.type === "quest" ? "text-indigo-400 bg-indigo-500/15 border-indigo-500/30" :
                            "text-cyan-400 bg-cyan-500/15 border-cyan-500/30";

                          const typeIcon =
                            n.type === "alarm" ? "⏰" :
                            n.type === "streak" ? "🔥" :
                            n.type === "levelup" ? "👑" :
                            n.type === "achievement" ? "🏅" :
                            n.type === "quest" ? "⚔️" :
                            "📋";

                          return (
                            <motion.div
                              key={n.id}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.02 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group flex items-start gap-2.5 ${
                                !n.read
                                  ? "bg-gradient-to-r from-primary/10 via-card to-card border-primary/40 shadow-2xs"
                                  : "bg-surface/50 border-border/50 hover:border-border"
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-surface border border-border/60 flex items-center justify-center text-xs flex-shrink-0 shadow-2xs mt-0.5">
                                {typeIcon}
                              </div>
                              <div className="min-w-0 flex-1 pr-3">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className={`text-[8px] font-mono uppercase font-black px-1.5 py-0.2 rounded-md border ${typeColor}`}>
                                    {n.type || "alert"}
                                  </span>
                                  <span className="text-[11px] font-bold text-foreground truncate">{n.title}</span>
                                  {!n.read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-auto" />
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>
                                <div className="text-[8.5px] text-muted-foreground/70 mt-1 font-mono">{n.time}</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(n.id);
                                }}
                                title="Dismiss notification"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-surface transition-all cursor-pointer absolute top-2 right-2"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          );
                        })}
                    </div>
                  )}

                  {/* Mobile Footer */}
                  <div className="px-3 py-2 border-t border-border/80 bg-surface/60 flex items-center justify-between text-[10px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotifOpen(false);
                        setActiveSection("reminders");
                      }}
                      className="text-muted-foreground hover:text-primary font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>🔔 Alert Preferences →</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={logout}
            className="bg-transparent border-none text-muted-foreground hover:text-destructive cursor-pointer p-1.5 flex items-center justify-center transition-colors"
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
            ${sidebarCollapsed ? "md:w-[72px]" : "md:w-[235px]"}
            ${sidebarOpen ? "w-[235px] translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-border/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-mono text-lg font-black text-primary tracking-[1.5px] truncate">
                  PPS<span className="text-secondary">.</span>
                </span>
              )}
            </div>
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer text-xs"
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? "→" : "←"}
            </button>
            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          {/* Nav List */}
          <nav className="py-2.5 flex-1 overflow-y-auto overflow-x-hidden">
            <ul className="list-none space-y-0.5 px-2">
              {NAV_ITEMS.map((item, index) => {
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
                      px-3 py-2 rounded-xl cursor-pointer text-xs flex items-center gap-2.5 transition-all relative group
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground font-black shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface"
                      }
                      ${sidebarCollapsed ? "justify-center px-0" : ""}
                    `}
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 font-medium">{item.label}</span>
                    )}
                    {/* Active Dot Indicator */}
                    {isActive && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full bg-primary-foreground flex-shrink-0 animate-pulse ${
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
                <span>{NAV_ITEMS.find((n) => n.key === activeSection)?.icon}</span>
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
                      {/* Top GitHub-Style Filter Ribbon */}
                      <div className="px-3.5 py-2.5 border-b border-border/80 bg-surface/90 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-card p-0.5 rounded-xl border border-border/60">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifFilter("all");
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              notifFilter === "all"
                                ? "bg-primary text-primary-foreground font-black shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            All ({notifications.length})
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifFilter("unread");
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              notifFilter === "unread"
                                ? "bg-primary text-primary-foreground font-black shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span>Unread</span>
                            {unreadCount > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllRead();
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface text-[11px] font-bold transition-colors cursor-pointer"
                              title="Mark all as read"
                            >
                              ✓ Read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearAll();
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface text-[11px] font-bold transition-colors cursor-pointer"
                              title="Clear all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* List Area */}
                      {notifications.filter((n) => (notifFilter === "unread" ? !n.read : true)).length === 0 ? (
                        <div className="px-6 py-10 text-center text-muted-foreground bg-card">
                          <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shadow-inner">
                            ✨
                          </div>
                          <div className="text-xs font-bold text-foreground">
                            {notifFilter === "unread" ? "All Caught Up!" : "Inbox is Empty"}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                            {notifFilter === "unread"
                              ? "You have completed all active habit alerts and streak reminders."
                              : "Habit alerts, streak freezes, and milestone updates will appear here."}
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto p-2 space-y-1.5 bg-card">
                          {notifications
                            .filter((n) => (notifFilter === "unread" ? !n.read : true))
                            .slice(0, 15)
                            .map((n, i) => {
                              const typeColor = 
                                n.type === "alarm" ? "text-rose-400 bg-rose-500/15 border-rose-500/30" :
                                n.type === "streak" ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
                                n.type === "levelup" ? "text-purple-400 bg-purple-500/15 border-purple-500/30" :
                                n.type === "achievement" ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
                                n.type === "quest" ? "text-indigo-400 bg-indigo-500/15 border-indigo-500/30" :
                                "text-cyan-400 bg-cyan-500/15 border-cyan-500/30";

                              const typeIcon =
                                n.type === "alarm" ? "⏰" :
                                n.type === "streak" ? "🔥" :
                                n.type === "levelup" ? "👑" :
                                n.type === "achievement" ? "🏅" :
                                n.type === "quest" ? "⚔️" :
                                "📋";

                              return (
                                <motion.div
                                  key={n.id}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.02 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                  }}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex items-start gap-3 ${
                                    !n.read
                                      ? "bg-gradient-to-r from-primary/10 via-card to-card border-primary/40 shadow-xs"
                                      : "bg-surface/40 border-border/50 hover:border-border hover:bg-surface/70"
                                  }`}
                                >
                                  {/* Icon container */}
                                  <div className="w-8 h-8 rounded-xl bg-surface border border-border/60 flex items-center justify-center text-sm flex-shrink-0 shadow-2xs mt-0.5">
                                    {typeIcon}
                                  </div>

                                  {/* Content */}
                                  <div className="min-w-0 flex-1 pr-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[8.5px] font-mono uppercase font-black px-1.5 py-0.2 rounded-md border ${typeColor}`}>
                                        {n.type || "alert"}
                                      </span>
                                      <span className="text-xs font-bold text-foreground truncate">{n.title}</span>
                                      {!n.read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-auto" />
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                                      {n.message}
                                    </div>
                                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/30 text-[9.5px] text-muted-foreground font-mono">
                                      <span>{n.time}</span>
                                      {!n.read && (
                                        <span className="text-primary font-bold hover:underline">Click to mark read</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick dismiss button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dismissNotification(n.id);
                                    }}
                                    title="Dismiss"
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface transition-all cursor-pointer absolute top-2.5 right-2.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </motion.div>
                              );
                            })}
                        </div>
                      )}

                      {/* Dropdown Footer Quick Link */}
                      <div className="px-3.5 py-2 border-t border-border/80 bg-surface/60 flex items-center justify-between text-[11px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifOpen(false);
                            setActiveSection("reminders");
                          }}
                          className="text-muted-foreground hover:text-primary font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>🔔 Manage Alert Preferences →</span>
                        </button>
                      </div>
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

          <main className="flex-1 px-4 py-4 pb-24 md:px-8 md:py-7 md:pb-7 overflow-y-auto">
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
          <span className="text-lg">⚡</span>
          <span>Today</span>
        </button>

        {/* Tab 2: Focus Pomodoro */}
        <button
          onClick={() => setActiveSection("tracker")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "tracker" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-lg">🎯</span>
          <span>Focus</span>
        </button>

        {/* Tab 3: Habit Architect */}
        <button
          onClick={() => setActiveSection("habits")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "habits" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span>Habits</span>
        </button>

        {/* Tab 4: Analytics Stats */}
        <button
          onClick={() => setActiveSection("analytics")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
            activeSection === "analytics" ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-lg">📊</span>
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
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⚡</div>
          <div className="text-muted-foreground text-sm">Loading...</div>
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
