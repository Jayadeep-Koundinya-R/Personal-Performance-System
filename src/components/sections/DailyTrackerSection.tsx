/*
  🎯 Focus Studio & Execution Engine (formerly Daily Tracker)
  
  Now consumes the global FocusTimerContext for all timer state,
  so the timer persists across tab navigation.
  
  Features:
  - Immersive Hero Pomodoro Room with Animated Radial Progress Ring
  - Custom Task Naming & 1-Click Habit Linking
  - Web Audio Synthetic Ambient Soundscapes (Rain, Ocean, Noise, Binaural)
  - Full-Screen Zen Focus Overlay with particle ambiance
  - Deep Work Analytics & Focus Time Tracking
  - High-Density Habit Execution Grid with 1-Tap "⚡ Focus" Launcher
  - Session Completion Audio Chime
  - Gamified Growth Indicator (🌱 → 🌿 → 🌳 → 🔥)
  - Flow Extension Prompt ("Extend 5 more minutes?")
  - Quick Preset Pills (15m/25m/45m) on each habit card
  - Focus Session History Log
  - Smart Focus Suggestion Notification
*/

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";

/* Floating XP component */
const FloatingXP = ({ habitId }: { habitId: string }) => (
  <motion.span
    key={`xp-${habitId}-${Date.now()}`}
    initial={{ opacity: 1, y: 0 }}
    animate={{ opacity: 0, y: -30 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="absolute -top-2 right-0 text-[12px] font-bold text-pps-green pointer-events-none z-10"
  >
    +10 XP ✨
  </motion.span>
);

function getUrgencyLevel(habit: any): "normal" | "urgent" | "overdue" {
  if (!habit.endTime || habit.completedDates.includes(new Date().toISOString().split("T")[0])) {
    return "normal";
  }
  const [endH, endM] = habit.endTime.split(":").map(Number);
  const now = new Date();
  const end = new Date();
  end.setHours(endH, endM, 0, 0);

  const diffMs = end.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 60 * 60 * 1000) return "urgent";
  return "normal";
}

function getGrowthStage(ratio: number): string {
  if (ratio >= 1) return "🔥";
  if (ratio >= 0.75) return "🌳";
  if (ratio >= 0.5) return "🌿";
  if (ratio >= 0.25) return "🌱";
  return "🎯";
}

interface DailyTrackerProps {
  onNavigate?: (section: string) => void;
}

const DailyTrackerSection = ({ onNavigate }: DailyTrackerProps) => {
  const { habits, toggleCompletion, isHabitDueToday, getTodayStr } = useHabits();
  const timer = useFocusTimer();
  const todayStr = getTodayStr();
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  // Category filter state
  const [selectedCat, setSelectedCat] = useState<string>("All");

  // Habit completion notes state
  const [habitNotes, setHabitNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`pps_habit_notes_${todayStr}`) || "{}");
    } catch {
      return {};
    }
  });

  const [activeNoteHabitId, setActiveNoteHabitId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const todayHabits = habits.filter((h) => !h.archived && isHabitDueToday(h));
  const doneCount = todayHabits.filter((h) => h.completedDates.includes(todayStr)).length;
  const pct = todayHabits.length > 0 ? Math.round((doneCount / todayHabits.length) * 100) : 0;

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Extract unique categories
  const categories = ["All", ...Array.from(new Set(todayHabits.map((h) => h.category || "General")))];

  // Filter & group habits
  const filteredHabits = selectedCat === "All"
    ? todayHabits
    : todayHabits.filter((h) => (h.category || "General") === selectedCat);

  const grouped: Record<string, typeof todayHabits> = {};
  filteredHabits.forEach((h) => {
    const cat = h.category || "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(h);
  });

  const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1, Optional: 0 };
  Object.keys(grouped).forEach((cat) => {
    grouped[cat].sort((a, b) => {
      const aDone = a.completedDates.includes(todayStr);
      const bDone = b.completedDates.includes(todayStr);
      if (aDone !== bDone) return aDone ? 1 : -1;
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return a.name.localeCompare(b.name);
    });
  });

  const priClass: Record<string, string> = {
    High: "bg-destructive/15 text-destructive",
    Medium: "bg-pps-yellow/15 text-pps-yellow",
    Low: "bg-pps-green/15 text-pps-green",
    Optional: "bg-primary/15 text-primary/70",
  };

  const handleToggle = (habitId: string, wasDone: boolean) => {
    toggleCompletion(habitId);
    if (!wasDone) {
      setJustCompleted((prev) => new Set(prev).add(habitId));
      setTimeout(() => {
        setJustCompleted((prev) => {
          const next = new Set(prev);
          next.delete(habitId);
          return next;
        });
      }, 900);
    }
  };

  // Smart focus suggestion
  const nextUncompleted = todayHabits.find((h) => !h.completedDates.includes(todayStr));
  const showSmartSuggestion = !timer.suggestionDismissed && timer.completedSessions === 0 && nextUncompleted && !timer.isRunning;

  const saveHabitNote = (habitId: string) => {
    if (!noteInput.trim()) return;
    const next = { ...habitNotes, [habitId]: noteInput.trim() };
    setHabitNotes(next);
    try {
      localStorage.setItem(`pps_habit_notes_${todayStr}`, JSON.stringify(next));
    } catch {}
    setActiveNoteHabitId(null);
    setNoteInput("");
    toast.success("Saved log note!");
  };

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5 tracking-tight text-foreground">
            <span>🎯 Focus Studio</span>
            {timer.isRunning && (
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[11px] font-mono bg-pps-green/15 text-pps-green border border-pps-green/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
              >
                ● Active Session
              </motion.span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immersive Pomodoro room, ambient soundscapes, and habit execution
          </p>
        </div>
        <div className="font-mono text-muted-foreground text-xs bg-surface border border-border px-3 py-1.5 rounded-xl font-semibold">
          {dateStr}
        </div>
      </div>

      {/* ── SMART FOCUS SUGGESTION BANNER ── */}
      <AnimatePresence>
        {showSmartSuggestion && nextUncompleted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 border border-primary/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-xl animate-pulse">
                💡
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Ready to start your first focus session?</div>
                <div className="text-[11px] text-muted-foreground">
                  Suggestion: Start a 25m Pomodoro for <span className="font-semibold text-primary">"{nextUncompleted.name}"</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => timer.startHabitFocus(nextUncompleted, 25)}
                className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
              >
                ▶ Start 25m Focus
              </button>
              <button
                onClick={() => timer.dismissSuggestion()}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. HERO POMODORO ROOM CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-primary/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5"
      >
        {/* Glow ambient background element */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          {/* Left: Task Setup & Preset Controls */}
          <div className="w-full lg:w-1/2 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-mono tracking-widest font-bold text-primary flex items-center gap-1.5">
                <span>{timer.TIMER_PRESETS[timer.timerMode].icon}</span>
                <span>{timer.TIMER_PRESETS[timer.timerMode].label} Mode</span>
              </span>
              <button
                onClick={() => timer.setIsFullscreen(true)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-surface border border-border/80 px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:border-primary/40"
              >
                <span>🖥️</span>
                <span>Zen Fullscreen</span>
              </button>
            </div>

            {/* Task Title Input & Habit Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Task Focus Target</span>
                {timer.linkedHabitId && (
                  <span className="text-[10px] text-pps-green font-mono font-semibold">✓ Linked to Habit</span>
                )}
              </label>
              <input
                type="text"
                value={timer.activeTaskName}
                onChange={(e) => {
                  timer.setActiveTaskName(e.target.value);
                  timer.setLinkedHabitId(null);
                }}
                placeholder="What are you focusing on?"
                className="w-full bg-surface border border-border/80 focus:border-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold outline-none transition-all shadow-xs"
              />

              {/* Link Habit Dropdown */}
              {todayHabits.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-muted-foreground font-mono">Or link:</span>
                  <select
                    value={timer.linkedHabitId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) {
                        timer.setLinkedHabitId(null);
                        timer.setActiveTaskName("Deep Work Session");
                      } else {
                        const h = todayHabits.find((item) => item.id === id);
                        if (h) {
                          timer.setLinkedHabitId(h.id);
                          timer.setActiveTaskName(h.name);
                        }
                      }
                    }}
                    className="flex-1 bg-surface border border-border/80 text-xs rounded-xl px-2.5 py-1.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="">-- Select Today's Habit --</option>
                    {todayHabits.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.completedDates.includes(todayStr) ? "✓ " : ""}{h.name} ({h.priority})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Presets Mode Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {(["pomodoro", "shortBreak", "longBreak", "custom"] as const).map((mode) => {
                const preset = timer.TIMER_PRESETS[mode];
                const isCurrent = timer.timerMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => timer.changeTimerMode(mode)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 border ${
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-surface border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-sm">{preset.icon}</span>
                    <span className="truncate">{preset.label}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      {mode === "custom" ? `${timer.customMinutes}m` : `${preset.minutes}m`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Minutes Slider */}
            {timer.timerMode === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-surface border border-border/60 p-3 rounded-xl space-y-1.5"
              >
                <div className="flex justify-between text-xs font-mono">
                  <span>Custom Duration:</span>
                  <span className="font-bold text-primary">{timer.customMinutes} Minutes</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={120}
                  value={timer.customMinutes}
                  onChange={(e) => {
                    const mins = Number(e.target.value);
                    timer.setCustomMinutes(mins);
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
              </motion.div>
            )}

            {/* Ambient Soundscapes Controls */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground font-semibold flex items-center gap-1">
                  🎧 Ambient Soundscape
                </span>
                {timer.activeSound && (
                  <span className="text-[10px] text-pps-green font-mono font-bold animate-pulse">● Playing</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: "rain" as const, label: "Rain 🌧️" },
                  { key: "waves" as const, label: "Waves 🌊" },
                  { key: "noise" as const, label: "White Noise 📻" },
                  { key: "binaural" as const, label: "Alpha 432Hz 🧘" },
                ]).map((snd) => {
                  const isActive = timer.activeSound === snd.key;
                  return (
                    <button
                      key={snd.key}
                      onClick={() => timer.handleSoundToggle(snd.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-secondary text-secondary-foreground border-secondary font-bold shadow-xs"
                          : "bg-surface border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {snd.label}
                    </button>
                  );
                })}
              </div>

              {timer.activeSound && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Vol:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={timer.soundVolume}
                    onChange={(e) => timer.handleVolumeChange(Number(e.target.value))}
                    className="w-32 accent-secondary cursor-pointer h-1.5"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{Math.round(timer.soundVolume * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Radial Pomodoro Ring & Controls */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100" cy="100" r="90"
                  className="stroke-surface"
                  strokeWidth="12"
                  fill="transparent"
                />
                <motion.circle
                  cx="100" cy="100" r="90"
                  className="stroke-primary"
                  strokeWidth="12"
                  strokeDasharray="565"
                  strokeDashoffset={timer.strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>

              {/* Inner Countdown */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <span className="text-lg mb-0.5">{getGrowthStage(timer.progressRatio)}</span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-semibold">
                  {timer.isRunning ? "Focusing..." : timer.showFlowExtend ? "Done!" : "Ready"}
                </span>
                <span className="text-4xl font-extrabold font-mono text-foreground tracking-tighter my-0.5">
                  {timer.formatTimerTime(timer.remainingSec)}
                </span>
                <span className="text-[11px] font-semibold text-primary truncate max-w-[140px]">
                  {timer.activeTaskName}
                </span>
              </div>
            </div>

            {/* Flow Extension Prompt */}
            <AnimatePresence>
              {timer.showFlowExtend && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface border border-primary/20 rounded-2xl p-3 text-center space-y-2 shadow-sm w-full max-w-[240px]"
                >
                  <div className="text-xs font-bold text-foreground">🌊 Extend your flow?</div>
                  <div className="flex items-center gap-1.5 justify-center">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => timer.handleFlowExtend(mins)}
                        className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => timer.dismissFlowExtend()}
                    className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    No thanks, I'm done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Action Buttons */}
            {!timer.showFlowExtend && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => timer.toggleTimer()}
                    className={`px-7 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                      timer.isRunning
                        ? "bg-pps-yellow text-slate-950 hover:bg-pps-yellow/90"
                        : "bg-gradient-to-br from-primary to-accent text-primary-foreground hover:shadow-primary/25 hover:scale-[1.02]"
                    }`}
                  >
                    <span>{timer.isRunning ? "⏸ Pause Focus" : "▶ Start Focus"}</span>
                  </button>

                  <button
                    onClick={() => timer.resetTimer()}
                    className="p-3 bg-surface border border-border/80 text-muted-foreground hover:text-foreground rounded-2xl hover:bg-muted transition-all cursor-pointer"
                    title="Reset Timer [R]"
                  >
                    🔄
                  </button>
                </div>

                {/* Keyboard shortcut hints */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80 pt-0.5">
                  <span className="bg-surface border border-border px-1.5 py-0.5 rounded text-[9px] font-semibold">[Space]</span>
                  <span>Play/Pause</span>
                  <span>•</span>
                  <span className="bg-surface border border-border px-1.5 py-0.5 rounded text-[9px] font-semibold">[F]</span>
                  <span>Zen</span>
                  <span>•</span>
                  <span className="bg-surface border border-border px-1.5 py-0.5 rounded text-[9px] font-semibold">[R]</span>
                  <span>Reset</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 2. DEEP WORK & EXECUTION ANALYTICS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Today's Focus Time */}
        <div
          className="group relative bg-card border border-border p-4 rounded-2xl flex items-center gap-3.5 shadow-xs hover:border-primary/40 transition-all cursor-help"
          title="Cumulative deep work minutes logged across all focus sessions today."
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0">
            🎯
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <span>Today's Focus Time</span>
              <span className="text-[9px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">ℹ️</span>
            </div>
            <div className="text-lg font-extrabold font-mono text-foreground">
              {timer.todayFocusMinutes >= 60
                ? `${Math.floor(timer.todayFocusMinutes / 60)}h ${timer.todayFocusMinutes % 60}m`
                : `${timer.todayFocusMinutes} Mins`}
            </div>
          </div>

          {/* Hover Tooltip Popover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 font-sans">
            <div className="font-bold text-primary mb-0.5">⏱️ Focus Duration</div>
            Tracks total active focus time logged today across Pomodoro and custom sessions.
          </div>
        </div>

        {/* Card 2: Sessions Completed & Target */}
        <div
          className="group relative bg-card border border-border p-4 rounded-2xl flex items-center gap-3.5 shadow-xs hover:border-pps-orange/40 transition-all cursor-help"
          title="4 sessions (100 mins total) is the scientifically recommended daily deep work target."
        >
          <div className="w-10 h-10 rounded-xl bg-pps-orange/10 border border-pps-orange/20 flex items-center justify-center text-xl flex-shrink-0">
            🍅
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <span>Daily Sessions</span>
              <span className="text-[9px] text-pps-orange/70 opacity-0 group-hover:opacity-100 transition-opacity">ℹ️</span>
            </div>
            <div className="text-lg font-extrabold font-mono text-foreground">
              {timer.completedSessions} <span className="text-xs font-normal text-muted-foreground">/ 4 Goal</span>
            </div>
          </div>

          {/* Hover Tooltip Popover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 font-sans">
            <div className="font-bold text-pps-orange mb-0.5">🎯 Daily Target (4 Sessions)</div>
            Productivity science recommends 4 × 25m Pomodoro sessions (100 mins) daily for optimal deep work.
          </div>
        </div>

        {/* Card 3: Focus Status / Efficiency */}
        <div
          className="group relative bg-card border border-border p-4 rounded-2xl flex items-center gap-3.5 shadow-xs hover:border-pps-green/40 transition-all cursor-help"
          title="Current daily focus tier based on total focus minutes logged today."
        >
          <div className="w-10 h-10 rounded-xl bg-pps-green/10 border border-pps-green/20 flex items-center justify-center text-xl flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <span>Focus Efficiency</span>
              <span className="text-[9px] text-pps-green/70 opacity-0 group-hover:opacity-100 transition-opacity">ℹ️</span>
            </div>
            <div className="text-lg font-extrabold font-mono text-foreground">
              {timer.todayFocusMinutes >= 120
                ? "🏆 Legend"
                : timer.todayFocusMinutes >= 60
                ? "🔥 Master"
                : timer.todayFocusMinutes > 0
                ? "⚡ Active"
                : "🎯 Standby"}
            </div>
          </div>

          {/* Hover Tooltip Popover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 font-sans">
            <div className="font-bold text-pps-green mb-0.5">⚡ Focus Tiers</div>
            • <b>Standby</b>: 0m<br/>
            • <b>Active</b>: 1m–59m<br/>
            • <b>Master</b>: 60m–119m<br/>
            • <b>Legend</b>: 120m+
          </div>
        </div>
      </div>

      {/* ── SESSION HISTORY LOG ── */}
      {timer.sessionHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border p-4 rounded-2xl shadow-xs"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <span>📋 Today's Focus Sessions</span>
            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.2 rounded-full">{timer.sessionHistory.length}</span>
          </h3>
          <div className="space-y-1.5">
            {timer.sessionHistory.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-surface/60 border border-border/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{timer.TIMER_PRESETS[s.mode]?.icon || "🎯"}</span>
                  <span className="font-semibold text-foreground truncate">{s.taskName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-muted-foreground">{s.durationMins}m</span>
                  <span className="font-mono text-muted-foreground/70">{s.completedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 3. HIGH-DENSITY HABIT EXECUTION GRID ── */}
      {todayHabits.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                📋 Today's Habit Execution
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check off habits or click ⚡ Focus to launch them into the Pomodoro room
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => {
                const catHabits = cat === "All" ? todayHabits : todayHabits.filter((h) => (h.category || "General") === cat);
                const catDone = catHabits.filter((h) => h.completedDates.includes(todayStr)).length;
                const isSelected = selectedCat === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCat(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {catDone}/{catHabits.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {Object.entries(grouped).map(([cat, catHabits]) => {
            const catDone = catHabits.filter((h) => h.completedDates.includes(todayStr)).length;
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{catDone}/{catHabits.length} completed</span>
                </div>

                <AnimatePresence>
                  {catHabits.map((habit, i) => {
                    const done = habit.completedDates.includes(todayStr);
                    const note = habitNotes[habit.id];

                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`relative flex flex-col gap-2 p-3.5 bg-surface/60 border rounded-xl text-[13.5px] transition-all duration-150 ${
                          done
                            ? "border-border/60 opacity-80"
                            : getUrgencyLevel(habit) === "overdue"
                            ? "border-destructive/40 shadow-xs shadow-destructive/5"
                            : getUrgencyLevel(habit) === "urgent"
                            ? "border-pps-orange/40 shadow-xs shadow-pps-orange/5"
                            : "border-border/60 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => handleToggle(habit.id, done)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 ${
                                done ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
                              }`}
                            >
                              <AnimatePresence>
                                {done && (
                                  <motion.svg
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                                  >
                                    <motion.path
                                      d="M2.5 6L5 8.5L9.5 3.5"
                                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                      initial={{ pathLength: 0 }}
                                      animate={{ pathLength: 1 }}
                                      transition={{ duration: 0.25, delay: 0.1 }}
                                    />
                                  </motion.svg>
                                )}
                              </AnimatePresence>
                            </button>
                            <span className={`font-semibold truncate ${done ? "line-through opacity-50" : "text-foreground"}`}>
                              {habit.name}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            {/* Quick Preset Timer Pills */}
                            {!done && (
                              <div className="hidden sm:flex items-center gap-0.5 bg-surface border border-border/80 rounded-lg p-0.5">
                                {[15, 25, 45].map((mins) => (
                                  <button
                                    key={mins}
                                    onClick={() => timer.startHabitFocus(habit, mins)}
                                    className="text-[10px] font-mono text-primary font-semibold hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    title={`Start ${mins}m focus for this habit`}
                                  >
                                    {mins}m
                                  </button>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={() => timer.startHabitFocus(habit)}
                              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-[11px] font-bold py-1 px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                              title="Launch into Focus Room"
                            >
                              <span>⚡</span>
                              <span>Focus</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveNoteHabitId(activeNoteHabitId === habit.id ? null : habit.id);
                                setNoteInput(note || "");
                              }}
                              className={`text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                note
                                  ? "bg-secondary/10 border-secondary/30 text-secondary font-semibold"
                                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
                              }`}
                              title="Add log note"
                            >
                              📝
                              <span className="hidden sm:inline">{note ? "Note" : "+ Note"}</span>
                            </button>

                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold font-mono ${priClass[habit.priority] || priClass.Optional}`}>
                              {habit.priority}
                            </span>

                            <motion.span
                              animate={done ? { scale: [1, 1.15, 1] } : {}}
                              transition={{ duration: 0.3 }}
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold font-mono ${
                                done ? "bg-pps-green/10 text-pps-green" : "bg-pps-orange/10 text-pps-orange"
                              }`}
                            >
                              {done ? "🔥 +10 XP ✓" : "+10 XP"}
                            </motion.span>

                            <AnimatePresence>
                              {justCompleted.has(habit.id) && <FloatingXP habitId={habit.id} />}
                            </AnimatePresence>
                          </div>
                        </div>

                        {note && activeNoteHabitId !== habit.id && (
                          <div className="text-[11.5px] text-muted-foreground italic bg-surface/80 border border-border/40 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                            💬 "{note}"
                          </div>
                        )}

                        <AnimatePresence>
                          {activeNoteHabitId === habit.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-1 flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder="Log details (e.g. 'Ran 5km in 24m')..."
                                className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary font-medium"
                                onKeyDown={(e) => e.key === "Enter" && saveHabitNote(habit.id)}
                              />
                              <button
                                onClick={() => saveHabitNote(habit.id)}
                                className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-all cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setActiveNoteHabitId(null)}
                                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 cursor-pointer"
                              >
                                ✕
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl">
          <EmptyState
            icon="📋"
            title="No habits due today"
            description="Add habits in the Habit Manager and they'll appear here automatically."
            actionLabel="+ Add Your First Habit"
            onAction={() => onNavigate?.("habits")}
          />
        </motion.div>
      )}

      {/* ── 4. FULLSCREEN ZEN FOCUS OVERLAY ── */}
      <AnimatePresence>
        {timer.isFullscreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-slate-950 to-slate-950 pointer-events-none" />

            <button
              onClick={() => timer.setIsFullscreen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all hover:border-primary/40"
            >
              Exit ✕
            </button>

            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 max-w-lg">
              <span className="text-xs font-mono tracking-widest text-primary uppercase font-bold bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                🧘 Zen Focus Room
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{timer.activeTaskName}</h2>

              <div className="relative w-72 h-72 flex items-center justify-center my-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                  <motion.circle
                    cx="100" cy="100" r="90"
                    className="stroke-primary"
                    strokeWidth="8"
                    strokeDasharray="565"
                    strokeDashoffset={timer.strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-1">{getGrowthStage(timer.progressRatio)}</span>
                  <span className="text-5xl font-extrabold font-mono text-white tracking-tighter">
                    {timer.formatTimerTime(timer.remainingSec)}
                  </span>
                  <span className="text-xs text-slate-400 mt-2 font-mono">{timer.TIMER_PRESETS[timer.timerMode].label}</span>
                </div>
              </div>

              {/* Ambient sounds in fullscreen */}
              <div className="flex items-center gap-2">
                {([
                  { key: "rain" as const, label: "🌧️" },
                  { key: "waves" as const, label: "🌊" },
                  { key: "noise" as const, label: "📻" },
                  { key: "binaural" as const, label: "🧘" },
                ]).map((snd) => (
                  <button
                    key={snd.key}
                    onClick={() => timer.handleSoundToggle(snd.key)}
                    className={`text-lg p-2 rounded-xl border transition-all cursor-pointer ${
                      timer.activeSound === snd.key
                        ? "bg-primary/20 border-primary/40 shadow-sm"
                        : "bg-slate-900 border-slate-800 hover:border-primary/30"
                    }`}
                  >
                    {snd.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => timer.toggleTimer()}
                  className={`px-8 py-3.5 rounded-2xl text-base font-bold shadow-2xl transition-all cursor-pointer ${
                    timer.isRunning
                      ? "bg-pps-yellow text-slate-950 hover:bg-pps-yellow/90"
                      : "bg-primary text-primary-foreground hover:scale-105"
                  }`}
                >
                  {timer.isRunning ? "⏸ Pause" : "▶ Start Focus"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyTrackerSection;
