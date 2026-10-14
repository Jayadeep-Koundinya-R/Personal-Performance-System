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
  Volume2,
  VolumeX,
} from "lucide-react";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { toast } from "sonner";

export interface MomentumCommandDeckProps {
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
}

export const MomentumCommandDeck: React.FC<MomentumCommandDeckProps> = ({
  completionRate,
  maxStreak,
  freezeCredits,
  todayFocusMinutes,
  habits,
  todayStr,
  onToggleHabit,
  onSkipHabit,
  onNavigate,
  skippedHabits,
}) => {
  const { startHabitFocus, isRunning: isTimerRunning } = useFocusTimer();

  // 1. Calculate Real-Time Momentum Score (0 - 100)
  // Combines Completion Rate (50%), Focus Time relative to 60m daily goal (30%), Streak health (20%)
  const momentumScore = useMemo(() => {
    const habitScore = Math.min(100, Math.max(0, completionRate)) * 0.5;
    const focusRatio = Math.min(1, todayFocusMinutes / 60) * 100 * 0.3;
    const streakFactor = Math.min(5, Math.max(1, maxStreak)) * 20 * 0.2;
    return Math.min(100, Math.round(habitScore + focusRatio + streakFactor));
  }, [completionRate, todayFocusMinutes, maxStreak]);

  // Momentum Status Label & Styling
  const momentumStatus = useMemo(() => {
    if (momentumScore >= 80) {
      return {
        label: "HYPER FLOW",
        sub: "Peak Performance State",
        gradient: "from-cyan-400 via-emerald-400 to-teal-300",
        ringColor: "#10b981",
        textColor: "text-emerald-400",
        badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      };
    }
    if (momentumScore >= 50) {
      return {
        label: "IN MOTION",
        sub: "Solid Steady Velocity",
        gradient: "from-blue-400 via-indigo-400 to-purple-400",
        ringColor: "#6366f1",
        textColor: "text-indigo-400",
        badgeBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
      };
    }
    return {
      label: "IGNITION",
      sub: "Warming Up Engine",
      gradient: "from-amber-400 via-orange-400 to-rose-400",
      ringColor: "#f59e0b",
      textColor: "text-amber-400",
      badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    };
  }, [momentumScore]);

  // 2. Circadian Rhythm Intelligence
  const circadian = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) {
      return {
        mode: "Morning Prime Focus",
        icon: <Sunrise className="w-4 h-4 text-amber-400 animate-pulse" />,
        color: "text-amber-400",
        advice: "Peak prefrontal alertness. Tackle the hardest high-impact priority now.",
        window: "05:00 - 12:00",
      };
    }
    if (h >= 12 && h < 17) {
      return {
        mode: "Afternoon Execution",
        icon: <Sun className="w-4 h-4 text-orange-400" />,
        color: "text-orange-400",
        advice: "Steady operational momentum. Good for sprints, review, and group focus.",
        window: "12:00 - 17:00",
      };
    }
    if (h >= 17 && h < 22) {
      return {
        mode: "Evening Consolidation",
        icon: <Moon className="w-4 h-4 text-indigo-400" />,
        color: "text-indigo-400",
        advice: "Wrap up open loops, light habit stacking, and reflection.",
        window: "17:00 - 22:00",
      };
    }
    return {
      mode: "Night Recovery Window",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      color: "text-purple-400",
      advice: "Lower screen blue light. Rest restores cognitive willpower for tomorrow.",
      window: "22:00 - 05:00",
    };
  }, []);

  // 3. Next Best Action (NBA) Detection
  const pendingHabits = useMemo(() => {
    return habits.filter(
      (h) =>
        (h.period === "Daily" || h.period === "Today" || (h.completedDates || []).length > 0) &&
        !(h.completedDates || []).includes(todayStr) &&
        !skippedHabits[h.id] &&
        !h.archived
    );
  }, [habits, todayStr, skippedHabits]);

  // Sort by priority (High > Medium > Low)
  const nextBestHabit = useMemo(() => {
    if (pendingHabits.length === 0) return null;
    const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1, Optional: 0 };
    return [...pendingHabits].sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0))[0];
  }, [pendingHabits]);

  // 4. Quick Handlers
  const handleStartSprint = (habit: any) => {
    feedbackSounds.playClick();
    startHabitFocus(habit, 25);
    toast.success(`⚡ 25m Focus Sprint Launched for "${habit.name}"!`, {
      description: "Timer running in background. Lock in!",
    });
  };

  const handleQuickComplete = (habit: any) => {
    feedbackSounds.playSuccessChime();
    onToggleHabit(habit.id);
    toast.success(`🎉 Completed "${habit.name}" (+10 XP)!`, {
      description: "Momentum score boosted!",
    });
  };

  const handleProtectDay = () => {
    feedbackSounds.playClick();
    if (freezeCredits > 0) {
      toast.info("🛡️ Streak Shield Active!", {
        description: `You have ${freezeCredits} freeze credit(s) armed. If you take a rest day, your ${maxStreak}-day streak stays 100% safe!`,
      });
    } else {
      toast.info("🧊 Rest Day Support", {
        description: "Zero guilt. You can skip individual habits below to preserve mental bandwidth.",
      });
    }
  };

  // Radial SVG Circle Geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (momentumScore / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-slate-950/90 via-card/95 to-slate-900/90 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-4">
      {/* Background Decorative Blurs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />

      {/* Top Header Row: Momentum Pulse + Circadian Pill + Streak Shield + Squad Presence */}
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-border/40">
        {/* Left Hero: Momentum Radial Gauge */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 w-22 h-22 sm:w-24 sm:h-24 flex items-center justify-center">
            {/* SVG Radial Meter */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-muted/20"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                stroke={momentumStatus.ringColor}
                strokeWidth="7"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: `drop-shadow(0 0 8px ${momentumStatus.ringColor}88)`,
                }}
              />
            </svg>

            {/* Inner Score Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-xl sm:text-2xl font-black text-foreground tracking-tighter">
                {momentumScore}
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${momentumStatus.badgeBg}`}
              >
                {momentumStatus.label}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                • {momentumStatus.sub}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Daily Vitality & Momentum
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1 text-foreground font-bold">
                <span className="text-primary">✓</span> {completionRate}% Done
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-foreground font-bold">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> {todayFocusMinutes}m Focus
              </span>
            </div>
          </div>
        </div>

        {/* Right Badges: Circadian Energy + Streak Shield + Co-Working Radar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 lg:justify-end">
          {/* Circadian Pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface/70 border border-border/80 shadow-xs">
            <div className="p-1.5 rounded-xl bg-card border border-border/60">
              {circadian.icon}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <span>Rhythm</span>
                <span className="text-[9px] text-primary">({circadian.window})</span>
              </div>
              <div className="text-xs font-bold text-foreground">
                {circadian.mode}
              </div>
            </div>
          </div>

          {/* Streak Shield Pill (Guilt-Free Forgiving Gamification) */}
          <button
            onClick={handleProtectDay}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface/70 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer shadow-xs group"
            title="Click to check streak shield status"
          >
            <div className="relative p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                <span>Streak</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[9px] text-amber-300">
                  {maxStreak}d
                </span>
              </div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {freezeCredits > 0 ? `${freezeCredits} Shield Armed` : "Rest Protected"}
                </span>
              </div>
            </div>
          </button>

          {/* Live Co-Working Squad Radar */}
          <button
            onClick={() => onNavigate?.("social")}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface/70 border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-xs group"
            title="Open Study Squads & Focus Rooms"
          >
            <div className="relative p-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30">
              <Users className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Co-Work Radar
              </div>
              <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                <span>Squad Active</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Row: Next Best Action (NBA) Zero-Friction 1-Click Sprint */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-surface/60 to-accent/10 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-mono uppercase font-bold text-primary tracking-wider">
                Intelligent Next Action
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                • Eliminates decision paralysis
              </span>
            </div>
            {nextBestHabit ? (
              <div className="flex items-center gap-2 mt-0.5">
                <h4 className="text-sm font-extrabold text-foreground truncate max-w-[220px] sm:max-w-md">
                  {nextBestHabit.name}
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border/80 text-muted-foreground font-semibold">
                  {nextBestHabit.priority} Priority
                </span>
                {nextBestHabit.startTime && (
                  <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                    ⏰ {nextBestHabit.startTime}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <span>🎉 All pending actions crushed for today!</span>
                <span className="text-muted-foreground font-normal">Take a well-deserved break or start a sprint.</span>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-auto flex-wrap justify-end">
          {nextBestHabit && (
            <>
              <button
                onClick={() => handleStartSprint(nextBestHabit)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground text-xs font-black transition-all hover:scale-[1.02] shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5 group"
                title="Press Space to sprint"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Sprint (25m)</span>
                <kbd className="hidden sm:inline-block text-[9px] bg-primary-foreground/20 px-1 py-0.2 rounded font-mono group-hover:scale-105 transition-transform">
                  Space
                </kbd>
              </button>

              <button
                onClick={() => {
                  feedbackSounds.playSuccessChime();
                  onToggleHabit(nextBestHabit.id);
                  toast.success(`🪜 Micro-Habit Logged: "${nextBestHabit.name}"!`, {
                    description: "Consistency preserved with zero burnout. +5 Micro XP! 🌿",
                  });
                }}
                className="px-3 py-2 rounded-xl bg-surface hover:bg-muted border border-border/80 text-foreground text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                title="Tired or low on energy? Scale to a 2-minute micro action to preserve your streak with zero guilt!"
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
          )}

          {!nextBestHabit && (
            <button
              onClick={() => onNavigate?.("tracker")}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Focus Studio</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MomentumCommandDeck;
