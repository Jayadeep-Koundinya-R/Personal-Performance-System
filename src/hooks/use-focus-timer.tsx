/*
  🎯 Global Focus Timer Context with Cross-Device Cloud Persistence
  
  Features:
  - Timestamp-based calculation: Eliminates setInterval drift across devices, lid closures, and tab throttling.
  - Cross-device sync: Active session state (startedAt, targetEndAt, totalSec, taskName, isRunning)
    is stored in Supabase with real-time subscription across phone/laptop.
  - Linked habit auto-completion on timer end
  - Ambient sound management
  - Completion chime (Web Audio)
  - Flow extension prompt
  - Session history log & daily analytics
*/

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHabits } from "@/hooks/use-habits";
import { ambientSound } from "@/lib/ambient-sound";
import { toast } from "sonner";

export type TimerMode = "pomodoro" | "shortBreak" | "longBreak" | "custom";

export interface FocusSession {
  taskName: string;
  linkedHabitId: string | null;
  mode: TimerMode;
  durationMins: number;
  completedAt: string;
}

export interface ActiveFocusSessionPayload {
  isRunning: boolean;
  startedAt: string | null;
  targetEndAt: string | null;
  totalSec: number;
  pausedRemainingSec: number | null;
  timerMode: TimerMode;
  activeTaskName: string;
  linkedHabitId: string | null;
  customMinutes: number;
  lastUpdated: string;
}

