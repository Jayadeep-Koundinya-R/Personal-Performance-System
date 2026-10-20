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
import { EmergencyTriageModal } from "@/components/dashboard/EmergencyTriageModal";
import { TriageActiveBanner } from "@/components/dashboard/TriageActiveBanner";
import { ParkinsonsLawInverterModal } from "@/components/habits/ParkinsonsLawInverterModal";
import { SyllabusDecomposerModal } from "@/components/syllabus/SyllabusDecomposerModal";
import { Link } from "react-router-dom";
import { Search, X, Volume2, VolumeX, Zap, MoreHorizontal, Headphones, Battery, BatteryCharging, Sparkles, Activity, Clock, Shield, Flame } from "lucide-react";
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
  const { user } = useAuth();
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

  // ── 🌬️ Vayu Autonomous Real-Time Flow Subsystem ──
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

  // Global listener for Vayu Sprint Launch events
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
    } catch {}

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
      } catch {}
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
    } catch {}
  };

  const handleDensityModeChange = (mode: "comfortable" | "compact") => {
    setDensityMode(mode);
    try {
      localStorage.setItem("pps_dashboard_density", mode);
    } catch {}
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
    } catch {}
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
  }, [habits, todayStr]);

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
      } catch {}

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
    } catch {}
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
      } catch {}

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
      } catch {}

      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
      toast.info("Suggestion dismissed");
    } catch {}
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
  }, [dueToday, doneToday.length, markAllDone, todayStr, skippedHabits, focusTimer, viewMode]);

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
      return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" };
    }
    if (cat.includes("prod") || cat.includes("work") || cat.includes("code") || cat.includes("deep")) {
      return { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" };
    }
    if (cat.includes("learn") || cat.includes("study") || cat.includes("read") || cat.includes("book")) {
      return { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-400" };
    }
    if (cat.includes("mindful") || cat.includes("meditat") || cat.includes("peace")) {
      return { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" };
    }
    if (cat.includes("mindset") || cat.includes("gratitude") || cat.includes("journal")) {
      return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" };
    }
    return { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" };
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
    let tagText = "Due " + dueDate.toLocaleDateString(undefined, { weekday: "long" });

    if (isSkipped) {
      tagClass = "bg-surface/80 text-muted-foreground border border-border/80 font-mono";
      tagText = `Skipped (${skipReason})`;
    } else if (diffDays < 0) {
      tagClass = "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold";
      tagText = "Overdue 🚨";
    } else if (diffDays === 0 && isCompletedToday) {
      tagClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold";
      tagText = "Done ✓";
    } else if (diffDays === 0) {
      const urgency = getUrgencyLevel(habit);
      if (urgency === "overdue") {
        tagClass = "bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold animate-pulse shadow-sm shadow-rose-500/20";
        tagText = "Overdue 🚨";
      } else if (urgency === "urgent") {
        tagClass = "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold animate-pulse shadow-sm shadow-amber-500/20";
        tagText = "Urgent ⏳";
      } else {
        tagClass = "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold";
        tagText = "Due Today";
      }
    } else if (diffDays === 1) {
      tagClass = "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-semibold";
      tagText = "Tomorrow";
    }

    if (densityMode === "compact") {
      return (
        <motion.div
          key={habit.id}
          variants={slideRight}
          custom={index}
          initial="hidden"
          animate="visible"
          className={`flex items-center justify-between px-3 py-1.5 bg-surface/60 border rounded-lg mb-1 text-xs cursor-default hover:bg-accent/[0.08] transition-all duration-150 ${
            isCompletedToday
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
                className="text-[9px] bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5 flex-shrink-0 cursor-pointer hover:bg-amber-500/25 transition-all"
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
                  <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono flex-shrink-0" title={c.label}>
                    {c.label}
                  </span>
                );
              }
              if (c.status === "closed") {
                return (
                  <span className="text-[9px] bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 px-1.5 py-0.2 rounded font-mono flex-shrink-0" title={c.label}>
                    {c.label}
                  </span>
                );
              }
              return (
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono flex-shrink-0" title={c.label}>
                  🟢 In Window
                </span>
              );
            })()}
            {habit.streak > 0 && (
              <span className="text-[10px] text-pps-orange font-mono font-bold flex-shrink-0" title={`Streak: ${habit.streak}d`}>
                🔥{habit.streak}
              </span>
            )}
            {isSkipped && (
              <span className="text-[10px] bg-surface/80 border border-border/60 px-1.5 py-0.2 rounded font-mono text-muted-foreground flex-shrink-0">
                ⏸️ {skipReason}
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
                <button
                  type="button"
                  onClick={() => {
                    focusTimer.startHabitFocus(habit, habit.focus_duration_minutes || 25);
                    toast.success(`⏱️ ${habit.focus_duration_minutes || 25}m Focus Sprint launched for "${habit.name}"!`);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-xs shrink-0"
                  title="Launch Pomodoro Focus Session"
                >
                  <Zap className="w-2.5 h-2.5 fill-primary/30" />
                  <span>{habit.focus_duration_minutes || 25}m</span>
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
                      <span>🪜</span>
                      <span>2m Micro-Habit (+2 XP)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setTargetHabitForSlicing(habit);
                        setParkinsonsModalOpen(true);
                      }}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-indigo-500/10"
                    >
                      <span>⏳</span>
                      <span>Parkinson's Slicer</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 border-border/60" />
                    <DropdownMenuItem
                      onClick={() => completeHabit(habit.id, "rest")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-500/10"
                    >
                      <span>💤</span>
                      <span>Rest Day (+5 XP)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSkipHabit(habit.id, "Sick")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg hover:bg-rose-500/10"
                    >
                      <span>🤒</span>
                      <span>Sick Day</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSkipHabit(habit.id, "Busy")}
                      className="cursor-pointer text-xs flex items-center gap-2 p-1.5 rounded-lg"
                    >
                      <span>💼</span>
                      <span>Busy Day</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold font-mono whitespace-nowrap shrink-0 shadow-xs ${tagClass}`}>
              {tagText}
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
        className={`flex items-center justify-between px-3.5 py-2.5 bg-surface/60 border rounded-xl mb-1.5 text-[13.5px] cursor-default hover:bg-accent/[0.08] transition-all duration-150 ${
          isCompletedToday
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
          <span className={`truncate font-medium ${isCompletedToday ? "line-through opacity-45" : ""}`}>{habit.name}</span>
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
              className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer hover:bg-amber-500/25 transition-all"
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
                <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 flex-shrink-0" title={c.label}>
                  {c.label}
                </span>
              );
            }
            if (c.status === "closed") {
              return (
                <span className="text-[10px] bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 flex-shrink-0" title={c.label}>
                  {c.label}
                </span>
              );
            }
            return (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 flex-shrink-0" title={c.label}>
                🟢 In Window
              </span>
            );
          })()}
          {habit.streak > 0 && (
            <span className="text-[11px] text-pps-orange font-mono font-bold flex items-center gap-0.5 flex-shrink-0" title={`Current Streak: ${habit.streak} days`}>
              <span>🔥</span>
              <span>{habit.streak}</span>
            </span>
          )}
          {isSkipped && (
            <span className="text-[10px] bg-surface/80 border border-border/60 px-2 py-0.5 rounded font-mono text-muted-foreground flex-shrink-0">
              ⏸️ {skipReason}
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
              {/* Primary 1-Tap Focus Sprint Button */}
              <button
                type="button"
                onClick={() => {
                  focusTimer.startHabitFocus(habit, habit.focus_duration_minutes || 25);
                  toast.success(`⏱️ ${habit.focus_duration_minutes || 25}m Focus Sprint launched for "${habit.name}"!`);
                }}
                className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs hover:scale-105 shrink-0"
                title="Launch Pomodoro Focus Session"
              >
                <Zap className="w-3 h-3 fill-primary/30" />
                <span>{habit.focus_duration_minutes || 25}m</span>
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
                    <span className="p-1 rounded-md bg-amber-500/15 text-amber-400">🪜</span>
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
                    <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-400">⏳</span>
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
                    <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-400">💤</span>
                    <div>
                      <div className="font-bold text-foreground">Rest Day</div>
                      <div className="text-[10px] text-muted-foreground">Honored recovery (+5 XP)</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSkipHabit(habit.id, "Sick")}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-rose-500/10"
                  >
                    <span className="p-1 rounded-md bg-rose-500/15 text-rose-400">🤒</span>
                    <div>
                      <div className="font-bold text-foreground">Sick Day</div>
                      <div className="text-[10px] text-muted-foreground">Pause streak with shield</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSkipHabit(habit.id, "Busy")}
                    className="cursor-pointer text-xs flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface"
                  >
                    <span className="p-1 rounded-md bg-muted text-muted-foreground">💼</span>
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
            {tagText}
          </span>
        </div>
      </motion.div>
    );
  };

  const renderEmptyList = (text: string) => (
    <div className="flex items-center justify-center gap-2 py-4 bg-surface/30 border border-dashed border-border/50 rounded-xl text-xs text-muted-foreground font-mono">
      <span>✨</span>
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
    <div className="space-y-3 sm:space-y-4">
      {/* ── 🚨 Active Emergency Triage Banner ── */}
      <TriageActiveBanner onOpenModal={() => setTriageModalOpen(true)} />

      {/* ── ZONE 1: Context & Nudges ── */}
      {nudge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/15 via-card to-accent/10 border border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl p-2 bg-primary/10 rounded-xl">{nudge.icon}</div>
            <div>
              <div className="text-sm font-extrabold text-foreground">{nudge.title}</div>
              <div className="text-xs text-muted-foreground">{nudge.message}</div>
            </div>
          </div>
          <Link
            to="/login?tab=signup"
            className="text-xs bg-gradient-to-r from-primary to-accent text-white font-extrabold px-4 py-2 rounded-xl hover:opacity-95 transition-all shadow-sm flex-shrink-0 text-center"
          >
            {nudge.ctaText}
          </Link>
        </motion.div>
      )}

      {/* ── LAYER 1: UNIFIED COCKPIT HEADER (Status, Energy State, Ambient Audio) ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-sm"
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
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    isActive
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
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isPlaying
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
            className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isAudioMuted
                ? "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
                : "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25"
            }`}
            title={isAudioMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>

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
                className={`flex flex-col items-center justify-center w-6 h-6 rounded-lg text-[9px] font-mono font-bold transition-all shadow-xs ${
                  d.isToday
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
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-amber-500/40 transition-all cursor-default">
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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30">
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
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                focusTimer.isRunning
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

        {/* Card 4: Next Best Action Recommendation */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-primary/30 shadow-sm flex flex-col justify-between">
          {nextBestAction ? (
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
                <span>Est: {nextBestAction.focus_duration_minutes || 15}m</span>
                <span className="text-amber-400 font-bold">{nextBestAction.priority || "Normal"}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-2 my-auto">
              <div className="text-xs font-black text-emerald-400">✓ All Caught Up!</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">No pending tasks for today</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── LAYER 3: COMPACT POWER TOOLS ACTION DOCK ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

      {/* ── LAYER 4: DAILY HABITS CORE & COMPANION RAIL (8:4 Responsive Grid) ── */}
      {habits.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-surface/60 to-primary/10 shadow-2xl space-y-6 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
              🚀
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground font-mono">
                Welcome to Your Command Dashboard!
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Build unstoppable daily momentum. Install our curated Starter Habit Stack below or create custom habits.
              </p>
            </div>
            <div className="sm:ml-auto">
              <button
                onClick={handleInstallStarterStack}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black transition-all hover:scale-105 shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
              >
                <span>⚡</span>
                <span>Install Starter Stack (3 Habits)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left 8 Columns: Habits Canvas & Unified Toolbar */}
          <div className="lg:col-span-8 flex flex-col gap-3">

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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/25 font-bold scale-105"
                          : "bg-card hover:bg-card/90 text-foreground/80 hover:text-foreground border-border/80 shadow-xs"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : color.dot}`} />
                      <span>{c}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isSelected
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
                  <span>~{remainingEstimatedMinutes}m left</span>
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
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      densityMode === "comfortable" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Card view"
                  >
                    ⠿ Cards
                  </button>
                  <button
                    onClick={() => handleDensityModeChange("compact")}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      densityMode === "compact" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
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
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === "priority" ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🎯</span>
                    <span>Priority</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange("timeblock")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === "timeblock" ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>⏰</span>
                    <span>Time Block</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange("zen")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === "zen" ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>⚡</span>
                    <span>Zen</span>
                  </button>
                </div>

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

          {/* Right 4 Columns: Quick Access Panel */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* Immediate Reminders Alert Strip */}
            <ImmediateRemindersStrip reminders={reminders} />

            {/* 🌬️ Vayu Real-Time Autonomous Flow Banner */}
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
            />

            {/* Embedded Mini Pomodoro Timer */}
            <MiniPomodoroCard onNavigate={onNavigate} />

            {/* Quick Habit Add Drawer / Input with Track-Adaptive Recommendation Chips */}
            <QuickAddHabitCard onAddHabit={addHabit} primaryTrack={profile?.primary_track} />
          </div>
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
                <h3 className="text-sm font-bold text-foreground">Verified Focus Sprint Required</h3>
                <p className="text-xs text-muted-foreground">Mechanical Anti-Cheat Protection</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              This anchor habit <span className="font-semibold text-amber-400">"{timerLockModalHabit.name}"</span> requires a verified focus sprint ({timerLockModalHabit.focus_duration_minutes || 25}m). Start Sprint now?
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
                Bypass (Grace Mode)
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
          className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
            isDone
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
