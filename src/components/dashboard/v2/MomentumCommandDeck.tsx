import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ShieldCheck,
  Radio,
} from "lucide-react";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useGroups } from "@/hooks/use-groups";
import { shareViaWhatsApp } from "@/lib/social/whatsappInvite";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { toast } from "sonner";
import { TRACK_PRESETS } from "@/constants/onboardingPresets";
import { PrimaryTrackId } from "@/types/onboarding";
import {
  calculateVitalityScore as calcVitality,
  calculateRolling7DayConsistency,
  VitalityTier,
  VitalityResult,
} from "@/lib/dashboard/vitality";
import { getNextBestAction, getCurrentTimeHHMM } from "@/lib/dashboard/recommendations";
import {
  canClaimRecoveryXP,
  claimRecoveryXP,
  canLogMicroCompletion,
  logMicroCompletion,
  REST_DAY_CONFIG,
} from "@/lib/dashboard/microHabits";

/**
 * Pure calculation helper for Vitality Score
 * Exported directly from MomentumCommandDeck per Master Spec Task 4.1
 */
export function calculateVitalityScore(params: {
  completionRate?: number;
  habitCompletionRate?: number;
  todayFocusMinutes: number;
  targetFocusMinutes: number;
  weeklyConsistencyRate?: number;
  rolling7DayConsistency?: number;
}): {
  score: number;
  tier: "Dormant" | "Building" | "Optimal" | "Peak Flow";
  breakdown: string;
  focusRatio: number;
  label: string;
  sub: string;
  ringColor: string;
  textColor: string;
  badgeBg: string;
  tooltipText: string;
} {
  return calcVitality(params);
}

export interface MomentumCommandDeckProfile {
  displayName?: string | null;
  primary_track?: string | null;
  daily_focus_target_minutes?: number | null;
  track_5_challenge_active?: boolean | null;
  [key: string]: any;
}

