import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
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
import { TrackCommandStrip } from "@/components/dashboard/v2/TrackCommandStrip";
import { ImmediateRemindersStrip } from "@/components/dashboard/v2/ImmediateRemindersStrip";
import { QuickAddHabitCard } from "@/components/dashboard/v2/QuickAddHabitCard";
import { DashboardCommandHub } from "@/components/dashboard/v2/DashboardCommandHub";
import { Link } from "react-router-dom";
import { Search, X, Volume2, VolumeX } from "lucide-react";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { toast } from "sonner";

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
    markAllDone,
    isHabitDueToday,
    getTodayStr,
    calculateWeeklyPoints,
    getMaxStreak,
    getTotalFreezeCredits,
  } = useHabits();

  const { profile } = useProfile();
  const { user } = useAuth();
  const { todayFocusMinutes } = useFocusTimer();
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
    toast.info(`Habit marked as ${reason}`, { description: "Streak protected for today! 🧊" });
  };

  const handleToggleHabit = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    const wasCompleted = habit?.completedDates.includes(todayStr);

    if (skippedHabits[habitId]) {
      const next = { ...skippedHabits };
      delete next[habitId];
      setSkippedHabits(next);
      try {
        localStorage.setItem(`pps_skipped_${todayStr}`, JSON.stringify(next));
      } catch {}
    }

    if (!wasCompleted) {
      feedbackSounds.playSuccessChime();
    } else {
      feedbackSounds.playClick();
    }

    await toggleCompletion(habitId);
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

  // Keyboard shortcuts (M: Mark All Done)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      if ((e.key === "m" || e.key === "M") && dueToday.length > 0 && doneToday.length < dueToday.length) {
        e.preventDefault();
        markAllDone();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dueToday.length, doneToday.length, markAllDone]);

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

  const renderTask = (habit: typeof habits[0], index: number) => {
    const dueDate = new Date(habit.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 864e5);
    const isCompletedToday = habit.completedDates.includes(todayStr);
    const skipReason = skippedHabits[habit.id];
    const isSkipped = !!skipReason;

    let tagClass = "bg-primary/10 text-primary";
    let tagText = "Due " + dueDate.toLocaleDateString(undefined, { weekday: "long" });

    if (isSkipped) {
      tagClass = "bg-muted text-muted-foreground border border-border/80 font-mono";
      tagText = `Skipped (${skipReason})`;
    } else if (diffDays < 0) {
      tagClass = "bg-destructive/10 text-destructive";
      tagText = "Overdue";
    } else if (diffDays === 0 && isCompletedToday) {
      tagClass = "bg-pps-green/10 text-pps-green";
      tagText = "Done ✓";
    } else if (diffDays === 0) {
      const urgency = getUrgencyLevel(habit);
      if (urgency === "overdue") {
        tagClass = "bg-destructive/10 text-destructive border border-destructive/20 font-bold animate-pulse";
        tagText = "Overdue 🚨";
      } else if (urgency === "urgent") {
        tagClass = "bg-pps-orange/10 text-pps-orange border border-pps-orange/20 font-bold animate-pulse";
        tagText = "Urgent ⏳";
      } else {
        tagClass = "bg-pps-orange/10 text-pps-orange";
        tagText = "Due Today";
      }
    } else if (diffDays === 1) {
      tagClass = "bg-pps-yellow/10 text-pps-yellow";
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
              <span className="text-[9px] bg-muted/70 text-muted-foreground px-1.5 py-0.2 rounded font-mono flex-shrink-0">
                {habit.category}
              </span>
            )}
            {habit.streak > 0 && (
              <span className="text-[10px] text-pps-orange font-mono font-bold flex-shrink-0" title={`Streak: ${habit.streak}d`}>
                🔥{habit.streak}
              </span>
            )}
            {isSkipped && (
              <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground flex-shrink-0">
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
              <select
                onChange={(e) => {
                  if (e.target.value) handleSkipHabit(habit.id, e.target.value);
                }}
                defaultValue=""
                className="text-[10px] bg-surface border border-border px-1 py-0.5 rounded text-muted-foreground outline-none cursor-pointer hover:border-primary"
                title="Skip today with reason"
              >
                <option value="" disabled>Skip...</option>
                <option value="Rest">Rest Day 💤</option>
                <option value="Sick">Sick 🤒</option>
                <option value="Busy">Busy 💼</option>
              </select>
            )}
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold font-mono whitespace-nowrap ${tagClass}`}>
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
            <span className="text-[10px] bg-surface border border-border/60 text-muted-foreground px-2 py-0.5 rounded-md font-mono flex-shrink-0">
              {habit.category}
            </span>
          )}
          {habit.streak > 0 && (
            <span className="text-[11px] text-pps-orange font-mono font-bold flex items-center gap-0.5 flex-shrink-0" title={`Current Streak: ${habit.streak} days`}>
              <span>🔥</span>
              <span>{habit.streak}</span>
            </span>
          )}
          {isSkipped && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground flex-shrink-0">
              ⏸️ {skipReason}
            </span>
          )}
          {habit.startTime && (
            <span className="text-[11px] font-mono text-muted-foreground bg-surface border border-border/40 px-1.5 py-0.5 rounded flex-shrink-0">
              {formatTime12(habit.startTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isCompletedToday && !isSkipped && (
            <select
              onChange={(e) => {
                if (e.target.value) handleSkipHabit(habit.id, e.target.value);
              }}
              defaultValue=""
              className="text-[11px] bg-surface border border-border px-1.5 py-0.5 rounded text-muted-foreground outline-none cursor-pointer hover:border-primary"
              title="Skip today with reason"
            >
              <option value="" disabled>Skip...</option>
              <option value="Rest">Rest Day 💤</option>
              <option value="Sick">Sick 🤒</option>
              <option value="Busy">Busy 💼</option>
            </select>
          )}
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold font-mono whitespace-nowrap ${tagClass}`}>
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

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {!nudge && maxStreak === 0 && habits.some((h) => (h.completedDates || []).length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-surface to-pps-green/10 border border-primary/25 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-lg flex-shrink-0">
              🌱
            </div>
            <div>
              <div className="text-xs font-black text-foreground flex items-center gap-1.5">
                <span>Welcome Back! Fresh Day Momentum</span>
                <span className="text-[10px] font-mono text-pps-green bg-pps-green/15 px-2 py-0.2 rounded-full font-bold">
                  Zero Guilt • Data, Not Failure
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Consistency is built over months, not single days. Check off your first habit today to start a fresh streak.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.("habits")}
            className="text-xs bg-surface border border-border/80 hover:border-primary text-foreground font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-2xs"
          >
            View Habit Stack →
          </button>
        </motion.div>
      )}

      {/* Track Command Strip Header */}
      <TrackCommandStrip
        profile={profile}
        todayMinutesCompleted={todayFocusMinutes}
        completionRate={completionRate}
        maxStreak={maxStreak}
      />

      {/* ── ZONE 2: PRIMARY ACTION CORE (Above the Fold) ── */}
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
                onClick={async () => {
                  const starters = [
                    { name: "💻 20-min Deep Work Sprint", cat: "Productivity", period: "Daily", priority: "High", time: "09:00", color: "indigo" },
                    { name: "💧 Morning Sunlight & Hydration", cat: "Health", period: "Daily", priority: "High", time: "07:30", color: "sky" },
                    { name: "📚 Read 10 Pages of Growth", cat: "Mindset", period: "Daily", priority: "Medium", time: "20:30", color: "emerald" },
                  ];
                  for (const s of starters) {
                    await addHabit(s.name, s.cat, s.period, s.priority, todayStr, s.time, null, s.color);
                  }
                  toast.success("Starter Habit Stack installed! 🚀");
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black transition-all hover:scale-105 shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
              >
                <span>⚡</span>
                <span>Install Starter Stack (3 Habits)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 Columns: Today's Habits & Immediate Alarms */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Immediate Reminders Alert Strip */}
            <ImmediateRemindersStrip reminders={reminders} />

            {/* View Switcher, Search, and Category Chips Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-surface/60 border border-border/70 shadow-xs">
              {/* Density & View Mode Selectors */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-surface border border-border p-0.5 rounded-xl text-xs font-semibold">
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

                <div className="flex items-center gap-1 bg-surface border border-border p-0.5 rounded-xl text-xs font-semibold">
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

                {/* Sound FX Mute Toggle */}
                <button
                  onClick={toggleAudioMute}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isAudioMuted
                      ? "bg-surface border-border text-muted-foreground hover:text-foreground"
                      : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  }`}
                  title={isAudioMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
                >
                  {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {dueToday.length > 0 && doneToday.length < dueToday.length && (
                  <button
                    onClick={markAllDone}
                    className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-xs font-semibold py-1 px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Press 'M' on keyboard"
                  >
                    <span>⚡ All Done</span>
                    <kbd className="text-[9px] bg-primary/20 px-1 py-0.2 rounded font-mono">M</kbd>
                  </button>
                )}
              </div>

              {/* Search & Category Filter */}
              <div className="flex items-center gap-2 flex-1 justify-end min-w-[200px]">
                <div className="relative flex-1 max-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search habits..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none transition-colors"
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

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-card border border-border/80 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground focus:text-foreground outline-none focus:border-primary"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recommended Next Action Banner */}
            {dueToday.some((h) => !h.completedDates.includes(todayStr) && !skippedHabits[h.id]) && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 px-4 rounded-2xl bg-gradient-to-r from-primary/15 via-card to-accent/15 border border-primary/35 flex items-center justify-between flex-wrap gap-2 text-xs shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-2xs">
                    ⚡
                  </div>
                  <div>
                    <span className="font-mono text-[9.5px] uppercase font-bold text-primary tracking-wider">
                      Recommended Next Action
                    </span>
                    <strong className="text-xs sm:text-sm text-foreground font-bold block">
                      {dueToday.find((h) => !h.completedDates.includes(todayStr) && !skippedHabits[h.id])?.name}
                    </strong>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const target = dueToday.find((h) => !h.completedDates.includes(todayStr) && !skippedHabits[h.id]);
                    if (target) handleToggleHabit(target.id);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  ✓ Complete Now (+10 XP)
                </button>
              </motion.div>
            )}

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

          {/* Right 5 Columns: Focus Studio & Vayu Autonomous Engine */}
          <div className="lg:col-span-5 flex flex-col gap-4">
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
      />

      <CelebrationOverlay
        show={showCelebration}
        onClose={() => setShowCelebration(false)}
        type="badge"
        title="All Habits Done!"
        subtitle="You crushed every single habit today. Keep this momentum going!"
        icon="🎉"
      />
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
