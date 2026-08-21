import React, { useState } from "react";
import { Play, Pause, RotateCcw, Flame, Coffee, Clock, Sparkles, SlidersHorizontal } from "lucide-react";
import { PomodoroMode } from "@/hooks/use-focus-room";

interface PomodoroSyncOverlayProps {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  cycles: number;
  onStart: (durationSec?: number, mode?: PomodoroMode) => void;
  onPause: () => void;
  onReset: (durationSec?: number) => void;
}

const PRESET_DURATIONS = [
  { label: "25m Sprint", sec: 25 * 60, mode: "work" as const, icon: "⚡" },
  { label: "50m Deep", sec: 50 * 60, mode: "work" as const, icon: "🎯" },
  { label: "15m Blitz", sec: 15 * 60, mode: "work" as const, icon: "⏱️" },
  { label: "5m Break", sec: 5 * 60, mode: "break" as const, icon: "☕" },
  { label: "10m Rest", sec: 10 * 60, mode: "break" as const, icon: "🌿" },
];

export const PomodoroSyncOverlay: React.FC<PomodoroSyncOverlayProps> = ({
  mode,
  timeLeft,
  isRunning,
  cycles,
  onStart,
  onPause,
  onReset,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(25 * 60);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("30");

  const validTimeLeft = typeof timeLeft === "number" && !isNaN(timeLeft) ? Math.max(0, timeLeft) : 25 * 60;
  const minutes = Math.floor(validTimeLeft / 60);
  const seconds = validTimeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleSelectPreset = (sec: number, presetMode: PomodoroMode) => {
    setSelectedDuration(sec);
    if (!isRunning) {
      onReset(sec);
    } else {
      onStart(sec, presetMode);
    }
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(customMinutes, 10);
    if (isNaN(num) || num <= 0 || num > 180) return;
    const sec = num * 60;
    setSelectedDuration(sec);
    setShowCustomPicker(false);
    if (!isRunning) {
      onReset(sec);
    } else {
      onStart(sec, mode);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 px-4 rounded-2xl bg-card/90 border border-border/80 backdrop-blur-xl shadow-lg">
      {/* Top Row: Mode, Badges, Timer, Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Mode Badge */}
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center ${
              mode === "work"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {mode === "work" ? <Flame className="w-4 h-4 fill-primary" /> : <Coffee className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold uppercase text-foreground">
                {mode === "work" ? "Squad Focus Sprint" : "Squad Rest Break"}
              </span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                {cycles} Sprints Done
              </span>
            </div>
            <span className="text-[10.5px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-primary" />
              <span>Synced live for all active members in room</span>
            </span>
          </div>
        </div>

        {/* Right: Big Display & Controls */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-2xl sm:text-3xl font-black text-foreground tracking-wider bg-surface/80 px-3.5 py-1 rounded-xl border border-border/60 shadow-inner">
            {formattedTime}
          </div>

          <div className="flex items-center gap-1.5">
            {isRunning ? (
              <button
                onClick={() => onPause()}
                title="Pause Squad Timer"
                className="p-2.5 rounded-xl bg-surface border border-border/80 hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onStart(selectedDuration, mode)}
                title="Start Squad Timer"
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md flex items-center gap-1"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              onClick={() => onReset(selectedDuration)}
              title={`Reset to ${Math.floor(selectedDuration / 60)}:00`}
              className="p-2.5 rounded-xl bg-surface border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Customizable Duration Presets */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground mr-1 hidden sm:inline">
            Sprint Duration:
          </span>
          {PRESET_DURATIONS.map((preset) => {
            const isSelected = selectedDuration === preset.sec && mode === preset.mode;
            return (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(preset.sec, preset.mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-black border border-primary"
                    : "bg-surface/80 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}

          {/* Custom Duration Toggle */}
          <button
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className={`p-1 px-2 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer flex items-center gap-1 ${
              showCustomPicker
                ? "bg-primary/20 border-primary text-primary"
                : "bg-surface/80 border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Set custom duration"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Custom</span>
          </button>
        </div>

        {/* Custom duration popover form */}
        {showCustomPicker && (
          <form onSubmit={handleCustomApply} className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-primary/40">
            <input
              type="number"
              min="1"
              max="180"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="w-14 px-2 py-0.5 bg-card text-xs font-bold text-foreground rounded-lg border border-border outline-none text-center font-mono"
              placeholder="mins"
              autoFocus
            />
            <span className="text-[10px] font-mono font-bold text-muted-foreground">min</span>
            <button
              type="submit"
              className="px-2 py-0.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg cursor-pointer hover:bg-primary/90"
            >
              Set
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
