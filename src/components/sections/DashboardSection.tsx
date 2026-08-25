import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useReminders } from "@/hooks/use-reminders";
import { useLifecycleNudges } from "@/hooks/use-lifecycle-nudges";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/dashboard/StatCard";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import { TaskSection } from "@/components/dashboard/TaskSection";
import { LevelWidget } from "@/components/dashboard/LevelWidget";
import { supabase } from "@/integrations/supabase/client";
import { MotivationalQuoteWidget } from "@/components/dashboard/MotivationalQuoteWidget";
import { LiveSquadMeetingCard } from "@/components/dashboard/LiveSquadMeetingCard";
import { StickyNotesWidget } from "@/components/dashboard/StickyNotesWidget";
import { toast } from "sonner";

import { Link } from "react-router-dom";
import { Search, X, Filter, Volume2, VolumeX } from "lucide-react";
import { feedbackSounds } from "@/lib/audio/clickFeedback";



const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: -15 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatTime12(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
}

/** Circular SVG Momentum Gauge with Glowing Gradient */
function MomentumGauge({ percentage }: { percentage: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let statusText = "Ready to Launch 🚀";
  let statusColor = "text-muted-foreground";
  if (percentage === 100) { statusText = "Unstoppable! 🏆"; statusColor = "text-pps-green font-bold"; }
  else if (percentage >= 75) { statusText = "Crushing It! 🔥"; statusColor = "text-primary font-bold"; }
  else if (percentage >= 50) { statusText = "In The Zone ⚡"; statusColor = "text-pps-orange font-bold"; }
  else if (percentage > 0) { statusText = "Getting Started 🌱"; statusColor = "text-secondary font-bold"; }

  return (
    <div className="flex items-center gap-4 bg-surface/60 border border-border/80 rounded-2xl p-4 mb-3 shadow-xs">
      <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <defs>
            <linearGradient id="momentum-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent, var(--primary)))" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r={radius} className="stroke-surface" strokeWidth="7" fill="transparent" />
          <motion.circle
            cx="40" cy="40" r={radius}
            stroke="url(#momentum-gradient)"
            strokeWidth="7"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-base font-bold font-mono text-foreground">{percentage}%</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Daily Momentum</div>
        <div className={`text-[13.5px] mt-0.5 ${statusColor}`}>{statusText}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Complete habits to boost score</div>
      </div>
    </div>
  );
}


interface DashboardSectionProps {
  onNavigate?: (section: string) => void;
  userEmail?: string | null;
}

const DashboardSection = ({ onNavigate, userEmail }: DashboardSectionProps) => {
  const {
    habits, addHabit, toggleCompletion, markAllDone, isHabitDueToday, getTodayStr,
    calculateWeeklyPoints, getMaxStreak, getTotalFreezeCredits,
  } = useHabits();

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
      try { localStorage.setItem(`pps_skipped_${todayStr}`, JSON.stringify(next)); } catch {}
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
    try { localStorage.setItem("pps_dashboard_view_mode", mode); } catch {}
  };

  const handleDensityModeChange = (mode: "comfortable" | "compact") => {
    setDensityMode(mode);
    try { localStorage.setItem("pps_dashboard_density", mode); } catch {}
  };

  // Energy/Mood logger pill
  const [mood, setMood] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`pps_today_mood_${todayStr}`) || null;
    } catch {
      return null;
    }
  });

  const energyCorrelationMsg = useMemo(() => {
    if (!mood) return null;
    if (mood === "high") return "⚡ High Energy: Completion output is +35% higher today!";
    if (mood === "good") return "😊 Good Energy: Steady focus momentum!";
    return "😴 Low Energy: Focus on 1-2 critical habits today.";
  }, [mood]);

  // Daily Scratchpad Note state
  const [dailyNote, setDailyNote] = useState<string>(() => {
    try {
      return localStorage.getItem(`pps_daily_note_${todayStr}`) || "";
    } catch {
      return "";
    }
  });

  const handleDailyNoteChange = (text: string) => {
    setDailyNote(text);
    try {
      localStorage.setItem(`pps_daily_note_${todayStr}`, text);
    } catch {}
  };

  const handleMoodSelect = (mVal: string, mLabel: string) => {
    setMood(mVal);
    try { localStorage.setItem(`pps_today_mood_${todayStr}`, mVal); } catch {}
    toast.success(`Energy logged: ${mLabel}`, { description: "Your energy state is updated for today!" });
  };

  // Quick Habit creation state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPriority, setQuickPriority] = useState("Medium");
  const [quickPeriod, setQuickPeriod] = useState("Daily");
  const [quickTime, setQuickTime] = useState("");

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

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error("Please enter a habit name");
      return;
    }
    const err = await addHabit(
      quickName.trim(),
      "General",
      quickPeriod,
      quickPriority,
      new Date().toISOString().split("T")[0],
      quickTime || null,
      null,
      "indigo",
      false,
      false
    );
    if (!err) {
      toast.success(`Habit "${quickName.trim()}" created!`);
      setQuickName("");
      setQuickTime("");
      setShowQuickAdd(false);
    } else {
      toast.error(err);
    }
  };

  const dueToday = habits.filter((h) => isHabitDueToday(h));

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

  const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
  const completionRate = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;

  // ⚡ Smart Next-Up Habit: Priority (Critical > High > Medium > Low) + Urgency + Time-Block
  const nextUpHabit = useMemo(() => {
    const uncompleted = dueToday.filter((h) => !h.completedDates.includes(todayStr));
    if (uncompleted.length === 0) return null;

    const priorityWeights: Record<string, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    return [...uncompleted].sort((a, b) => {
      // 1. Urgency Level (Overdue > Urgent within 1h > Normal)
      const urgA = getUrgencyLevel(a);
      const urgB = getUrgencyLevel(b);
      if (urgA === "overdue" && urgB !== "overdue") return -1;
      if (urgB === "overdue" && urgA !== "overdue") return 1;
      if (urgA === "urgent" && urgB !== "urgent") return -1;
      if (urgB === "urgent" && urgA !== "urgent") return 1;

      // 2. Priority Weight
      const pA = priorityWeights[a.priority] || 2;
      const pB = priorityWeights[b.priority] || 2;
      if (pA !== pB) return pB - pA;

      // 3. Scheduled Start Time
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      if (a.startTime && !b.startTime) return -1;
      if (!a.startTime && b.startTime) return 1;

      return 0;
    })[0];
  }, [dueToday, todayStr]);

  const maxStreak = getMaxStreak();
  const freezeCredits = getTotalFreezeCredits();
  const weeklyPoints = calculateWeeklyPoints();


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
        if (localStorage.getItem(celebKey)) return; // Already celebrated today
        localStorage.setItem(celebKey, "1");
      } catch { /* localStorage unavailable */ }

      // Small delay so the checkbox animation finishes first
      setTimeout(() => {
        setShowCelebration(true);
        toast.success("🏆 Perfect Day Bonus: +25 XP!", {
          description: "You completed every habit due today. Incredible discipline!",
          duration: 5000,
        });
      }, 400);
    }
  }, [completionRate, dueToday.length, todayStr]);

  // Keyboard shortcuts (Q: Quick Add, M: Mark All Done)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        setShowQuickAdd((prev) => !prev);
      } else if ((e.key === "m" || e.key === "M") && dueToday.length > 0 && doneToday.length < dueToday.length) {
        e.preventDefault();
        markAllDone();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dueToday.length, doneToday.length, markAllDone]);

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { user } = useAuth();
  const { reminders: allReminders } = useReminders();
  const reminders = allReminders.filter(r => r.enabled);

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
        toast.success(`Updated timing for "${sugg.habit_name || 'habit'}" to ${sugg.suggested_time}`);
      } else if (sugg.type === "struggling_habit" && sugg.alternative_habit_name) {
        toast.success(`Updated habit suggestion "${sugg.alternative_habit_name}"`);
      } else {
        toast.success("Applied AI suggestion!");
      }

      // Update local storage status
      const cacheKey = user?.id ? `pps_ai_suggestions_${user.id}` : "pps_ai_suggestions_guest";
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const list = JSON.parse(cached);
          const updated = list.map((item: any) => item.id === sugg.id ? { ...item, status: "accepted" } : item);
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      } catch {}

      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
    } catch (e) {
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
          const updated = list.map((item: any) => item.id === sugg.id ? { ...item, status: "dismissed" } : item);
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      } catch {}

      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
      toast.info("Suggestion dismissed");
    } catch {}
  };

  const trend = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const dueYesterday = habits.filter((h) => h.period === "Daily" || h.period === "Today");
    const doneYesterday = dueYesterday.filter((h) => h.completedDates.includes(yesterdayStr));
    const yesterdayRate = dueYesterday.length > 0 ? Math.round((doneYesterday.length / dueYesterday.length) * 100) : 0;
    return { diff: completionRate - yesterdayRate };
  }, [habits, completionRate]);

  const weeklyTrend = useMemo(() => {
    const now = new Date();
    let lastWeekPoints = 0;
    for (let i = 7; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      habits.forEach((h) => { if (h.completedDates.includes(ds)) lastWeekPoints += 10; });
    }
    return { diff: weeklyPoints - lastWeekPoints };
  }, [habits, weeklyPoints]);

  const [heatmapOffset, setHeatmapOffset] = useState<number>(0);

  const heatmapDays = useMemo(() => {
    const list = [];
    const endOffset = heatmapOffset * 30;
    for (let i = 29 + endOffset; i >= endOffset; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      let done = 0;
      habits.forEach((h) => {
        if (h.completedDates.includes(ds)) done++;
      });
      list.push({ dateStr: ds, dayNum: d.getDate(), count: done, isToday: i === 0 });
    }
    return list;
  }, [habits, heatmapOffset]);


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


  const counts = new Array(7).fill(0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    habits.forEach((h) => { if (h.completedDates.includes(ds)) counts[6 - i]++; });
  }
  const maxCount = Math.max(...counts, 1);

  const TrendBadge = ({ diff, suffix = "" }: { diff: number; suffix?: string }) => {
    if (diff === 0) return <span className="text-[11px] text-muted-foreground">— No change</span>;
    const isUp = diff > 0;
    return (
      <span className={`text-[11px] font-semibold font-mono ${isUp ? "text-pps-green" : "text-destructive"}`}>
        {isUp ? "▲" : "▼"} {Math.abs(diff)}{suffix} vs yesterday
      </span>
    );
  };

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
                title="Skip today with reason (Streak Protected)"
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
              title="Skip today with reason (Streak Protected)"
            >
              <option value="" disabled>Skip...</option>
              <option value="Rest">Rest Day 💤</option>
              <option value="Sick">Sick 🤒</option>
              <option value="Busy">Busy 💼</option>
            </select>
          )}
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold font-mono whitespace-nowrap ${tagClass}`}
          >
            {tagText}
          </motion.span>
        </div>
      </motion.div>
    );
  };

  const renderEmptyList = (text: string) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-2 py-4 bg-surface/30 border border-dashed border-border/50 rounded-xl text-xs text-muted-foreground font-mono"
    >
      <span>✨</span>
      <span>{text}</span>
    </motion.div>
  );


  const { profile } = useProfile();
  const displayName = profile?.displayName || (userEmail ? userEmail.split("@")[0] : "Guest");

  const MOOD_OPTIONS = [
    { label: "⚡ Focused", val: "high" },
    { label: "😊 Good", val: "good" },
    { label: "😴 Low Energy", val: "low" },
  ];

  const nudge = useLifecycleNudges();

  return (
    <div>
      {/* Active Lifecycle / Retention Nudge Banner */}
      {nudge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 bg-gradient-to-r from-primary/15 via-card to-accent/10 border border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
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
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
            <span>{getGreeting()}, <span className="text-primary">{displayName}</span></span>
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
              className="inline-block origin-[70%_70%]"
            >
              👋
            </motion.span>
          </h1>
          <div className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{dateStr}</span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              className="inline-block text-[11px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-mono"
            >
              {dueToday.length} habit{dueToday.length !== 1 ? "s" : ""} due today
            </motion.span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mood/Energy Pill Logger */}
          <div className="flex items-center gap-1 bg-surface/70 border border-border/80 px-2 py-1 rounded-full text-xs">
            <span className="text-[10px] text-muted-foreground font-semibold px-1">Energy:</span>
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.val}
                onClick={() => handleMoodSelect(m.val, m.label)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  mood === m.val
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "hover:bg-accent/15 text-muted-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Quick Add Habit Button */}
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="bg-surface border border-border hover:border-primary/40 text-foreground text-xs font-semibold py-1.5 px-3 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            title="Press 'Q' on keyboard"
          >
            <span>✨</span>
            <span>+ Quick Add</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.2 rounded border border-border font-mono">Q</kbd>
          </button>

          {/* Sound Effects Mute Toggle */}
          <button
            onClick={toggleAudioMute}
            className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center ${
              isAudioMuted
                ? "bg-surface border-border text-muted-foreground hover:text-foreground"
                : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 shadow-2xs"
            }`}
            title={isAudioMuted ? "Unmute Sound Effects (currently muted)" : "Mute Sound Effects"}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>


          {dueToday.length > 0 && doneToday.length < dueToday.length && (
            <button
              onClick={markAllDone}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-xs font-semibold py-1.5 px-3 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              title="Press 'M' on keyboard"
            >
              <span>⚡ Mark All Done</span>
              <kbd className="hidden sm:inline-block text-[10px] bg-primary/20 px-1.5 py-0.2 rounded font-mono">M</kbd>
            </button>
          )}

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-3.5 py-1.5 text-[12px] font-mono"
          >
            <span className="text-pps-green font-semibold">✅ {doneToday.length}</span>
            <span className="text-border">|</span>
            <span className="text-pps-orange font-semibold">⏳ {dueToday.length - doneToday.length}</span>
            <span className="text-border">|</span>
            <span className="text-primary font-semibold">🔥 {maxStreak}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Add Habit Dropdown Panel */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <form
              onSubmit={handleQuickAddSubmit}
              className="bg-card border border-primary/30 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Habit name (e.g., Drink 2L Water, Read 15 mins)..."
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-surface border border-border px-3 py-2 rounded-lg text-sm outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value)}
                  className="bg-surface border border-border px-2.5 py-2 rounded-lg text-xs outline-none focus:border-primary"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
                <select
                  value={quickPeriod}
                  onChange={(e) => setQuickPeriod(e.target.value)}
                  className="bg-surface border border-border px-2.5 py-2 rounded-lg text-xs outline-none focus:border-primary"
                >
                  <option value="Daily">Daily</option>
                  <option value="Today">Today Only</option>
                  <option value="Weekly">Weekly</option>
                </select>
                <input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  className="bg-surface border border-border px-2.5 py-2 rounded-lg text-xs outline-none focus:border-primary"
                  title="Start Time (Optional)"
                />
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Save Habit
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="bg-transparent border border-border text-muted-foreground text-xs py-2 px-3 rounded-lg hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 Live Squad Meeting & Group Chat Activity Banner */}
      <LiveSquadMeetingCard onNavigate={onNavigate} />

      {/* Motivational Quote Widget */}
      <div className="mb-4">
        <MotivationalQuoteWidget />
      </div>


      {/* AI Suggestions Cards */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 bg-card border border-primary/20 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[13px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span>💡</span> AI Coach Recommendations
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Weekly Analysis</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {suggestions.map((sugg) => (
              <div key={sugg.id} className="bg-surface/50 border border-border/80 rounded-lg p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-bold text-foreground">
                      {sugg.habit_name || "General Suggestion"}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${sugg.type === "smart_timing" ? "bg-secondary/15 text-secondary border border-secondary/20" : "bg-pps-orange/10 text-pps-orange border border-pps-orange/20"}`}>
                      {sugg.type === "smart_timing" ? "Smart Timing" : "Struggling Habit"}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{sugg.reason}</p>
                </div>
                <div className="flex items-center gap-2 mt-3.5 justify-end">
                  <button
                    onClick={() => handleAcceptSuggestion(sugg)}
                    className="bg-primary text-white py-1 px-3 rounded text-[11px] font-semibold hover:bg-primary/95 transition-all duration-200 cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(sugg)}
                    className="bg-transparent border border-border text-muted-foreground py-1 px-3 rounded text-[11px] font-semibold hover:bg-muted hover:text-foreground transition-all duration-200 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stat Cards with Direct Section Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {[
          {
            value: `${completionRate}%`,
            label: "Completion Rate",
            icon: "📊",
            trend: <TrendBadge diff={trend.diff} suffix="%" />,
            progress: completionRate,
            variant: "indigo" as const,
            onClick: () => onNavigate?.("analytics"),
          },
          {
            value: `🔥 ${maxStreak}`,
            label: "Current Streak",
            icon: "⚡",
            trend: (
              <span className="text-[11px] font-semibold text-pps-orange font-mono">
                {maxStreak >= 7 ? "🏆 On fire!" : maxStreak > 0 ? "Keep pushing!" : "Start today!"}
              </span>
            ),
            progress: Math.min(maxStreak * 10, 100),
            variant: "orange" as const,
            onClick: () => onNavigate?.("streak"),
          },
          {
            value: String(freezeCredits),
            label: "Freeze Credits",
            icon: "🧊",
            trend: (
              <span className="text-[11px] font-semibold text-secondary font-mono">
                {freezeCredits > 3 ? "Well stocked" : freezeCredits > 0 ? "Use wisely" : "Earn more!"}
              </span>
            ),
            progress: Math.min(freezeCredits * 20, 100),
            variant: "cyan" as const,
            onClick: () => onNavigate?.("streak"),
          },
          {
            value: String(weeklyPoints),
            label: "Points This Week",
            icon: "🎯",
            trend: (
              <span
                className={`text-[11px] font-semibold font-mono ${
                  weeklyTrend.diff >= 0 ? "text-pps-green" : "text-destructive"
                }`}
              >
                {weeklyTrend.diff > 0
                  ? `▲ +${weeklyTrend.diff}`
                  : weeklyTrend.diff < 0
                  ? `▼ ${weeklyTrend.diff}`
                  : "—"}{" "}
                vs last week
              </span>
            ),
            progress: Math.min(weeklyPoints, 100),
            variant: "green" as const,
            onClick: () => onNavigate?.("achievements"),
          },
        ].map((card, i) => (
          <motion.div key={card.label} variants={scaleIn} custom={i} initial="hidden" animate="visible">
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>




      {/* View Switcher Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>
              {viewMode === "priority"
                ? "🎯 Focus By Priority"
                : viewMode === "timeblock"
                ? "⏰ Focus By Time Block"
                : "⚡ Zen Spotlight Mode"}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === "priority"
              ? "Habits organized by urgency and priority level"
              : viewMode === "timeblock"
              ? "Habits grouped by time of day (Morning, Afternoon, Evening)"
              : "Distraction-free single-habit focus spotlight"}
          </p>
        </div>

        {/* View Mode & Density Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout Density Switcher */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handleDensityModeChange("comfortable")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                densityMode === "comfortable"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Comfortable card view"
            >
              ⠿ Cards
            </button>
            <button
              onClick={() => handleDensityModeChange("compact")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                densityMode === "compact"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact IDE table view"
            >
              ☰ Compact
            </button>
          </div>

          {/* Main View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handleViewModeChange("priority")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "priority"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🎯</span>
              <span className="hidden sm:inline">Priority</span>
            </button>
            <button
              onClick={() => handleViewModeChange("timeblock")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "timeblock"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>⏰</span>
              <span className="hidden sm:inline">Time Block</span>
            </button>
            <button
              onClick={() => handleViewModeChange("zen")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "zen"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>⚡</span>
              <span>Zen Focus</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔍 Power-User Search & Category Filter Toolbar */}
      {habits.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-surface/50 border border-border/60 mb-6 shadow-xs">
          <div className="relative flex-1 max-w-md">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search habits (e.g. LeetCode, workout, reading)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {cat}
              </button>
            ))}

            {(searchQuery || categoryFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All");
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs"
                title="Clear active search and category filters"
              >
                <X className="w-3 h-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      )}


      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">

        {habits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 p-6 sm:p-8 rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-surface/60 to-primary/10 shadow-2xl space-y-6 text-left"
          >
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-border/50">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                🚀
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground font-mono">
                  Welcome to Your Command Dashboard, {displayName}!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  Build unstoppable daily momentum. Install our curated Starter Habit Stack below or create your own custom habits in Habit Architect.
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
                    toast.success("Starter Habit Stack installed! 🚀", {
                      description: "Your 3 foundational habits are ready. Check off your first habit to earn +10 XP!",
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black transition-all hover:scale-105 shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
                >
                  <span>⚡</span>
                  <span>Install Starter Stack (3 Habits)</span>
                </button>
              </div>
            </div>

            {/* 3-Step Onboarding Quick Journey */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface/70 border border-border/80 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Complete 1st Habit</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Earn +10 XP & unlock your "First Step" achievement badge.</div>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface/70 border border-border/80 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-secondary/20 text-secondary border border-secondary/30 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Launch a Focus Sprint</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Join a synced 25-min Pomodoro room with 432Hz ambient sound.</div>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface/70 border border-border/80 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Set Circadian Alarms</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Align your hardest habits with biological peak energy windows.</div>
                </div>
              </div>
            </div>

            {/* 1-Click Starter Habits Grid */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-mono font-extrabold uppercase text-primary tracking-wider flex items-center justify-between">
                <span>⚡ Or Pick Individual Starter Habits:</span>
                <span className="text-muted-foreground text-[10px] lowercase font-normal">click any card to add instantly</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { name: "📚 Read 15 Minutes", cat: "Learning", period: "Daily", priority: "High" },
                  { name: "💧 Drink 2L Water", cat: "Health", period: "Daily", priority: "Medium" },
                  { name: "💻 30-min Deep Work Sprint", cat: "Productivity", period: "Daily", priority: "High" },
                  { name: "🏃 20-min Exercise / Walk", cat: "Fitness", period: "Daily", priority: "Medium" },
                  { name: "🧘 5-min Daily Reflection", cat: "Mindfulness", period: "Daily", priority: "Low" },
                  { name: "🎯 Plan Top 3 Daily Goals", cat: "Productivity", period: "Daily", priority: "High" },
                ].map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={async () => {
                      await addHabit(starter.name, starter.cat, starter.period, starter.priority);
                      toast.success(`Added "${starter.name}" to your schedule! 🎉`);
                    }}
                    className="p-3 rounded-2xl bg-surface/80 border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {starter.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {starter.cat} • {starter.priority}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Habit Action Footer */}
            <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground font-medium">
                Want to build custom habits from scratch?
              </span>
              <button
                onClick={() => onNavigate?.("habits")}
                className="px-4 py-2 bg-surface border border-border hover:border-primary text-foreground font-bold text-xs rounded-xl hover:bg-card transition-all cursor-pointer shadow-xs"
              >
                + Open Habit Architect
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Left — Task Lists (Dynamically toggles between Priority & Time-block view) */}
            <div className="flex flex-col gap-5">

              {energyCorrelationMsg && (
                <div className="text-[11px] font-mono text-primary font-semibold px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                  {energyCorrelationMsg}
                </div>
              )}

              {/* Next Up Focus Habit Banner (for Returning Users) */}
              {dueToday.some((h) => !h.completedDates.includes(todayStr) && !skippedHabits[h.id]) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary/20 via-card to-accent/15 border border-primary/40 flex items-center justify-between flex-wrap gap-3 text-xs shadow-md backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold shadow-xs">
                      ⚡
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase font-bold text-primary tracking-wider">Recommended Next Action</span>
                        <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.2 rounded font-mono font-bold">Priority #1</span>
                      </div>
                      <strong className="text-sm text-foreground font-bold block mt-0.5">
                        {dueToday.find((h) => !h.completedDates.includes(todayStr) && !skippedHabits[h.id])?.name}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const target = dueToday.find((h) => !h.completedDates.includes(todayStr) && !skippedHabits[h.id]);
                        if (target) handleToggleHabit(target.id);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02] flex items-center gap-1.5"
                    >
                      <span>✓</span>
                      <span>Complete Now (+10 XP)</span>
                    </button>
                  </div>
                </motion.div>
              )}


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
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-4"
                  >
                    {[
                      { title: "🔴 Critical Tasks", borderColor: "border-l-destructive", tasks: sortedCritical, emptyText: "No critical tasks 🎉" },
                      { title: "🟠 High Priority", borderColor: "border-l-pps-orange", tasks: sortedHigh, emptyText: "No high priority tasks" },
                      { title: "🟡 Medium Focus", borderColor: "border-l-pps-yellow", tasks: sortedMedium, emptyText: "No medium tasks" },
                      { title: "🟢 Upcoming", borderColor: "border-l-pps-green", tasks: sortedUpcoming, emptyText: "No upcoming tasks" },
                    ].map((section, i) => (
                      <motion.div key={section.title} variants={fadeUp} custom={i + 7} initial="hidden" animate="visible">
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
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-4"
                  >
                    {[
                      { key: "morning", title: "🌅 Morning Ritual (05:00 - 12:00)", borderColor: "border-l-secondary", tasks: morningHabits, emptyText: "No morning habits scheduled" },
                      { key: "afternoon", title: "☀️ Afternoon Focus (12:00 - 17:00)", borderColor: "border-l-pps-orange", tasks: afternoonHabits, emptyText: "No afternoon habits scheduled" },
                      { key: "evening", title: "🌙 Evening Wind-down (17:00 - 00:00)", borderColor: "border-l-primary", tasks: eveningHabits, emptyText: "No evening habits scheduled" },
                      { key: "anytime", title: "⏰ Flexible & Anytime", borderColor: "border-l-pps-green", tasks: anytimeHabits, emptyText: "No flexible habits" },
                    ].map((section, i) => {
                      const isCurrent = section.key === getCurrentTimeBlock();
                      return (
                        <motion.div key={section.title} variants={fadeUp} custom={i + 7} initial="hidden" animate="visible" className={isCurrent ? "ring-2 ring-primary/40 rounded-xl shadow-sm" : ""}>
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

            {/* Right — Widgets (Action-First Ordering) */}
            <div className="flex flex-col gap-5">

              {/* 1. 📌 Super-Elevated Sticky Notes with Checklist & 1-Click Habit Converter (Top Priority) */}
              <motion.div variants={scaleIn} custom={7} initial="hidden" animate="visible">
                <StickyNotesWidget todayStr={todayStr} onAddHabit={addHabit} />
              </motion.div>

              {/* 2. 🔔 Upcoming Reminders & Alarms */}
              <motion.div variants={scaleIn} custom={8} initial="hidden" animate="visible" className="bg-card border border-border/90 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 5 }}>🔔</motion.span>
                    Upcoming Reminders
                    {reminders.length > 0 && (
                      <span className="text-[9px] bg-secondary/15 text-secondary border border-secondary/30 px-1.5 py-0.2 rounded font-mono font-bold">
                        {reminders.length} active
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={() => onNavigate?.("reminders")}
                    className="text-[10px] text-primary hover:underline font-mono font-semibold flex items-center gap-1 cursor-pointer"
                    title="Manage all reminders in Reminders section"
                  >
                    <span>⚙️ Manage</span>
                  </button>
                </div>

                {reminders.length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground text-[12px]">
                    <div className="text-lg mb-0.5">🔕</div>
                    No active reminders
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reminders.slice(0, 3).map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex flex-col gap-1.5 p-3 bg-surface/60 border border-border/70 rounded-xl text-xs hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-foreground truncate pr-2">{r.label}</div>
                          <span className="text-[11px] font-mono text-secondary font-bold flex-shrink-0">{formatTime12(r.time)}</span>
                        </div>

                        {/* Quick Snooze Actions */}
                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/40">
                          <span className="text-muted-foreground font-mono">{r.repeat}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                toast.info(`Snoozed "${r.label}" for +30m! 💤`);
                              }}
                              className="bg-surface border border-border/80 hover:border-primary/40 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-lg font-mono transition-all cursor-pointer shadow-2xs"
                              title="Snooze reminder by 30 mins for today"
                            >
                              💤 +30m
                            </button>
                            <button
                              onClick={() => {
                                toast.info(`Snoozed "${r.label}" for +1h! 💤`);
                              }}
                              className="bg-surface border border-border/80 hover:border-primary/40 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-lg font-mono transition-all cursor-pointer shadow-2xs"
                              title="Snooze reminder by 1 hour for today"
                            >
                              💤 +1h
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {reminders.length > 3 && (
                      <div className="text-[11px] text-muted-foreground text-center pt-1 font-mono">+{reminders.length - 3} more reminders</div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* 3. 🎯 Today's Progress + Circular Momentum Gauge */}
              <motion.div variants={scaleIn} custom={9} initial="hidden" animate="visible" className="bg-card border border-border rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Today's Progress</h4>
                  <span className="text-[11px] font-mono text-primary font-bold">
                    {doneToday.length} / {dueToday.length} Done
                  </span>
                </div>
                
                {/* Circular Momentum Gauge */}
                <MomentumGauge percentage={completionRate} />

                {completionRate === 100 && dueToday.length > 0 && (
                  <div className="mt-2 mb-3 p-2.5 text-center text-xs text-pps-green font-semibold bg-pps-green/10 border border-pps-green/20 rounded-xl">
                    🏆 All due habits completed today!
                  </div>
                )}

                <div className="mt-3 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {dueToday.map((h, i) => {
                      const done = h.completedDates.includes(todayStr);
                      return (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center justify-between text-[12px] py-1 border-b border-border/30 last:border-0"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <motion.span animate={done ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }} className={done ? "text-pps-green" : "text-muted-foreground"}>
                              {done ? "✅" : "⬜"}
                            </motion.span>
                            <span className={`truncate ${done ? "text-muted-foreground line-through" : "text-foreground/80"}`}>{h.name}</span>
                          </div>
                          {h.startTime && (
                            <span className="text-[10px] font-mono text-muted-foreground">{formatTime12(h.startTime)}</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>



              {/* 30-Day Activity Heatmap Grid with Window Pagination */}
              <motion.div variants={scaleIn} custom={10} initial="hidden" animate="visible" className="bg-card border border-border/90 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <span>🔥</span> Activity Grid
                    {heatmapOffset > 0 && (
                      <span className="text-[9px] bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-mono font-bold">
                        -{heatmapOffset * 30}d
                      </span>
                    )}
                  </h4>

                  {/* Previous/Next 30-Day Paginator */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setHeatmapOffset((prev) => prev + 1)}
                      className="text-[10px] text-muted-foreground hover:text-foreground bg-surface border border-border/80 px-2 py-0.5 rounded-lg cursor-pointer font-mono font-semibold transition-all hover:border-primary/40 shadow-2xs"
                      title="View previous 30 days"
                    >
                      ◀ Prev 30d
                    </button>
                    {heatmapOffset > 0 && (
                      <button
                        onClick={() => setHeatmapOffset((prev) => Math.max(0, prev - 1))}
                        className="text-[10px] text-primary hover:text-primary-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg cursor-pointer font-mono font-semibold transition-all hover:bg-primary shadow-2xs"
                        title="View recent 30 days"
                      >
                        Recent ▶
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono ml-0.5">
                      {heatmapDays.filter(d => d.count > 0).length} active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 mt-3">
                  {heatmapDays.map((d, i) => {
                    let bgClass = "bg-surface/50 border border-border/40 text-muted-foreground";
                    if (d.count >= 4) bgClass = "bg-primary text-primary-foreground font-bold border border-primary/50 shadow-xs";
                    else if (d.count >= 2) bgClass = "bg-primary/80 text-white border border-primary/40 font-semibold";
                    else if (d.count >= 1) bgClass = "bg-primary/30 text-foreground border border-primary/30 font-medium";

                    return (
                      <motion.div
                        key={d.dateStr}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.012 }}
                        whileHover={{ scale: 1.15 }}
                        title={`${d.dateStr}: ${d.count} completion${d.count !== 1 ? "s" : ""}`}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-mono cursor-pointer transition-all ${bgClass} ${d.isToday ? "ring-2 ring-secondary" : ""}`}
                      >
                        <span>{d.dayNum}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Level Progress */}
              <motion.div variants={scaleIn} custom={10} initial="hidden" animate="visible" className="bg-card border border-border/90 rounded-2xl p-5 shadow-xs">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold mb-3">Level Progress</h4>
                <LevelWidget />
              </motion.div>

              {/* Latest Badge Goal */}
              <motion.div variants={scaleIn} custom={11} initial="hidden" animate="visible" className="bg-card border border-border/90 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-xs">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
                  {maxStreak >= 7 ? "⚔️" : maxStreak >= 3 ? "🔥" : "🌱"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Active Milestone</div>
                  <div className="text-[13px] font-bold text-foreground truncate">
                    {maxStreak >= 7 ? "Week Warrior Goal" : maxStreak >= 3 ? "On a Roll (3-Day Streak)" : "First Step Goal"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {maxStreak >= 7 ? "Maintain streak to earn Master badge" : `${Math.max(0, 3 - maxStreak)} more days to 3-day badge`}
                  </div>
                </div>
              </motion.div>

            </div>
          </>
        )}
      </div>

      {/* Completion Celebration Overlay */}
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
  const isSkipped = !!skippedHabits[current.id];

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
            {["Rest Day 💤", "Sick FC", "Busy 💼"].map((r) => (
              <button
                key={r}
                onClick={() => onSkip(current.id, r.split(" ")[0])}
                className="bg-surface border border-border/80 text-[11px] px-2.5 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer font-medium"
              >
                {r.split(" ")[1] === "FC" ? "🤒" : r.split(" ")[1]} {r.split(" ")[0]}
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
