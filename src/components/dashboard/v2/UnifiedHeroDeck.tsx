import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Shield,
  Zap,
  Play,
  CheckCircle2,
  Clock,
  Users,
  Compass,
  ArrowRight,
  Sun,
  Sunrise,
  Moon,
  Sparkles,
  Info,
  Target,
} from "lucide-react";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { toast } from "sonner";
import { TRACK_PRESETS } from "@/constants/onboardingPresets";
import { PrimaryTrackId } from "@/types/onboarding";
import { calculateVitalityScore, calculateRolling7DayConsistency } from "@/lib/dashboard/vitality";
import { getNextBestAction, getCurrentTimeHHMM } from "@/lib/dashboard/recommendations";
import {
  canClaimRecoveryXP,
  claimRecoveryXP,
  canLogMicroCompletion,
  logMicroCompletion,
  REST_DAY_CONFIG,
  getMicroCountInWeek,
} from "@/lib/dashboard/microHabits";

export interface UnifiedHeroDeckProfile {
  displayName?: string | null;
  primary_track?: string | null;
  daily_focus_target_minutes?: number | null;
  track_5_challenge_active?: boolean | null;
  [key: string]: any;
}

export interface UnifiedHeroDeckProps {
  profile?: UnifiedHeroDeckProfile | null;
  completionRate: number;
  maxStreak: number;
  freezeCredits: number;
  todayFocusMinutes: number;
  habits: any[];
  todayStr: string;
  onToggleHabit: (habitId: string) => Promise<void> | void;
  onSkipHabit: (habitId: string, reason: string) => void;
  onNavigate?: (section: string) => void;
  skippedHabits: Record<string, string>;
  onInstallStarterStack?: () => Promise<void> | void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export const UnifiedHeroDeck: React.FC<UnifiedHeroDeckProps> = ({
  profile,
  completionRate = 0,
  maxStreak = 0,
  freezeCredits = 0,
  todayFocusMinutes = 0,
  habits = [],
  todayStr,
  onToggleHabit,
  onSkipHabit,
  onNavigate,
  skippedHabits,
  onInstallStarterStack,
}) => {
  const { startHabitFocus, isRunning: isTimerRunning } = useFocusTimer();
  const [showVitalityTooltip, setShowVitalityTooltip] = useState(false);

  // 1. Resolve Active Track & Target Focus Minutes
  const activeTrackId = (profile?.primary_track ||
    (typeof window !== "undefined" ? localStorage.getItem("pps_active_track") : null) ||
    "placements") as PrimaryTrackId;

  const trackConfig = TRACK_PRESETS[activeTrackId] || TRACK_PRESETS.placements;
  const storedDailyHours = typeof window !== "undefined" ? Number(localStorage.getItem("pps_daily_focus_hours")) : 0;
  const targetMinutes =
    profile?.daily_focus_target_minutes ||
    (storedDailyHours > 0 ? storedDailyHours * 60 : (trackConfig?.defaultFocusHours || 3) * 60);

  const displayName = profile?.displayName || "Champion";

  // 2. Compute 7-day rolling consistency
  const rolling7DayScore = useMemo(() => {
    return calculateRolling7DayConsistency(habits, todayStr, completionRate);
  }, [habits, todayStr, completionRate]);

  // 3. Compute Real Vitality Score & Formula
  const vitality = useMemo(() => {
    return calculateVitalityScore({
      habitCompletionRate: completionRate,
      todayFocusMinutes,
      targetFocusMinutes: targetMinutes,
      rolling7DayConsistency: rolling7DayScore,
    });
  }, [completionRate, todayFocusMinutes, targetMinutes, rolling7DayScore]);

  // 4. Circadian Rhythm Intelligence
  const circadian = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) {
      return {
        mode: "Morning Alertness",
        icon: <Sunrise className="w-4 h-4 text-amber-400" />,
        advice: "Peak focus window. Execute hardest cognitive priorities.",
        window: "05:00 - 12:00",
      };
    }
    if (h >= 12 && h < 17) {
      return {
        mode: "Afternoon Execution",
        icon: <Sun className="w-4 h-4 text-orange-400" />,
        advice: "Steady operational momentum. Ideal for sprints and deep work.",
        window: "12:00 - 17:00",
      };
    }
    if (h >= 17 && h < 22) {
      return {
        mode: "Evening Review",
        icon: <Moon className="w-4 h-4 text-indigo-400" />,
        advice: "Wrap up remaining actions, journaling, and daily reflection.",
        window: "17:00 - 22:00",
      };
    }
    return {
      mode: "Night Restoration",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      advice: "Lower blue light exposure. Sleep powers tomorrow's discipline.",
      window: "22:00 - 05:00",
    };
  }, []);

  // 5. Compute Pure Next Best Action (NBA)
  const nextBestHabit = useMemo(() => {
    return getNextBestAction({
      habits,
      todayStr,
      currentTimeStr: getCurrentTimeHHMM(),
      skippedHabits,
    });
  }, [habits, todayStr, skippedHabits]);

  // 6. Action Handlers
  const handleStartSprint = (habit: any) => {
    feedbackSounds.playClick();
    startHabitFocus(habit, 25);
    toast.success(`⚡ 25m Focus Sprint Launched for "${habit.name}"!`, {
      description: "Timer running in background. Habit will mark completed upon finish.",
    });
  };

  const handleQuickComplete = (habit: any) => {
    feedbackSounds.playSuccessChime();
    onToggleHabit(habit.id);
    toast.success(`🎉 Completed "${habit.name}" (+10 XP)!`);
  };

  const handleMicroComplete = (habit: any) => {
    const check = canLogMicroCompletion(habit.id, todayStr);
    if (!check.allowed) {
      feedbackSounds.playClick();
      toast.warning("🪜 Micro-Completion Unavailable", {
        description: check.reason,
      });
      return;
    }

    feedbackSounds.playSuccessChime();
    logMicroCompletion(habit.id, todayStr);
    onToggleHabit(habit.id); // Toggle completion state so streak is protected
    const remaining = REST_DAY_CONFIG.MAX_MICRO_PER_HABIT_PER_WEEK - (check.countThisWeek + 1);
    toast.success(`🪜 2m Micro Logged for "${habit.name}"!`, {
      description: `Streak protected! (${remaining} micro protection${remaining === 1 ? "" : "s"} left this week). No full XP awarded.`,
    });
  };

  const handleRestDayClaim = () => {
    feedbackSounds.playClick();
    const check = canClaimRecoveryXP(todayStr);
    if (!check.allowed) {
      toast.info("🛡️ Rest Day Status", {
        description: check.reason,
      });
      return;
    }

    const res = claimRecoveryXP(todayStr);
    if (res.success) {
      toast.success("🌿 Rest Day Claimed (+5 Recovery XP)!", {
        description: `Strategic recovery fuel added. (${check.countThisWeek + 1}/2 used this week). Rest Days never stack.`,
      });
    }
  };

  // Radial Gauge Geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (vitality.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-card/95 via-surface/85 to-card/95 p-4 sm:p-6 backdrop-blur-2xl shadow-xl space-y-4 mb-4"
    >
      {/* Background Decorative Blurs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* ── Top Header Row: Unified Non-Redundant Deck ── */}
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-border/40">
        {/* Left Column: Greeting, Track Badge & Streak Status */}
        <div className="flex flex-col justify-center space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>
                {getGreeting()}, <span className="text-primary">{displayName}</span>
              </span>
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
                className="inline-block origin-[70%_70%]"
              >
                👋
              </motion.span>
            </h2>

            {/* Streak flame badge */}
            <div className="inline-flex items-center gap-1 bg-pps-orange/15 text-pps-orange border border-pps-orange/25 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold shadow-2xs">
              <Flame className="w-3.5 h-3.5 fill-current text-pps-orange" />
              <span>{maxStreak}d Streak</span>
            </div>

            {/* Streak Shield / Rest Status */}
            <button
              onClick={handleRestDayClaim}
              className="inline-flex items-center gap-1.5 bg-surface border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs group"
              title="Rest Day gives Recovery XP at most 2 times per week and never stacks."
            >
              <Shield className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>{freezeCredits > 0 ? `${freezeCredits} Shield` : "Rest Day"}</span>
            </button>
          </div>

          {/* Active Track Badge & Quick Key Hints */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-xl font-bold font-mono">
              <Target className="w-3.5 h-3.5" />
              <span>{trackConfig.badge || trackConfig.title}</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">• {trackConfig.title}</span>
            <span className="text-[10px] text-muted-foreground/70 font-mono hidden md:inline ml-auto bg-surface/60 border border-border/50 px-2 py-0.5 rounded-md">
              ⌨️ <kbd className="font-bold text-foreground">Space</kbd> Sprint • <kbd className="font-bold text-foreground">V</kbd> Views
            </span>
          </div>
        </div>

        {/* Right Hero: Vitality Score Radial Gauge + Documented Tooltip */}
        <div className="flex items-center gap-4 bg-surface/50 border border-border/60 p-3 rounded-2xl shadow-2xs self-start lg:self-auto">
          {/* Radial SVG Gauge */}
          <div
            className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center cursor-pointer group"
            onClick={() => setShowVitalityTooltip((prev) => !prev)}
            title={vitality.tooltipText}
          >
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} className="stroke-muted/20" strokeWidth="8" fill="transparent" />
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                stroke={vitality.ringColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: `drop-shadow(0 0 6px ${vitality.ringColor}88)`,
                }}
              />
            </svg>

            {/* Inner Score Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-mono text-base sm:text-lg font-black text-foreground tracking-tighter">
                {vitality.score}
              </span>
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Vitality
              </span>
            </div>
          </div>

          {/* Computed Vitality Labels & Breakdown */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${vitality.badgeBg}`}>
                {vitality.label}
              </span>
              <button
                type="button"
                onClick={() => setShowVitalityTooltip((prev) => !prev)}
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="View Vitality Score Formula"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-xs">
              {vitality.sub}
            </div>

            {/* Non-duplicated live metrics */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
              <span className="text-foreground font-bold">✓ {completionRate}% Habits</span>
              <span>•</span>
              <span className="text-foreground font-bold">
                <Clock className="w-3 h-3 inline mr-0.5 text-primary" />
                {todayFocusMinutes}/{targetMinutes}m
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">🛡️ {rolling7DayScore}% 7d</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vitality Tooltip / Formula Modal Drawer */}
      {showVitalityTooltip && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3 bg-card border border-primary/30 rounded-2xl text-xs space-y-1.5 font-mono text-foreground"
        >
          <div className="flex items-center justify-between font-bold text-primary">
            <span>📐 Vitality Score Formula Breakdown</span>
            <button
              onClick={() => setShowVitalityTooltip(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close ✕
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground space-y-1">
            <div>• <strong className="text-foreground">40% Habit Completion:</strong> {completionRate}% completed today</div>
            <div>• <strong className="text-foreground">30% Focus Target:</strong> {todayFocusMinutes}m completed vs {targetMinutes}m daily target ({vitality.focusRatio}%)</div>
            <div>• <strong className="text-foreground">30% 7-Day Consistency:</strong> {rolling7DayScore}% rolling velocity over the past 7 days</div>
          </div>
        </motion.div>
      )}

      {/* ── Bottom Row: Intelligent Next Best Action (NBA) Spotlight ── */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-surface/60 to-accent/10 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
            {habits.length === 0 ? "🚀" : nextBestHabit ? "⚡" : "🌿"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-mono uppercase font-bold text-primary tracking-wider">
                {habits.length === 0
                  ? "Starter Habit Stack"
                  : nextBestHabit
                  ? "Intelligent Next Best Action"
                  : "All Clear Status"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                • {circadian.mode} window
              </span>
            </div>

            {habits.length === 0 ? (
              <div className="mt-0.5 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-extrabold text-foreground">
                    Build Your Daily Momentum Stack
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                    Curated Setup
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Install our 3 core foundational habits: Deep Work Sprint, Sunlight & Hydration, and Mindset Reading.
                </p>
              </div>
            ) : nextBestHabit ? (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <h4 className="text-sm font-extrabold text-foreground truncate max-w-[200px] sm:max-w-md">
                  {nextBestHabit.name}
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border/80 text-muted-foreground font-semibold">
                  {nextBestHabit.priority} Priority
                </span>
                {nextBestHabit.startTime && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ⏰ {nextBestHabit.startTime}
                    {nextBestHabit.endTime ? ` - ${nextBestHabit.endTime}` : ""}
                  </span>
                )}
                {(nextBestHabit.streak || 0) > 0 && (
                  <span className="text-[10px] font-mono text-pps-orange font-bold">
                    🔥 {nextBestHabit.streak}d streak at risk
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-0.5 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>All scheduled actions cleared for today!</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your daily slate is complete. Rest strategically, recharge your cognitive battery, or enter an open flow sprint.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-auto flex-wrap justify-end">
          {habits.length === 0 ? (
            <button
              onClick={onInstallStarterStack}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground text-xs font-black transition-all hover:scale-[1.02] shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Install Starter Stack (3 Habits)</span>
            </button>
          ) : nextBestHabit ? (
            <>
              <button
                onClick={() => handleStartSprint(nextBestHabit)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground text-xs font-black transition-all hover:scale-[1.02] shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5 group"
                title="Press Space when not in inputs/modals to sprint"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Sprint (25m)</span>
                <kbd className="hidden sm:inline-block text-[9px] bg-primary-foreground/20 px-1 py-0.2 rounded font-mono group-hover:scale-105 transition-transform">
                  Space
                </kbd>
              </button>

              <button
                onClick={() => handleMicroComplete(nextBestHabit)}
                className="px-3 py-2 rounded-xl bg-surface hover:bg-muted border border-border/80 text-foreground text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                title="Scale to 2m micro habit. Max 3 times per week to protect streak without burnout."
              >
                <span>🪜 2m Micro</span>
              </button>

              <button
                onClick={() => handleQuickComplete(nextBestHabit)}
                className="px-3 py-2 rounded-xl bg-surface border border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-foreground hover:text-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Mark Completed (+10 XP)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Done</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  feedbackSounds.playClick();
                  startHabitFocus({ id: "open_flow", name: "Deep Flow Sprint" }, 25);
                  toast.success("🌊 Launched 25m Open Flow Sprint!");
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Focus (25m)</span>
              </button>
              <button
                onClick={() => onNavigate?.("analytics")}
                className="px-3 py-2 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UnifiedHeroDeck;
