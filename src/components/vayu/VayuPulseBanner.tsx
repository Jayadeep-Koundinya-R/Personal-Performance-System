import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Send,
  Zap,
  SlidersHorizontal,
  Flame,
  Coffee,
  AlertCircle,
  Play,
} from "lucide-react";
import { formatDisplayTime } from "@/lib/vayu/vayuPlanner";
import { VayuTimeBlock, VayuDailyPlan } from "@/lib/vayu/types";

interface VayuPulseBannerProps {
  plan: VayuDailyPlan | null;
  currentBlock: VayuTimeBlock | null;
  nextBlock: VayuTimeBlock | null;
  completionRate: number;
  onProcessInput: (input: string) => Promise<any>;
  onRebalance: () => void;
  onOpenStudio: () => void;
  onCompleteCurrent: (blockId: string) => void;
  onStartSprint?: (block: VayuTimeBlock) => void;
}

export const VayuPulseBanner: React.FC<VayuPulseBannerProps> = ({
  plan,
  currentBlock,
  nextBlock,
  completionRate,
  onProcessInput,
  onRebalance,
  onOpenStudio,
  onCompleteCurrent,
  onStartSprint,
}) => {
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onProcessInput(inputText.trim());
      setInputText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchSprint = (block: VayuTimeBlock) => {
    if (onStartSprint) {
      onStartSprint(block);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pps_start_focus_timer", {
          detail: {
            durationMins: block.durationMinutes,
            taskName: block.title,
            linkedHabitId: block.habitId || block.linkedHabitId,
          },
        })
      );
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-card/90 dark:bg-gradient-to-r dark:from-cyan-950/40 dark:via-slate-900/80 dark:to-emerald-950/40 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-cyan-950/20 mb-6">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Breathing Vayu Indicator */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card dark:bg-slate-950/80">
                <Wind className="h-4 w-4 text-cyan-500 dark:text-cyan-300 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                  Vayu Circadian Flow
                </h3>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                  45/15 Rhythm
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ultradian biological alignment & zero-guilt rebalancer.
              </p>
            </div>
          </div>

          {/* Real-time Day Flow Rate Gauge */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-muted-foreground">Vital Day Flow</span>
              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-emerald-400">
                {completionRate}% Achieved
              </span>
            </div>
            <div className="h-9 w-20 sm:w-28 rounded-full bg-surface border border-border/80 dark:bg-slate-800/80 dark:border-slate-700/50 p-1 flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, Math.min(100, completionRate))}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-sm shadow-cyan-500/50"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 border-l border-border/80 pl-3">
              <button
                onClick={onRebalance}
                title="Fluid Rebalance Schedule"
                className="rounded-lg p-2 text-muted-foreground hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenStudio}
                title="Open Flow Studio"
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20 transition-all border border-cyan-500/30 cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Flow Studio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Task 2.2: Zero-Guilt Delay Alert & Rebalance Banner */}
        <AnimatePresence>
          {plan?.needsRebalance && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-3 text-xs text-cyan-100 shadow-sm shadow-cyan-950/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Wind className="h-4 w-4 animate-pulse" />
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-cyan-200">
                    Schedule running behind? Zero guilt.
                  </span>
                  <p className="text-[11px] text-cyan-300/80 truncate">
                    {(plan.rebalanceExplanation || "Vayu can slide remaining blocks forward to protect your 10:00 PM Agni Curfew.").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&")}
                  </p>
                </div>
              </div>

              <button
                onClick={onRebalance}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-400 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Slide Schedule Forward</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Active Block Card & Next Block */}
        <div className="flex flex-col gap-3">
          {/* Active Vital Block */}
          <div className="rounded-xl border border-cyan-500/20 bg-surface/80 dark:bg-slate-900/60 p-3 sm:p-3.5 backdrop-blur-sm flex flex-col gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400 mt-0.5">
                {currentBlock?.energyLevel === "peak" ? (
                  <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                ) : currentBlock?.energyLevel === "recharge" ? (
                  <Coffee className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Zap className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400">
                    Active Vital Focus
                  </span>
                  
                  {/* Energy Level Badge */}
                  {currentBlock?.energyLevel === "peak" && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      ⚡ Peak Energy (45m)
                    </span>
                  )}
                  {currentBlock?.energyLevel === "medium" && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      🎯 Tactical Drill
                    </span>
                  )}
                  {currentBlock?.energyLevel === "recharge" && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      🌿 Vital Recharge
                    </span>
                  )}

                  {currentBlock?.startTime && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDisplayTime(currentBlock.startTime)} – {formatDisplayTime(currentBlock.endTime)}
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-foreground truncate mt-1">
                  {currentBlock ? currentBlock.title : "All scheduled blocks completed for today! 🌟"}
                </h4>
                {currentBlock?.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{currentBlock.description}</p>
                )}
              </div>
            </div>

            {/* Block Actions */}
            {currentBlock && currentBlock.status !== "completed" && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/50">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{currentBlock.durationMinutes} min focus session</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Task 2.4: Timeblock Sprint Launcher */}
                  <button
                    onClick={() => handleLaunchSprint(currentBlock)}
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-200 transition-all cursor-pointer"
                    title="Launch dedicated focus sprint timer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Sprint ({currentBlock.durationMinutes}m)</span>
                  </button>

                  <button
                    onClick={() => onCompleteCurrent(currentBlock.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Done (+15 XP)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Up Next Preview */}
          <div className="rounded-xl border border-border/80 bg-surface/80 dark:bg-slate-900/40 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                Up Next <ArrowRight className="h-3 w-3" />
              </span>
              <p className="text-xs sm:text-sm font-medium text-foreground truncate mt-0.5">
                {nextBlock ? nextBlock.title : "Agni Curfew & Evening Reflection"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                {nextBlock ? `${formatDisplayTime(nextBlock.startTime)} • ${nextBlock.durationMinutes}m` : "Curfew ready at 22:00"}
              </span>
              {nextBlock?.energyLevel === "peak" && (
                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold">⚡ Peak</span>
              )}
              {nextBlock?.energyLevel === "recharge" && (
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold">🌿 Recharge</span>
              )}
            </div>
          </div>
        </div>

        {/* Natural Language Real-Time Intake Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tell Vayu: 'Finished 45m DSA', 'Done with workout 50%', 'Start sprint', 'Push schedule 30m'..."
            className="w-full rounded-xl border border-border/80 dark:border-cyan-500/20 bg-surface dark:bg-slate-950/70 py-2.5 pl-3.5 pr-24 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="h-3 w-3" />
            <span>Process</span>
          </button>
        </form>
      </div>
    </div>
  );
};
