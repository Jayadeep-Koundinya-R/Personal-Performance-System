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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-emerald-950/40 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-cyan-950/20 mb-6">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Breathing Vayu Indicator */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/80">
                <Wind className="h-4 w-4 text-cyan-300 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-cyan-100 uppercase">
                  Vayu Real-Time Flow
                </h3>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/30">
                  Autonomous Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI plans, tracks time-blocks & completes automatically.
              </p>
            </div>
          </div>

          {/* Real-time Day Flow Rate Gauge */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-slate-400">Vital Day Flow</span>
              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-300">
                {completionRate}% Achieved
              </span>
            </div>
            <div className="h-9 w-20 sm:w-28 rounded-full bg-slate-800/80 p-1 border border-slate-700/50 flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, Math.min(100, completionRate))}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-sm shadow-cyan-500/50"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 border-l border-slate-700/50 pl-3">
              <button
                onClick={onRebalance}
                title="Fluid Rebalance Schedule"
                className="rounded-lg p-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenStudio}
                title="Open Flow Studio"
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all border border-cyan-500/30"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Flow Studio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Current Active Block Card & Next Block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Active Vital Block */}
          <div className="md:col-span-2 rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3 sm:p-3.5 backdrop-blur-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                    Active Vital Focus
                  </span>
                  {currentBlock?.startTime && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatDisplayTime(currentBlock.startTime)} – {formatDisplayTime(currentBlock.endTime)}
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                  {currentBlock ? currentBlock.title : "All scheduled blocks completed for today! 🌟"}
                </h4>
                {currentBlock?.description && (
                  <p className="text-xs text-slate-400 truncate">{currentBlock.description}</p>
                )}
              </div>
            </div>

            {currentBlock && currentBlock.status !== "completed" && (
              <button
                onClick={() => onCompleteCurrent(currentBlock.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Mark Done (+15 XP)</span>
              </button>
            )}
          </div>

          {/* Up Next Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              Up Next <ArrowRight className="h-3 w-3" />
            </span>
            <p className="text-xs sm:text-sm font-medium text-slate-200 truncate mt-0.5">
              {nextBlock ? nextBlock.title : "Evening Reflection & Recharge"}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5">
              {nextBlock ? `${formatDisplayTime(nextBlock.startTime)} • ${nextBlock.durationMinutes} mins` : "Flow ready"}
            </span>
          </div>
        </div>

        {/* Natural Language Real-Time Intake Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tell Vayu what you did or want to do (e.g. 'Finished 45m algorithms', 'Workout done', 'Plan 2 focus sprints')..."
            className="w-full rounded-xl border border-cyan-500/20 bg-slate-950/70 py-2.5 pl-3.5 pr-24 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-40 transition-all"
          >
            <Send className="h-3 w-3" />
            <span>Process</span>
          </button>
        </form>
      </div>
    </div>
  );
};
