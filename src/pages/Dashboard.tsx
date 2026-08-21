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
  const [notifOpen, setNotifOpen] = useState(false);
  const { calculateLevel, calculateTotalXP, habits, getTodayStr, isHabitDueToday, addHabit, toggleCompletion } = useHabits();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, dismissNotification } = useNotifications();
  const { profile } = useProfile();
  const { settings, loading: settingsLoading, completeOnboarding } = useUserSettings();
  const { isPro, refresh: refreshSub } = useSubscription();
  const focusTimer = useFocusTimer();

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

  const prevLevelRef = useRef(calculateLevel());
  const prevBadgeCountRef = useRef(0);

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

  useEffect(() => {
    prevBadgeCountRef.current = getBadgeCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect level up
  useEffect(() => {
    const currentLevel = calculateLevel();
    if (currentLevel > prevLevelRef.current) {
      const levelTitle = currentLevel >= 10 ? "Legend" : currentLevel >= 7 ? "Master" : currentLevel >= 5 ? "Warrior" : currentLevel >= 3 ? "Apprentice" : "Beginner";
      setCelebration({
        show: true,
        type: "levelup",
        title: `Level ${currentLevel} — ${levelTitle}`,
        subtitle: `You've earned ${calculateTotalXP()} XP total!`,
        icon: "⬆️",
      });
    }
    prevLevelRef.current = currentLevel;
  }, [calculateLevel, calculateTotalXP]);

  // Detect badge unlock
  useEffect(() => {
    const currentCount = getBadgeCount();
    if (currentCount > prevBadgeCountRef.current && !celebration.show) {
      setCelebration({
        show: true,
        type: "badge",
        title: "New Badge Unlocked!",
        subtitle: `You now have ${currentCount} badges. Keep going!`,
        icon: "🏅",
      });
    }
    prevBadgeCountRef.current = currentCount;
  }, [getBadgeCount, celebration.show]);

  const level = calculateLevel();
  const xp = calculateTotalXP();
  const displayName = profile?.displayName ||
    (user.email ? user.email.split("@")[0] : "Guest");

  // Navigation handler — allows sections to navigate to other sections
  const navigateToSection = useCallback((section: SectionKey) => {
    setActiveSection(section);
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
          <div className="relative z-50">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) markAllRead();
              }}
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
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/10 dark:ring-white/10"
                  >
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#111625] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs font-mono uppercase tracking-wider text-foreground">
                          🔔 Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-mono font-black bg-primary/15 text-primary px-1.5 py-0.2 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="text-[11px] font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground bg-white dark:bg-[#0b0f19]">
                        <div className="text-2xl mb-1.5">✨</div>
                        <div className="text-xs font-bold text-foreground">All caught up!</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">No active alerts</p>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 bg-white dark:bg-[#0b0f19]">
                        {notifications.slice(0, 10).map((n, i) => (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => markAsRead(n.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
                              !n.read
                                ? "bg-primary/5 dark:bg-[#151c2e] border-primary/40 shadow-xs"
                                : "bg-slate-50 dark:bg-[#111625] border-slate-200/80 dark:border-slate-800/80"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-base mt-0.5 flex-shrink-0">{n.icon || "🔔"}</span>
                              <div className="min-w-0 flex-1 pr-3">
                                <div className="text-[11.5px] font-bold text-foreground truncate">{n.title}</div>
                                <div className="text-[10.5px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>
                                <div className="text-[9px] text-muted-foreground/70 mt-1 font-mono">{n.time}</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(n.id);
                                }}
                                title="Dismiss notification"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-surface transition-all cursor-pointer absolute top-1.5 right-1.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
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
        <aside className={`
          w-[230px] bg-card/90 backdrop-blur-xl border-r border-border/80 flex flex-col flex-shrink-0
          md:relative md:translate-x-0
          fixed top-0 bottom-0 left-0 z-[1001] transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `} style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="font-mono text-xl font-bold text-primary px-5 py-6 border-b border-border tracking-[2px]">
            PPS<span className="text-secondary">.</span>
          </div>

          <nav className="py-3 flex-1 overflow-y-auto">
            <ul className="list-none">
              {NAV_ITEMS.map((item, index) => (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
                  className={`
                    py-[11px] px-5 cursor-pointer text-[13.5px] flex items-center gap-2.5
                    border-l-[3px] transition-all duration-200
                    ${activeSection === item.key
                      ? "text-primary bg-primary/10 border-l-primary font-semibold shadow-[inset_0_0_20px_hsl(var(--primary)/0.05)]"
                      : "text-muted-foreground border-l-transparent hover:text-foreground hover:bg-primary/[0.04] hover:border-l-primary/30"}
                  `}
                >
                  <motion.span
                    animate={activeSection === item.key ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {item.icon}
                  </motion.span>
                  <span>{item.label}</span>
                  {item.key === "tracker" && focusTimer.isRunning && activeSection !== "tracker" && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="ml-auto w-2 h-2 rounded-full bg-pps-green shadow-[0_0_6px_hsl(var(--pps-green))]"
                      title="Focus session active"
                    />
                  )}
                  {activeSection === item.key && (
                    <motion.div
                      layoutId="activeNav"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </motion.li>
              ))}
            </ul>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="px-5 py-4 border-t border-border"
          >
            {!isPro && !user.isGuest && (
              <Link
                to="/pricing"
                className="block mb-3 text-center text-[12px] bg-primary/10 text-primary border border-primary/20 py-2 rounded-lg font-semibold hover:bg-primary/15"
              >
                Upgrade to Pro ✨
              </Link>
            )}
            {isPro && (
              <div className="mb-3 text-center text-[11px] font-semibold text-primary">Pro Member</div>
            )}
            <div className="flex items-center gap-2.5 bg-surface px-3 py-2.5 rounded-lg border border-border">
              <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                {displayName[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="text-[13px] font-semibold">{displayName}</div>
                <div className="text-[11px] text-muted-foreground">Level {level} • {xp} XP</div>
              </div>
            </div>
          </motion.div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          <GuestTrialBanner />
          {/* Top bar — desktop only */}
          <header className="hidden md:flex items-center justify-end px-8 py-3 border-b border-border bg-card/95 backdrop-blur-xl gap-3 relative z-40" style={{ boxShadow: "var(--card-shadow)" }}>
            <button
              onClick={toggleTheme}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-2"
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
              <span className="text-[12px] text-foreground">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="relative z-50">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (!notifOpen) markAllRead();
                }}
                className={`bg-surface border rounded-xl px-3 py-1.5 text-sm cursor-pointer transition-all flex items-center gap-1.5 relative ${
                  notifOpen
                    ? "border-primary bg-primary/15 text-primary shadow-sm"
                    : "border-border hover:bg-primary/10 hover:border-primary/40 text-foreground"
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-mono font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Notification dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/10 dark:ring-white/10"
                    >
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#111625] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs font-mono uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5 text-primary" />
                            <span>Notifications</span>
                          </span>
                          {unreadCount > 0 ? (
                            <span className="text-[10px] font-mono font-black bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                              {unreadCount} New
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                              All read
                            </span>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAll}
                            className="text-[11px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear all</span>
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-6 py-10 text-center text-muted-foreground bg-white dark:bg-[#0b0f19]">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                            ✨
                          </div>
                          <div className="text-xs font-bold text-foreground">All caught up!</div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            No new notifications or habit reminders.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto p-2.5 space-y-1.5 bg-white dark:bg-[#0b0f19]">
                          {notifications.slice(0, 15).map((n, i) => (
                            <motion.div
                              key={n.id}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.02 }}
                              onClick={() => markAsRead(n.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                                !n.read
                                  ? "bg-primary/5 dark:bg-[#151c2e] border-primary/40 shadow-xs"
                                  : "bg-slate-50 dark:bg-[#111625] border-slate-200/80 dark:border-slate-800/80 hover:border-border"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="text-base mt-0.5 flex-shrink-0">{n.icon || "🔔"}</span>
                                <div className="min-w-0 flex-1 pr-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="text-xs font-bold text-foreground truncate">{n.title}</div>
                                    {!n.read && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</div>
                                  <div className="text-[9.5px] text-muted-foreground/70 mt-1 font-mono">{n.time}</div>
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
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={logout}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors flex items-center gap-2"
              title="Log out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span className="text-[12px] font-medium">Logout</span>
            </button>
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

      {/* Close notif on click outside */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}
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
