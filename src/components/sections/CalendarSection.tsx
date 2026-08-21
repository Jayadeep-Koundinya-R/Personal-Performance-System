/*
  📅 Masterwork Performance Calendar & Circadian Time-Block Planner
  
  Features:
  - High-Contrast Crisp Typography (Fixed low-contrast grey text for high visibility)
  - 3 View Modes: Month Grid Matrix, Weekly Circadian Time-Block Schedule, Agenda Stream
  - Circadian Time-Block Mapping:
    - 🌅 Morning (6am–12pm): Deep Focus & Peak Clarity
    - ☀️ Afternoon (12pm–6pm): Execution & Stamina
    - 🌙 Evening (6pm–12am): Recovery & Wind-Down
  - Interactive Habit Pills in Weekly Schedule with 1-Click Checkbox & ⚡ Focus Launcher
  - Interactive Day Modal for Retroactive Habit Toggling
  - Category & Single-Habit Inspector Filters
  - Monthly Performance Summary Metrics
*/

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ListFilter, Zap } from "lucide-react";
import { toast } from "sonner";

type ViewMode = "month" | "weekly" | "agenda";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getCircadianBlock(habit: any): "morning" | "afternoon" | "evening" {
  if (habit.startTime) {
    const hour = parseInt(habit.startTime.split(":")[0], 10);
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }
  if (habit.priority === "High") return "morning";
  if (habit.priority === "Medium") return "afternoon";
  return "evening";
}

