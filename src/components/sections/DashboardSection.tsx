import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { StatCard } from "@/components/dashboard/StatCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { TaskSection } from "@/components/dashboard/TaskSection";
import { LevelWidget } from "@/components/dashboard/LevelWidget";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MOTIVATIONAL_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
];

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

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" },
  }),
};

interface Reminder {
  id: number;
  label: string;
  time: string;
  repeat: string;
  enabled: boolean;
}

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

interface DashboardSectionProps {
  onNavigate?: (section: string) => void;
  userEmail?: string | null;
}

const DashboardSection = ({ onNavigate, userEmail }: DashboardSectionProps) => {
  const {
    habits, toggleCompletion, markAllDone, isHabitDueToday, getTodayStr,
    calculateWeeklyPoints, getMaxStreak, getTotalFreezeCredits,
    calculateLevel, calculateTotalXP,
  } = useHabits();

  const todayStr = getTodayStr();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
  const completionRate = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;
  const maxStreak = getMaxStreak();
  const freezeCredits = getTotalFreezeCredits();
  const weeklyPoints = calculateWeeklyPoints();

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const loadReminders = useCallback(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      const email = raw ? (JSON.parse(raw).email || "guest") : "guest";
      const key = `reminders_${email}`;
      setReminders(JSON.parse(localStorage.getItem(key) || "[]").filter((r: Reminder) => r.enabled));
    } catch { setReminders([]); }
  }, []);
  useEffect(() => { loadReminders(); }, [loadReminders]);

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const loadSuggestions = useCallback(async () => {
    const { data } = await supabase
      .from("ai_suggestions")
      .select("*")
      .eq("status", "pending");
    setSuggestions(data || []);
  }, []);

  const triggerAiAnalysis = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .maybeSingle();

      if (!profile) return;

      const profileAgeDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (profileAgeDays >= 7) {
        const { data: lastSugg } = await supabase
          .from("ai_suggestions")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1);

        const lastRunTime = lastSugg?.[0] ? new Date(lastSugg[0].created_at).getTime() : 0;
        const daysSinceLastRun = (Date.now() - lastRunTime) / (1000 * 60 * 60 * 24);

        if (daysSinceLastRun >= 7) {
          console.log("Triggering weekly habit AI coach recommendations...");
          await supabase.functions.invoke("analyze-habits-ai");
          loadSuggestions();
        }
      }
    } catch (err) {
      console.error("AI check error:", err);
    }
  }, [loadSuggestions]);

  useEffect(() => {
    loadSuggestions();
    triggerAiAnalysis();
  }, [loadSuggestions, triggerAiAnalysis]);

  const handleAcceptSuggestion = async (sugg: any) => {
    try {
      if (sugg.type === "smart_timing" && sugg.suggested_time) {
        const { data: existing } = await supabase
          .from("reminders")
          .select("id")
          .eq("habit_id", sugg.habit_id);

        if (existing && existing.length > 0) {
          await supabase
            .from("reminders")
            .update({ reminder_time: sugg.suggested_time })
            .eq("id", existing[0].id);
        } else {
          const { data: session } = await supabase.auth.getSession();
          const userId = session?.session?.user?.id;
          if (userId) {
            await supabase.from("reminders").insert({
              user_id: userId,
              habit_id: sugg.habit_id,
              label: `Reminder for ${sugg.habit_name}`,
              reminder_time: sugg.suggested_time,
              repeat_pattern: "Daily",
              channel: "in_app",
              delivery_type: "notification"
            });
          }
        }
        toast.success(`Updated reminder for "${sugg.habit_name}" to ${sugg.suggested_time}`);
      } else if (sugg.type === "struggling_habit") {
        if (sugg.alternative_habit_name) {
          await supabase
            .from("habits")
            .update({ name: sugg.alternative_habit_name })
            .eq("id", sugg.habit_id);
          toast.success(`Renamed habit to "${sugg.alternative_habit_name}"`);
        }
        if (sugg.suggested_time) {
          await supabase
            .from("reminders")
            .update({ reminder_time: sugg.suggested_time })
            .eq("habit_id", sugg.habit_id);
        }
      }

      await supabase
        .from("ai_suggestions")
        .update({ status: "accepted" })
        .eq("id", sugg.id);
      
      loadSuggestions();
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply suggestion");
    }
  };

  const handleDismissSuggestion = async (sugg: any) => {
    try {
      await supabase
        .from("ai_suggestions")
        .update({ status: "dismissed" })
        .eq("id", sugg.id);
      loadSuggestions();
      toast.info("Suggestion dismissed");
    } catch (e) {
      console.error(e);
    }
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

  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, []);

  const bestCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    habits.forEach((h) => {
      const cat = h.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + h.completedDates.length;
    });
    let best = { name: "—", count: 0 };
    Object.entries(catMap).forEach(([name, done]) => {
      if (done > best.count) best = { name, count: done };
    });
    return best;
  }, [habits]);

  const critical: typeof habits = [];
  const high: typeof habits = [];
  const medium: typeof habits = [];
  const upcoming: typeof habits = [];
  habits.filter((h) => !h.archived).forEach((habit) => {
    switch (habit.priority) {
      case "High":
        // Only High-priority habits that are due today are truly "critical"
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

  const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1, Optional: 0 };

  const sortHabits = (list: typeof habits) => {
    return [...list].sort((a, b) => {
      const aDone = a.completedDates.includes(todayStr);
      const bDone = b.completedDates.includes(todayStr);
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const periodOrder: Record<string, number> = { Today: 0, Daily: 1, Weekly: 2, Monthly: 3 };
      const periodDiff = (periodOrder[a.period] ?? 0) - (periodOrder[b.period] ?? 0);
      if (periodDiff !== 0) return periodDiff;
      return a.name.localeCompare(b.name);
    });
  };

  const sortedCritical = sortHabits(critical);
  const sortedHigh = sortHabits(high);
  const sortedMedium = sortHabits(medium);
  const sortedUpcoming = sortHabits(upcoming);

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

    let tagClass = "bg-primary/10 text-primary";
    let tagText = "Due " + dueDate.toLocaleDateString(undefined, { weekday: "long" });
    if (diffDays < 0) { tagClass = "bg-destructive/10 text-destructive"; tagText = "Overdue"; }
    else if (diffDays === 0 && isCompletedToday) { tagClass = "bg-pps-green/10 text-pps-green"; tagText = "Done ✓"; }
    else if (diffDays === 0) {
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
    }
    else if (diffDays === 1) { tagClass = "bg-pps-yellow/10 text-pps-yellow"; tagText = "Tomorrow"; }

    return (
      <motion.div
        key={habit.id}
        variants={slideRight}
        custom={index}
        initial="hidden"
        animate="visible"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.15 }}
        className={`flex items-center justify-between px-3.5 py-2.5 bg-surface/60 border rounded-lg mb-1.5 text-[13.5px] cursor-default hover:bg-accent/[0.08] transition-all duration-150 ${
          isCompletedToday
            ? "border-border/60 hover:border-primary/20"
            : getUrgencyLevel(habit) === "overdue"
            ? "border-destructive/40 shadow-sm shadow-destructive/5"
            : getUrgencyLevel(habit) === "urgent"
            ? "border-pps-orange/40 shadow-sm shadow-pps-orange/5"
            : "border-border/60 hover:border-primary/20"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={isCompletedToday}
            onChange={() => toggleCompletion(habit.id)}
            className="accent-primary w-4 h-4 cursor-pointer flex-shrink-0"
          />
          <span className={isCompletedToday ? "line-through opacity-45" : ""}>{habit.name}</span>
        </div>
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold font-mono whitespace-nowrap ${tagClass}`}
        >
          {tagText}
        </motion.span>
      </motion.div>
    );
  };

  const renderEmptyList = (text: string) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center px-3 py-4 bg-surface/40 border border-border/40 rounded-lg text-[13px] text-muted-foreground"
    >
      {text}
    </motion.div>
  );

  const { profile } = useProfile();
  const displayName = profile?.displayName || (userEmail ? userEmail.split("@")[0] : "Guest");

  return (
    <div>
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2"
      >
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, <span className="text-primary">{displayName}</span>{" "}
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
              className="inline-block origin-[70%_70%]"
            >
              👋
            </motion.span>
          </h1>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            {dateStr}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              className="inline-block text-[11px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full ml-2 font-mono align-middle"
            >
              {dueToday.length} habit{dueToday.length !== 1 ? "s" : ""} due
            </motion.span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {dueToday.length > 0 && doneToday.length < dueToday.length && (
            <button
              onClick={markAllDone}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-xs font-semibold py-1.5 px-3 rounded-lg transition-all duration-200 cursor-pointer"
            >
              ⚡ Mark All Done
            </button>
          )}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-[12px] font-mono"
          >
            <span className="text-pps-green font-semibold">✅ {doneToday.length}</span>
            <span className="text-border">|</span>
            <span className="text-pps-orange font-semibold">⏳ {dueToday.length - doneToday.length}</span>
            <span className="text-border">|</span>
            <span className="text-primary font-semibold">🔥 {maxStreak}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Quote */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        whileHover={{ scale: 1.01 }}
        className="mb-5 bg-gradient-to-r from-primary/8 via-secondary/5 to-transparent border border-primary/10 rounded-xl px-5 py-4 flex items-start gap-3"
      >
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
          className="text-2xl mt-0.5"
        >
          💡
        </motion.span>
        <div>
          <p className="text-[13.5px] italic text-foreground/85">"{dailyQuote.text}"</p>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">— {dailyQuote.author}</p>
        </div>
      </motion.div>

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
                    className="bg-primary text-white py-1 px-3 rounded text-[11px] font-semibold hover:bg-primary/95 transition-all duration-200"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(sugg)}
                    className="bg-transparent border border-border text-muted-foreground py-1 px-3 rounded text-[11px] font-semibold hover:bg-muted hover:text-foreground transition-all duration-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {[
          { value: `${completionRate}%`, label: "Completion Rate", icon: "📊", trend: <TrendBadge diff={trend.diff} suffix="%" />, progress: completionRate, variant: "indigo" as const },
          { value: `🔥 ${maxStreak}`, label: "Current Streak", icon: "⚡", trend: <span className="text-[11px] font-semibold text-pps-orange font-mono">{maxStreak >= 7 ? "🏆 On fire!" : maxStreak > 0 ? "Keep pushing!" : "Start today!"}</span>, progress: Math.min(maxStreak * 10, 100), variant: "orange" as const },
          { value: String(freezeCredits), label: "Freeze Credits", icon: "🧊", trend: <span className="text-[11px] font-semibold text-secondary font-mono">{freezeCredits > 3 ? "Well stocked" : freezeCredits > 0 ? "Use wisely" : "Earn more!"}</span>, progress: Math.min(freezeCredits * 20, 100), variant: "cyan" as const },
          { value: String(weeklyPoints), label: "Points This Week", icon: "🎯", trend: <span className={`text-[11px] font-semibold font-mono ${weeklyTrend.diff >= 0 ? "text-pps-green" : "text-destructive"}`}>{weeklyTrend.diff > 0 ? `▲ +${weeklyTrend.diff}` : weeklyTrend.diff < 0 ? `▼ ${weeklyTrend.diff}` : "—"} vs last week</span>, progress: Math.min(weeklyPoints, 100), variant: "green" as const },
        ].map((card, i) => (
          <motion.div key={card.label} variants={scaleIn} custom={i} initial="hidden" animate="visible">
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        {[
          { icon: "🏅", label: "Best Category", value: bestCategory.name, color: "primary" },
          { icon: "📈", label: "Total Habits", value: `${habits.length} tracked`, color: "pps-orange" },
          { icon: "✅", label: "All-Time Done", value: `${habits.reduce((s, h) => s + h.completedDates.length, 0)} completions`, color: "pps-green" },
        ].map((insight, i) => (
          <motion.div key={insight.label} variants={fadeUp} custom={i + 4} initial="hidden" animate="visible">
            <InsightCard {...insight} />
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
      {habits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 bg-card border border-border rounded-xl"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl mb-4">🚀</motion.div>
              <h3 className="text-xl font-bold mb-2">Ready to start your journey?</h3>
              <p className="text-[13px] text-muted-foreground text-center max-w-[320px] mb-5">
                Add your first habit to see your dashboard come alive with stats, streaks, and progress tracking.
              </p>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate?.("habits")}
                className="bg-gradient-to-br from-primary to-accent text-primary-foreground px-6 py-2.5 rounded-xl text-[13.5px] font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                + Add Your First Habit
              </motion.button>
            </div>
          </motion.div>
        ) : (
        <>
        {/* Left — Task Lists */}
        <div className="flex flex-col gap-4">
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
        </div>

        {/* Right — Widgets */}
        <div className="flex flex-col gap-4">
          {/* Today's Progress */}
          <motion.div variants={scaleIn} custom={7} initial="hidden" animate="visible" className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Today's Progress</h4>
            <motion.div
              key={doneToday.length}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="text-[28px] font-bold font-mono text-primary"
            >
              {doneToday.length}/{dueToday.length}
            </motion.div>
            <div className="text-muted-foreground text-xs mt-1">habits completed</div>
            <div className="bg-surface rounded-full h-2 mt-2.5">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
                initial={false}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 space-y-1">
              <AnimatePresence>
                {dueToday.map((h, i) => {
                  const done = h.completedDates.includes(todayStr);
                  return (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <motion.span animate={done ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }} className={done ? "text-pps-green" : "text-muted-foreground"}>
                        {done ? "✅" : "⬜"}
                      </motion.span>
                      <span className={done ? "text-muted-foreground line-through" : "text-foreground/80"}>{h.name}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Reminders Widget */}
          <motion.div variants={scaleIn} custom={8} initial="hidden" animate="visible" className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5 flex items-center gap-1.5">
              <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 5 }}>🔔</motion.span>
              Upcoming Reminders
            </h4>
            {reminders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-[12px]">
                <div className="text-xl mb-1">🔕</div>
                No active reminders
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.slice(0, 4).map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.02, x: 3 }}
                    className="flex items-center justify-between px-3 py-2 bg-surface/60 border border-border/60 rounded-lg"
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground">{r.repeat}</div>
                    </div>
                    <span className="text-[12px] font-mono text-secondary font-semibold">{formatTime12(r.time)}</span>
                  </motion.div>
                ))}
                {reminders.length > 4 && (
                  <div className="text-[11px] text-muted-foreground text-center">+{reminders.length - 4} more</div>
                )}
              </div>
            )}
          </motion.div>

          {/* Weekly Snapshot */}
          <motion.div variants={scaleIn} custom={9} initial="hidden" animate="visible" className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Weekly Snapshot</h4>
            <div className="flex items-end gap-2 h-[130px] mt-3">
              {LABELS.map((label, i) => {
                const h = Math.max(Math.round((counts[i] / maxCount) * 100), 4);
                const isToday = i === 6;
                return (
                  <motion.div
                    key={label}
                    className="flex-1 flex flex-col items-center gap-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.07 }}
                  >
                    <div className="text-[10px] font-mono font-semibold text-foreground/70 mb-0.5">{counts[i]}</div>
                    <motion.div
                      className="w-full rounded-t"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.7 + i * 0.07, duration: 0.5, ease: "easeOut" }}
                      whileHover={{ scaleX: 1.15 }}
                      style={{
                        background: isToday
                          ? "linear-gradient(180deg, hsl(var(--secondary)), hsl(var(--secondary) / 0.6))"
                          : "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
                        minHeight: "4px",
                      }}
                    />
                    <div className={`text-[10px] font-mono ${isToday ? "text-secondary font-bold" : "text-muted-foreground"}`}>{label}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Level Progress */}
          <motion.div variants={scaleIn} custom={10} initial="hidden" animate="visible" className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Level Progress</h4>
            <LevelWidget />
          </motion.div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};



export default DashboardSection;
