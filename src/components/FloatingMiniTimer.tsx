/*
  🎯 Floating Mini-Timer Widget
  
  Glassmorphic floating pill rendered at the app shell level.
  Visible on ALL tabs when a focus session is active,
  EXCEPT when the user is already on the Focus Studio tab.
  
  Features:
  - Compact countdown display with growth stage emoji
  - Pause/Resume toggle
  - Task name (truncated)
  - Progress bar
  - Expandable ambient sound controls
  - "Go to Focus Studio →" navigation button
  - Smooth entrance/exit animations
*/

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTimer } from "@/hooks/use-focus-timer";

function getGrowthStage(ratio: number): string {
  if (ratio >= 1) return "🔥";
  if (ratio >= 0.75) return "🌳";
  if (ratio >= 0.5) return "🌿";
  if (ratio >= 0.25) return "🌱";
  return "🎯";
}

interface FloatingMiniTimerProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const FloatingMiniTimer = ({ activeSection, onNavigate }: FloatingMiniTimerProps) => {
  const timer = useFocusTimer();
  const [expanded, setExpanded] = useState(false);

  // Only show when timer is running or flow extend prompt is active, and NOT on Focus Studio tab
  const shouldShow = (timer.isRunning || timer.showFlowExtend || timer.remainingSec < timer.totalSec && timer.remainingSec > 0) && activeSection !== "tracker";

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-20 sm:right-24 z-[999] select-none cursor-grab active:cursor-grabbing"
          title="Drag to move timer anywhere on screen"
        >
          <div
            className="bg-card/90 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl overflow-hidden"
            style={{ 
              boxShadow: "0 8px 40px rgba(0,0,0,0.2), 0 0 20px hsl(var(--primary) / 0.15)",
              minWidth: expanded ? "280px" : "240px",
              maxWidth: "320px",
            }}
          >
            {/* Main compact row */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer hover:bg-surface/50 transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {/* Drag Handle indicator */}
              <div className="text-muted-foreground/60 text-xs font-mono select-none px-0.5 cursor-grab active:cursor-grabbing" title="Drag me">
                ⋮⋮
              </div>

              {/* Growth stage + pulsing indicator */}
              <div className="relative flex-shrink-0">
                <span className="text-lg">{getGrowthStage(timer.progressRatio)}</span>
                {timer.isRunning && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pps-green rounded-full"
                  />
                )}
              </div>

              {/* Task name + timer */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate leading-tight">
                  {timer.activeTaskName}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {timer.TIMER_PRESETS[timer.timerMode].icon} {timer.TIMER_PRESETS[timer.timerMode].label}
                </div>
              </div>

              {/* Countdown */}
              <div className="text-lg font-extrabold font-mono text-foreground tracking-tight flex-shrink-0">
                {timer.formatTimerTime(timer.remainingSec)}
              </div>

              {/* Play/Pause button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  timer.toggleTimer();
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all cursor-pointer flex-shrink-0 ${
                  timer.isRunning
                    ? "bg-pps-yellow/20 text-pps-yellow border border-pps-yellow/30 hover:bg-pps-yellow/30"
                    : "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
                }`}
              >
                {timer.isRunning ? "⏸" : "▶"}
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-surface relative">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-r-full"
                style={{ width: `${Math.round(timer.progressRatio * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Expanded section */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-2.5 border-t border-border/40">
                    {/* Flow extension prompt */}
                    {timer.showFlowExtend && (
                      <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 text-center space-y-1.5">
                        <div className="text-[11px] font-bold text-foreground">🌊 Extend your flow?</div>
                        <div className="flex items-center gap-1 justify-center">
                          {[5, 10, 15].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => timer.handleFlowExtend(mins)}
                              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all cursor-pointer"
                            >
                              +{mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ambient sound quick toggles */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">🎧</span>
                      {([
                        { key: "rain" as const, label: "🌧️" },
                        { key: "waves" as const, label: "🌊" },
                        { key: "noise" as const, label: "📻" },
                        { key: "binaural" as const, label: "🧘" },
                      ]).map((snd) => (
                        <button
                          key={snd.key}
                          onClick={() => timer.handleSoundToggle(snd.key)}
                          className={`text-sm p-1.5 rounded-lg border transition-all cursor-pointer ${
                            timer.activeSound === snd.key
                              ? "bg-secondary/15 border-secondary/30 shadow-xs"
                              : "bg-surface border-border/50 hover:border-primary/30"
                          }`}
                        >
                          {snd.label}
                        </button>
                      ))}
                      {timer.activeSound && (
                        <span className="text-[9px] text-pps-green font-mono font-bold animate-pulse ml-0.5">●</span>
                      )}
                    </div>

                    {/* Navigation button */}
                    <button
                      onClick={() => onNavigate("tracker")}
                      className="w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-[11px] font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🎯</span>
                      <span>Go to Focus Studio →</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingMiniTimer;