const CalendarSection = () => {
  const { habits, toggleCompletion, getTodayStr } = useHabits();
  const timer = useFocusTimer();
  const todayStr = getTodayStr();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  // Selected Day Drawer / Modal State
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(habits.map((h) => h.category || "General")))];
  }, [habits]);

  // Filter habits by category or single habit
  const filteredHabits = useMemo(() => {
    let list = habits.filter((h) => !h.archived);
    if (selectedHabitId) {
      return list.filter((h) => h.id === selectedHabitId);
    }
    if (selectedCategory !== "All") {
      return list.filter((h) => (h.category || "General") === selectedCategory);
    }
    return list;
  }, [habits, selectedCategory, selectedHabitId]);

  // Month Grid Calculation
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    // Empty padding cells before 1st of month
    for (let i = 0; i < startDay; i++) {
      days.push({ dateStr: null, completions: 0, dueCount: 0, isToday: false });
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      let completions = 0;
      let dueCount = 0;

      filteredHabits.forEach((h) => {
        const isDone = h.completedDates.includes(dateStr);
        if (isDone) completions++;
        if (h.period === "Daily" || h.period === "Today" || isDone) {
          dueCount++;
        }
      });

      days.push({
        dateStr,
        dayNum: day,
        completions,
        dueCount: Math.max(dueCount, completions),
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate, filteredHabits, todayStr]);

  const maxCompletions = useMemo(() => {
    return Math.max(...calendarData.map((d) => d.completions), 1);
  }, [calendarData]);

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    const validDays = calendarData.filter((d) => d.dateStr !== null);
    const activeDays = validDays.filter((d) => d.completions > 0).length;
    const totalCompletions = validDays.reduce((sum, d) => sum + d.completions, 0);
    const perfectDays = validDays.filter((d) => d.dueCount > 0 && d.completions >= d.dueCount).length;
    const consistencyRate = validDays.length > 0 ? Math.round((activeDays / validDays.length) * 100) : 0;

    return { activeDays, totalCompletions, perfectDays, consistencyRate, totalMonthDays: validDays.length };
  }, [calendarData]);

  // Heatmap color generator
  const getCellHeatStyle = (completions: number, dueCount: number) => {
    if (completions === 0) return "bg-surface/60 border-border/60 text-muted-foreground";
    if (dueCount > 0 && completions >= dueCount) {
      return "bg-primary text-primary-foreground font-bold border-primary/60 shadow-sm shadow-primary/20";
    }
    const ratio = completions / maxCompletions;
    if (ratio >= 0.75) return "bg-primary/85 text-white border-primary/50 font-semibold";
    if (ratio >= 0.5) return "bg-primary/60 text-foreground border-primary/40 font-medium";
    return "bg-primary/30 text-foreground border-primary/30";
  };

  // Month navigation
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Retroactive toggle habit completion
  const handleRetroactiveToggle = (habitId: string, dateStr: string) => {
    toggleCompletion(habitId, dateStr);
    toast.success(`Updated habit completion for ${dateStr}!`);
  };

  const selectedDayHabits = useMemo(() => {
    if (!selectedDayStr) return [];
    return habits.filter((h) => !h.archived);
  }, [selectedDayStr, habits]);

  const getDayNote = (dateStr: string) => {
    try {
      return localStorage.getItem(`pps_daily_note_${dateStr}`) || null;
    } catch {
      return null;
    }
  };

  // ── Weekly View Calculation ──
  const weeklyDays = useMemo(() => {
    const now = new Date(currentDate);
    const dayOfWeek = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      week.push({
        dateStr: ds,
        dayName: DAYS_OF_WEEK[i],
        dayNum: d.getDate(),
        isToday: ds === todayStr,
      });
    }
    return week;
  }, [currentDate, todayStr]);

  return (
    <div className="space-y-6">
      {/* Top Header & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>📅 Performance Calendar</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Circadian Schedule & History
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Align habits with your biological peak energy windows, track heatmaps, and retroactively check off habits
          </p>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1 bg-surface border border-border/80 p-1 rounded-2xl shadow-xs">
          {[
            { key: "month" as const, label: "Month Grid", icon: CalendarIcon },
            { key: "weekly" as const, label: "Weekly Schedule", icon: Clock },
            { key: "agenda" as const, label: "Agenda Stream", icon: ListFilter },
          ].map((v) => {
            const Icon = v.icon;
            const isCurrent = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${isCurrent
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ── */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 bg-surface border border-border/80 rounded-xl hover:bg-muted hover:border-primary/40 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>

            <h2 className="text-base font-extrabold text-foreground font-mono min-w-[160px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <button
              onClick={() => navigateMonth(1)}
              className="p-2 bg-surface border border-border/80 rounded-xl hover:bg-muted hover:border-primary/40 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>

            <button
              onClick={goToToday}
              className="text-xs bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 rounded-xl font-bold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer ml-1"
            >
              Today
            </button>
          </div>

          {/* Category & Single Habit Filters */}
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedHabitId(null);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${selectedCategory === cat && !selectedHabitId
                    ? "bg-secondary text-secondary-foreground border-secondary shadow-xs"
                    : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <select
              value={selectedHabitId || ""}
              onChange={(e) => setSelectedHabitId(e.target.value || null)}
              className="bg-surface border border-border/80 text-xs rounded-xl px-2.5 py-1 outline-none font-bold text-foreground cursor-pointer"
            >
              <option value="">-- Inspect Single Habit --</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.completedDates.length} completions)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── MONTHLY PERFORMANCE METRICS SUMMARY BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-lg flex-shrink-0">
            📊
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">Total Completions</div>
            <div className="text-base font-extrabold font-mono text-foreground">{monthlyStats.totalCompletions}</div>
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pps-yellow/15 border border-pps-yellow/30 flex items-center justify-center text-lg flex-shrink-0">
            🏆
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">Perfect Days</div>
            <div className="text-base font-extrabold font-mono text-foreground">{monthlyStats.perfectDays} Days</div>
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pps-green/15 border border-pps-green/30 flex items-center justify-center text-lg flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">Consistency Rate</div>
            <div className="text-base font-extrabold font-mono text-foreground">{monthlyStats.consistencyRate}%</div>
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-lg flex-shrink-0">
            🔥
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">Active Days</div>
            <div className="text-base font-extrabold font-mono text-foreground">{monthlyStats.activeDays} / {monthlyStats.totalMonthDays}</div>
          </div>
        </div>
      </div>

      {/* ── VIEW MODE 1: MONTH GRID MATRIX ── */}
      {viewMode === "month" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
        >
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-xs font-extrabold text-muted-foreground uppercase tracking-wider py-1 font-mono">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
            {calendarData.map((day, index) => {
              if (!day.dateStr) {
                return <div key={`empty-${index}`} className="aspect-square rounded-2xl bg-surface/20" />;
              }

              const heatClass = getCellHeatStyle(day.completions, day.dueCount);

              return (
                <motion.div
                  key={day.dateStr}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDayStr(day.dateStr)}
                  className={`
                    aspect-square rounded-2xl p-2 flex flex-col justify-between items-center relative
                    transition-all duration-200 cursor-pointer select-none border ${heatClass}
                    ${day.isToday ? "ring-2 ring-secondary ring-offset-2 ring-offset-background font-bold shadow-md" : ""}
                  `}
                >
                  <div className="flex justify-between items-center w-full text-[11px] font-mono font-bold">
                    <span>{day.dayNum}</span>
                    {day.completions > 0 && day.dueCount > 0 && day.completions >= day.dueCount && (
                      <span className="text-[10px]" title="Perfect Day! 100% completed">🏆</span>
                    )}
                  </div>

                  {day.completions > 0 ? (
                    <div className="text-[11px] font-extrabold font-mono flex items-center gap-0.5">
                      <span>✓</span>
                      <span>{day.completions}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400/60 font-mono">—</div>
                  )}

                  {day.isToday && (
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary absolute bottom-1.5" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Legend Bar */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/40 text-xs text-muted-foreground flex-wrap font-mono font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-surface/50 border border-border/40 rounded-md" />
              <span>No Activity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-primary/30 border border-primary/20 rounded-md" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-primary/60 border border-primary/30 rounded-md" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-primary/85 border border-primary/40 rounded-md" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-primary border border-primary/60 rounded-md shadow-xs" />
              <span>100% Perfect 🏆</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── VIEW MODE 2: WEEKLY CIRCADIAN TIME-BLOCK PLANNER ── */}
      {viewMode === "weekly" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-card border border-border rounded-3xl p-5 shadow-xl space-y-4">
            {/* Header & Purpose Explanation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
              <div>
                <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                  <span>⏰ Weekly Circadian Time-Block Schedule</span>
                </h3>
                <p className="text-[11.5px] text-sky-300 font-medium mt-0.5">
                  Align habits with biological energy peaks: 🌅 Morning (Focus) • ☀️ Afternoon (Execution) • 🌙 Evening (Wind-down)
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-mono font-bold bg-surface border border-border/80 px-2.5 py-1 rounded-xl">
                7-Day Circadian Map
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weeklyDays.map((w) => {
                const dayHabits = filteredHabits;
                const doneCount = dayHabits.filter((h) => h.completedDates.includes(w.dateStr)).length;

                const morningHabits = dayHabits.filter((h) => getCircadianBlock(h) === "morning");
                const afternoonHabits = dayHabits.filter((h) => getCircadianBlock(h) === "afternoon");
                const eveningHabits = dayHabits.filter((h) => getCircadianBlock(h) === "evening");

                return (
                  <div
                    key={w.dateStr}
                    className={`bg-surface/60 border rounded-2xl p-3 space-y-3 transition-all ${w.isToday ? "border-secondary ring-1 ring-secondary" : "border-border/80"
                      }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div>
                        <div className="text-xs font-extrabold text-foreground font-mono">{w.dayName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono font-bold">{w.dateStr}</div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${doneCount > 0 ? "bg-pps-green/20 text-pps-green border border-pps-green/30" : "bg-muted text-muted-foreground"}`}>
                        {doneCount}/{dayHabits.length}
                      </span>
                    </div>

                    {/* Circadian Time Blocks */}
                    {([
                      { title: "MORNING 🌅", time: "6am–12pm", color: "text-sky-300", habits: morningHabits },
                      { title: "AFTERNOON ☀️", time: "12pm–6pm", color: "text-amber-300", habits: afternoonHabits },
                      { title: "EVENING 🌙", time: "6pm–12am", color: "text-indigo-300", habits: eveningHabits },
                    ]).map((block) => (
                      <div key={block.title} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9.5px] font-mono font-extrabold uppercase ${block.color}`}>
                            {block.title}
                          </span>
                          <span className="text-[8.5px] font-mono text-muted-foreground font-semibold">{block.time}</span>
                        </div>

                        <div className="space-y-1">
                          {block.habits.length > 0 ? (
                            block.habits.map((h) => {
                              const isDone = h.completedDates.includes(w.dateStr);
                              return (
                                <div
                                  key={h.id}
                                  className={`text-[11px] p-2 rounded-xl border flex items-center justify-between font-bold transition-all shadow-xs ${isDone
                                    ? "bg-pps-green/10 border-pps-green/30 text-pps-green opacity-90"
                                    : "bg-card border-border/80 text-foreground hover:border-primary/40"
                                    }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <button
                                      onClick={() => handleRetroactiveToggle(h.id, w.dateStr)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer text-[10px] font-bold ${isDone ? "bg-pps-green border-pps-green text-white" : "border-slate-400 hover:border-primary"
                                        }`}
                                      title="Toggle completion for this date"
                                    >
                                      {isDone && "✓"}
                                    </button>
                                    <span className={`truncate max-w-[85px] ${isDone ? "line-through opacity-80" : ""}`}>
                                      {h.name}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => timer.startHabitFocus(h)}
                                    className="text-[10px] text-primary hover:text-primary-foreground hover:bg-primary/20 p-1 rounded transition-all cursor-pointer flex-shrink-0"
                                    title="Launch in Focus Studio"
                                  >
                                    <Zap className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-[9.5px] text-slate-400/60 font-mono italic px-1">— No habits</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── VIEW MODE 3: AGENDA STREAM ── */}
      {viewMode === "agenda" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-5 shadow-xl space-y-3"
        >
          <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground mb-3 flex items-center gap-2">
            <span>📋 Monthly Agenda Stream</span>
          </h3>

          <div className="space-y-2">
            {calendarData
              .filter((d) => d.dateStr !== null && d.completions > 0)
              .map((d) => {
                const note = d.dateStr ? getDayNote(d.dateStr) : null;
                return (
                  <div
                    key={d.dateStr}
                    onClick={() => setSelectedDayStr(d.dateStr)}
                    className="p-3.5 bg-surface/60 border border-border/60 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-mono font-bold text-primary flex-shrink-0">
                        {d.dayNum}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground font-mono flex items-center gap-2">
                          <span>{d.dateStr}</span>
                          {d.completions >= d.dueCount && <span className="text-xs" title="Perfect Day">🏆</span>}
                        </div>
                        {note && (
                          <div className="text-[11px] text-muted-foreground italic truncate mt-0.5 font-medium">
                            💬 "{note}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                      <span className="text-xs font-bold text-pps-green bg-pps-green/15 border border-pps-green/30 px-2.5 py-1 rounded-xl">
                        ✓ {d.completions} Completed
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* ── INTERACTIVE DAY PERFORMANCE MODAL (RETROACTIVE CHECK-IN) ── */}
      <AnimatePresence>
        {selectedDayStr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedDayStr(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-primary/30 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 font-mono">
                    <span>📅 {selectedDayStr}</span>
                    {selectedDayStr === todayStr && (
                      <span className="text-[10px] bg-secondary/15 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full font-sans font-bold">
                        Today
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Click checkmark to retroactively complete or undo habits for this date
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayStr(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Day Note Display if any */}
              {getDayNote(selectedDayStr) && (
                <div className="bg-surface/80 border border-amber-500/30 p-3 rounded-xl text-xs text-muted-foreground italic flex items-center gap-2 font-medium">
                  <span>💬 Note:</span>
                  <span>"{getDayNote(selectedDayStr)}"</span>
                </div>
              )}

              {/* Habits List for Selected Day */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedDayHabits.length > 0 ? (
                  selectedDayHabits.map((habit) => {
                    const isDone = habit.completedDates.includes(selectedDayStr);
                    return (
                      <div
                        key={habit.id}
                        onClick={() => handleRetroactiveToggle(habit.id, selectedDayStr)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${isDone
                          ? "bg-primary/15 border-primary/30 text-foreground"
                          : "bg-surface/60 border-border/60 text-muted-foreground hover:border-primary/40"
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold ${isDone ? "bg-primary border-primary text-white" : "border-border"}`}>
                            {isDone && "✓"}
                          </div>
                          <span className={isDone ? "line-through opacity-80" : ""}>{habit.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              timer.startHabitFocus(habit);
                              setSelectedDayStr(null);
                            }}
                            className="p-1 text-primary hover:bg-primary/20 rounded transition-all"
                            title="Launch in Focus Studio"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isDone ? "bg-pps-green/20 text-pps-green font-bold border border-pps-green/30" : "bg-muted text-muted-foreground"}`}>
                            {isDone ? "+10 XP ✓" : "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs font-medium">No habits logged for this date.</div>
                )}
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setSelectedDayStr(null)}
                  className="w-full bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarSection;
