import React from "react";
import { motion } from "framer-motion";
import { Flame, Clock, Zap, CheckCircle2, Target, ShieldCheck } from "lucide-react";
import { TRACK_PRESETS, TRACK_5_CHALLENGE } from "@/constants/onboardingPresets";
import { PrimaryTrackId } from "@/types/onboarding";

export interface TrackCommandStripProfile {
  displayName?: string | null;
  primary_track?: string | null;
  daily_focus_target_minutes?: number | null;
  track_5_challenge_active?: boolean | null;
  [key: string]: any;
}

interface TrackCommandStripProps {
  profile?: TrackCommandStripProfile | null;
  todayMinutesCompleted: number;
  completionRate: number;
  maxStreak: number;
  habits?: any[];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/* 🌀 Concentric Activity Rings Component (Apple Fitness / Streaks-inspired) */
const MomentumTrinityRings: React.FC<{
  focusRatio: number;
  habitRatio: number;
  consistencyRatio: number;
}> = ({ focusRatio, habitRatio, consistencyRatio }) => {
  // Ring dimensions
  const size = 68;
  const strokeWidth = 5.5;
  const center = size / 2;

  // Ring 1 (Focus / Outer): r = 26
  const r1 = 26;
  const c1 = 2 * Math.PI * r1;
  const offset1 = c1 - (Math.min(100, Math.max(0, focusRatio)) / 100) * c1;

  // Ring 2 (Habits / Middle): r = 18.5
  const r2 = 18.5;
  const c2 = 2 * Math.PI * r2;
  const offset2 = c2 - (Math.min(100, Math.max(0, habitRatio)) / 100) * c2;

  // Ring 3 (Energy / Inner): r = 11
  const r3 = 11;
  const c3 = 2 * Math.PI * r3;
  const offset3 = c3 - (Math.min(100, Math.max(0, consistencyRatio)) / 100) * c3;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group shrink-0 aspect-square w-[68px] h-[68px]"
      title={`Momentum Trinity:\n• Focus Target: ${focusRatio}%\n• Habit Velocity: ${habitRatio}%\n• Consistency Score: ${consistencyRatio}%`}
    >
      <svg width={size} height={size} className="rotate-[-90deg] shrink-0 aspect-square">
        {/* Track backgrounds */}
        <circle cx={center} cy={center} r={r1} stroke="currentColor" strokeWidth={strokeWidth} className="text-primary/15" fill="none" />
        <circle cx={center} cy={center} r={r2} stroke="currentColor" strokeWidth={strokeWidth} className="text-emerald-500/15" fill="none" />
        <circle cx={center} cy={center} r={r3} stroke="currentColor" strokeWidth={strokeWidth} className="text-amber-500/15" fill="none" />

        {/* Outer Ring: Focus Target (Indigo/Primary) */}
        <circle
          cx={center}
          cy={center}
          r={r1}
          stroke="#6366f1"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c1}
          strokeDashoffset={offset1}
          fill="none"
          className="transition-all duration-700 ease-out"
        />

        {/* Middle Ring: Habit Velocity (Emerald) */}
        <circle
          cx={center}
          cy={center}
          r={r2}
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c2}
          strokeDashoffset={offset2}
          fill="none"
          className="transition-all duration-700 ease-out"
        />

        {/* Inner Ring: Consistency & Energy (Amber) */}
        <circle
          cx={center}
          cy={center}
          r={r3}
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c3}
          strokeDashoffset={offset3}
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center icon / indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black font-mono text-primary group-hover:scale-110 transition-transform">
          ⚡
        </span>
      </div>
    </div>
  );
};

