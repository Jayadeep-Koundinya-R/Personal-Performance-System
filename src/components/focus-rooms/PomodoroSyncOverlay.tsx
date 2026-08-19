import React from "react";
import { Play, Pause, RotateCcw, Sparkles, Flame, Coffee } from "lucide-react";
import { PomodoroMode } from "@/hooks/use-focus-room";

interface PomodoroSyncOverlayProps {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  cycles: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const PomodoroSyncOverlay: React.FC<PomodoroSyncOverlayProps> = ({
  mode,
  timeLeft,
  isRunning,
  cycles,
  onStart,
  onPause,
  onReset,
}) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalDuration = mode === "work" ? 25 * 60 : 5 * 60;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-card/80 border border-border/80 backdrop-blur-xl shadow-lg flex-wrap gap-3">
      {/* Mode Badge & Sprints */}
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl border flex items-center justify-center ${
          mode === "work"
            ? "bg-primary/15 text-primary border-primary/30"
            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        }`}>
          {mode === "work" ? <Flame className="w-4 h-4 fill-primary" /> : <Coffee className="w-4 h-4" />}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-extrabold uppercase text-foreground">
              {mode === "work" ? "Squad Focus Sprint" : "Squad Rest Break"}
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded-md">
              {cycles} Sprints Done
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {mode === "work" ? "25:00 Synced Deep Work" : "5:00 Rest & Recharge"}
          </span>
        </div>
      </div>

      {/* Countdown Display & Controls */}
      <div className="flex items-center gap-3">
        <div className="font-mono text-xl sm:text-2xl font-black text-foreground tracking-wider">
          {formattedTime}
        </div>

        <div className="flex items-center gap-1">
          {isRunning ? (
            <button
              onClick={onPause}
              title="Pause Squad Timer"
              className="p-2 rounded-xl bg-surface border border-border/80 hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onStart}
              title="Start Squad Timer"
              className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onReset}
            title="Reset to 25:00"
            className="p-2 rounded-xl bg-surface border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
