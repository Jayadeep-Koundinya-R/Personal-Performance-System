/*
  🎯 Global Focus Timer Context
  
  Lifts ALL timer state out of DailyTrackerSection into a global React context
  so the timer persists across tab/section navigation.
  
  Features:
  - Timer state: isRunning, remainingSec, totalSec, timerMode, activeTaskName
  - Linked habit auto-completion on timer end
  - Ambient sound management (persists across tabs)
  - Completion chime (Web Audio)
  - Flow extension prompt
  - Session history log (persisted in localStorage)
  - Smart focus suggestion state
  - Cleanup on unmount
*/

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useHabits } from "@/hooks/use-habits";
import { ambientSound } from "@/lib/ambient-sound";
import { toast } from "sonner";

type TimerMode = "pomodoro" | "shortBreak" | "longBreak" | "custom";

interface FocusSession {
  taskName: string;
  linkedHabitId: string | null;
  mode: TimerMode;
  durationMins: number;
  completedAt: string;
}

const TIMER_PRESETS: Record<TimerMode, { label: string; minutes: number; icon: string }> = {
  pomodoro: { label: "Pomodoro", minutes: 25, icon: "🎯" },
  shortBreak: { label: "Short Break", minutes: 5, icon: "☕" },
  longBreak: { label: "Long Break", minutes: 15, icon: "🌴" },
  custom: { label: "Custom", minutes: 30, icon: "⚙️" },
};

interface FocusTimerState {
  // Timer core
  timerMode: TimerMode;
  customMinutes: number;
  activeTaskName: string;
  linkedHabitId: string | null;
  totalSec: number;
  remainingSec: number;
  isRunning: boolean;
  isFullscreen: boolean;
  showFlowExtend: boolean;

  // Ambient
  activeSound: "rain" | "waves" | "noise" | "binaural" | null;
  soundVolume: number;

  // Analytics
  todayFocusMinutes: number;
  completedSessions: number;
  sessionHistory: FocusSession[];

  // Smart suggestion
  suggestionDismissed: boolean;
}

interface FocusTimerActions {
  setTimerMode: (mode: TimerMode) => void;
  setCustomMinutes: (mins: number) => void;
  setActiveTaskName: (name: string) => void;
  setLinkedHabitId: (id: string | null) => void;
  setIsFullscreen: (v: boolean) => void;

