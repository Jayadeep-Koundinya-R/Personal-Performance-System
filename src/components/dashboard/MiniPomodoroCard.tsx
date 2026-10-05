import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTimer, TIMER_PRESETS, TimerMode } from "@/hooks/use-focus-timer";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Sparkles, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface MiniPomodoroCardProps {
  onNavigate?: (section: string) => void;
}

export const MiniPomodoroCard: React.FC<MiniPomodoroCardProps> = ({ onNavigate }) => {
  const timer = useFocusTimer();
  const [selectedMins, setSelectedMins] = useState<number>(25);

  const presets = [
    { label: "15m", mins: 15, mode: "custom" as TimerMode },
    { label: "25m", mins: 25, mode: "pomodoro" as TimerMode },
    { label: "45m", mins: 45, mode: "custom" as TimerMode },
    { label: "5m Break", mins: 5, mode: "shortBreak" as TimerMode },
  ];

  const handleSelectPreset = (p: typeof presets[number]) => {
    setSelectedMins(p.mins);
    timer.changeTimerMode(p.mode, p.mins);
    if (!timer.isRunning) {
      timer.startTimer();
      toast.success(`⏱️ Started ${p.label} focus session!`);
    }
  };

  const handleToggle = () => {
    if (timer.isRunning) {
      timer.pauseTimer();
      toast.info("Timer paused");
    } else {
      timer.startTimer();
      toast.success("Focus sprint resumed!");
    }
  };

  const formattedTime = timer.formatTimerTime(timer.remainingSec);
  const progressPct = Math.round(timer.progressRatio * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-primary/25 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden space-y-3.5 group hover:border-primary/40 transition-all"
    >
      {/* Background radial highlight */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-sm shadow-2xs">
            ⏱️
          </div>
          <div>
            <h4 className="text-xs font-black font-mono uppercase tracking-wider text-foreground">
              Quick Focus Studio
            </h4>
            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px] sm:max-w-[160px]">
              {timer.activeTaskName || "Deep Work Sprint"}
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate?.("tracker")}
          className="text-[10.5px] font-mono font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          title="Open Full Focus Studio"
        >
          <span>Studio</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Countdown Strip & Circular Progress */}
      <div className="flex items-center justify-between gap-3 bg-surface/70 border border-border/80 p-3 rounded-xl">
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight drop-shadow-xs">
            {formattedTime}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {timer.timerMode === "shortBreak" || timer.timerMode === "longBreak" ? "Break" : "Focus"}
          </span>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              timer.isRunning
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {timer.isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{timer.isRunning ? "Pause" : "Start"}</span>
          </button>

          <button
            onClick={timer.resetTimer}
            className="p-1.5 rounded-lg bg-surface border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9.5px] font-mono text-muted-foreground">
          <span>Session Progress</span>
          <span className="text-primary font-bold">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-surface border border-border/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            style={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Preset Pills */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        {presets.map((p) => {
          const isActive = (timer.totalSec === p.mins * 60 && timer.timerMode === p.mode) || selectedMins === p.mins;
          return (
            <button
              key={p.label}
              onClick={() => handleSelectPreset(p)}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer text-center truncate ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/40 shadow-2xs font-black"
                  : "bg-surface border border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