export interface MomentumCommandDeckProps {
  profile?: MomentumCommandDeckProfile | null;
  completionRate: number;
  maxStreak: number;
  freezeCredits: number;
  todayFocusMinutes: number;
  habits: any[];
  todayStr: string;
  onToggleHabit: (habitId: string) => Promise<void> | void;
  onSkipHabit?: (habitId: string, reason: string) => void;
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

export const MomentumCommandDeck: React.FC<MomentumCommandDeckProps> = ({
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
  const { activeGroup, presenceSummary } = useGroups();
  const [showVitalityModal, setShowVitalityModal] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);

  // 1. Resolve Active Track & Target Focus Minutes
  const activeTrackId = (profile?.primary_track ||
    (typeof window !== "undefined" ? localStorage.getItem("pps_active_track") : null) ||
    "placements") as PrimaryTrackId;

  const trackConfig = TRACK_PRESETS[activeTrackId] || TRACK_PRESETS.placements;
  const storedDailyHours =
    typeof window !== "undefined" ? Number(localStorage.getItem("pps_daily_focus_hours")) : 0;
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
      completionRate,
      todayFocusMinutes,
      targetFocusMinutes: targetMinutes,
      weeklyConsistencyRate: rolling7DayScore,
    });
  }, [completionRate, todayFocusMinutes, targetMinutes, rolling7DayScore]);

  // 4. Circadian Rhythm & Curfew Intelligence
  const circadian = useMemo(() => {
    const h = new Date().getHours();
    const curHour = h;
    const isCurfewApproaching = curHour >= 21;

    if (h >= 5 && h < 12) {
      return {
        mode: "Morning Alertness",
        icon: <Sunrise className="w-4 h-4 text-amber-400" />,
        advice: "Peak prefrontal alertness. Execute high-impact cognitive priorities.",
        window: "05:00 - 12:00",
        curfewStatus: "Curfew Safe (10:00 PM)",
        curfewColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      };
    }
    if (h >= 12 && h < 17) {
      return {
        mode: "Afternoon Execution",
        icon: <Sun className="w-4 h-4 text-orange-400" />,
        advice: "Steady operational momentum. Ideal for sprints, review, and drills.",
        window: "12:00 - 17:00",
        curfewStatus: "Curfew Safe (10:00 PM)",
        curfewColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      };
    }
    if (h >= 17 && h < 22) {
      return {
        mode: "Evening Consolidation",
        icon: <Moon className="w-4 h-4 text-indigo-400" />,
        advice: "Wrap up remaining actions, journaling, and daily reflection.",
        window: "17:00 - 22:00",
        curfewStatus: isCurfewApproaching ? "Curfew Imminent (22:00)" : "Curfew Protected (22:00)",
        curfewColor: isCurfewApproaching
          ? "text-amber-400 border-amber-500/30 bg-amber-500/10 animate-pulse"
          : "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
      };
    }
    return {
      mode: "Night Restoration",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      advice: "Lower blue light exposure. Sleep powers tomorrow's discipline.",
      window: "22:00 - 05:00",
      curfewStatus: "Agni Curfew Active",
      curfewColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
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
    onToggleHabit(habit.id);
    const remaining = REST_DAY_CONFIG.MAX_MICRO_PER_HABIT_PER_WEEK - (check.countThisWeek + 1);
    toast.success(`🪜 2m Micro Logged for "${habit.name}"!`, {
      description: `Streak protected! (${remaining} micro protection${
        remaining === 1 ? "" : "s"
      } left this week). +2 XP awarded.`,
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
        description: `Strategic recovery fuel added. (${
          check.countThisWeek + 1
        }/2 used this week). Shields streak with zero guilt.`,
      });
    }
  };

  const handleLaunchWhatsAppFromRadar = () => {
    feedbackSounds.playClick();
    shareViaWhatsApp({
      squadCode: activeGroup?.inviteCode || "PPS2026",
      squadName: activeGroup?.name || "Focus Squad",
      studyTopic: activeGroup?.studyTopic || "Deep Work",
    });
    toast.success("Opening WhatsApp to invite study partner! 📲");
  };

  const handleLaunchSprintFromRadar = () => {
    feedbackSounds.playClick();
    if (nextBestHabit) {
      startHabitFocus(nextBestHabit, 25);
      toast.success(`⚡ 25m Focus Sprint Launched for "${nextBestHabit.name}"!`, {
        description: "Your live presence status is now broadcast to your squad as Sprinting.",
      });
      setShowRadarModal(false);
    } else if (habits.length > 0) {
      startHabitFocus(habits[0], 25);
      toast.success(`⚡ 25m Focus Sprint Launched for "${habits[0].name}"!`, {
        description: "Your live presence status is now broadcast to your squad as Sprinting.",
      });
      setShowRadarModal(false);
    } else {
      toast.info("Select or create a habit to start a sprint!");
    }
  };

  // Radial SVG Gauge Geometry
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
              title="Rest Day gives +5 Recovery XP at most 2 times per rolling 7 days and shields streaks."
            >
              <Shield className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>{freezeCredits > 0 ? `${freezeCredits} Shield` : "Rest Day"}</span>
            </button>
          </div>

          {/* Active Track Badge & Agni Curfew Indicator */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-xl font-bold font-mono">
              <Target className="w-3.5 h-3.5" />
              <span>{trackConfig.badge || trackConfig.title}</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • {trackConfig.title}
            </span>

            {/* Agni Curfew Badge */}
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${circadian.curfewColor}`}
              title="Agni 22:00 Sleep Curfew protects circadian hormonal recovery"
            >
              <Moon className="w-3 h-3" />
              <span>{circadian.curfewStatus}</span>
            </div>

            {/* Co-Work Squad Radar */}
            <button
              onClick={() => setShowRadarModal((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/80 border border-border/80 hover:border-primary/50 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer ml-auto shadow-2xs"
              title="Open Squad Co-Work Radar & Live Study Presence"
            >
              {presenceSummary && presenceSummary.sprintingCount > 0 ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-400 font-extrabold">🟢 {presenceSummary.sprintingCount} Sprinting</span>
                </>
              ) : presenceSummary && presenceSummary.onlineCount > 0 ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  <span className="text-amber-400 font-extrabold">🟡 {presenceSummary.onlineCount} Online</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground/30 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/60" />
                  </span>
                  <span>Squad Radar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Hero: Vitality Score Radial Gauge + Documented Tooltip */}
        <div className="flex items-center gap-4 bg-surface/50 border border-border/60 p-3 rounded-2xl shadow-2xs self-start lg:self-auto">
          {/* Radial SVG Gauge */}
          <div
            className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center cursor-pointer group"
            onClick={() => setShowVitalityModal((prev) => !prev)}
            title={vitality.tooltipText}
          >
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-muted/20"
                strokeWidth="8"
                fill="transparent"
              />
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
              <span
                className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${vitality.badgeBg}`}
              >
                {vitality.tier}
              </span>
              <button
                type="button"
                onClick={() => setShowVitalityModal((prev) => !prev)}
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="View Vitality Score Formula Breakdown"
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
      <AnimatePresence>
        {showVitalityModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 bg-card border border-primary/30 rounded-2xl text-xs space-y-2 font-mono text-foreground shadow-lg"
          >
            <div className="flex items-center justify-between font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Documented Vitality Score Formula</span>
              </span>
              <button
                onClick={() => setShowVitalityModal(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Close ✕
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <div>
                • <strong className="text-foreground">40% Habit Completion:</strong>{" "}
                {completionRate}% completed today ({Math.round(completionRate * 0.4)} pts)
              </div>
              <div>
                • <strong className="text-foreground">30% Focus Target:</strong>{" "}
                {todayFocusMinutes}m completed vs {targetMinutes}m daily target ({vitality.focusRatio}%) (
                {Math.round(vitality.focusRatio * 0.3)} pts)
              </div>
              <div>
                • <strong className="text-foreground">30% Weekly Consistency:</strong>{" "}
                {rolling7DayScore}% rolling 7-day velocity (
                {Math.round(rolling7DayScore * 0.3)} pts)
              </div>
            </div>
            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground/80 flex items-center justify-between">
              <span>{vitality.breakdown}</span>
              <span className="font-bold text-primary">Tier: {vitality.tier}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Squad Co-Work Radar Modal Drawer */}
      <AnimatePresence>
        {showRadarModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-card/95 border border-primary/40 rounded-2xl text-xs space-y-3 font-mono text-foreground shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between font-bold border-b border-border/40 pb-2">
              <span className="flex items-center gap-2 text-primary font-sans text-sm font-black">
                <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
                <span>Squad Co-Work Radar</span>
                {activeGroup && (
                  <span className="text-xs font-mono text-muted-foreground font-normal">
                    — {activeGroup.name}
                  </span>
                )}
              </span>
              <button
                onClick={() => setShowRadarModal(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-2 py-0.5 rounded-lg hover:bg-muted transition-colors"
              >
                Close ✕
              </button>
            </div>

            {/* If peers are actively sprinting or online */}
            {presenceSummary && presenceSummary.activeCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>🟢 {presenceSummary.sprintingCount} Sprinting</span>
                    {presenceSummary.onlineCount > 0 && (
                      <span className="text-muted-foreground ml-2">
                        🟡 {presenceSummary.onlineCount} Online
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleLaunchWhatsAppFromRadar}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    <span>📲 WhatsApp Invite</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presenceSummary.activePeers.map((peer) => (
                    <div
                      key={peer.id}
                      className="p-2.5 rounded-xl bg-surface/70 border border-border/60 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{peer.avatarEmoji || "🧑‍💻"}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{peer.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {peer.currentTask || "Deep Study Session"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          peer.status === "sprinting"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {peer.status === "sprinting" ? "Sprinting" : "Online"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowRadarModal(false);
                      onNavigate?.("social");
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground font-sans font-bold text-xs hover:opacity-95 transition-all text-center cursor-pointer shadow-sm"
                  >
                    📞 Join Squad Focus Room
                  </button>
                  <button
                    onClick={handleLaunchSprintFromRadar}
                    className="py-2 px-3 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-foreground font-sans font-bold text-xs transition-all cursor-pointer"
                  >
                    ⚡ Signal Squad (Start 25m Sprint)
                  </button>
                </div>
              </div>
            ) : (
              /* Zero Mock Policy: Honest Empty State */
              <div className="p-4 rounded-xl bg-surface/40 border border-border/50 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Radio className="w-6 h-6 animate-pulse text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm text-foreground">
                    Radar Quiet — Start a sprint to signal your squad
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No peers are currently in a focus sprint. Launch your timer to light up the radar, or invite a study partner.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleLaunchSprintFromRadar}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-sans font-black text-xs hover:opacity-95 shadow-md shadow-primary/20 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start 25m Sprint to Signal</span>
                  </button>

                  <button
                    onClick={handleLaunchWhatsAppFromRadar}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-sans font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    <span>📲</span>
                    <span>Invite via WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowRadarModal(false);
                      onNavigate?.("social");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground font-sans font-bold text-xs transition-all cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Open Squads</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                  Install our 3 core foundational habits: Deep Work Sprint, Sunlight & Hydration, and
                  Mindset Reading.
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
                    🔥 {nextBestHabit.streak}d streak
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
                  Your daily slate is complete. Rest strategically, recharge your cognitive battery,
                  or enter an open flow sprint.
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

export default MomentumCommandDeck;
