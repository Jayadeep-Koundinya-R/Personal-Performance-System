import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits, Habit } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useReminders } from "@/hooks/use-reminders";
import { useLifecycleNudges } from "@/hooks/use-lifecycle-nudges";
import { useAuth } from "@/hooks/use-auth";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useVayu } from "@/hooks/use-vayu";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import { TaskSection } from "@/components/dashboard/TaskSection";
import { VayuPulseBanner } from "@/components/vayu/VayuPulseBanner";
import { VayuFlowStudioModal } from "@/components/vayu/VayuFlowStudioModal";
import { MiniPomodoroCard } from "@/components/dashboard/MiniPomodoroCard";
import { MomentumCommandDeck } from "@/components/dashboard/v2/MomentumCommandDeck";
import { ImmediateRemindersStrip } from "@/components/dashboard/v2/ImmediateRemindersStrip";
import { QuickAddHabitCard } from "@/components/dashboard/v2/QuickAddHabitCard";
import { DashboardCommandHub } from "@/components/dashboard/v2/DashboardCommandHub";
import { ThreePerformanceCanvas } from "@/components/dashboard/v2/ThreePerformanceCanvas";
import { InteractiveQuickDock } from "@/components/dashboard/v2/InteractiveQuickDock";
import { ProAiPerformanceAgentBox } from "@/components/dashboard/v2/ProAiPerformanceAgentBox";
import { InteractiveDemoExperienceBanner } from "@/components/dashboard/v2/InteractiveDemoExperienceBanner";
import { EmergencyTriageModal } from "@/components/dashboard/EmergencyTriageModal";
import { TriageActiveBanner } from "@/components/dashboard/TriageActiveBanner";
import { ParkinsonsLawInverterModal } from "@/components/habits/ParkinsonsLawInverterModal";
import { SyllabusDecomposerModal } from "@/components/syllabus/SyllabusDecomposerModal";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { ambientAudio, AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { calculateVitalityScore, calculateRolling7DayConsistency } from "@/lib/dashboard/vitality";
import { toast } from "sonner";
import { canFireGlobalShortcut } from "@/lib/utils/keyboard";
import { canClaimRecoveryXP, claimRecoveryXP } from "@/lib/dashboard/microHabits";
import { getNextBestAction, getCurrentTimeHHMM, STARTER_HABIT_STACK } from "@/lib/dashboard/recommendations";

function getUrgencyLevel(habit: any): "normal" | "urgent" | "overdue" {
  if (!habit.endTime || (habit.completedDates || []).includes(new Date().toISOString().split("T")[0])) {
    return "normal";
  }
  const [endH, endM] = habit.endTime.split(":").map(Number);
  const now = new Date();
  const end = new Date();
  end.setHours(endH, endM, 0, 0);

  const diffMs = end.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 60 * 60 * 1000) return "urgent"; // 1 hour
  return "normal";
}

function getTimeBlock(habit: any): "morning" | "afternoon" | "evening" | "anytime" {
  if (!habit.startTime) return "anytime";
  const [h] = habit.startTime.split(":").map(Number);
  if (isNaN(h)) return "anytime";
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

function getCurrentTimeBlock(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.25, ease: "easeOut" },
  }),
};

function formatTime12(t: string): string {
  if (!t) return "";
  const parts = t.split(":").map(Number);
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
}

interface DashboardSectionProps {
  onNavigate?: (section: string) => void;
  userEmail?: string | null;
}