export const TrackCommandStrip: React.FC<TrackCommandStripProps> = ({
  profile,
  todayMinutesCompleted = 0,
  completionRate = 0,
  maxStreak = 0,
  habits = [],
}) => {
  // 1. Resolve Active Track & Metadata
  const activeTrackId = (profile?.primary_track ||
    (typeof window !== "undefined" ? localStorage.getItem("pps_active_track") : null) ||
    "placements") as PrimaryTrackId;

  const trackConfig = TRACK_PRESETS[activeTrackId] || TRACK_PRESETS.placements;

  // 2. Resolve Target Focus Minutes (from profile, localStorage, or track preset)
  const storedDailyHours = typeof window !== "undefined" ? Number(localStorage.getItem("pps_daily_focus_hours")) : 0;
  const targetMinutes =
    profile?.daily_focus_target_minutes ||
    (storedDailyHours > 0 ? storedDailyHours * 60 : (trackConfig?.defaultFocusHours || 3) * 60);

  // 3. Resolve Agni Challenge status
  const isAgniActive = Boolean(
    profile?.track_5_challenge_active ??
    (typeof window !== "undefined" &&
      (localStorage.getItem("pps_track5_enabled") === "true" || activeTrackId === ("track_5_agni" as any)))
  );

  const displayName = profile?.displayName || "Champion";

  // Progress calculations
  const progressRatio = targetMinutes > 0 ? Math.min(100, Math.round((todayMinutesCompleted / targetMinutes) * 100)) : 0;
  const targetHoursFormatted = (targetMinutes / 60).toFixed(targetMinutes % 60 === 0 ? 0 : 1);

  // 4. Rolling 7-Day Consistency Velocity (Anti-Streak Death Metric)
  const rolling7DayScore = React.useMemo(() => {
    if (!habits || habits.length === 0) return completionRate || 100;
    const now = new Date();
    let totalDue = 0;
    let totalDone = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      habits.forEach((h) => {
        if (!h.archived) {
          totalDue++;
          if ((h.completedDates || []).includes(ds)) totalDone++;
        }
      });
    }
    return totalDue > 0 ? Math.min(100, Math.round((totalDone / totalDue) * 100)) : completionRate || 100;
  }, [habits, completionRate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-card/85 backdrop-blur-xl border border-border/70 rounded-2xl p-4 sm:p-5 mb-4 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      {/* Subtle ambient gradient highlights */}
      <div className="pointer-events-none absolute -right-20 -top-20 w-52 h-52 bg-primary/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 w-52 h-52 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row flex-wrap justify-between items-center gap-3">
        {/* Left Section: Greeting, Track Badge & Streak */}
        <div className="flex-1 min-w-[270px] max-w-full flex flex-col justify-center space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>{getGreeting()}, <span className="text-primary">{displayName}</span></span>
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
                className="inline-block origin-[70%_70%]"
              >
                👋
              </motion.span>
            </h2>

            {/* Streak flame badge */}
            <div className="inline-flex items-center gap-1 bg-pps-orange/15 text-pps-orange border border-pps-orange/25 px-2 py-0.5 rounded-full text-xs font-mono font-bold shadow-2xs">
              <Flame className="w-3.5 h-3.5 fill-current text-pps-orange" />
              <span>{maxStreak}d Streak</span>
            </div>

            {/* Anti-Burnout Rolling 7-Day Velocity Pill */}
            <div
              className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold shadow-2xs"
              title="7-Day Rolling Consistency Velocity: Real momentum that never dies with a single missed day!"
            >
              <span>🛡️ {rolling7DayScore}% 7d Velocity</span>
            </div>
          </div>

          {/* Active Track Badge & Quick Key Hints */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-xl font-bold font-mono">
              <Target className="w-3.5 h-3.5" />
              <span>{trackConfig.badge || trackConfig.title}</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • {trackConfig.title}
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-mono hidden md:inline ml-auto bg-surface/60 border border-border/50 px-2 py-0.5 rounded-md">
              ⌨️ <kbd className="font-bold text-foreground">Space</kbd> Sprint • <kbd className="font-bold text-foreground">Z</kbd> Zen
            </span>
          </div>
        </div>

        {/* Center Section: Concentric Momentum Trinity & Target Bar */}
        <div className="flex-1 min-w-[270px] max-w-full flex items-center gap-3 bg-surface/50 border border-border/60 p-3 rounded-xl shadow-2xs">
          {/* 🌀 Concentric Activity Rings */}
          <MomentumTrinityRings
            focusRatio={progressRatio}
            habitRatio={completionRate}
            consistencyRatio={Math.max(25, rolling7DayScore)}
          />

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span className="truncate">Daily Focus Target</span>
              </span>
              <span className="font-bold text-foreground text-[11.5px]">
                <span className="text-primary">{todayMinutesCompleted}</span>/{targetMinutes}m
              </span>
            </div>

            {/* Glowing Target Progress Bar */}
            <div className="h-2 w-full bg-surface border border-border/70 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, progressRatio))}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-pps-green shadow-xs shadow-primary/30"
              />
            </div>

            <div className="flex items-center justify-between text-[9.5px] font-mono text-muted-foreground">
              <span>{progressRatio}% Target</span>
              {progressRatio >= 100 ? (
                <span className="text-pps-green font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Met! 🚀
                </span>
              ) : (
                <span>{Math.max(0, targetMinutes - todayMinutesCompleted)}m left</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Agni Challenge Protocol & Habit Momentum */}
        <div className="flex flex-row sm:flex-nowrap flex-wrap md:flex-col justify-start md:justify-center items-start md:items-end gap-2 shrink-0">
          {/* Agni Protocol Badge */}
          {isAgniActive ? (
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-xl text-xs font-mono font-bold shadow-2xs animate-pulse">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400 flex-shrink-0" />
              <div className="text-left md:text-right">
                <div className="text-[11px] font-black uppercase tracking-wider text-orange-300 leading-tight">
                  Agni Protocol Active
                </div>
                <div className="text-[9.5px] text-orange-400/90 font-mono">
                  5:00 AM Rise • 10:00 PM Curfew
                </div>
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-surface border border-border/80 px-2.5 py-1 rounded-xl text-[11px] font-mono text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Standard Execution Flow</span>
            </div>
          )}

          {/* Today's Habit Momentum Pill */}
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-primary">
            <Zap className="w-3 h-3 text-primary fill-current" />
            <span>{completionRate}% Habit Momentum</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
