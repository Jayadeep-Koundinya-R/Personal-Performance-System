/*
  📈 Masterwork Analytics & Performance Intelligence Engine
  
  Features:
  - Multi-Range & Custom Date Range Selector (7d, 30d, 90d, 1y, Custom Range)
  - High-Contrast Crisp Typography (Zero low-contrast grey text)
  - Category Effort Distribution (Donut & Progress Breakdown across Health, Productivity, etc.)
  - Energy Level vs Performance Correlation Engine (Links logged energy to completion output)
  - Habit Power Rankings & At-Risk Recovery Radar (Identifies top vs struggling habits)
  - Interactive 6-Month Heatmap Matrix with Tooltips
  - AI Level Velocity Predictor ("Level Up Forecast")
*/

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { useSmartInsights, useAiCoachSummary } from "@/hooks/use-insights";
import { Calendar, Zap, TrendingUp, Award, Flame, AlertTriangle, Sparkles, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type TimeRange = "7d" | "30d" | "90d" | "1y" | "custom";

const AnalyticsSection = () => {
  const { habits, calculateTotalXP, getMaxStreak, getTodayStr, calculateLevel } = useHabits();
  const { isPro, limits } = useSubscription();
  const insights = useSmartInsights(isPro);
  const coach = useAiCoachSummary(isPro);
  const todayStr = getTodayStr();

  // Timeframe selector state
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Calculate Days count for current time range
  const rangeDaysCount = useMemo(() => {
    if (timeRange === "7d") return 7;
    if (timeRange === "30d") return 30;
    if (timeRange === "90d") return 90;
    if (timeRange === "1y") return 365;
    
    // Custom range
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }, [timeRange, customStartDate, customEndDate]);

  // Overall Stats calculation over selected time range
  const rangeStats = useMemo(() => {
    const datesList: string[] = [];
    const now = new Date();
    
    if (timeRange === "custom") {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesList.push(d.toISOString().split("T")[0]);
      }
    } else {
      for (let i = rangeDaysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        datesList.push(d.toISOString().split("T")[0]);
      }
    }

    let totalPossible = 0;
    let totalCompleted = 0;
    const dailyCounts: Record<string, number> = {};

    datesList.forEach((ds) => {
      let completedOnDate = 0;
      habits.forEach((h) => {
        const isDone = (h.completedDates || []).includes(ds);
        if (isDone) completedOnDate++;
      });
      dailyCounts[ds] = completedOnDate;
      totalCompleted += completedOnDate;
      totalPossible += habits.length;
    });

    const activeDays = datesList.filter((ds) => (dailyCounts[ds] || 0) > 0).length;
    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const dailyAvg = (totalCompleted / Math.max(datesList.length, 1)).toFixed(1);

    return { datesList, totalCompleted, activeDays, completionRate, dailyAvg, dailyCounts };
  }, [timeRange, rangeDaysCount, customStartDate, customEndDate, habits]);

  // Category Effort Distribution
  const categoryDistribution = useMemo(() => {
    const catMap: Record<string, number> = {};
    let grandTotal = 0;

    habits.forEach((h) => {
      const cat = h.category || "General";
      const countInRange = (h.completedDates || []).filter((ds) => rangeStats.datesList.includes(ds)).length;
      catMap[cat] = (catMap[cat] || 0) + countInRange;
      grandTotal += countInRange;
    });

    return Object.entries(catMap).map(([category, count]) => ({
      category,
      count,
      pct: grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [habits, rangeStats.datesList]);

  // Habit Power Rankings & Consistency Leaderboard
  const habitRankings = useMemo(() => {
    const daysTotal = Math.max(rangeStats.datesList.length, 1);

    return habits
      .filter((h) => !h.archived)
      .map((h) => {
        const doneCount = (h.completedDates || []).filter((ds) => rangeStats.datesList.includes(ds)).length;
        const consistencyPct = Math.min(100, Math.round((doneCount / daysTotal) * 100));

        let status: "master" | "strong" | "building" | "at_risk" = "building";
        if (consistencyPct >= 80) status = "master";
        else if (consistencyPct >= 60) status = "strong";
        else if (consistencyPct >= 40) status = "building";
        else status = "at_risk";

        return { habit: h, doneCount, consistencyPct, status };
      })
      .sort((a, b) => b.consistencyPct - a.consistencyPct);
  }, [habits, rangeStats.datesList]);

  // Energy Level vs Performance Correlation Engine
  const energyCorrelation = useMemo(() => {
    const moodMap: Record<string, { days: number; completions: number }> = {
      high: { days: 0, completions: 0 },
      good: { days: 0, completions: 0 },
      low: { days: 0, completions: 0 },
    };

    rangeStats.datesList.forEach((ds) => {
      try {
        const loggedMood = localStorage.getItem(`pps_today_mood_${ds}`);
        if (loggedMood && moodMap[loggedMood]) {
          moodMap[loggedMood].days++;
          moodMap[loggedMood].completions += rangeStats.dailyCounts[ds] || 0;
        }
      } catch {}
    });

    const highAvg = moodMap.high.days > 0 ? (moodMap.high.completions / moodMap.high.days).toFixed(1) : "—";
    const goodAvg = moodMap.good.days > 0 ? (moodMap.good.completions / moodMap.good.days).toFixed(1) : "—";
    const lowAvg = moodMap.low.days > 0 ? (moodMap.low.completions / moodMap.low.days).toFixed(1) : "—";

    return { moodMap, highAvg, goodAvg, lowAvg };
  }, [rangeStats]);

  // Level & XP Velocity Prediction
  const totalXP = calculateTotalXP();
  const currentLevel = calculateLevel();
  const xpForNext = 100;
  const levelProgressXP = totalXP % 100;
  const levelProgressPct = Math.min(100, Math.round((levelProgressXP / 100) * 100));

  const levelVelocityDays = useMemo(() => {
    const dailyXPEstimate = Math.max(10, parseFloat(rangeStats.dailyAvg) * 10);
    const xpNeeded = 100 - levelProgressXP;
    const daysNeeded = Math.ceil(xpNeeded / dailyXPEstimate);
    return { daysNeeded, dailyXPEstimate: Math.round(dailyXPEstimate) };
  }, [rangeStats.dailyAvg, levelProgressXP]);

  const bestStreak = getMaxStreak();

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selector Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>📈 Performance Intelligence</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Deep Analytics
            </span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Multi-range analysis, category effort distribution, energy correlation, and AI level velocity forecast
          </p>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 bg-surface border border-border/80 p-1 rounded-2xl shadow-xs flex-wrap">
          {[
            { key: "7d" as const, label: "7 Days" },
            { key: "30d" as const, label: "30 Days" },
            { key: "90d" as const, label: "90 Days" },
            { key: "1y" as const, label: "1 Year" },
            { key: "custom" as const, label: "📅 Custom" },
          ].map((t) => {
            const isCurrent = timeRange === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTimeRange(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker Bar (Shown when Custom is selected) */}
      <AnimatePresence>
        {timeRange === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-primary/30 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Select Custom Range:</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-mono font-bold">Start:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-2.5 py-1.5 outline-none text-foreground"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-mono font-bold">End:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-2.5 py-1.5 outline-none text-foreground"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. HIGH-CONTRAST PERFORMANCE METRICS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-xl flex-shrink-0">
            📊
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">Completion Rate</div>
            <div className="text-xl font-extrabold font-mono text-foreground">{rangeStats.completionRate}%</div>
            <div className="text-[10.5px] text-primary font-mono font-bold">{rangeStats.totalCompleted} done in {rangeDaysCount}d</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-pps-orange/15 border border-pps-orange/30 flex items-center justify-center text-xl flex-shrink-0">
            🔥
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">Streak Momentum</div>
            <div className="text-xl font-extrabold font-mono text-foreground">🔥 {bestStreak} Days</div>
            <div className="text-[10.5px] text-pps-orange font-mono font-bold">Best consecutive run</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-pps-green/15 border border-pps-green/30 flex items-center justify-center text-xl flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">Habit Velocity</div>
            <div className="text-xl font-extrabold font-mono text-foreground">{rangeStats.dailyAvg} / Day</div>
            <div className="text-[10.5px] text-pps-green font-mono font-bold">{rangeStats.activeDays} active days</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-xl flex-shrink-0">
            🏆
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">Total Focus XP</div>
            <div className="text-xl font-extrabold font-mono text-foreground">{totalXP} XP</div>
            <div className="text-[10.5px] text-secondary font-mono font-bold">Level {currentLevel} • {levelProgressPct}% to Next</div>
          </div>
        </div>
      </div>

      {/* ── 2. AI LEVEL VELOCITY & PREDICTION CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/15 via-card to-secondary/10 border border-primary/30 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-2xl animate-pulse flex-shrink-0">
            🔮
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase font-mono tracking-wider text-primary flex items-center gap-1.5">
              <span>AI Level Velocity Forecast</span>
              <Sparkles className="w-3.5 h-3.5 text-pps-yellow" />
            </div>
            <div className="text-sm font-extrabold text-foreground mt-0.5">
              At current pace (+{levelVelocityDays.dailyXPEstimate} XP/day), you'll reach <span className="text-primary font-mono">Level {currentLevel + 1}</span> in ~<span className="text-pps-green font-mono">{levelVelocityDays.daysNeeded} days</span>!
            </div>
            <div className="text-[11.5px] text-muted-foreground font-medium mt-0.5">
              Currently Level {currentLevel} • {levelProgressXP} / {xpForNext} XP in level tier
            </div>
          </div>
        </div>

        {/* Mini Level Bar */}
        <div className="w-full sm:w-48 space-y-1.5 flex-shrink-0">
          <div className="flex justify-between text-[11px] font-mono font-bold">
            <span className="text-muted-foreground">Lvl {currentLevel}</span>
            <span className="text-primary">{levelProgressPct}%</span>
          </div>
          <div className="h-2.5 bg-surface border border-border/80 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              style={{ width: `${levelProgressPct}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── 3. CATEGORY DISTRIBUTION & ENERGY CORRELATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Effort Distribution Chart */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>📊 Category Effort Distribution</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-muted-foreground">{timeRange.toUpperCase()} View</span>
          </div>

          <div className="space-y-3">
            {categoryDistribution.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-medium">No category completions logged yet.</div>
            ) : (
              categoryDistribution.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{c.category}</span>
                    <span className="font-mono text-primary">{c.count} done ({c.pct}%)</span>
                  </div>
                  <div className="h-2 bg-surface border border-border/60 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${c.pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Energy Level vs Performance Correlation Engine */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>⚡ Energy vs Output Correlation</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-pps-green">Peak Productivity</span>
          </div>

          <div className="space-y-3.5">
            <div className="bg-surface/60 border border-border/60 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <div className="text-xs font-extrabold text-foreground">High Energy Days</div>
                  <div className="text-[11px] text-muted-foreground font-medium">Logged on {energyCorrelation.moodMap.high.days} days</div>
                </div>
              </div>
              <div className="text-base font-extrabold font-mono text-pps-green">{energyCorrelation.highAvg} Habits/Day</div>
            </div>

            <div className="bg-surface/60 border border-border/60 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">😊</span>
                <div>
                  <div className="text-xs font-extrabold text-foreground">Good Energy Days</div>
                  <div className="text-[11px] text-muted-foreground font-medium">Logged on {energyCorrelation.moodMap.good.days} days</div>
                </div>
              </div>
              <div className="text-base font-extrabold font-mono text-primary">{energyCorrelation.goodAvg} Habits/Day</div>
            </div>

            <div className="bg-surface/60 border border-border/60 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">😴</span>
                <div>
                  <div className="text-xs font-extrabold text-foreground">Low Energy Days</div>
                  <div className="text-[11px] text-muted-foreground font-medium">Logged on {energyCorrelation.moodMap.low.days} days</div>
                </div>
              </div>
              <div className="text-base font-extrabold font-mono text-pps-orange">{energyCorrelation.lowAvg} Habits/Day</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. HABIT POWER RANKINGS & RECOVERY RISK RADAR ── */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>🏆 Habit Power Rankings & Consistency Leaderboard</span>
            </h3>
            <p className="text-[11.5px] text-muted-foreground font-medium mt-0.5">
              Ranks habits by consistency % over the selected timeframe ({timeRange.toUpperCase()})
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono font-bold bg-surface border border-border/80 px-2.5 py-1 rounded-xl">
            {habitRankings.length} Active Habits
          </span>
        </div>

        <div className="space-y-2.5">
          {habitRankings.map(({ habit, doneCount, consistencyPct, status }, rank) => {
            let statusBadge = (
              <span className="text-[10.5px] font-mono font-bold bg-pps-green/15 text-pps-green border border-pps-green/30 px-2 py-0.5 rounded-full">
                🏆 Master ({consistencyPct}%)
              </span>
            );
            if (status === "strong") {
              statusBadge = (
                <span className="text-[10.5px] font-mono font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                  🔥 Strong ({consistencyPct}%)
                </span>
              );
            } else if (status === "building") {
              statusBadge = (
                <span className="text-[10.5px] font-mono font-bold bg-pps-orange/15 text-pps-orange border border-pps-orange/30 px-2 py-0.5 rounded-full">
                  🌱 Building ({consistencyPct}%)
                </span>
              );
            } else if (status === "at_risk") {
              statusBadge = (
                <span className="text-[10.5px] font-mono font-bold bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 rounded-full">
                  ⚠️ At-Risk ({consistencyPct}%)
                </span>
              );
            }

            return (
              <div
                key={habit.id}
                className="p-3.5 bg-surface/60 border border-border/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-surface border border-border/80 flex items-center justify-center font-mono font-extrabold text-xs text-foreground flex-shrink-0">
                    #{rank + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-foreground truncate">{habit.name}</div>
                    <div className="text-[11px] text-slate-300 font-medium truncate">
                      Category: {habit.category || "General"} • Priority: {habit.priority}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-mono font-extrabold text-foreground">{doneCount} Completed</div>
                    <div className="text-[10px] text-slate-300 font-mono">in {rangeStats.datesList.length} days</div>
                  </div>
                  {statusBadge}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. INTERACTIVE 6-MONTH ACTIVITY HEATMAP ── */}
      <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
          <span>📅 Activity Heatmap Matrix — Last 6 Months</span>
        </h3>
        <HeatmapGrid habits={habits} />
      </div>

      {/* ── 6. SMART INSIGHTS & WEEKLY AI COACH SUMMARY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center justify-between">
            <span>Smart Insights {isPro ? "✨" : "🔒"}</span>
            <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">Automated Analysis</span>
          </h3>
          <ul className="space-y-2">
            {insights.map((line, i) => (
              <li key={i} className="text-xs text-slate-200 font-medium leading-relaxed">• {line}</li>
            ))}
          </ul>
          {!isPro && (
            <Link to="/pricing" className="text-xs text-primary font-bold mt-2 inline-block hover:underline">
              Unlock Unlimited Pro Insights →
            </Link>
          )}
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center justify-between">
            <span>Weekly AI Coach Summary {isPro ? "🤖" : "🔒"}</span>
            <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded-full font-bold">AI Coach</span>
          </h3>
          <p className="text-xs text-slate-200 font-medium leading-relaxed mb-3">{coach.summary}</p>
          <div className="text-[11px] font-extrabold text-slate-300 uppercase font-mono mb-2">Recommendations</div>
          {coach.suggestions.map((s, i) => (
            <div key={i} className="text-xs text-foreground font-semibold mb-1.5 flex items-center gap-1.5">
              <span>→</span> <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* Extracted Heatmap Component */
function HeatmapGrid({ habits }: { habits: ReturnType<typeof useHabits>["habits"] }) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const { weeks, monthLabels } = useMemo(() => {
    const DAYS = 182;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const habitTotal = habits.length || 1;

    const countMap: Record<string, number> = {};
    habits.forEach((h) => (h.completedDates || []).forEach((d) => { countMap[d] = (countMap[d] || 0) + 1; }));

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - DAYS + 1);
    const dow = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

    const weeks: Array<Array<{ ds: string; count: number; level: number; isToday: boolean; visible: boolean; month: number }>> = [];
    const d = new Date(startDate);
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    let weekIndex = 0;
    while (d <= today || (weeks.length > 0 && weeks[weeks.length - 1].length < 7)) {
      const week: typeof weeks[0] = [];
      for (let day = 0; day < 7; day++) {
        if (d > today) {
          week.push({ ds: "", count: 0, level: 0, isToday: false, visible: false, month: -1 });
        } else {
          const ds = d.toISOString().split("T")[0];
          const count = countMap[ds] || 0;
          const ratio = count / habitTotal;
          let level = 0;
          if (count > 0) level = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;

          const month = d.getMonth();
          if (month !== lastMonth && day === 0) {
            monthLabels.push({ label: MONTHS[month], weekIndex });
            lastMonth = month;
          }

          week.push({ ds, count, level, isToday: ds === todayStr, visible: true, month });
        }
        d.setDate(d.getDate() + 1);
      }
      weeks.push(week);
      weekIndex++;
    }

    return { weeks, monthLabels };
  }, [habits]);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="relative h-5 text-[10px] font-mono text-slate-300 ml-8 font-extrabold mb-1">
          {monthLabels.map((m) => (
            <div
              key={`${m.label}-${m.weekIndex}`}
              style={{ left: `${m.weekIndex * 16}px` }}
              className="absolute top-0"
            >
              {m.label}
            </div>
          ))}
        </div>

        <div className="flex gap-1 mt-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1 text-[9.5px] font-mono text-slate-300 font-bold mr-1.5 select-none">
            <span>Mon</span>
            <span className="opacity-0">Tue</span>
            <span>Wed</span>
            <span className="opacity-0">Thu</span>
            <span>Fri</span>
            <span className="opacity-0">Sat</span>
            <span className="opacity-0">Sun</span>
          </div>

          {/* Weeks */}
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day, dIdx) => {
                if (!day.visible) return <div key={dIdx} className="w-3 h-3 rounded-xs opacity-0" />;

                let bgClass = "bg-surface/50 border border-border/40";
                if (day.level === 4) bgClass = "bg-primary border border-primary/60 shadow-xs";
                else if (day.level === 3) bgClass = "bg-primary/80 border border-primary/50";
                else if (day.level === 2) bgClass = "bg-primary/50 border border-primary/40";
                else if (day.level === 1) bgClass = "bg-primary/25 border border-primary/30";

                return (
                  <motion.div
                    key={day.ds}
                    whileHover={{ scale: 1.25 }}
                    title={`${day.ds}: ${day.count} completion${day.count !== 1 ? "s" : ""}`}
                    className={`w-3 h-3 rounded-xs cursor-pointer transition-all ${bgClass} ${day.isToday ? "ring-1 ring-secondary" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsSection;
