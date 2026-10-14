import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Users,
  FileText,
  Flame,
  Award,
  Bell,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { LevelWidget } from "@/components/dashboard/LevelWidget";
import { LiveSquadMeetingCard } from "@/components/dashboard/LiveSquadMeetingCard";
import { MotivationalQuoteWidget } from "@/components/dashboard/MotivationalQuoteWidget";
import { StickyNotesWidget } from "@/components/dashboard/StickyNotesWidget";
import { Reminder } from "@/hooks/use-reminders";
import { toast } from "sonner";
import { isMicroCompleted } from "@/lib/dashboard/microHabits";

export interface DashboardCommandHubProps {
  completionRate: number;
  maxStreak: number;
  freezeCredits: number;
  weeklyPoints: number;
  habits: any[];
  onNavigate?: (section: string) => void;
  todayStr: string;
  addHabit: (
    name: string,
    category?: string,
    period?: string,
    priority?: string,
    dueDate?: string | null,
    startTime?: string | null,
    endTime?: string | null,
    color?: string
  ) => Promise<string | null>;
  reminders?: Reminder[];
  suggestions?: any[];
  onAcceptSuggestion?: (sugg: any) => Promise<void>;
  onDismissSuggestion?: (sugg: any) => Promise<void>;
}

function formatTime12(t: string): string {
  if (!t) return "";
  const parts = t.split(":").map(Number);
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
}

