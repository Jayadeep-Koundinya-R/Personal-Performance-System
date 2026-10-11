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
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export const TrackCommandStrip: React.FC<TrackCommandStripProps> = ({
  profile,
  todayMinutesCompleted = 0,
  completionRate = 0,
  maxStreak = 0,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-card/75 backdrop-blur-xl border border-border/70 rounded-2xl p-4 sm:p-5 mb-4 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      {/* Subtle ambient gradient highlights */}
      <div className="pointer-events-none absolute -right-20 -top-20 w-52 h-52 bg-primary/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 w-52 h-52 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left Column (5 Cols): Greeting, Track Badge & Streak */}
        <div className="md:col-span-5 flex flex-col justify-center space-y-1.5">
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
          </div>

          {/* Active Track Badge */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-xl font-bold font-mono">
              <Target className="w-3.5 h-3.5" />
              <span>{trackConfig.badge || trackConfig.title}</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • {trackConfig.title}
            </span>
          </div>
        </div>

        {/* Center Column (4 Cols): Daily Focus Target Meter */}
        <div className="md:col-span-4 flex flex-col justify-center space-y-1.5 bg-surface/50 border border-border/60 p-3 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Daily Target Focus</span>
            </span>
            <span className="font-bold text-foreground">
              <span className="text-primary">{todayMinutesCompleted}</span> / {targetMinutes} min
              <span className="text-[10px] text-muted-foreground ml-1">({targetHoursFormatted}h target)</span>
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

          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>{progressRatio}% Target Met</span>
            {progressRatio >= 100 ? (
              <span className="text-pps-green font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Goal Reached! 🚀
              </span>
            ) : (
              <span>{Math.max(0, targetMinutes - todayMinutesCompleted)}m remaining</span>
            )}
          </div>
        </div>

        {/* Right Column (3 Cols): Agni Challenge Protocol & Habit Momentum */}
        <div className="md:col-span-3 flex flex-col sm:flex-row md:flex-col justify-center items-start md:items-end gap-2">
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