export const DashboardSection = ({ onNavigate, userEmail }: DashboardSectionProps) => {
  const {
    habits,
    loading: habitsLoading,
    addHabit,
    toggleCompletion,
    completeHabit,
    markAllDone,
    isHabitDueToday,
    getTodayStr,
    calculateWeeklyPoints,
    getMaxStreak,
    getTotalFreezeCredits,
    isWithinCircadianWindow,
  } = useHabits();

  const [timerLockModalHabit, setTimerLockModalHabit] = useState<Habit | null>(null);
  const [circadianModalHabit, setCircadianModalHabit] = useState<{ habit: Habit; label: string } | null>(null);

  const { profile } = useProfile();
  const { user, guestDaysRemaining } = useAuth();
  const focusTimer = useFocusTimer();
  const { todayFocusMinutes } = focusTimer;
  const { reminders: allReminders } = useReminders();
  const reminders = allReminders.filter((r) => r.enabled);
  const nudge = useLifecycleNudges();

  const todayStr = getTodayStr();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // View mode switcher: Priority vs Time-block vs Zen Focus Mode
  const [viewMode, setViewMode] = useState<"priority" | "timeblock" | "zen">(() => {
    try {
      return (localStorage.getItem("pps_dashboard_view_mode") as any) || "priority";
    } catch {
      return "priority";
    }
  });

  // Layout density switcher: Comfortable vs Compact
  const [densityMode, setDensityMode] = useState<"comfortable" | "compact">(() => {
    try {
      return (localStorage.getItem("pps_dashboard_density") as any) || "comfortable";
    } catch {
      return "comfortable";
    }
  });

  // ── 🌬️ Autonomous Adaptive Circadian Flow Subsystem ──
  const {
    plan: vayuPlan,
    currentBlock: vayuCurrentBlock,
    nextBlock: vayuNextBlock,
    completionRate: vayuRate,
    generateNewPlan: generateVayuPlan,
    completeBlock: completeVayuBlock,
    rebalanceSchedule: rebalanceVayuSchedule,
    processNaturalInput: processVayuInput,
  } = useVayu();
  const [isVayuStudioOpen, setIsVayuStudioOpen] = useState(false);

  // Global listener for Circadian Sprint Launch events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStartTimer = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const duration = detail.durationMins || 45;
      focusTimer.changeTimerMode("custom", duration);
      if (detail.taskName) focusTimer.setActiveTaskName(detail.taskName);
      if (detail.linkedHabitId) focusTimer.setLinkedHabitId(detail.linkedHabitId);
      focusTimer.startTimer();
      toast.success(`⚡ Focus Sprint Launched (${duration}m)`);
    };

    window.addEventListener("pps_start_focus_timer", handleStartTimer);
    return () => window.removeEventListener("pps_start_focus_timer", handleStartTimer);
  }, [focusTimer]);

  // ── 🎯 Phase 3: Dopamine & Motivation Engine States ──
  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [parkinsonsModalOpen, setParkinsonsModalOpen] = useState(false);
  const [targetHabitForSlicing, setTargetHabitForSlicing] = useState<any>(null);
  const [syllabusModalOpen, setSyllabusModalOpen] = useState(false);

  // Power tools collapsed state (collapsed by default to elevate habits above fold)
  const [powerToolsOpen, setPowerToolsOpen] = useState(() => {
    try {
      return localStorage.getItem("pps_power_tools_open") === "true";
    } catch {
      return false;
    }
  });

  const togglePowerTools = () => {
    const next = !powerToolsOpen;
    setPowerToolsOpen(next);
    try {
      localStorage.setItem("pps_power_tools_open", String(next));
    } catch { }
  };

  // Companion right rail expanded/collapsed state (Wide mode toggle)
  const [showCompanionRail, setShowCompanionRail] = useState(() => {
    try {
      return localStorage.getItem("pps_show_companion_rail") !== "false";
    } catch {
      return true;
    }
  });

  const toggleCompanionRail = () => {
    const next = !showCompanionRail;
    setShowCompanionRail(next);
    try {
      localStorage.setItem("pps_show_companion_rail", String(next));
    } catch { }
  };

  // Pro AI Performance Agent Box state
  const [showAiAgentBox, setShowAiAgentBox] = useState(() => {
    try {
      return localStorage.getItem("pps_show_ai_agent_box") !== "false";
    } catch {
      return true;
    }
  });

  const toggleAiAgentBox = () => {
    const next = !showAiAgentBox;
    setShowAiAgentBox(next);
    try {
      localStorage.setItem("pps_show_ai_agent_box", String(next));
    } catch { }
  };

  // 🤖 Proactive AI Copilot Event Listener & Auto-Scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenAiCopilot = () => {
      setShowAiAgentBox(true);
      try {
        localStorage.setItem("pps_show_ai_agent_box", "true");
      } catch { }
      setTimeout(() => {
        const el = document.getElementById("pro-ai-copilot-box");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    };

    window.addEventListener("pps_open_ai_copilot", handleOpenAiCopilot);
    return () => window.removeEventListener("pps_open_ai_copilot", handleOpenAiCopilot);
  }, []);

  // 🛡️ Proactive AI Guardian Check (Evening Curfew & Low Energy Nudge)
  useEffect(() => {
    if (typeof window === "undefined" || habits.length === 0) return;
    const sessionKey = `pps_ai_guardian_notified_${todayStr}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const uncompleted = habits.filter((h) => !h.completedDates.includes(todayStr));
    if (uncompleted.length === 0) return;

    const currentHour = new Date().getHours();
    // Evening curfew check (8 PM to 10 PM)
    if (currentHour >= 20 && currentHour < 22) {
      sessionStorage.setItem(sessionKey, "true");
      setTimeout(() => {
        toast("🛡️ AI Streak Guardian Alert", {
          description: `10 PM Agni Curfew approaching! You have ${uncompleted.length} habit(s) pending. Tap to scale them to 2m micro-habits.`,
          action: {
            label: "Open Copilot",
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent("pps_open_ai_copilot", {
                  detail: { prompt: "How should I scale down my remaining habits to protect my streak before curfew?" },
                })
              );
            },
          },
          duration: 8000,
        });
      }, 1500);
    }
  }, [habits, todayStr]);

  // Nudge banner dismissal state
  const [dismissedNudgeId, setDismissedNudgeId] = useState(() => {
    try {
      return sessionStorage.getItem("pps_dismissed_nudge_id");
    } catch {
      return null;
    }
  });

  const handleDismissNudge = (id: string) => {
    setDismissedNudgeId(id);
    try {
      sessionStorage.setItem("pps_dismissed_nudge_id", id);
    } catch { }
  };

  // Skipped habits state for forgiving rest-day system
  const [skippedHabits, setSkippedHabits] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`pps_skipped_${todayStr}`) || "{}");
    } catch {
      return {};
    }
  });

  const handleSkipHabit = (habitId: string, reason: string) => {
    const next = { ...skippedHabits, [habitId]: reason };
    setSkippedHabits(next);
    try {
      localStorage.setItem(`pps_skipped_${todayStr}`, JSON.stringify(next));
    } catch { }

    if (reason === "Rest 💤" || reason === "Sick 🤒") {
      const check = canClaimRecoveryXP(todayStr);
      if (check.allowed) {
        claimRecoveryXP(todayStr);
        toast.info(`Habit marked as ${reason} 🛡️`, {
          description: "Rest Day Honored! Recovery fuels high performance. +5 Recovery XP! 🌿",
        });
      } else {
        toast.info(`Habit marked as ${reason} 🛡️`, {
          description: check.reason || "Rest Day noted.",
        });
      }
    } else {
      toast.info(`Habit marked as ${reason} 🛡️`, {
        description: "Schedule adjusted with zero guilt.",
      });
    }
  };

  const handleToggleHabit = async (habitId: string, forceBypass = false) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const wasCompleted = habit.completedDates.includes(todayStr);

    if (skippedHabits[habitId]) {
      const next = { ...skippedHabits };
      delete next[habitId];
      setSkippedHabits(next);
      try {
        localStorage.setItem(`pps_skipped_${todayStr}`, JSON.stringify(next));
      } catch { }
    }

    if (!wasCompleted && !forceBypass) {
      // 1. Proof of Focus Anti-Cheat Lock Check
      if (habit.requires_focus_timer) {
        setTimerLockModalHabit(habit);
        return;
      }

      // 2. Circadian Window Time Gating Check
      if (habit.window_start || habit.window_end) {
        const cCheck = isWithinCircadianWindow(habit.window_start, habit.window_end);
        if (!cCheck.isOpen) {
          setCircadianModalHabit({ habit, label: cCheck.label });
          return;
        }
      }

      feedbackSounds.playSuccessChime();
    } else {
      feedbackSounds.playClick();
    }

    await toggleCompletion(habitId, todayStr, forceBypass);
  };

  const handleViewModeChange = (mode: "priority" | "timeblock" | "zen") => {
    setViewMode(mode);
    try {
      localStorage.setItem("pps_dashboard_view_mode", mode);
    } catch { }
  };

  const handleDensityModeChange = (mode: "comfortable" | "compact") => {
    setDensityMode(mode);
    try {
      localStorage.setItem("pps_dashboard_density", mode);
    } catch { }
  };

  // Energy/Mood logger pill
  const [mood, setMood] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`pps_today_mood_${todayStr}`) || null;
    } catch {
      return null;
    }
  });

  const handleMoodSelect = (mVal: string, mLabel: string) => {
    setMood(mVal);
    try {
      localStorage.setItem(`pps_today_mood_${todayStr}`, mVal);
    } catch { }
    toast.success(`Energy logged: ${mLabel}`, { description: "Your energy state is updated for today!" });
  };

  // 🎧 Ambient procedural soundscape state
  const [soundscape, setSoundscape] = useState<AmbienceType>("none");
  const handleToggleSoundscape = (type: AmbienceType) => {
    const next = soundscape === type ? "none" : type;
    setSoundscape(next);
    ambientAudio.play(next);
    if (next !== "none") {
      toast.success(`🎧 Ambient Soundscape: ${next.toUpperCase()}`, {
        description: "Native Web Audio procedural focus soundscape.",
      });
    }
  };

  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  // Habit search & category filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    habits.forEach((h) => {
      if (h.category && h.category.trim()) set.add(h.category.trim());
    });
    return ["All", ...Array.from(set)];
  }, [habits]);

  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
  const completionRate = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;
  const maxStreak = getMaxStreak();
  const freezeCredits = getTotalFreezeCredits();
  const weeklyPoints = calculateWeeklyPoints();

  // Rolling 7-day consistency & Vitality score
  const rollingConsistency = useMemo(() => {
    return calculateRolling7DayConsistency(habits, todayStr, completionRate);
  }, [habits, todayStr, completionRate]);

  const vitality = useMemo(() => {
    return calculateVitalityScore({
      completionRate,
      todayFocusMinutes,
      targetFocusMinutes: profile?.daily_focus_target_minutes || 60,
      rolling7DayConsistency: rollingConsistency,
    });
  }, [completionRate, todayFocusMinutes, profile, rollingConsistency]);

  // Rolling 7-day mini-dots for glanceable weekly rhythm
  const rolling7Days = useMemo(() => {
    const days = [];
    const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const completedCount = habits.filter((h) => (h.completedDates || []).includes(ds)).length;
      days.push({
        dateStr: ds,
        label: dayLabels[d.getDay()],
        isToday: i === 0,
        isCompleted: completedCount > 0,
        count: completedCount,
      });
    }
    return days;
  }, [habits]);

  // Estimated time remaining today
  const remainingEstimatedMinutes = useMemo(() => {
    const uncompleted = dueToday.filter((h) => !h.completedDates.includes(todayStr));
    return uncompleted.reduce((acc, h) => acc + (h.focus_duration_minutes || 15), 0);
  }, [dueToday, todayStr]);

  // Audio FX Mute State
  const [isAudioMuted, setIsAudioMuted] = useState(() => feedbackSounds.getIsMuted());
  const toggleAudioMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    feedbackSounds.setMuted(next);
    if (!next) {
      feedbackSounds.playClick();
      toast.success("Sound Effects: Enabled 🔊");
    } else {
      toast.info("Sound Effects: Muted 🔇");
    }
  };

  // --- Completion Celebration ---
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletionRef = useRef(completionRate);

  useEffect(() => {
    const wasNotComplete = prevCompletionRef.current < 100;
    prevCompletionRef.current = completionRate;

    // Only trigger when transitioning TO 100% (not on initial load at 100%)
    if (completionRate === 100 && dueToday.length > 0 && wasNotComplete) {
      const celebKey = `pps_celebrated_${todayStr}`;
      try {
        if (localStorage.getItem(celebKey)) return;
        localStorage.setItem(celebKey, "1");
      } catch { }

      setTimeout(() => {
        setShowCelebration(true);
        toast.success("🏆 Perfect Day Bonus: +25 XP!", {
          description: "You completed every habit due today. Incredible discipline!",
          duration: 5000,
        });
      }, 400);
    }
  }, [completionRate, dueToday.length, todayStr]);

  // AI suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const loadSuggestions = useCallback(() => {
    const cacheKey = user?.id ? `pps_ai_suggestions_${user.id}` : "pps_ai_suggestions_guest";
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setSuggestions(parsed.filter((s: any) => s.status !== "dismissed" && s.status !== "accepted"));
          return;
        }
      }
    } catch { }
    setSuggestions([]);
  }, [user]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleAcceptSuggestion = async (sugg: any) => {
    try {
      if (sugg.type === "smart_timing" && sugg.suggested_time) {
        toast.success(`Updated timing for "${sugg.habit_name || "habit"}" to ${sugg.suggested_time}`);
      } else if (sugg.type === "struggling_habit" && sugg.alternative_habit_name) {
        toast.success(`Updated habit suggestion "${sugg.alternative_habit_name}"`);
      } else {
        toast.success("Applied AI suggestion!");
      }

      const cacheKey = user?.id ? `pps_ai_suggestions_${user.id}` : "pps_ai_suggestions_guest";
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const list = JSON.parse(cached);
          const updated = list.map((item: any) => (item.id === sugg.id ? { ...item, status: "accepted" } : item));
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      } catch { }

      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
    } catch {
      toast.error("Failed to apply suggestion");
    }
  };

  const handleDismissSuggestion = async (sugg: any) => {
    try {
      const cacheKey = user?.id ? `pps_ai_suggestions_${user.id}` : "pps_ai_suggestions_guest";
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const list = JSON.parse(cached);
          const updated = list.map((item: any) => (item.id === sugg.id ? { ...item, status: "dismissed" } : item));
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      } catch { }

      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
      toast.info("Suggestion dismissed");
    } catch { }
  };

  const handleInstallStarterStack = useCallback(async () => {
    for (const s of STARTER_HABIT_STACK) {
      await addHabit(
        s.name,
        s.category,
        s.period,
        s.priority,
        todayStr,
        s.time,
        null,
        s.color,
        false,
        false,
        s.requires_focus_timer,
        s.focus_duration_minutes,
        s.window_start,
        s.window_end
      );
    }
    toast.success("Starter Habit Stack installed! 🚀");
  }, [addHabit, todayStr]);

  // Keyboard shortcuts (Space: Launch Sprint, M: Mark All Done, Z: Toggle Zen, V: Cycle Views)
  // Preserves 1-5 strictly for section navigation; prevents firing in interactive elements & modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canFireGlobalShortcut(e)) return;

      if ((e.key === "m" || e.key === "M") && dueToday.length > 0 && doneToday.length < dueToday.length) {
        e.preventDefault();
        markAllDone();
        return;
      }

      if (e.key === " " || e.code === "Space") {
        if (focusTimer.isRunning) {
          e.preventDefault();
          focusTimer.toggleTimer();
          return;
        }
        const nba = getNextBestAction({
          habits,
          todayStr,
          currentTimeStr: getCurrentTimeHHMM(),
          skippedHabits,
        });
        if (nba) {
          e.preventDefault();
          focusTimer.startHabitFocus(nba, 25);
          toast.success(`⏱️ 25m Deep Work Sprint launched for "${nba.name}"!`);
        }
        return;
      }

      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        handleViewModeChange(viewMode === "zen" ? "priority" : "zen");
        return;
      }

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        handleViewModeChange(
          viewMode === "priority" ? "timeblock" : viewMode === "timeblock" ? "zen" : "priority"
        );
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dueToday, doneToday.length, markAllDone, todayStr, skippedHabits, focusTimer, viewMode, habits]);

  // Sorting habits helper
  const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1, Optional: 0 };
  const sortHabits = (list: typeof habits) => {
    return [...list].sort((a, b) => {
      const aDone = a.completedDates.includes(todayStr);
      const bDone = b.completedDates.includes(todayStr);
      if (aDone !== bDone) return aDone ? 1 : -1;
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const periodOrder: Record<string, number> = { Today: 0, Daily: 1, Weekly: 2, Monthly: 3 };
      const periodDiff = (periodOrder[a.period] ?? 0) - (periodOrder[b.period] ?? 0);
      if (periodDiff !== 0) return periodDiff;
      return a.name.localeCompare(b.name);
    });
  };

  // Filtered habits by search & category
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      if (h.archived) return false;
      if (categoryFilter !== "All" && h.category !== categoryFilter) return false;
      if (searchQuery.trim() && !h.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
  }, [habits, categoryFilter, searchQuery]);

  // Priority View lists
  const critical: typeof habits = [];
  const high: typeof habits = [];
  const medium: typeof habits = [];
  const upcoming: typeof habits = [];
  filteredHabits.forEach((habit) => {
    switch (habit.priority) {
      case "High":
        if (isHabitDueToday(habit)) critical.push(habit);
        else high.push(habit);
        break;
      case "Medium":
        medium.push(habit);
        break;
      case "Low":
      case "Optional":
      default:
        upcoming.push(habit);
        break;
    }
  });

  const sortedCritical = sortHabits(critical);
  const sortedHigh = sortHabits(high);
  const sortedMedium = sortHabits(medium);
  const sortedUpcoming = sortHabits(upcoming);

  // Time-Block View lists
  const morningHabits = sortHabits(filteredHabits.filter((h) => getTimeBlock(h) === "morning"));
  const afternoonHabits = sortHabits(filteredHabits.filter((h) => getTimeBlock(h) === "afternoon"));
  const eveningHabits = sortHabits(filteredHabits.filter((h) => getTimeBlock(h) === "evening"));
  const anytimeHabits = sortHabits(filteredHabits.filter((h) => getTimeBlock(h) === "anytime"));

  function getCategoryColor(category?: string | null): { bg: string; text: string; border: string; dot: string } {
    const cat = (category || "").toLowerCase();
    if (cat.includes("health") || cat.includes("fit") || cat.includes("water") || cat.includes("sleep")) {
      return {
        bg: "bg-emerald-50 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-300 font-bold",
        border: "border-emerald-300/80 dark:border-emerald-500/30",
        dot: "bg-emerald-500"
      };
    }
    if (cat.includes("prod") || cat.includes("work") || cat.includes("code") || cat.includes("deep")) {
      return {
        bg: "bg-blue-50 dark:bg-blue-500/15",
        text: "text-blue-700 dark:text-blue-300 font-bold",
        border: "border-blue-300/80 dark:border-blue-500/30",
        dot: "bg-blue-500"
      };
    }
    if (cat.includes("learn") || cat.includes("study") || cat.includes("read") || cat.includes("book")) {
      return {
        bg: "bg-cyan-50 dark:bg-cyan-500/15",
        text: "text-cyan-800 dark:text-cyan-300 font-bold",
        border: "border-cyan-300/80 dark:border-cyan-500/30",
        dot: "bg-cyan-500"
      };
    }
    if (cat.includes("mindful") || cat.includes("meditat") || cat.includes("peace")) {
      return {
        bg: "bg-purple-50 dark:bg-purple-500/15",
        text: "text-purple-700 dark:text-purple-300 font-bold",
        border: "border-purple-300/80 dark:border-purple-500/30",
        dot: "bg-purple-500"
      };
    }
    if (cat.includes("mindset") || cat.includes("gratitude") || cat.includes("journal")) {
      return {
        bg: "bg-amber-50 dark:bg-amber-500/15",
        text: "text-amber-800 dark:text-amber-300 font-bold",
        border: "border-amber-300/80 dark:border-amber-500/30",
        dot: "bg-amber-500"
      };
    }
    return {
      bg: "bg-indigo-50 dark:bg-indigo-500/15",
      text: "text-indigo-700 dark:text-indigo-300 font-bold",
      border: "border-indigo-300/80 dark:border-indigo-500/30",
      dot: "bg-indigo-500"
    };
  }

  function formatCategoryName(name: string): string {
    if (!name) return "General";
    return name
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatRemainingTime(minutes: number): string {
    if (minutes <= 0) return "All clear";
    if (minutes < 60) return `~${minutes}m focus left`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `~${hrs}h focus left`;
    return `~${hrs}h ${mins}m left`;
  }

  function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 5) return "Good Night";
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }

  const renderTask = (habit: typeof habits[0], index: number) => {
    const dueDate = new Date(habit.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 864e5);
    const isCompletedToday = habit.completedDates.includes(todayStr);
    const skipReason = skippedHabits[habit.id];
    const isSkipped = !!skipReason;

    let tagClass = "bg-primary/15 text-primary border border-primary/30";
    let tagNode: React.ReactNode = <span>Due {dueDate.toLocaleDateString(undefined, { weekday: "long" })}</span>;

    if (isSkipped) {
      tagClass = "bg-surface/80 text-muted-foreground border border-border/80 font-mono";
      tagNode = (
        <span className="flex items-center gap-1">
          <Shield className="w-2.5 h-2.5 inline" />
          <span>Skipped ({skipReason})</span>
        </span>
      );
    } else if (diffDays < 0) {
      tagClass = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold";
      tagNode = (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5 inline" />
          <span>Overdue</span>
        </span>
      );
    } else if (diffDays === 0 && isCompletedToday) {
      tagClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold";
      tagNode = (
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5 inline" />
          <span>Done</span>
        </span>
      );
    } else if (diffDays === 0) {
      const urgency = getUrgencyLevel(habit);
      if (urgency === "overdue") {
        tagClass = "bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 font-bold animate-pulse shadow-2xs";
        tagNode = (
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 inline" />
            <span>Overdue</span>
          </span>
        );
      } else if (urgency === "urgent") {
        tagClass = "bg-amber-50 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold animate-pulse shadow-2xs";
        tagNode = (
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 inline" />
            <span>Urgent</span>
          </span>
        );
      } else {
        tagClass = "bg-slate-100 dark:bg-surface/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border/60 font-semibold shadow-2xs";
        tagNode = <span>Due Today</span>;
      }
    } else if (diffDays === 1) {
      tagClass = "bg-yellow-500/15 text-yellow-800 dark:text-yellow-400 border border-yellow-500/30 font-semibold";
      tagNode = <span>Tomorrow</span>;
    }

    if (densityMode === "compact") {
      return (
        <motion.div
          key={habit.id}
          variants={slideRight}
          custom={index}
          initial="hidden"
          animate="visible"
          className={`flex items-center justify-between px-3 py-1.5 bg-card/95 dark:bg-card/70 backdrop-blur-md border rounded-xl mb-1 text-xs cursor-default hover:bg-accent/[0.08] transition-all duration-150 shadow-2xs ${focusTimer.isRunning && (focusTimer.linkedHabitId === habit.id || focusTimer.activeTaskName === habit.name)
              ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/15"
              : isCompletedToday
                ? "border-border/60 opacity-60"
                : isSkipped
                  ? "border-border/60 bg-muted/20"
                  : getUrgencyLevel(habit) === "overdue"
                    ? "border-destructive/40"
                    : "border-border/60 hover:border-primary/20"
            }`}
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <input
              type="checkbox"
              checked={isCompletedToday}
              onChange={() => handleToggleHabit(habit.id)}
              className="accent-primary w-3.5 h-3.5 cursor-pointer flex-shrink-0"
            />
            <span className={`truncate font-medium ${isCompletedToday ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {habit.name}
            </span>
            {habit.category && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border flex-shrink-0 ${getCategoryColor(habit.category).bg} ${getCategoryColor(habit.category).text} ${getCategoryColor(habit.category).border}`}>
                {formatCategoryName(habit.category)}
              </span>
            )}
            {/* Task 1.2: Amber Timer-Locked Badge */}
            {habit.requires_focus_timer && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setTimerLockModalHabit(habit);
                }}
                className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5 flex-shrink-0 cursor-pointer hover:bg-amber-500/25 transition-all"
                title={`⚡ Timer-Locked: Requires ${habit.focus_duration_minutes || 25}m focus session`}
              >
                ⚡ Timer-Locked
              </span>
            )}
            {/* Task 1.3: Circadian Status Badge */}
            {(habit.window_start || habit.window_end) && (() => {
              const c = isWithinCircadianWindow(habit.window_start, habit.window_end);
              if (c.status === "upcoming") {
                return (
                  <span className="text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono flex-shrink-0" title={c.label}>
                    {c.label}
                  </span>
                );
              }
              if (c.status === "closed") {
                return (
                  <span className="text-[9px] bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border border-zinc-500/30 px-1.5 py-0.2 rounded font-mono flex-shrink-0" title={c.label}>
                    {c.label}
                  </span>
                );
              }
              return (
                <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono flex-shrink-0" title={c.label}>
                  🟢 In Window
                </span>
              );
            })()}
            {habit.streak > 0 && (
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-mono font-bold flex items-center gap-0.5 flex-shrink-0 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 px-1.5 py-0.2 rounded-md shadow-2xs" title={`Streak: ${habit.streak}d`}>
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500/20 inline" />
                <span>{habit.streak}</span>
              </span>
            )}
            {isSkipped && (
              <span className="text-[10px] bg-surface/80 border border-border/60 px-1.5 py-0.2 rounded font-mono text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                <Shield className="w-2.5 h-2.5 inline" />
                <span>{skipReason}</span>
              </span>
            )}
            {habit.startTime && (
              <span className="text-[10px] font-mono text-muted-foreground bg-surface border px-1.5 py-0.2 rounded flex-shrink-0">
                {formatTime12(habit.startTime)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isCompletedToday && !isSkipped && (
              <>
                {focusTimer.isRunning && (focusTimer.linkedHabitId === habit.id || focusTimer.activeTaskName === habit.name) ? (
                  <button
                    type="button"
                    onClick={() => focusTimer.toggleTimer()}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs animate-pulse shrink-0"
                    title="Session in progress - click to pause/resume"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{Math.floor(focusTimer.remainingSec / 60)}:{(focusTimer.remainingSec % 60).toString().padStart(2, "0")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      focusTimer.startHabitFocus(habit, habit.focus_duration_minutes || 25);
                      toast.success(`⏱️ ${habit.focus_duration_minutes || 25}m Focus Sprint launched for "${habit.name}"!`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-primary text-indigo-700 hover:text-white border border-indigo-200/90 hover:border-primary dark:bg-primary/15 dark:hover:bg-primary/30 dark:text-primary dark:hover:text-white dark:border-primary/30 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs hover:scale-105 shrink-0"
                    title="Launch Pomodoro Focus Session"
                  >
                    <Zap className="w-2.5 h-2.5 fill-primary/30" />
                    <span>{habit.focus_duration_minutes || 25}m</span>
                  </button>
                )}

                {/* Direct 1-Tap 2m Micro Pill */}
                <button
                  type="button"
                  onClick={() => completeHabit(habit.id, "micro")}
                  className="px-1.5 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs hover:scale-105 shrink-0"
                  title="Scale down to 2-minute emergency micro-habit (+2 XP, streak protected)"
                >
                  <Layers className="w-2.5 h-2.5 text-amber-500" />
                  <span>2m</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1 rounded-md bg-surface/80 hover:bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-xs"
                      title="More actions"
                      aria-label="Habit actions"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 z-[2000] bg-card/95 backdrop-blur-xl border-border/80 shadow-xl p-1 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => completeHabit(habit.id, "micro")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-amber-500/10"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>2m Micro-Habit (+2 XP)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setTargetHabitForSlicing(habit);
                        setParkinsonsModalOpen(true);
                      }}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-indigo-500/10"
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Parkinson's Slicer</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 border-border/60" />
                    <DropdownMenuItem
                      onClick={() => completeHabit(habit.id, "rest")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Rest Day (+5 XP)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSkipHabit(habit.id, "Sick")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-rose-500/10"
                    >
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sick Day</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSkipHabit(habit.id, "Busy")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                      <span>Busy Day</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold font-mono whitespace-nowrap shrink-0 shadow-xs ${tagClass}`}>
              {tagNode}
            </span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={habit.id}
        variants={slideRight}
        custom={index}
        initial="hidden"
        animate="visible"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.15 }}
        className={`flex items-center justify-between px-3.5 py-2.5 bg-card/95 dark:bg-card/70 backdrop-blur-md border rounded-xl mb-1.5 text-[13.5px] cursor-default hover:bg-accent/[0.08] transition-all duration-150 shadow-2xs hover:shadow-xs ${focusTimer.isRunning && (focusTimer.linkedHabitId === habit.id || focusTimer.activeTaskName === habit.name)
            ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/15 ring-1 ring-emerald-500/30"
            : isCompletedToday
              ? "border-border/60 hover:border-primary/20"
              : isSkipped
                ? "border-border/60 bg-muted/20"
                : getUrgencyLevel(habit) === "overdue"
                  ? "border-destructive/40 shadow-sm shadow-destructive/5"
                  : getUrgencyLevel(habit) === "urgent"
                    ? "border-pps-orange/40 shadow-sm shadow-pps-orange/5"
                    : "border-border/60 hover:border-primary/20"
          }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden truncate">
          <input
            type="checkbox"
            checked={isCompletedToday}
            onChange={() => handleToggleHabit(habit.id)}
            className="accent-primary w-4 h-4 cursor-pointer flex-shrink-0"
          />
          <span className={`truncate font-semibold tracking-tight ${isCompletedToday ? "line-through opacity-45 text-muted-foreground" : "text-slate-900 dark:text-slate-100"}`}>{habit.name}</span>
          {habit.category && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border flex-shrink-0 ${getCategoryColor(habit.category).bg} ${getCategoryColor(habit.category).text} ${getCategoryColor(habit.category).border}`}>
              {habit.category}
            </span>
          )}
          {/* Task 1.2: Amber Timer-Locked Badge */}
          {habit.requires_focus_timer && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setTimerLockModalHabit(habit);
              }}
              className="text-[10px] bg-accent/15 text-accent-foreground border border-accent/30 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer hover:bg-accent/25 transition-all"
              title={`⚡ Timer-Locked: Requires ${habit.focus_duration_minutes || 25}m focus sprint`}
            >
              ⚡ Timer-Locked
            </span>
          )}
          {/* Task 1.3: Circadian Status Badge */}
          {(habit.window_start || habit.window_end) && (() => {
            const c = isWithinCircadianWindow(habit.window_start, habit.window_end);
            if (c.status === "upcoming") {
              return (
                <span className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 flex-shrink-0" title={c.label}>
                  {c.label}
                </span>
              );
            }
            if (c.status === "closed") {
              return (
                <span className="text-[10px] bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border border-zinc-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 flex-shrink-0" title={c.label}>
                  {c.label}
                </span>
              );
            }
            return (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 flex-shrink-0" title={c.label}>
                🟢 In Window
              </span>
            );
          })()}
          {habit.streak > 0 && (
            <span className="text-[11px] text-primary font-mono font-bold flex items-center gap-0.5 flex-shrink-0 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md shadow-2xs" title={`Current Streak: ${habit.streak} days`}>
              <Flame className="w-3.5 h-3.5 text-primary fill-primary/20 inline" />
              <span>{habit.streak}</span>
            </span>
          )}
          {isSkipped && (
            <span className="text-[10px] bg-surface/80 border border-border/60 px-2 py-0.5 rounded font-mono text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Shield className="w-3 h-3 text-muted-foreground inline" />
              <span>{skipReason}</span>
            </span>
          )}
          {habit.startTime && (
            <span className="text-[11px] font-mono text-muted-foreground bg-surface border border-border/40 px-2 py-0.5 rounded flex-shrink-0">
              {formatTime12(habit.startTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isCompletedToday && !isSkipped && (
            <>
              {/* Primary 1-Tap Focus Sprint Button / Live Timer Indicator */}
              {focusTimer.isRunning && (focusTimer.linkedHabitId === habit.id || focusTimer.activeTaskName === habit.name) ? (
                <button
                  type="button"
                  onClick={() => focusTimer.toggleTimer()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs animate-pulse shrink-0"
                  title="Session in progress - click to pause/resume"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{Math.floor(focusTimer.remainingSec / 60)}:{(focusTimer.remainingSec % 60).toString().padStart(2, "0")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    focusTimer.startHabitFocus(habit, habit.focus_duration_minutes || 25);
                    toast.success(`⏱️ ${habit.focus_duration_minutes || 25}m Focus Sprint launched for "${habit.name}"!`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary-foreground hover:text-white border border-primary/30 hover:border-primary text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105 shrink-0"
                  title="Launch Pomodoro Focus Session"
                >
                  <Zap className="w-3 h-3 fill-primary/30" />
                  <span>{habit.focus_duration_minutes || 25}m Sprint</span>
                </button>
              )}

              {/* Direct 1-Tap 2m Micro Pill */}
              <button
                type="button"
                onClick={() => completeHabit(habit.id, "micro")}
                className="px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent text-accent-foreground border border-accent/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105 shrink-0"
                title="Scale down to 2-minute emergency micro-habit (+2 XP, streak protected)"
              >
                <Layers className="w-3 h-3 text-accent-foreground" />
                <span>2m Micro</span>
              </button>

              {/* Advanced Actions Dropdown (2m Micro, Parkinson's Slice, Rest / Sick / Busy) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-lg bg-surface/80 hover:bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-xs"
                    title="Advanced options"
                    aria-label="Habit options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 z-[2000] bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl p-1.5 rounded-xl">
                  <DropdownMenuItem
                    onClick={() => completeHabit(habit.id, "micro")}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-amber-500/10"
                  >
                    <span className="p-1 rounded-md bg-amber-500/15 text-amber-400"><Layers className="w-3.5 h-3.5" /></span>
                    <div>
                      <div className="font-bold text-foreground">2m Micro-Habit</div>
                      <div className="text-[10px] text-muted-foreground">Low energy fallback (+2 XP)</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTargetHabitForSlicing(habit);
                      setParkinsonsModalOpen(true);
                    }}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-indigo-500/10"
                  >
                    <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-400"><Clock className="w-3.5 h-3.5" /></span>
                    <div>
                      <div className="font-bold text-foreground">Parkinson's Slicer</div>
                      <div className="text-[10px] text-muted-foreground">Slice into a 15m sprint</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 border-border/60" />
                  <DropdownMenuItem
                    onClick={() => completeHabit(habit.id, "rest")}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-emerald-500/10"
                  >
                    <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-400"><Sparkles className="w-3.5 h-3.5" /></span>
                    <div>
                      <div className="font-bold text-foreground">Rest Day</div>
                      <div className="text-[10px] text-muted-foreground">Honored recovery (+5 XP)</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSkipHabit(habit.id, "Sick")}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-rose-500/10"
                  >
                    <span className="p-1 rounded-md bg-rose-500/15 text-rose-400"><Shield className="w-3.5 h-3.5" /></span>
                    <div>
                      <div className="font-bold text-foreground">Sick Day</div>
                      <div className="text-[10px] text-muted-foreground">Pause streak with shield</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSkipHabit(habit.id, "Busy")}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface"
                  >
                    <span className="p-1 rounded-md bg-muted text-muted-foreground"><Briefcase className="w-3.5 h-3.5 text-blue-400" /></span>
                    <div>
                      <div className="font-bold text-foreground">Busy Day</div>
                      <div className="text-[10px] text-muted-foreground">Reschedule without guilt</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono whitespace-nowrap shrink-0 shadow-xs ${tagClass}`}>
            {tagNode}
          </span>
        </div>
      </motion.div>
    );
  };

  const renderEmptyList = (text: string) => (
    <div className="flex items-center justify-center gap-2 py-4 bg-surface/30 border border-dashed border-border/50 rounded-xl text-xs text-muted-foreground font-mono">
      <Sparkles className="w-3.5 h-3.5 text-primary/70 inline" />
      <span>{text}</span>
    </div>
  );

  const nextBestAction = getNextBestAction({
    habits,
    todayStr,
    currentTimeStr: getCurrentTimeHHMM(),
    skippedHabits,
  });

  return (
    <div className="space-y-3 sm:space-y-4 relative">
      {/* ── 🌌 3D AMBIENT SPATIAL PERFORMANCE CANVAS (Gyroscope Orbit & Kaizen Gem) ── */}
      <ThreePerformanceCanvas />

      {/* ── 🚨 Active Emergency Triage Banner ── */}
      <TriageActiveBanner onOpenModal={() => setTriageModalOpen(true)} />

      {/* ── ZONE 1: Context & Interactive Demo Experience Guide ── */}
      {user?.isGuest ? (
        <InteractiveDemoExperienceBanner
          guestDaysRemaining={guestDaysRemaining}
          onNavigate={onNavigate}
          onStartSprint={(duration) => {
            focusTimer.changeTimerMode("custom", duration);
            focusTimer.setActiveTaskName("Demo Deep Work Sprint");
            focusTimer.startTimer();
            toast.success(`⚡ Demo Sprint Launched (${duration}m) with Ambient Soundscape`);
          }}
        />
      ) : nudge && dismissedNudgeId !== nudge.id ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-card to-accent/5 border border-primary/25 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs mb-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg p-1.5 bg-primary/10 rounded-lg flex-shrink-0">{nudge.icon}</span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground mr-1.5">{nudge.title}</span>
              <span className="text-[11px] text-muted-foreground hidden md:inline truncate">{nudge.message}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
            <Link
              to="/login?tab=signup"
              className="text-[11px] bg-primary text-primary-foreground font-bold px-3 py-1 rounded-lg hover:bg-primary/90 transition-all shadow-2xs"
            >
              {nudge.ctaText}
            </Link>
            <button
              onClick={() => handleDismissNudge(nudge.id)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface/50 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : null}

      {/* ── LAYER 1: UNIFIED COCKPIT HEADER (Status, Energy State, Ambient Audio) ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/60 shadow-lg relative z-10"
      >
        {/* Left: Greeting, Date & System Pulse */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 via-accent/20 to-primary/10 border border-primary/30 flex items-center justify-center text-lg shadow-inner flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-sm font-black text-foreground flex items-center gap-2">
              <span>{getGreeting()}, {profile?.displayName?.split(" ")[0] || "Champion"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" title="System Live" />
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              {vayuCurrentBlock?.title ? ` · Focus: ${vayuCurrentBlock.title}` : " · Daily Flow"}
            </div>
          </div>
        </div>

        {/* Right: 1-Tap Energy State & Procedural Soundscape */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Energy State Quick Toggles */}
          <div className="flex items-center gap-1 bg-surface/90 border border-border/80 p-0.5 rounded-xl">
            <span className="text-[10px] font-mono text-muted-foreground px-2 uppercase font-bold flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" /> State:
            </span>
            {[
              { id: "high", icon: "⚡", label: "Peak", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
              { id: "flow", icon: "🎯", label: "Flow", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" },
              { id: "steady", icon: "☕", label: "Steady", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
              { id: "low", icon: "🔋", label: "Low", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
            ].map((m) => {
              const isActive = mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleMoodSelect(m.id, m.label)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${isActive
                      ? `${m.color} border font-bold shadow-xs scale-105`
                      : "text-muted-foreground hover:text-foreground hover:bg-surface"
                    }`}
                >
                  <span>{m.icon}</span>
                  <span className="text-[11px]">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Procedural Ambient Soundscape */}
          <div className="flex items-center gap-1 bg-surface/90 border border-border/80 p-0.5 rounded-xl">
            <span className="text-[10px] font-mono text-muted-foreground px-2 flex items-center gap-1 font-bold">
              <Headphones className="w-3 h-3 text-primary" /> Audio:
            </span>
            {(["none", "rain", "lofi", "coffee", "library"] as AmbienceType[]).map((type) => {
              const isPlaying = soundscape === type;
              const labels: Record<AmbienceType, { icon: string; label: string }> = {
                none: { icon: "Off", label: "Off" },
                rain: { icon: "🌧️", label: "Rain" },
                lofi: { icon: "🎵", label: "Lo-Fi" },
                coffee: { icon: "☕", label: "Cafe" },
                library: { icon: "📖", label: "Library" },
              };
              return (
                <button
                  key={type}
                  onClick={() => handleToggleSoundscape(type)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isPlaying
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                  title={`Procedural ${type} focus soundscape`}
                >
                  <span>{labels[type].icon}</span>
                </button>
              );
            })}
          </div>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleAudioMute}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isAudioMuted
                ? "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
                : "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25"
              }`}
            title={isAudioMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>

      {/* ── SPEED-DIAL QUICK COMMAND DOCK ── */}
      <InteractiveQuickDock
        onAddHabitClick={() => {
          const el = document.getElementById("quick-add-habit-card");
          if (el) el.scrollIntoView({ behavior: "smooth" });
          else if (onNavigate) onNavigate("habits");
        }}
        onOpenAiAgent={() => toggleAiAgentBox()}
        onToggleZenMode={() => setViewMode((prev) => (prev === "zen" ? "priority" : "zen"))}
        isZenMode={viewMode === "zen"}
        onNavigate={onNavigate}
        maxStreak={maxStreak}
        freezeCredits={freezeCredits}
        hasAiRecommendation={habits.some((h) => !h.completedDates.includes(todayStr))}
      />

      {/* ── LOADING SKELETONS (shown while habits sync from cloud) ── */}
      {habitsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/4 rounded bg-surface mb-2" />
                  <div className="h-3 w-1/2 rounded bg-surface" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LAYER 2: THE VITALITY COMMAND DECK (4 High-Contrast Cohesive Cards) ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {/* Card 1: Today's Momentum + High-Contrast 7-Day Sparkline */}
        <div className="col-span-2 sm:col-span-1 flex flex-col justify-between p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm group hover:border-primary/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={completionRate >= 100 ? "#10b981" : "hsl(var(--primary))"}
                  strokeWidth="2.5"
                  strokeDasharray={`${(completionRate / 100) * 97.4} 97.4`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-foreground">
                {completionRate}<span className="text-[9px]">%</span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-black text-foreground leading-tight">{doneToday.length}/{dueToday.length}</div>
              <div className="text-[11px] text-muted-foreground font-mono">Today's Habits</div>
            </div>
          </div>
          {/* High-Contrast 7-Day Sparkline */}
          <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-border/60">
            {rolling7Days.map((d) => (
              <div
                key={d.dateStr}
                className={`flex flex-col items-center justify-center w-6 h-6 rounded-lg text-[9px] font-mono font-bold transition-all shadow-xs ${d.isToday
                    ? "ring-2 ring-primary bg-primary/25 text-primary font-black scale-105"
                    : d.isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10"
                      : "bg-surface/80 text-foreground/50 border border-border/80"
                  }`}
                title={`${d.dateStr}: ${d.count} completed`}
              >
                {d.isCompleted ? "✓" : d.label.slice(0, 1)}
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Streak & Shield Vault + Vitality Badge */}
        <div
          onClick={() => onNavigate?.("streak")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigate?.("streak");
            }
          }}
          className="flex flex-col justify-between p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
          title="Open Streak Engine"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
              🔥
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-black text-foreground leading-tight">
                {maxStreak}<span className="text-xs text-muted-foreground font-normal ml-0.5">d streak</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                {freezeCredits > 0 ? `${freezeCredits} 🛡️ shields` : "Streak Active"}
              </div>
            </div>
          </div>
          {/* Vitality Indicator */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60">
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 font-bold">
              <Activity className="w-3 h-3 text-emerald-400" /> Vitality
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-accent/10 text-accent-foreground border border-accent/30">
              {vitality.score} · {vitality.tier}
            </span>
          </div>
        </div>

        {/* Card 3: Deep Work Studio + Quick 25m Pomodoro Trigger */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-foreground leading-tight">
                  {todayFocusMinutes}<span className="text-xs text-muted-foreground font-normal ml-0.5">m</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">Deep Work</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (focusTimer.isRunning) {
                  focusTimer.pauseTimer();
                  toast.info("Timer paused");
                } else {
                  focusTimer.changeTimerMode("pomodoro", 25);
                  focusTimer.startTimer();
                  toast.success("⚡ 25m Focus Sprint started!");
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${focusTimer.isRunning
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 hover:scale-105"
                }`}
            >
              {focusTimer.isRunning ? "Pause" : "+25m"}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
            <span>Goal: {profile?.daily_focus_target_minutes || 60}m</span>
            <span className="text-primary font-bold">{Math.min(100, Math.round((todayFocusMinutes / (profile?.daily_focus_target_minutes || 60)) * 100))}%</span>
          </div>
        </div>

        {/* Card 4: Next Target or Active Focus Sprint Monitor */}
        <div className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${focusTimer.isRunning
            ? "bg-gradient-to-br from-emerald-500/15 via-card to-primary/10 border-emerald-500/40"
            : "bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/30"
          }`}>
          {focusTimer.isRunning ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase font-mono text-emerald-700 dark:text-emerald-400 font-black tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Sprint Active</span>
                  </div>
                  <div className="text-xs font-black text-foreground truncate mt-0.5">
                    {focusTimer.activeTaskName || "Deep Work Sprint"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => focusTimer.toggleTimer()}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono hover:bg-emerald-500/30 transition-all cursor-pointer shadow-xs flex-shrink-0"
                  title="Pause active focus session"
                >
                  <span>{Math.floor(focusTimer.remainingSec / 60)}:{(focusTimer.remainingSec % 60).toString().padStart(2, "0")}</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span>⏱️</span>
                  <span>In Progress</span>
                </span>
                <span className="capitalize">{focusTimer.timerMode}</span>
              </div>
            </>
          ) : nextBestAction ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase font-mono text-primary font-black tracking-wider">Next Target</div>
                  <div className="text-xs font-black text-foreground truncate mt-0.5">{nextBestAction.name}</div>
                </div>
                <button
                  onClick={() => {
                    focusTimer.startHabitFocus(nextBestAction, nextBestAction.focus_duration_minutes || 25);
                    toast.success(`⚡ Sprint launched for "${nextBestAction.name}"!`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/25 flex-shrink-0 flex items-center gap-1 hover:scale-105"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Go</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
                <span>Est: {nextBestAction.focus_duration_minutes || 25}m</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{nextBestAction.priority || "Normal"}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-2 my-auto">
              <div className="text-xs font-black text-primary font-mono">✓ All Caught Up!</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">No pending tasks for today</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 👑 PRO-EXCLUSIVE COGNITIVE AI PERFORMANCE AGENT BOX ── */}
      <AnimatePresence>
        {showAiAgentBox && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <ProAiPerformanceAgentBox
              habits={habits}
              todayFocusMinutes={todayFocusMinutes}
              targetFocusMinutes={profile?.daily_focus_target_minutes || 60}
              completionRate={completionRate}
              maxStreak={maxStreak}
              primaryTrack={profile?.primary_track || "placements"}
              onStartSprint={(taskName, duration) => {
                focusTimer.changeTimerMode("pomodoro", duration);
                focusTimer.setActiveTaskName(taskName);
                focusTimer.startTimer();
                toast.success(`⚡ Sprint launched for "${taskName}"!`);
              }}
              onNavigate={onNavigate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LAYER 3: FOCUS POWER TOOLS (Collapsible Quick Action Drawer) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={togglePowerTools}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer py-0.5 group"
          >
            <Wrench className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
            <span>Focus Power Tools (3)</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${powerToolsOpen ? "rotate-180" : ""}`} />
          </button>
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            {powerToolsOpen ? "Click to collapse" : "Triage • Parkinson's Slicer • Syllabus"}
          </span>
        </div>

        <AnimatePresence>
          {powerToolsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Tool 1: Emergency Triage */}
                <button
                  type="button"
                  onClick={() => setTriageModalOpen(true)}
                  className="p-3 rounded-2xl bg-gradient-to-r from-rose-500/15 via-card to-rose-500/5 border border-rose-500/35 hover:border-rose-500/70 transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 group-hover:scale-110 transition-transform flex-shrink-0">
                      🚨
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Emergency Triage</span>
                        <span className="text-[9px] font-mono uppercase bg-rose-500/25 text-rose-300 px-1.5 py-0.2 rounded-md font-bold">
                          Panic Mode
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Mute noise, shield streaks, isolate 1 target
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-rose-400 font-bold group-hover:translate-x-1 transition-transform ml-2">→</span>
                </button>

                {/* Tool 2: Parkinson's Slicer */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetHabitForSlicing(null);
                    setParkinsonsModalOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-card to-amber-500/5 border border-amber-500/35 hover:border-amber-500/70 transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 group-hover:scale-110 transition-transform flex-shrink-0">
                      ⏳
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Parkinson’s Slicer</span>
                        <span className="text-[9px] font-mono uppercase bg-amber-500/25 text-amber-300 px-1.5 py-0.2 rounded-md font-bold">
                          Anti-Procrastinate
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Slice distant deadlines into 15m micro-bites
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition-transform ml-2">→</span>
                </button>

                {/* Tool 3: Syllabus Decomposer */}
                <button
                  type="button"
                  onClick={() => setSyllabusModalOpen(true)}
                  className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-card to-cyan-500/5 border border-cyan-500/35 hover:border-cyan-500/70 transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 group-hover:scale-110 transition-transform flex-shrink-0">
                      📚
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Syllabus Decomposer</span>
                        <span className="text-[9px] font-mono uppercase bg-cyan-500/25 text-cyan-300 px-1.5 py-0.2 rounded-md font-bold">
                          30-Day Track
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Deconstruct exams & roadmaps into habits
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-400 font-bold group-hover:translate-x-1 transition-transform ml-2">→</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── LAYER 4: DAILY HABITS CORE & COMPANION RAIL (8:4 Responsive Grid) ── */}
      {habits.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-card via-surface/60 to-primary/10 shadow-xl space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-4xl shadow-sm shadow-primary/20 flex-shrink-0">
              🚀
            </div>
            <h3 className="text-2xl font-black text-foreground font-mono tracking-tight">
              Welcome to Your Command Dashboard!
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md px-4">
              Build unstoppable daily momentum. Install our curated Starter Habit Stack below or create custom habits.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleInstallStarterStack}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-black transition-all hover:scale-105 shadow-lg shadow-primary/25 cursor-pointer flex items-center gap-2 group"
            >
              <span>⚡</span>
              <span>Install Starter Stack (3 Habits)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${showCompanionRail ? "lg:grid-cols-12" : "grid-cols-1"} gap-4 items-start`}>
          {/* Habits Canvas & Unified Toolbar */}
          <div className={`${showCompanionRail ? "lg:col-span-8" : "w-full"} flex flex-col gap-3`}>

            {/* Quick 1-Tap Category Filter Chips & Time Estimate Bar */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap overflow-x-auto">
                {categories.map((c) => {
                  const isSelected = categoryFilter === c;
                  const count =
                    c === "All"
                      ? dueToday.length
                      : dueToday.filter((h) => (h.category || "").trim() === c).length;
                  const color = getCategoryColor(c);
                  return (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${isSelected
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/25 font-bold scale-105"
                          : "bg-card hover:bg-card/90 text-foreground/80 hover:text-foreground border-border/80 shadow-xs"
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : color.dot}`} />
                      <span>{c === "All" ? "All" : formatCategoryName(c)}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isSelected
                            ? "bg-white/20 text-white"
                            : `${color.bg} ${color.text} border ${color.border}`
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {dueToday.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0 shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{formatRemainingTime(remainingEstimatedMinutes)}</span>
                </div>
              )}
            </div>

            {/* View Switcher, Density, Bulk Done & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-card/85 backdrop-blur-md border border-border/80 shadow-xs">
              {/* Left controls: Density, View Mode, Bulk All Done */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Density Switcher */}
                <div className="flex items-center gap-1 bg-surface border border-border/80 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => handleDensityModeChange("comfortable")}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${densityMode === "comfortable" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    title="Card view"
                  >
                    ⠿ Cards
                  </button>
                  <button
                    onClick={() => handleDensityModeChange("compact")}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${densityMode === "compact" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    title="Compact view"
                  >
                    ☰ Compact
                  </button>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-surface border border-border/80 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => handleViewModeChange("priority")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewMode === "priority" ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span>🎯</span>
                    <span>Priority</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange("timeblock")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewMode === "timeblock" ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span>⏰</span>
                    <span>Time Block</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange("zen")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewMode === "zen" ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span>⚡</span>
                    <span>Zen</span>
                  </button>
                </div>

                {/* Sidebar / Wide Deck Toggle */}
                <button
                  type="button"
                  onClick={toggleCompanionRail}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold border ${!showCompanionRail
                      ? "bg-primary/20 text-primary border-primary/40 font-bold shadow-xs"
                      : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
                    }`}
                  title={showCompanionRail ? "Expand habits to full width (hide sidebar)" : "Show companion sidebar"}
                >
                  <Sidebar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{showCompanionRail ? "Wide" : "Sidebar"}</span>
                </button>

                {/* ⚡ All Done Button */}
                {dueToday.length > 0 && doneToday.length < dueToday.length && (
                  <button
                    onClick={markAllDone}
                    className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground text-xs font-semibold py-1 px-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Press 'M' on keyboard"
                  >
                    <span>⚡ All Done</span>
                    <kbd className="text-[9px] bg-primary/20 px-1 py-0.2 rounded font-mono">M</kbd>
                  </button>
                )}
              </div>

              {/* Right: Search Input */}
              <div className="relative flex-1 max-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  maxLength={100}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search habits..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-surface border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Habit List */}
            <AnimatePresence mode="wait">
              {viewMode === "zen" ? (
                <ZenFocusSpotlight
                  dueHabits={dueToday}
                  todayStr={todayStr}
                  onToggle={handleToggleHabit}
                  onSkip={handleSkipHabit}
                  onExit={() => setViewMode("priority")}
                  skippedHabits={skippedHabits}
                />
              ) : viewMode === "priority" ? (
                <motion.div
                  key="priority-view"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3.5"
                >
                  {[
                    { title: "🔴 Critical Tasks", borderColor: "border-l-destructive", tasks: sortedCritical, emptyText: "No critical tasks 🎉" },
                    { title: "🟠 High Priority", borderColor: "border-l-pps-orange", tasks: sortedHigh, emptyText: "No high priority tasks" },
                    { title: "🟡 Medium Focus", borderColor: "border-l-pps-yellow", tasks: sortedMedium, emptyText: "No medium tasks" },
                    { title: "🟢 Upcoming", borderColor: "border-l-pps-green", tasks: sortedUpcoming, emptyText: "No upcoming tasks" },
                  ].map((section, i) => (
                    <motion.div key={section.title} variants={fadeUp} custom={i} initial="hidden" animate="visible">
                      <TaskSection {...section} renderTask={renderTask} renderEmptyList={renderEmptyList} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="timeblock-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3.5"
                >
                  {[
                    { key: "morning", title: "🌅 Morning Ritual (05:00 - 12:00)", borderColor: "border-l-secondary", tasks: morningHabits, emptyText: "No morning habits scheduled" },
                    { key: "afternoon", title: "☀️ Afternoon Focus (12:00 - 17:00)", borderColor: "border-l-pps-orange", tasks: afternoonHabits, emptyText: "No afternoon habits scheduled" },
                    { key: "evening", title: "🌙 Evening Wind-down (17:00 - 00:00)", borderColor: "border-l-primary", tasks: eveningHabits, emptyText: "No evening habits scheduled" },
                    { key: "anytime", title: "⏰ Flexible & Anytime", borderColor: "border-l-pps-green", tasks: anytimeHabits, emptyText: "No flexible habits" },
                  ].map((section, i) => {
                    const isCurrent = section.key === getCurrentTimeBlock();
                    return (
                      <motion.div key={section.title} variants={fadeUp} custom={i} initial="hidden" animate="visible" className={isCurrent ? "ring-2 ring-primary/40 rounded-xl" : ""}>
                        <TaskSection
                          {...section}
                          title={isCurrent ? `${section.title} — 📍 NOW` : section.title}
                          renderTask={renderTask}
                          renderEmptyList={renderEmptyList}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right 4 Columns: Quick Access Companion Panel */}
          {showCompanionRail && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="lg:col-span-4 flex flex-col gap-3"
            >
              {/* Immediate Reminders Alert Strip */}
              <ImmediateRemindersStrip reminders={reminders} />

              {/* 🌬️ Autonomous Adaptive Circadian Flow Banner */}
              <VayuPulseBanner
                plan={vayuPlan}
                currentBlock={vayuCurrentBlock}
                nextBlock={vayuNextBlock}
                completionRate={vayuRate}
                onProcessInput={processVayuInput}
                onRebalance={rebalanceVayuSchedule}
                onOpenStudio={() => setIsVayuStudioOpen(true)}
                onCompleteCurrent={(blockId) => completeVayuBlock(blockId, 100, "manual")}
                onStartSprint={(block) => {
                  focusTimer.changeTimerMode("custom", block.durationMinutes);
                  focusTimer.setActiveTaskName(block.title);
                  if (block.linkedHabitId || block.habitId) {
                    focusTimer.setLinkedHabitId(block.linkedHabitId || block.habitId || null);
                  }
                  focusTimer.startTimer();
                  toast.success(`⚡ Launched ${block.durationMinutes}m focus sprint for "${block.title}"`);
                }}
                activeTimer={{
                  isRunning: focusTimer.isRunning,
                  remainingSec: focusTimer.remainingSec,
                  activeTaskName: focusTimer.activeTaskName,
                  linkedHabitId: focusTimer.linkedHabitId,
                }}
                onToggleTimer={focusTimer.toggleTimer}
              />

              {/* Embedded Mini Pomodoro Timer */}
              <MiniPomodoroCard onNavigate={onNavigate} />

              {/* Quick Habit Add Drawer / Input with Track-Adaptive Recommendation Chips */}
              <QuickAddHabitCard onAddHabit={addHabit} primaryTrack={profile?.primary_track} />
            </motion.div>
          )}
        </div>
      )}

      {/* ── ZONE 3: SECONDARY COMMAND HUB (Full Ecosystem in Tabs) ── */}
      <DashboardCommandHub
        completionRate={completionRate}
        maxStreak={maxStreak}
        freezeCredits={freezeCredits}
        weeklyPoints={weeklyPoints}
        habits={habits}
        onNavigate={onNavigate}
        todayStr={todayStr}
        addHabit={addHabit}
        reminders={reminders}
        suggestions={suggestions}
        onAcceptSuggestion={handleAcceptSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />

      {/* Global Overlays preserved */}
      <VayuFlowStudioModal
        isOpen={isVayuStudioOpen}
        onClose={() => setIsVayuStudioOpen(false)}
        plan={vayuPlan}
        onGenerateNewPlan={generateVayuPlan}
        onRebalance={rebalanceVayuSchedule}
        onCompleteBlock={(blockId, pct) => completeVayuBlock(blockId, pct || 100, "manual")}
        onStartSprint={(block) => {
          focusTimer.changeTimerMode("custom", block.durationMinutes);
          focusTimer.setActiveTaskName(block.title);
          if (block.linkedHabitId || block.habitId) {
            focusTimer.setLinkedHabitId(block.linkedHabitId || block.habitId || null);
          }
          focusTimer.startTimer();
          toast.success(`⚡ Launched ${block.durationMinutes}m focus sprint for "${block.title}"`);
        }}
      />


      <CelebrationOverlay
        show={showCelebration}
        onClose={() => setShowCelebration(false)}
        type="badge"
        title="All Habits Done!"
        subtitle="You crushed every single habit today. Keep this momentum going!"
        icon="🎉"
      />

      {/* ── 🎯 Phase 3: Dopamine & Motivation Modals ── */}
      <EmergencyTriageModal
        isOpen={triageModalOpen}
        onClose={() => setTriageModalOpen(false)}
      />

      <ParkinsonsLawInverterModal
        isOpen={parkinsonsModalOpen}
        onClose={() => setParkinsonsModalOpen(false)}
        targetHabit={targetHabitForSlicing}
      />

      <SyllabusDecomposerModal
        isOpen={syllabusModalOpen}
        onClose={() => setSyllabusModalOpen(false)}
      />

      {/* ── ⚡ Task 1.2: Proof-of-Focus Anti-Cheat Modal ── */}
      {timerLockModalHabit && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-amber-500/30 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl shrink-0">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Focus Session Required</h3>
                <p className="text-xs text-muted-foreground">Proof-of-Focus Habit Lock</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              This anchor habit <span className="font-semibold text-amber-400">"{timerLockModalHabit.name}"</span> requires a verified focus sprint ({timerLockModalHabit.focus_duration_minutes || 25}m). Ready to start?
            </p>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const habit = timerLockModalHabit;
                  setTimerLockModalHabit(null);
                  handleToggleHabit(habit.id, true);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Mark Done Manually
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerLockModalHabit(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const habit = timerLockModalHabit;
                    setTimerLockModalHabit(null);
                    focusTimer.startHabitFocus(habit, habit.focus_duration_minutes || 25);
                    toast.success(`⏱️ Focus Sprint started for "${habit.name}"!`);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <span>⚡</span>
                  <span>Start Sprint ({timerLockModalHabit.focus_duration_minutes || 25}m)</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── ⏳ Task 1.3: Circadian Window Warning Modal ── */}
      {circadianModalHabit && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-blue-500/30 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-xl shrink-0">
                ⏳
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Circadian Time-Window Gating</h3>
                <p className="text-xs text-muted-foreground">Biological Rhythm Alignment</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              <span className="font-semibold text-blue-400">"{circadianModalHabit.habit.name}"</span> is currently outside its scheduled circadian window: <span className="font-mono text-foreground font-semibold">{circadianModalHabit.label}</span>.
              <br /><br />
              Do you want to log it anyway using Grace Mode, or wait for the biological window?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCircadianModalHabit(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted cursor-pointer"
              >
                Wait for Window
              </button>
              <button
                type="button"
                onClick={() => {
                  const habit = circadianModalHabit.habit;
                  setCircadianModalHabit(null);
                  handleToggleHabit(habit.id, true);
                }}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer shadow-md"
              >
                Complete (Grace Mode)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

function ZenFocusSpotlight({
  dueHabits,
  todayStr,
  onToggle,
  onSkip,
  onExit,
  skippedHabits,
}: {
  dueHabits: any[];
  todayStr: string;
  onToggle: (id: string) => void;
  onSkip: (id: string, reason: string) => void;
  onExit: () => void;
  skippedHabits: Record<string, string>;
}) {
  const [index, setIndex] = useState(0);
  const uncompleted = dueHabits.filter((h) => !h.completedDates.includes(todayStr));
  const current = uncompleted[index % (uncompleted.length || 1)] || dueHabits[0];

  if (!current || uncompleted.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-primary/30 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xl my-6"
      >
        <div className="text-6xl mb-3">🏆</div>
        <h3 className="text-xl font-bold text-foreground">Zen Focus Complete!</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-5">
          You completed all habits due for today. Rest up or celebrate your win!
        </p>
        <button
          onClick={onExit}
          className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-xl text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-md"
        >
          ← Return to Dashboard
        </button>
      </motion.div>
    );
  }

  const isDone = current.completedDates.includes(todayStr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-card border border-primary/30 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl my-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] uppercase font-mono tracking-widest bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">
          🎯 Zen Spotlight ({index + 1} of {uncompleted.length})
        </span>
        <button
          onClick={onExit}
          className="text-xs text-muted-foreground hover:text-foreground bg-surface border border-border/60 px-3 py-1 rounded-lg cursor-pointer transition-all"
        >
          Exit Zen Mode ✕
        </button>
      </div>

      <div className="text-center py-4">
        <span className="text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold">Scheduled Focus Habit</span>
        <h2 className="text-2xl font-bold text-foreground mt-1 mb-2">{current.name}</h2>
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="bg-surface border border-border/60 px-2.5 py-0.5 rounded-full font-mono text-muted-foreground">
            {current.category || "General"}
          </span>
          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold font-mono">
            {current.priority} Priority
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <button
          onClick={() => onToggle(current.id)}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${isDone
              ? "bg-pps-green text-white hover:bg-pps-green/90"
              : "bg-gradient-to-br from-primary to-accent text-primary-foreground hover:shadow-lg hover:scale-[1.02]"
            }`}
        >
          <span>{isDone ? "✅ Completed!" : "⚡ Mark Complete (+10 XP)"}</span>
        </button>

        {!isDone && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-mono mr-1">Skip:</span>
            {["Rest Day 💤", "Sick 🤒", "Busy 💼"].map((r) => (
              <button
                key={r}
                onClick={() => onSkip(current.id, r.split(" ")[0])}
                className="bg-surface border border-border/80 text-[11px] px-2.5 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer font-medium"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-8 pt-4 border-t border-border/40 text-xs">
        <button
          onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
          disabled={index === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer font-semibold"
        >
          ← Previous
        </button>
        <span className="font-mono text-muted-foreground text-[11px]">{uncompleted.length} habits remaining</span>
        <button
          onClick={() => setIndex((prev) => prev + 1)}
          disabled={index >= uncompleted.length - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer font-semibold"
        >
          Next →
        </button>
      </div>
    </motion.div>
  );
}

export default DashboardSection;
