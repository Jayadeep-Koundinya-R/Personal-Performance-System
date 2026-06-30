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
import { DashboardProviders } from "@/providers/AppProviders";
import RitualOverlay from "@/components/RitualOverlay";
import { Navigate, Link } from "react-router-dom";
import AiChatWidget from "@/components/ui/AiChatWidget";

import AnimatedSection from "@/components/AnimatedSection";
import CelebrationOverlay from "@/components/CelebrationOverlay";

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
const ExportSection = lazy(() => import("@/components/sections/ExportSection").then(m => ({ default: m.default })));

const NAV_ITEMS = [
  { key: "dashboard", icon: "⚡", label: "Dashboard" },
  { key: "tracker", icon: "📋", label: "Daily Tracker" },
  { key: "calendar", icon: "📅", label: "Calendar" },
  { key: "analytics", icon: "📊", label: "Analytics" },
  { key: "streak", icon: "🔥", label: "Streak Engine" },
  { key: "achievements", icon: "🏅", label: "Achievements" },
  { key: "social", icon: "👥", label: "Social" },
  { key: "reports", icon: "📈", label: "Reports" },
  { key: "reflections", icon: "📝", label: "Reflections" },
  { key: "habits", icon: "⚙️", label: "Habit Manager" },
  { key: "reminders", icon: "🔔", label: "Reminders" },
  { key: "export", icon: "📤", label: "Export" },
  { key: "settings", icon: "🛠", label: "Settings" },
] as const;

type SectionKey = (typeof NAV_ITEMS)[number]["key"];

/* Onboarding overlay for first-time users */
function OnboardingOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "🎯", title: "Welcome to PPS!", desc: "Your Personal Performance System — track habits, earn XP, and level up your life." },
    { icon: "📋", title: "Add Your First Habit", desc: "Head to the Habit Manager to create habits. They'll appear in your Daily Tracker automatically." },
    { icon: "🔥", title: "Build Streaks & Earn XP", desc: "Complete habits daily to build streaks. Every completion earns 10 XP towards leveling up!" },
    { icon: "🏅", title: "Unlock Achievements", desc: "Hit milestones to unlock badges. Challenge friends on the leaderboard. You're ready!" },
  ];

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
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-6"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-4"
          >
            {steps[step].icon}
          </motion.div>
          <h2 className="text-xl font-bold mb-2">{steps[step].title}</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{steps[step].desc}</p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-5">
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
            onClick={() => step < steps.length - 1 ? setStep(step + 1) : onDismiss()}
            className="flex-1 bg-gradient-to-br from-primary to-[hsl(239,60%,55%)] text-primary-foreground py-2.5 rounded-xl text-[13px] font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            {step < steps.length - 1 ? "Next" : "Get Started! 🚀"}
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

function DashboardInner({ user }: { user: User }) {
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { calculateLevel, calculateTotalXP, habits, getTodayStr, isHabitDueToday } = useHabits();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const { profile } = useProfile();
  const { settings, completeOnboarding } = useUserSettings();
  const { isPro } = useSubscription();

  const [showOnboarding, setShowOnboarding] = useState(() => !settings.onboardingCompleted);
  const [showRitual, setShowRitual] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return settings.ritualLastDone !== today;
  });

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
      case "export": return <Suspense fallback={<LoadingFallback />}><ExportSection user={user} /></Suspense>;
      case "settings": return <Suspense fallback={<LoadingFallback />}><SettingsSection user={user} /></Suspense>;
    }
  };

  return (
    <>
      {/* Onboarding overlay for new users */}
      <AnimatePresence>
        {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} />}
      </AnimatePresence>

      <AnimatePresence>
        {showRitual && !showOnboarding && <RitualOverlay onDismiss={() => setShowRitual(false)} />}
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

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-card border-b border-border sticky top-0 z-[1002]" style={{ boxShadow: "var(--card-shadow)" }}>
        <button
          className="bg-transparent border-none text-foreground text-[28px] cursor-pointer p-0 px-2"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <div className="font-mono text-[22px] font-bold text-primary tracking-[1px]">PPS</div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="bg-transparent border-none text-foreground text-lg cursor-pointer p-1" title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAllRead(); }} className="bg-transparent border-none text-foreground text-lg cursor-pointer p-1 relative" title="Notifications">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
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

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          w-[230px] bg-card border-r border-border flex flex-col flex-shrink-0
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
                      ? "text-primary bg-primary/10 border-l-primary font-semibold shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar — desktop only */}
          <header className="hidden md:flex items-center justify-end px-8 py-3 border-b border-border bg-card gap-3" style={{ boxShadow: "var(--card-shadow)" }}>
            <button
              onClick={toggleTheme}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-2"
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
              <span className="text-[12px] text-muted-foreground">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAllRead(); }}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors relative"
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Notification dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                    style={{ boxShadow: "var(--card-shadow-hover)" }}
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="font-semibold text-[13px]">Notifications</span>
                      {notifications.length > 0 && (
                        <button onClick={clearAll} className="text-[11px] text-destructive hover:underline">Clear all</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground text-[13px]">
                        <div className="text-2xl mb-2">🔕</div>
                        No notifications yet
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.slice(0, 10).map((n, i) => (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`px-4 py-3 border-b border-border/50 hover:bg-surface/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-lg mt-0.5">{n.icon}</span>
                              <div>
                                <div className="text-[13px] font-semibold">{n.title}</div>
                                <div className="text-[11px] text-muted-foreground">{n.message}</div>
                                <div className="text-[10px] text-muted-foreground mt-1 font-mono">{n.time}</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          <main className="flex-1 px-8 py-7 overflow-y-auto">
            <AnimatedSection sectionKey={activeSection}>
              {renderSection()}
            </AnimatedSection>
          </main>
        </div>
      </div>

      {/* Close notif on click outside */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}
      <AiChatWidget />
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
      <DashboardInner user={user} />
    </DashboardProviders>
  );
};

export default DashboardPage;