export const TIMER_PRESETS: Record<TimerMode, { label: string; minutes: number; icon: string }> = {
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

const LOCAL_SESSION_KEY = (email: string | null) => `pps_active_focus_session_${email || "guest"}`;

export function FocusTimerProvider({
  children,
  userId,
  isGuest,
  userEmail,
}: {
  children: ReactNode;
  userId?: string;
  isGuest?: boolean;
  userEmail?: string | null;
}) {
  const { habits, toggleCompletion, getTodayStr } = useHabits();
  const todayStr = getTodayStr();
  const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");

  // ── Timer Core State ──
  const [timerMode, setTimerMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState<number>(25);
  const [activeTaskName, setActiveTaskName] = useState<string>("Deep Work Session");
  const [linkedHabitId, setLinkedHabitId] = useState<string | null>(null);

  const [totalSec, setTotalSec] = useState<number>(25 * 60);
  const [remainingSec, setRemainingSec] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [targetEndAt, setTargetEndAt] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFlowExtend, setShowFlowExtend] = useState(false);

  // ── Ambient Sound State ──
  const [activeSound, setActiveSound] = useState<"rain" | "waves" | "noise" | "binaural" | null>(null);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);

  // ── Analytics State ──
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(`pps_focus_minutes_${todayStr}`) || "0");
    } catch {
      return 0;
    }
  });
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(`pps_focus_sessions_${todayStr}`) || "0");
    } catch {
      return 0;
    }
  });
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`pps_focus_history_${todayStr}`) || "[]");
    } catch {
      return [];
    }
  });

  // ── Smart Suggestion ──
  const [suggestionDismissed, setSuggestionDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`pps_focus_suggestion_dismissed_${todayStr}`) === "true";
    } catch {
      return false;
    }
  });

  const habitsRef = useRef(habits);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const toggleCompletionRef = useRef(toggleCompletion);
  useEffect(() => {
    toggleCompletionRef.current = toggleCompletion;
  }, [toggleCompletion]);

  // Stable refs for timer state
  const stateRef = useRef({
    totalSec,
    todayFocusMinutes,
    completedSessions,
    linkedHabitId,
    activeTaskName,
    timerMode,
    sessionHistory,
    todayStr,
    customMinutes,
  });
  useEffect(() => {
    stateRef.current = {
      totalSec,
      todayFocusMinutes,
      completedSessions,
      linkedHabitId,
      activeTaskName,
      timerMode,
      sessionHistory,
      todayStr,
      customMinutes,
    };
  }, [totalSec, todayFocusMinutes, completedSessions, linkedHabitId, activeTaskName, timerMode, sessionHistory, todayStr, customMinutes]);

  // ── Cloud / Local State Synchronizer ──
  const syncSessionState = useCallback(
    async (payload: ActiveFocusSessionPayload) => {
      // 1. Always update local storage
      try {
        localStorage.setItem(LOCAL_SESSION_KEY(userEmail), JSON.stringify(payload));
      } catch {}

      // 2. If authenticated, update Supabase user_settings
      if (!isGuestUser && userId) {
        try {
          await supabase
            .from("user_settings")
            .update({
              notification_prefs: {
                ...((payload as any) || {}),
                active_focus_session: payload,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } catch (err) {
          console.error("Failed to sync active focus session to cloud:", err);
        }
      }
    },
    [userId, isGuestUser, userEmail]
  );

  // ── Handler for Session Completion ──
  const handleSessionComplete = useCallback(() => {
    setIsRunning(false);
    setTargetEndAt(null);
    setRemainingSec(0);

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
        toast.success(`🎉 Focus complete! "${targetHabit.name}" marked done! (+10 XP + ${elapsedMins * 2} Focus XP)`);
      } else {
        toast.success(`🎉 Focus session complete! +${elapsedMins * 2} Focus XP earned!`);
      }
    } else {
      toast.success(`🎉 Focus session complete! +${elapsedMins * 2} Focus XP earned!`);
    }

    setShowFlowExtend(true);

    // Clear active session from cloud
    const endPayload: ActiveFocusSessionPayload = {
      isRunning: false,
      startedAt: null,
      targetEndAt: null,
      totalSec: s.totalSec,
      pausedRemainingSec: null,
      timerMode: s.timerMode,
      activeTaskName: s.activeTaskName,
      linkedHabitId: s.linkedHabitId,
      customMinutes: s.customMinutes,
      lastUpdated: new Date().toISOString(),
    };
    syncSessionState(endPayload);
  }, [syncSessionState]);

  // ── Apply Session Payload from Cloud / Cache ──
  const applySessionPayload = useCallback(
    (payload: ActiveFocusSessionPayload | null) => {
      if (!payload) return;

      setTimerMode(payload.timerMode || "pomodoro");
      setActiveTaskName(payload.activeTaskName || "Deep Work Session");
      setLinkedHabitId(payload.linkedHabitId || null);
      setCustomMinutes(payload.customMinutes || 25);
      setTotalSec(payload.totalSec || 25 * 60);

      if (payload.isRunning && payload.targetEndAt) {
        const now = Date.now();
        const target = new Date(payload.targetEndAt).getTime();
        const diffSec = Math.ceil((target - now) / 1000);

        if (diffSec <= 0) {
          // Timer finished while device was closed or offline
          setRemainingSec(0);
          setIsRunning(false);
          setTargetEndAt(null);
          setShowFlowExtend(true);
        } else {
          // Timer is actively running
          setRemainingSec(diffSec);
          setIsRunning(true);
          setTargetEndAt(payload.targetEndAt);
          setShowFlowExtend(false);
        }
      } else {
        // Timer was paused or idle
        setIsRunning(false);
        setTargetEndAt(null);
        if (payload.pausedRemainingSec !== null && payload.pausedRemainingSec !== undefined) {
          setRemainingSec(payload.pausedRemainingSec);
        } else {
          setRemainingSec(payload.totalSec || 25 * 60);
        }
      }
    },
    []
  );

  // ── Initial Load & Realtime Cross-Device Subscription ──
  useEffect(() => {
    let isMounted = true;

    async function loadActiveSession() {
      // 1. Check local cache first for instant UI response
      try {
        const raw = localStorage.getItem(LOCAL_SESSION_KEY(userEmail));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isMounted) applySessionPayload(parsed);
        }
      } catch {}

      // 2. Fetch latest state from Supabase for authenticated users
      if (!isGuestUser && userId) {
        try {
          const { data } = await supabase.from("user_settings").select("notification_prefs").eq("user_id", userId).maybeSingle();
          const cloudSession = (data?.notification_prefs as any)?.active_focus_session as ActiveFocusSessionPayload | undefined;
          if (cloudSession && isMounted) {
            applySessionPayload(cloudSession);
          }
        } catch (err) {
          console.error("Failed to load cross-device focus session:", err);
        }
      }
    }

    loadActiveSession();

    // 3. Realtime multi-device sync subscription
    if (!isGuestUser && userId) {
      const channel = supabase
        .channel("user-focus-session-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const newPrefs = payload?.new?.notification_prefs;
            const session = newPrefs?.active_focus_session as ActiveFocusSessionPayload | undefined;
            if (session) {
              applySessionPayload(session);
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [userId, isGuestUser, userEmail, applySessionPayload]);

  // ── True Time-Based Zero-Drift Timer Tick Effect ──
  useEffect(() => {
    if (!isRunning || !targetEndAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const target = new Date(targetEndAt).getTime();
      const diffSec = Math.ceil((target - now) / 1000);

      if (diffSec <= 0) {
        clearInterval(interval);
        handleSessionComplete();
      } else {
        setRemainingSec(diffSec);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, targetEndAt, handleSessionComplete]);

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

  // ── Actions ──
  const startTimer = useCallback(() => {
    const now = Date.now();
    const duration = remainingSec > 0 ? remainingSec : totalSec;
    const target = new Date(now + duration * 1000).toISOString();

    setTargetEndAt(target);
    setIsRunning(true);
    setShowFlowExtend(false);

    const payload: ActiveFocusSessionPayload = {
      isRunning: true,
      startedAt: new Date(now).toISOString(),
      targetEndAt: target,
      totalSec,
      pausedRemainingSec: null,
      timerMode,
      activeTaskName,
      linkedHabitId,
      customMinutes,
      lastUpdated: new Date().toISOString(),
    };
    syncSessionState(payload);
  }, [remainingSec, totalSec, timerMode, activeTaskName, linkedHabitId, customMinutes, syncSessionState]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    setTargetEndAt(null);

    const payload: ActiveFocusSessionPayload = {
      isRunning: false,
      startedAt: null,
      targetEndAt: null,
      totalSec,
      pausedRemainingSec: remainingSec,
      timerMode,
      activeTaskName,
      linkedHabitId,
      customMinutes,
      lastUpdated: new Date().toISOString(),
    };
    syncSessionState(payload);
  }, [remainingSec, totalSec, timerMode, activeTaskName, linkedHabitId, customMinutes, syncSessionState]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTargetEndAt(null);
    setShowFlowExtend(false);

    const mins = timerMode === "custom" ? customMinutes : TIMER_PRESETS[timerMode].minutes;
    const sec = mins * 60;
    setTotalSec(sec);
    setRemainingSec(sec);

    const payload: ActiveFocusSessionPayload = {
      isRunning: false,
      startedAt: null,
      targetEndAt: null,
      totalSec: sec,
      pausedRemainingSec: null,
      timerMode,
      activeTaskName,
      linkedHabitId,
      customMinutes,
      lastUpdated: new Date().toISOString(),
    };
    syncSessionState(payload);
    toast.info("🔄 Timer Reset");
  }, [timerMode, customMinutes, activeTaskName, linkedHabitId, syncSessionState]);

  const changeTimerMode = useCallback(
    (mode: TimerMode, customMins?: number) => {
      if (isRunning) {
        const ok = window.confirm("Timer is currently running. Switching modes will reset the timer. Continue?");
        if (!ok) return;
      }
      setTimerMode(mode);
      setIsRunning(false);
      setTargetEndAt(null);
      setShowFlowExtend(false);

      const mins = mode === "custom" ? customMins || customMinutes : TIMER_PRESETS[mode].minutes;
      const sec = mins * 60;
      setTotalSec(sec);
      setRemainingSec(sec);

      const payload: ActiveFocusSessionPayload = {
        isRunning: false,
        startedAt: null,
        targetEndAt: null,
        totalSec: sec,
        pausedRemainingSec: null,
        timerMode: mode,
        activeTaskName,
        linkedHabitId,
        customMinutes: customMins || customMinutes,
        lastUpdated: new Date().toISOString(),
      };
      syncSessionState(payload);
    },
    [isRunning, customMinutes, activeTaskName, linkedHabitId, syncSessionState]
  );

  const startHabitFocus = useCallback(
    (habit: any, mins?: number) => {
      setLinkedHabitId(habit.id);
      setActiveTaskName(habit.name);
      const duration = mins || 25;
      const mode: TimerMode = mins === 5 ? "shortBreak" : mins === 15 ? "longBreak" : duration === 25 ? "pomodoro" : "custom";
      setTimerMode(mode);
      if (mins && ![5, 15, 25].includes(mins)) {
        setCustomMinutes(duration);
      }
      const sec = duration * 60;
      setTotalSec(sec);
      setRemainingSec(sec);

      const now = Date.now();
      const target = new Date(now + sec * 1000).toISOString();
      setTargetEndAt(target);
      setIsRunning(true);
      setShowFlowExtend(false);

      const payload: ActiveFocusSessionPayload = {
        isRunning: true,
        startedAt: new Date(now).toISOString(),
        targetEndAt: target,
        totalSec: sec,
        pausedRemainingSec: null,
        timerMode: mode,
        activeTaskName: habit.name,
        linkedHabitId: habit.id,
        customMinutes: duration,
        lastUpdated: new Date().toISOString(),
      };
      syncSessionState(payload);

      toast.info(`🎯 Loaded "${habit.name}" into Focus Studio! ${duration}m timer started.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [syncSessionState]
  );

  const handleFlowExtend = useCallback(
    (extraMinutes: number) => {
      const sec = extraMinutes * 60;
      const now = Date.now();
      const target = new Date(now + sec * 1000).toISOString();

      setTotalSec(sec);
      setRemainingSec(sec);
      setTargetEndAt(target);
      setIsRunning(true);
      setShowFlowExtend(false);

      const payload: ActiveFocusSessionPayload = {
        isRunning: true,
        startedAt: new Date(now).toISOString(),
        targetEndAt: target,
        totalSec: sec,
        pausedRemainingSec: null,
        timerMode,
        activeTaskName,
        linkedHabitId,
        customMinutes,
        lastUpdated: new Date().toISOString(),
      };
      syncSessionState(payload);

      toast.info(`🌊 Extended focus by ${extraMinutes} more minutes!`);
    },
    [timerMode, activeTaskName, linkedHabitId, customMinutes, syncSessionState]
  );

  const dismissFlowExtend = useCallback(() => {
    setShowFlowExtend(false);
  }, []);

  const handleSoundToggle = useCallback(
    (soundType: "rain" | "waves" | "noise" | "binaural") => {
      if (activeSound === soundType) {
        ambientSound.stop();
        setActiveSound(null);
      } else {
        ambientSound.start(soundType, soundVolume);
        setActiveSound(soundType);
      }
    },
    [activeSound, soundVolume]
  );

  const handleVolumeChange = useCallback((vol: number) => {
    setSoundVolume(vol);
    ambientSound.setVolume(vol);
  }, []);

  const dismissSuggestion = useCallback(() => {
    setSuggestionDismissed(true);
    try {
      localStorage.setItem(`pps_focus_suggestion_dismissed_${todayStr}`, "true");
    } catch {}
  }, [todayStr]);

  const formatTimerTime = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        toggleTimer();
      } else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        resetTimer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTimer, resetTimer]);

  // Cleanup ambient audio on unmount
  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  // Derived Values
  const progressRatio = totalSec > 0 ? (totalSec - remainingSec) / totalSec : 0;
  const strokeDashoffset = 565 - 565 * progressRatio;

  const value: FocusTimerContextValue = {
    timerMode,
    customMinutes,
    activeTaskName,
    linkedHabitId,
    totalSec,
    remainingSec,
    isRunning,
    isFullscreen,
    showFlowExtend,
    activeSound,
    soundVolume,
    todayFocusMinutes,
    completedSessions,
    sessionHistory,
    suggestionDismissed,

    setTimerMode,
    setCustomMinutes,
    setActiveTaskName,
    setLinkedHabitId,
    setIsFullscreen,
    changeTimerMode,
    startHabitFocus,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    handleFlowExtend,
    dismissFlowExtend,
    handleSoundToggle,
    handleVolumeChange,
    dismissSuggestion,

    progressRatio,
    strokeDashoffset,
    formatTimerTime,
    TIMER_PRESETS,
  };

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}