  changeTimerMode: (mode: TimerMode, customMins?: number) => void;
  startHabitFocus: (habit: any, mins?: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  handleFlowExtend: (extraMinutes: number) => void;
  dismissFlowExtend: () => void;

  handleSoundToggle: (soundType: "rain" | "waves" | "noise" | "binaural") => void;
  handleVolumeChange: (vol: number) => void;

  dismissSuggestion: () => void;

  // Derived
  progressRatio: number;
  strokeDashoffset: number;
  formatTimerTime: (sec: number) => string;
  TIMER_PRESETS: typeof TIMER_PRESETS;
}

type FocusTimerContextValue = FocusTimerState & FocusTimerActions;

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) {
    throw new Error("useFocusTimer must be used within a FocusTimerProvider");
  }
  return ctx;
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { habits, toggleCompletion, getTodayStr } = useHabits();
  const todayStr = getTodayStr();

  // ── Timer Core State ──
  const [timerMode, setTimerMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState<number>(25);
  const [activeTaskName, setActiveTaskName] = useState<string>("Deep Work Session");
  const [linkedHabitId, setLinkedHabitId] = useState<string | null>(null);

  const [totalSec, setTotalSec] = useState<number>(25 * 60);
  const [remainingSec, setRemainingSec] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFlowExtend, setShowFlowExtend] = useState(false);

  // ── Ambient Sound State ──
  const [activeSound, setActiveSound] = useState<"rain" | "waves" | "noise" | "binaural" | null>(null);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);

  // ── Analytics State ──
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(() => {
    try { return Number(localStorage.getItem(`pps_focus_minutes_${todayStr}`) || "0"); } catch { return 0; }
  });
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    try { return Number(localStorage.getItem(`pps_focus_sessions_${todayStr}`) || "0"); } catch { return 0; }
  });
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>(() => {
    try { return JSON.parse(localStorage.getItem(`pps_focus_history_${todayStr}`) || "[]"); } catch { return []; }
  });

  // ── Smart Suggestion ──
  const [suggestionDismissed, setSuggestionDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(`pps_focus_suggestion_dismissed_${todayStr}`) === "true"; } catch { return false; }
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stable refs for values used in timer tick to avoid stale closures
  const stateRef = useRef({
    totalSec, todayFocusMinutes, completedSessions, linkedHabitId,
    activeTaskName, timerMode, sessionHistory, todayStr,
  });
  useEffect(() => {
    stateRef.current = {
      totalSec, todayFocusMinutes, completedSessions, linkedHabitId,
      activeTaskName, timerMode, sessionHistory, todayStr,
    };
  }, [totalSec, todayFocusMinutes, completedSessions, linkedHabitId, activeTaskName, timerMode, sessionHistory, todayStr]);

  const habitsRef = useRef(habits);
  useEffect(() => { habitsRef.current = habits; }, [habits]);

  const toggleCompletionRef = useRef(toggleCompletion);
  useEffect(() => { toggleCompletionRef.current = toggleCompletion; }, [toggleCompletion]);

  // ── Timer Tick Effect ──
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsRunning(false);

            // Play completion chime
            ambientSound.playChime();

            const s = stateRef.current;
            const elapsedMins = Math.max(1, Math.round(s.totalSec / 60));
            const newMinutes = s.todayFocusMinutes + elapsedMins;
            const newSessions = s.completedSessions + 1;

            setTodayFocusMinutes(newMinutes);
            setCompletedSessions(newSessions);

            try {
              localStorage.setItem(`pps_focus_minutes_${s.todayStr}`, String(newMinutes));
              localStorage.setItem(`pps_focus_sessions_${s.todayStr}`, String(newSessions));
            } catch {}

            // Save session history
            const session: FocusSession = {
              taskName: s.activeTaskName,
              linkedHabitId: s.linkedHabitId,
              mode: s.timerMode,
              durationMins: elapsedMins,
              completedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            const newHistory = [...s.sessionHistory, session];
            setSessionHistory(newHistory);
            try {
              localStorage.setItem(`pps_focus_history_${s.todayStr}`, JSON.stringify(newHistory));
            } catch {}

            // Auto-complete linked habit
            if (s.linkedHabitId) {
              const targetHabit = habitsRef.current.find((h) => h.id === s.linkedHabitId);
              if (targetHabit && !targetHabit.completedDates.includes(s.todayStr)) {
                toggleCompletionRef.current(s.linkedHabitId);
                toast.success(`🎉 Focus complete! "${targetHabit.name}" marked done! (+10 XP + ${elapsedMins * 2} Focus XP)`, {
                  duration: 6000,
                  action: {
                    label: "☕ 5m Break",
                    onClick: () => {
                      setTimerMode("shortBreak");
                      setTotalSec(5 * 60);
                      setRemainingSec(5 * 60);
                      setIsRunning(true);
                      setShowFlowExtend(false);
                    },
                  },
                });
              } else {
                toast.success(`🎉 Focus session complete! +${elapsedMins * 2} Focus XP earned!`, {
                  duration: 6000,
                  action: {
                    label: "☕ 5m Break",
                    onClick: () => {
                      setTimerMode("shortBreak");
                      setTotalSec(5 * 60);
                      setRemainingSec(5 * 60);
                      setIsRunning(true);
                      setShowFlowExtend(false);
                    },
                  },
                });
              }
            } else {
              toast.success(`🎉 Focus session complete! +${elapsedMins * 2} Focus XP earned!`, {
                duration: 6000,
                action: {
                  label: "☕ 5m Break",
                  onClick: () => {
                    setTimerMode("shortBreak");
                    setTotalSec(5 * 60);
                    setRemainingSec(5 * 60);
                    setIsRunning(true);
                    setShowFlowExtend(false);
                  },
                },
              });
            }

            setShowFlowExtend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  // ── Browser Document Title Sync ──
  useEffect(() => {
    if (isRunning) {
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      const timeStr = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      document.title = `(${timeStr}) 🎯 ${activeTaskName} - PPS`;
    } else {
      document.title = "Personal Performance System";
    }
    return () => {
      document.title = "Personal Performance System";
    };
  }, [isRunning, remainingSec, activeTaskName]);

  // ── Global Focus Keyboard Hotkeys ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsRunning((prev) => {
          if (!prev) setShowFlowExtend(false);
          return !prev;
        });
      } else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsRunning(false);
        setShowFlowExtend(false);
        const mins = timerMode === "custom" ? customMinutes : TIMER_PRESETS[timerMode].minutes;
        const sec = mins * 60;
        setTotalSec(sec);
        setRemainingSec(sec);
        toast.info("🔄 Timer Reset [R]");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timerMode, customMinutes]);

  // Cleanup ambient on provider unmount
  useEffect(() => {
    return () => { ambientSound.stop(); };
  }, []);

  // ── Actions ──
  const changeTimerMode = useCallback((mode: TimerMode, customMins?: number) => {
    if (isRunning) {
      const ok = window.confirm("Timer is currently running. Switching modes will reset the timer. Continue?");
      if (!ok) return;
    }
    setTimerMode(mode);
    setIsRunning(false);
    setShowFlowExtend(false);
    const mins = mode === "custom" ? (customMins || customMinutes) : TIMER_PRESETS[mode].minutes;
    const sec = mins * 60;
    setTotalSec(sec);
    setRemainingSec(sec);
  }, [isRunning, customMinutes]);

  const startHabitFocus = useCallback((habit: any, mins?: number) => {
    setLinkedHabitId(habit.id);
    setActiveTaskName(habit.name);
    const duration = mins || 25;
    setTimerMode(mins === 5 ? "shortBreak" : mins === 15 ? "longBreak" : duration === 25 ? "pomodoro" : "custom");
    if (mins && ![5, 15, 25].includes(mins)) {
      setCustomMinutes(duration);
    }
    const sec = duration * 60;
    setTotalSec(sec);
    setRemainingSec(sec);
    setIsRunning(true);
    setShowFlowExtend(false);
    toast.info(`🎯 Loaded "${habit.name}" into Focus Studio! ${duration}m timer started.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const startTimer = useCallback(() => {
    setIsRunning(true);
    setShowFlowExtend(false);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => {
      if (!prev) setShowFlowExtend(false);
      return !prev;
    });
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setShowFlowExtend(false);
    const mins = timerMode === "custom" ? customMinutes : TIMER_PRESETS[timerMode].minutes;
    const sec = mins * 60;
    setTotalSec(sec);
    setRemainingSec(sec);
  }, [timerMode, customMinutes]);

  const handleFlowExtend = useCallback((extraMinutes: number) => {
    const sec = extraMinutes * 60;
    setTotalSec(sec);
    setRemainingSec(sec);
    setIsRunning(true);
    setShowFlowExtend(false);
    toast.info(`🌊 Extended focus by ${extraMinutes} more minutes!`);
  }, []);

  const dismissFlowExtend = useCallback(() => {
    setShowFlowExtend(false);
  }, []);

  const handleSoundToggle = useCallback((soundType: "rain" | "waves" | "noise" | "binaural") => {
    if (activeSound === soundType) {
      ambientSound.stop();
      setActiveSound(null);
    } else {
      ambientSound.start(soundType, soundVolume);
      setActiveSound(soundType);
    }
  }, [activeSound, soundVolume]);

  const handleVolumeChange = useCallback((vol: number) => {
    setSoundVolume(vol);
    ambientSound.setVolume(vol);
  }, []);

  const dismissSuggestion = useCallback(() => {
    setSuggestionDismissed(true);
    try { localStorage.setItem(`pps_focus_suggestion_dismissed_${todayStr}`, "true"); } catch {}
  }, [todayStr]);

  const formatTimerTime = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  // Derived
  const progressRatio = totalSec > 0 ? (totalSec - remainingSec) / totalSec : 0;
  const strokeDashoffset = 565 - 565 * progressRatio;

  const value: FocusTimerContextValue = {
    // State
    timerMode, customMinutes, activeTaskName, linkedHabitId,
    totalSec, remainingSec, isRunning, isFullscreen, showFlowExtend,
    activeSound, soundVolume,
    todayFocusMinutes, completedSessions, sessionHistory,
    suggestionDismissed,

    // Actions
    setTimerMode, setCustomMinutes, setActiveTaskName, setLinkedHabitId, setIsFullscreen,
    changeTimerMode, startHabitFocus, startTimer, pauseTimer, toggleTimer, resetTimer,
    handleFlowExtend, dismissFlowExtend,
    handleSoundToggle, handleVolumeChange,
    dismissSuggestion,

    // Derived
    progressRatio, strokeDashoffset, formatTimerTime,
    TIMER_PRESETS,
  };

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
}