export const DashboardCommandHub: React.FC<DashboardCommandHubProps> = ({
  completionRate,
  maxStreak,
  freezeCredits,
  weeklyPoints,
  habits,
  onNavigate,
  todayStr,
  addHabit,
  reminders = [],
  suggestions = [],
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const [activeTab, setActiveTab] = useState<"stats" | "social" | "scratchpad">("stats");
  const [heatmapOffset, setHeatmapOffset] = useState<number>(0);

  // 1. Calculate Day-over-Day and Week-over-Week Trends
  const trend = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const dueYesterday = habits.filter((h) => h.period === "Daily" || h.period === "Today");
    const doneYesterday = dueYesterday.filter((h) => (h.completedDates || []).includes(yesterdayStr));
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
      habits.forEach((h) => {
        if ((h.completedDates || []).includes(ds)) lastWeekPoints += 10;
      });
    }
    return { diff: weeklyPoints - lastWeekPoints };
  }, [habits, weeklyPoints]);

  // 2. 30-Day Activity Heatmap Days (Distinguishes full vs lighter partial micro completions)
  const heatmapDays = useMemo(() => {
    const list = [];
    const endOffset = heatmapOffset * 30;
    for (let i = 29 + endOffset; i >= endOffset; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      let fullDone = 0;
      let microDone = 0;
      habits.forEach((h) => {
        if ((h.completedDates || []).includes(ds)) {
          if (isMicroCompleted(h.id, ds)) {
            microDone++;
          } else {
            fullDone++;
          }
        }
      });
      list.push({
        dateStr: ds,
        dayNum: d.getDate(),
        count: fullDone + microDone,
        fullDone,
        microDone,
        isMicroOnly: microDone > 0 && fullDone === 0,
        isToday: i === 0,
      });
    }
    return list;
  }, [habits, heatmapOffset]);

  const TrendBadge = ({ diff, suffix = "" }: { diff: number; suffix?: string }) => {
    if (diff === 0) return <span className="text-[11px] text-muted-foreground">— No change</span>;
    const isUp = diff > 0;
    return (
      <span className={`text-[11px] font-semibold font-mono ${isUp ? "text-pps-green" : "text-destructive"}`}>
        {isUp ? "▲" : "▼"} {Math.abs(diff)}{suffix} vs yesterday
      </span>
    );
  };

  const activeReminders = reminders.filter((r) => r.enabled);

  return (
    <div className="bg-card/85 backdrop-blur-xl border border-border/70 rounded-3xl p-4 sm:p-6 shadow-md transition-all">
      {/* Header and Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-sm shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase font-mono tracking-wider text-foreground">
              Command Hub & Ecosystem
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Secondary engines: Consistency, Study Squads, and Scratchpad
            </p>
          </div>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-2xl text-xs font-semibold w-full sm:w-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "stats"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Consistency & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab("social")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "social"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Study Squad & Social</span>
          </button>

          <button
            onClick={() => setActiveTab("scratchpad")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "scratchpad"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scratchpad & Notes</span>
            {activeReminders.length > 0 && (
              <span className="text-[9px] bg-secondary/20 text-secondary border border-secondary/30 px-1 py-0.2 rounded-full font-mono">
                {activeReminders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* TAB 1: Consistency & Stats */}
        {activeTab === "stats" && (
          <motion.div
            key="tab-stats"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* 4 Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <StatCard
                value={`${completionRate}%`}
                label="Completion Rate"
                icon="📊"
                trend={<TrendBadge diff={trend.diff} suffix="%" />}
                progress={completionRate}
                variant="indigo"
                onClick={() => onNavigate?.("analytics")}
              />
              <StatCard
                value={`🔥 ${maxStreak}`}
                label="Current Streak"
                icon="⚡"
                trend={
                  <span className="text-[11px] font-semibold text-pps-orange font-mono">
                    {maxStreak >= 7 ? "🏆 On fire!" : maxStreak > 0 ? "Keep pushing!" : "Start today!"}
                  </span>
                }
                progress={Math.min(maxStreak * 10, 100)}
                variant="orange"
                onClick={() => onNavigate?.("streak")}
              />
              <StatCard
                value={String(freezeCredits)}
                label="Freeze Credits"
                icon="🧊"
                trend={
                  <span className="text-[11px] font-semibold text-secondary font-mono">
                    {freezeCredits > 3 ? "Well stocked" : freezeCredits > 0 ? "Use wisely" : "Earn more!"}
                  </span>
                }
                progress={Math.min(freezeCredits * 20, 100)}
                variant="cyan"
                onClick={() => onNavigate?.("streak")}
              />
              <StatCard
                value={String(weeklyPoints)}
                label="Points This Week"
                icon="🎯"
                trend={
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
                }
                progress={Math.min(weeklyPoints, 100)}
                variant="green"
                onClick={() => onNavigate?.("achievements")}
              />
            </div>

            {/* 30-Day Activity Heatmap Grid */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-pps-orange" />
                  <span>30-Day Activity Heatmap</span>
                  {heatmapOffset > 0 && (
                    <span className="text-[9px] bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-mono font-bold">
                      -{heatmapOffset * 30}d
                    </span>
                  )}
                </h4>

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
                    {heatmapDays.filter((d) => d.count > 0).length} active days
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 mt-3">
                {heatmapDays.map((d, i) => {
                  let bgClass = "bg-surface/50 border border-border/40 text-muted-foreground";
                  if (d.isMicroOnly) {
                    bgClass = "bg-primary/15 text-primary/80 border border-dashed border-primary/35 font-normal";
                  } else if (d.count >= 4) {
                    bgClass = "bg-primary text-primary-foreground font-bold border border-primary/50 shadow-xs";
                  } else if (d.count >= 2) {
                    bgClass = "bg-primary/80 text-white border border-primary/40 font-semibold";
                  } else if (d.count >= 1) {
                    bgClass = "bg-primary/30 text-foreground border border-primary/30 font-medium";
                  }

                  const titleText = d.isMicroOnly
                    ? `${d.dateStr}: ${d.microDone} 2-min micro completion${d.microDone !== 1 ? "s" : ""} (streak protected, lighter state)`
                    : `${d.dateStr}: ${d.count} completion${d.count !== 1 ? "s" : ""}${d.microDone > 0 ? ` (${d.microDone} micro)` : ""}`;

                  return (
                    <motion.div
                      key={d.dateStr}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.008 }}
                      whileHover={{ scale: 1.15 }}
                      title={titleText}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-mono cursor-pointer transition-all ${bgClass} ${
                        d.isToday ? "ring-2 ring-secondary" : ""
                      }`}
                    >
                      <span>{d.dayNum}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Level Widget & Active Milestone Card (2 Col Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold mb-3">
                  Level & XP Progression
                </h4>
                <LevelWidget />
              </div>

              <div className="bg-card border border-border/80 rounded-2xl p-5 flex items-center gap-3.5 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
                  {maxStreak >= 7 ? "⚔️" : maxStreak >= 3 ? "🔥" : "🌱"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">
                    Active Milestone Goal
                  </div>
                  <div className="text-sm font-bold text-foreground truncate mt-0.5">
                    {maxStreak >= 7
                      ? "Week Warrior Goal"
                      : maxStreak >= 3
                      ? "On a Roll (3-Day Streak)"
                      : "First Step Goal"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {maxStreak >= 7
                      ? "Maintain daily consistency to earn the Master badge"
                      : `${Math.max(0, 3 - maxStreak)} more days to unlock the 3-day badge`}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: Study Squad & Social */}
        {activeTab === "social" && (
          <motion.div
            key="tab-social"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* 2-Column Grid: Live Squad Card & Daily Motivational Quote */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
              <LiveSquadMeetingCard onNavigate={onNavigate} />
              <MotivationalQuoteWidget />
            </div>

            {/* Study Squad Presence & Quick Action Banner */}
            <div className="bg-gradient-to-r from-primary/15 via-card to-accent/15 border border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                  👥
                </div>
                <div>
                  <div className="text-xs font-black text-foreground">
                    Study Squads & Silent Co-Working
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Hop into synchronized 25-minute Pomodoro rooms with active video presence and screen sharing.
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate?.("social")}
                className="px-4 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5"
              >
                <span>Launch Squad Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB 3: Scratchpad & Reminders */}
        {activeTab === "scratchpad" && (
          <motion.div
            key="tab-scratchpad"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Left 7 Cols: Sticky Notes Widget */}
            <div className="lg:col-span-7">
              <StickyNotesWidget todayStr={todayStr} onAddHabit={addHabit} />
            </div>

            {/* Right 5 Cols: Upcoming Reminders & AI Recommendations */}
            <div className="lg:col-span-5 space-y-4">
              {/* Upcoming Reminders Box */}
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-primary" />
                    <span>Scheduled Reminders</span>
                    {activeReminders.length > 0 && (
                      <span className="text-[9px] bg-secondary/15 text-secondary border border-secondary/30 px-1.5 py-0.2 rounded font-mono font-bold">
                        {activeReminders.length} active
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={() => onNavigate?.("reminders")}
                    className="text-[10px] text-primary hover:underline font-mono font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚙️ Manage</span>
                  </button>
                </div>

                {activeReminders.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs font-mono">
                    🔕 No active reminders scheduled
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeReminders.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-col gap-1 p-2.5 bg-surface/60 border border-border/70 rounded-xl text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate pr-2">{r.label}</span>
                          <span className="text-[11px] font-mono text-secondary font-bold flex-shrink-0">
                            {formatTime12(r.time)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40 text-muted-foreground font-mono">
                          <span>{r.repeat}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toast.info(`Snoozed "${r.label}" for +30m! 💤`)}
                              className="px-1.5 py-0.5 rounded bg-surface border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              💤 +30m
                            </button>
                            <button
                              onClick={() => toast.info(`Snoozed "${r.label}" for +1h! 💤`)}
                              className="px-1.5 py-0.5 rounded bg-surface border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              💤 +1h
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Coach Recommendations Feed */}
              {suggestions.length > 0 && (
                <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Coach Feed</span>
                    </h4>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono font-bold">
                      Insights
                    </span>
                  </div>

                  <div className="space-y-2">
                    {suggestions.slice(0, 2).map((sugg) => (
                      <div
                        key={sugg.id}
                        className="p-2.5 bg-surface/50 border border-border/80 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground truncate">
                            {sugg.habit_name || "Habit Advice"}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono">
                            {sugg.type === "smart_timing" ? "Timing" : "Adjustment"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{sugg.reason}</p>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => onAcceptSuggestion?.(sugg)}
                            className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded cursor-pointer"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => onDismissSuggestion?.(sugg)}
                            className="px-2 py-0.5 bg-surface border border-border text-muted-foreground text-[10px] rounded cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
