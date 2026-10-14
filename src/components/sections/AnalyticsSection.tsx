/*
  📈 Masterwork Performance Analytics & Records Intelligence Studio
  
  Features:
  - Interactive Weekly Focus-Minutes Curve (SVG area + line curve with day-by-day telemetry)
  - Executive Records Vault (Best streak, best 7-day week, total focus hours, lifetime output)
  - Activity Heatmap Matrix with 2-minute Micro-Habit Partial States
  - Habit Power Rankings & Consistency Leaderboard
  - Honest Energy / Circadian Correlation Engine (strictly gated by 14-day minimum data baseline)
  - 1-Click Executive PDF Report Generation (jsPDF + autotable)
  - Category Effort Distribution & AI Level Velocity Forecast
*/

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { useSmartInsights, useAiCoachSummary } from "@/hooks/use-insights";
import {
  Calendar,
  Zap,
  TrendingUp,
  Award,
  Flame,
  AlertTriangle,
  Sparkles,
  Download,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  BarChart2,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getMicroCompletionsMap } from "@/lib/dashboard/microHabits";
import {
  calculateWeeklyFocusCurveData,
  calculateExecutiveRecords,
  checkCircadianDataSufficiency,
  calculateHeatmapCellState,
  WeeklyFocusDay,
} from "@/lib/dashboard/analytics";

type TimeRange = "7d" | "30d" | "90d" | "1y" | "custom";

const AnalyticsSection = () => {
  const { habits, calculateTotalXP, getMaxStreak, getTodayStr, calculateLevel } = useHabits();
  const { isPro } = useSubscription();
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

  // Active hover point for weekly curve
  const [activeCurveDay, setActiveCurveDay] = useState<WeeklyFocusDay | null>(null);

  // Helper to read focus minutes from localStorage
  const getMinutesForDate = useMemo(() => {
    return (ds: string): number => {
      if (typeof window === "undefined") return 0;
      try {
        return Number(localStorage.getItem(`pps_focus_minutes_${ds}`) || "0");
      } catch {
        return 0;
      }
    };
  }, []);

  // 1. Weekly Focus-Minutes Curve (interactive 7-day trajectory)
  const weeklyCurve = useMemo(() => {
    return calculateWeeklyFocusCurveData(todayStr, getMinutesForDate, 180);
  }, [todayStr, getMinutesForDate]);

  // Calculate Days count for current time range
  const rangeDaysCount = useMemo(() => {
    if (timeRange === "7d") return 7;
    if (timeRange === "30d") return 30;
    if (timeRange === "90d") return 90;
    if (timeRange === "1y") return 365;

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

  // 2. Executive Records Vault
  const records = useMemo(() => {
    // Generate dates for the past 180 days to scan records
    const historicalDates: string[] = [];
    const now = new Date();
    for (let i = 180; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      historicalDates.push(d.toISOString().split("T")[0]);
    }

    return calculateExecutiveRecords(habits, historicalDates, getMinutesForDate);
  }, [habits, getMinutesForDate]);

  // 3. Category Effort Distribution
  const categoryDistribution = useMemo(() => {
    const catMap: Record<string, number> = {};
    let grandTotal = 0;

    habits.forEach((h) => {
      const cat = h.category || "General";
      const countInRange = (h.completedDates || []).filter((ds) => rangeStats.datesList.includes(ds)).length;
      catMap[cat] = (catMap[cat] || 0) + countInRange;
      grandTotal += countInRange;
    });

    return Object.entries(catMap)
      .map(([category, count]) => ({
        category,
        count,
        pct: grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [habits, rangeStats.datesList]);

  // 4. Habit Power Rankings & Consistency Leaderboard
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

  // 5. Energy Level vs Performance Correlation Engine (Strict 14-day threshold guard)
  const energyData = useMemo(() => {
    const moodMap: Record<string, { days: number; completions: number }> = {
      high: { days: 0, completions: 0 },
      good: { days: 0, completions: 0 },
      low: { days: 0, completions: 0 },
    };

    let loggedMoodDaysCount = 0;

    rangeStats.datesList.forEach((ds) => {
      try {
        const loggedMood = localStorage.getItem(`pps_today_mood_${ds}`);
        if (loggedMood && moodMap[loggedMood]) {
          moodMap[loggedMood].days++;
          moodMap[loggedMood].completions += rangeStats.dailyCounts[ds] || 0;
          loggedMoodDaysCount++;
        }
      } catch {}
    });

    const check = checkCircadianDataSufficiency(loggedMoodDaysCount, 14);

    const highAvg = moodMap.high.days > 0 ? (moodMap.high.completions / moodMap.high.days).toFixed(1) : "—";
    const goodAvg = moodMap.good.days > 0 ? (moodMap.good.completions / moodMap.good.days).toFixed(1) : "—";
    const lowAvg = moodMap.low.days > 0 ? (moodMap.low.completions / moodMap.low.days).toFixed(1) : "—";

    return { check, moodMap, highAvg, goodAvg, lowAvg };
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

  // 6. PDF Export Handler (reusing jsPDF + autotable)
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PERSONAL PERFORMANCE SYSTEM", 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Executive Performance & Analytics Report (${timeRange.toUpperCase()})`, 14, 28);

      // Stats Summary
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 38);
      doc.text(`Total Habit Completions: ${rangeStats.totalCompleted}`, 14, 44);
      doc.text(`Overall Consistency Rate: ${rangeStats.completionRate}%`, 14, 50);
      doc.text(`Best Streak: ${records.bestStreak} Days | Best 7-Day Week: ${records.bestWeekCompletions} Habits`, 14, 56);
      doc.text(`Total Deep Focus Logged: ${records.totalFocusHours} Hours (${records.totalFocusMinutes} minutes)`, 14, 62);

      // Table of Habits
      const tableData = habitRankings.map((item, idx) => [
        `#${idx + 1}`,
        item.habit.name,
        item.habit.category || "General",
        `${item.doneCount} / ${rangeStats.datesList.length} days`,
        `${item.consistencyPct}%`,
        item.status.toUpperCase(),
      ]);

      (doc as any).autoTable({
        startY: 70,
        head: [["Rank", "Habit Name", "Category", "Completions", "Rate %", "Status"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229] },
      });

      doc.save(`PPS_Executive_Analytics_${timeRange}_${todayStr}.pdf`);
      toast.success("Executive PDF Report generated & downloaded!");
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("Failed to generate PDF. Check browser permissions.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selector Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>📈</span>
              <span>Performance Intelligence</span>
            </h1>
            <span className="text-[9.5px] font-mono bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold uppercase shrink-0 whitespace-nowrap">
              Live Analytics & Vault
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Weekly focus curve, completion heatmap, per-habit consistency, records vault, and executive reports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Selector Pills */}
          <div className="flex items-center gap-1 bg-surface border border-border/80 p-1 rounded-2xl shadow-xs">
            {[
              { key: "7d" as const, label: "7D" },
              { key: "30d" as const, label: "30D" },
              { key: "90d" as const, label: "90D" },
              { key: "1y" as const, label: "1Y" },
              { key: "custom" as const, label: "📅 Custom" },
            ].map((t) => {
              const isCurrent = timeRange === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTimeRange(t.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
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

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-surface border border-border/80 hover:border-primary text-foreground text-xs font-bold transition-all hover:shadow-sm cursor-pointer"
            title="Download executive PDF report"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
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

      {/* ── 1. EXECUTIVE RECORDS VAULT ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive Records Vault</span>
          </span>
          <span className="text-[10px] text-muted-foreground/80 font-mono hidden sm:inline">
            All-time historical benchmarks
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Record 1: Best Streak */}
          <div className="bg-card/90 border border-border/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">
                Best Streak
              </span>
              <div className="w-7 h-7 rounded-lg bg-pps-orange/15 border border-pps-orange/30 flex items-center justify-center text-sm">
                🔥
              </div>
            </div>
            <div className="my-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
                {records.bestStreak} <span className="text-xs font-sans text-muted-foreground">Days</span>
              </div>
              <div className="text-[11px] text-pps-orange font-mono font-semibold">
                Peak continuous discipline
              </div>
            </div>
          </div>

          {/* Record 2: Best Week */}
          <div className="bg-card/90 border border-border/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">
                Best 7-Day Week
              </span>
              <div className="w-7 h-7 rounded-lg bg-pps-green/15 border border-pps-green/30 flex items-center justify-center text-sm">
                ⚡
              </div>
            </div>
            <div className="my-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
                {records.bestWeekCompletions} <span className="text-xs font-sans text-muted-foreground">Habits</span>
              </div>
              <div className="text-[11px] text-pps-green font-mono font-semibold">
                Peak 7-day completion output
              </div>
            </div>
          </div>

          {/* Record 3: Total Focus Hours */}
          <div className="bg-card/90 border border-border/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">
                Total Focus Time
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-sm">
                ⏱️
              </div>
            </div>
            <div className="my-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
                {records.totalFocusHours} <span className="text-xs font-sans text-muted-foreground">Hours</span>
              </div>
              <div className="text-[11px] text-primary font-mono font-semibold">
                {records.totalFocusMinutes} total focus minutes
              </div>
            </div>
          </div>

          {/* Record 4: Lifetime Completions */}
          <div className="bg-card/90 border border-border/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-extrabold">
                Lifetime Completions
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-sm">
                🏆
              </div>
            </div>
            <div className="my-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
                {records.totalLifetimeCompletions} <span className="text-xs font-sans text-muted-foreground">Done</span>
              </div>
              <div className="text-[11px] text-cyan-400 font-mono font-semibold">
                Level {currentLevel} • {totalXP} Total XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. INTERACTIVE WEEKLY FOCUS-MINUTES CURVE ── */}
      <div className="bg-card border border-border/80 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Interactive Weekly Focus-Minutes Curve</span>
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Live 7-day deep work telemetry • Benchmark target: {weeklyCurve.targetMinutes}m / day
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="text-right">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-black text-foreground">{weeklyCurve.totalMinutes}m</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Avg: </span>
              <span className="font-black text-primary">{weeklyCurve.averageMinutes}m/d</span>
            </div>
            {weeklyCurve.peakDay && (
              <div className="text-right hidden sm:block">
                <span className="text-muted-foreground">Peak: </span>
                <span className="font-black text-emerald-400">
                  {weeklyCurve.peakDay.dayLabel} ({weeklyCurve.peakDay.focusMinutes}m)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SVG Curve Canvas */}
        <div className="relative pt-2 pb-1">
          {/* Tooltip on Active Point */}
          {activeCurveDay && (
            <div className="absolute top-0 right-4 bg-surface border border-primary/40 px-3 py-1.5 rounded-xl shadow-lg text-xs font-mono z-10 flex items-center gap-2 pointer-events-none">
              <span className="font-bold text-foreground">{activeCurveDay.dayLabel} ({activeCurveDay.dateStr}):</span>
              <span className="font-black text-primary">{activeCurveDay.focusMinutes}m</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeCurveDay.meetsTarget ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {activeCurveDay.meetsTarget ? "✓ Met Target" : `${Math.round((activeCurveDay.focusMinutes / weeklyCurve.targetMinutes) * 100)}% of goal`}
              </span>
            </div>
          )}

          <div className="w-full h-44">
            <FocusCurveChart
              data={weeklyCurve.days}
              targetMinutes={weeklyCurve.targetMinutes}
              activeDay={activeCurveDay}
              onHoverDay={setActiveCurveDay}
            />
          </div>
        </div>
      </div>

      {/* ── 3. ACTIVITY HEATMAP MATRIX (WITH MICRO-HABIT PARTIAL STATE) ── */}
      <div className="bg-card border border-border/80 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Activity Heatmap Matrix — Last 6 Months</span>
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Daily habit completions with distinct 2-minute micro-habit streak protection states
            </p>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground flex-wrap">
            <span>Empty</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-surface border border-border/40" />
            <div className="w-2.5 h-2.5 rounded-xs bg-primary/25 border border-primary/30" />
            <div className="w-2.5 h-2.5 rounded-xs bg-primary/50 border border-primary/40" />
            <div className="w-2.5 h-2.5 rounded-xs bg-primary/80 border border-primary/50" />
            <div className="w-2.5 h-2.5 rounded-xs bg-primary border border-primary/60" />
            <span>Max</span>
            <span className="mx-1 text-border">|</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-primary/20 border border-dashed border-primary/70" />
            <span className="text-primary font-bold">2m Micro (Partial)</span>
          </div>
        </div>

        <EnhancedHeatmapGrid habits={habits} />
      </div>

      {/* ── 4. CATEGORY EFFORT & CIRCADIAN/ENERGY CORRELATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Effort Distribution Chart */}
        <div className="bg-card border border-border/80 p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-black uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span>Category Effort Distribution</span>
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

        {/* Energy & Circadian Correlation Engine (Strict 14-Day Baseline Guard) */}
        <div className="bg-card border border-border/80 p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-black uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Circadian & Energy Correlation</span>
            </h3>
            <span className={`text-[9.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${energyData.check.sufficient ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
              {energyData.check.sufficient ? "14D Active" : "14-Day Baseline"}
            </span>
          </div>

          {!energyData.check.sufficient ? (
            /* Honest Empty State for < 14 Days */
            <div className="p-5 rounded-2xl bg-surface/50 border border-border/70 space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 text-lg">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-black text-foreground">
                    Baseline Data Collection in Progress
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {energyData.check.message}
                  </p>
                </div>
              </div>

              {/* Progress bar towards 14 days */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono font-bold">
                  <span className="text-muted-foreground">Telemetry Baseline</span>
                  <span className="text-primary">{energyData.check.loggedDaysCount} / {energyData.check.requiredDaysCount} Days ({energyData.check.progressPct}%)</span>
                </div>
                <div className="h-2 bg-surface border border-border/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${energyData.check.progressPct}%` }}
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>Record evening reflections to unlock circadian rhythms</span>
                <Link to="/dashboard" className="text-primary font-bold hover:underline">
                  Log Check-In →
                </Link>
              </div>
            </div>
          ) : (
            /* Real Correlation Analysis when >= 14 days of data exist */
            <div className="space-y-3">
              <div className="bg-surface/60 border border-border/60 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚡</span>
                  <div>
                    <div className="text-xs font-extrabold text-foreground">High Energy Days</div>
                    <div className="text-[11px] text-muted-foreground font-medium">Logged on {energyData.moodMap.high.days} days</div>
                  </div>
                </div>
                <div className="text-base font-extrabold font-mono text-emerald-400">{energyData.highAvg} Habits/Day</div>
              </div>

              <div className="bg-surface/60 border border-border/60 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">😊</span>
                  <div>
                    <div className="text-xs font-extrabold text-foreground">Good Energy Days</div>
                    <div className="text-[11px] text-muted-foreground font-medium">Logged on {energyData.moodMap.good.days} days</div>
                  </div>
                </div>
                <div className="text-base font-extrabold font-mono text-primary">{energyData.goodAvg} Habits/Day</div>
              </div>

              <div className="bg-surface/60 border border-border/60 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">😴</span>
                  <div>
                    <div className="text-xs font-extrabold text-foreground">Low Energy Days</div>
                    <div className="text-[11px] text-muted-foreground font-medium">Logged on {energyData.moodMap.low.days} days</div>
                  </div>
                </div>
                <div className="text-base font-extrabold font-mono text-pps-orange">{energyData.lowAvg} Habits/Day</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. HABIT POWER RANKINGS & PER-HABIT CONSISTENCY ── */}
      <div className="bg-card border border-border/80 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span>Habit Power Rankings & Consistency Leaderboard</span>
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
          {habitRankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs font-medium">
              No habits found in the active workspace.
            </div>
          ) : (
            habitRankings.map(({ habit, doneCount, consistencyPct, status }, rank) => {
              let statusBadge = (
                <span className="text-[10.5px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
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
                    <div className="w-8 h-8 rounded-xl bg-surface border border-border/80 flex items-center justify-center font-mono font-black text-xs text-foreground shrink-0">
                      #{rank + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground truncate">{habit.name}</div>
                      <div className="text-[11px] text-muted-foreground font-medium truncate">
                        Category: {habit.category || "General"} • Priority: {habit.priority}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-foreground">{doneCount} Completed</div>
                      <div className="text-[10px] text-muted-foreground font-mono">in {rangeStats.datesList.length} days</div>
                    </div>
                    {statusBadge}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Interactive Focus Curve SVG Component ── */
interface FocusCurveChartProps {
  data: WeeklyFocusDay[];
  targetMinutes: number;
  activeDay: WeeklyFocusDay | null;
  onHoverDay: (day: WeeklyFocusDay | null) => void;
}

const FocusCurveChart: React.FC<FocusCurveChartProps> = ({
  data,
  targetMinutes,
  activeDay,
  onHoverDay,
}) => {
  const maxMins = useMemo(() => {
    const peak = Math.max(...data.map((d) => d.focusMinutes), targetMinutes);
    return Math.max(peak + 30, 240);
  }, [data, targetMinutes]);

  const width = 600;
  const height = 150;
  const paddingX = 40;
  const paddingBottom = 25;
  const paddingTop = 15;

  const points = useMemo(() => {
    const stepX = (width - paddingX * 2) / Math.max(1, data.length - 1);
    const usableH = height - paddingTop - paddingBottom;

    return data.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingTop + (1 - d.focusMinutes / maxMins) * usableH;
      return { x, y, day: d };
    });
  }, [data, maxMins]);

  // Construct smooth SVG path
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const bottomY = height - paddingBottom;
    return `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [pathD, points]);

  // Target line Y
  const targetY = paddingTop + (1 - targetMinutes / maxMins) * (height - paddingTop - paddingBottom);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="focusAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Target Benchmark Line */}
      <line
        x1={paddingX}
        y1={targetY}
        x2={width - paddingX}
        y2={targetY}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        strokeDasharray="4 4"
        strokeOpacity="0.5"
      />
      <text
        x={width - paddingX + 5}
        y={targetY + 3}
        fill="hsl(var(--muted-foreground))"
        fontSize="9"
        fontFamily="monospace"
        textAnchor="start"
      >
        Target ({targetMinutes}m)
      </text>

      {/* Area under curve */}
      <path d={areaD} fill="url(#focusAreaGradient)" />

      {/* Main Curve Stroke */}
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Interactive Points and Labels */}
      {points.map((pt, i) => {
        const isActive = activeDay?.dateStr === pt.day.dateStr;
        return (
          <g key={pt.day.dateStr}>
            {/* Day name label below */}
            <text
              x={pt.x}
              y={height - 6}
              fill="hsl(var(--muted-foreground))"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {pt.day.dayLabel}
            </text>

            {/* Hover trigger zone */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="14"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => onHoverDay(pt.day)}
              onMouseLeave={() => onHoverDay(null)}
            />

            {/* Data Point circle */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 6 : 4}
              fill={pt.day.meetsTarget ? "hsl(var(--primary))" : "hsl(var(--surface))"}
              stroke="hsl(var(--primary))"
              strokeWidth={isActive ? 3 : 2}
              className="transition-all pointer-events-none"
            />
          </g>
        );
      })}
    </svg>
  );
};

/* ── Enhanced Heatmap Component with 2m Micro Partial State ── */
function EnhancedHeatmapGrid({ habits }: { habits: ReturnType<typeof useHabits>["habits"] }) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const { weeks, monthLabels } = useMemo(() => {
    const DAYS = 182;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const habitTotal = habits.length || 1;

    // Full completions map
    const countMap: Record<string, number> = {};
    habits.forEach((h) => {
      (h.completedDates || []).forEach((d) => {
        countMap[d] = (countMap[d] || 0) + 1;
      });
    });

    // Micro completions map
    const microMap = getMicroCompletionsMap();
    const microDateCountMap: Record<string, number> = {};
    Object.values(microMap).forEach((dates) => {
      dates.forEach((d) => {
        microDateCountMap[d] = (microDateCountMap[d] || 0) + 1;
      });
    });

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - DAYS + 1);
    const dow = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

    const weeks: Array<
      Array<{
        ds: string;
        fullCount: number;
        microCount: number;
        state: ReturnType<typeof calculateHeatmapCellState>;
        isToday: boolean;
        visible: boolean;
        month: number;
      }>
    > = [];
    const d = new Date(startDate);
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    let weekIndex = 0;
    while (d <= today || (weeks.length > 0 && weeks[weeks.length - 1].length < 7)) {
      const week: typeof weeks[0] = [];
      for (let day = 0; day < 7; day++) {
        if (d > today) {
          week.push({ ds: "", fullCount: 0, microCount: 0, state: "empty", isToday: false, visible: false, month: -1 });
        } else {
          const ds = d.toISOString().split("T")[0];
          const fullCount = countMap[ds] || 0;
          const microCount = microDateCountMap[ds] || 0;
          const state = calculateHeatmapCellState(fullCount, microCount, habitTotal);

          const month = d.getMonth();
          if (month !== lastMonth && day === 0) {
            monthLabels.push({ label: MONTHS[month], weekIndex });
            lastMonth = month;
          }

          week.push({ ds, fullCount, microCount, state, isToday: ds === todayStr, visible: true, month });
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
        <div className="relative h-5 text-[10px] font-mono text-muted-foreground ml-8 font-extrabold mb-1">
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
          <div className="flex flex-col gap-1 text-[9.5px] font-mono text-muted-foreground font-bold mr-1.5 select-none">
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
                let tooltipText = `${day.ds}: No completions`;

                if (day.state === "micro_partial") {
                  bgClass = "bg-primary/20 border border-dashed border-primary/70";
                  tooltipText = `${day.ds}: ${day.microCount} micro-habit (partial state — protected streak)`;
                } else if (day.state === "level_4") {
                  bgClass = "bg-primary border border-primary/60 shadow-xs";
                  tooltipText = `${day.ds}: ${day.fullCount} full completions (100% output)`;
                } else if (day.state === "level_3") {
                  bgClass = "bg-primary/80 border border-primary/50";
                  tooltipText = `${day.ds}: ${day.fullCount} completions (High output)`;
                } else if (day.state === "level_2") {
                  bgClass = "bg-primary/50 border border-primary/40";
                  tooltipText = `${day.ds}: ${day.fullCount} completions (Moderate output)`;
                } else if (day.state === "level_1") {
                  bgClass = "bg-primary/25 border border-primary/30";
                  tooltipText = `${day.ds}: ${day.fullCount} completions (Light output)`;
                }

                return (
                  <motion.div
                    key={day.ds}
                    whileHover={{ scale: 1.3 }}
                    title={tooltipText}
                    className={`w-3 h-3 rounded-xs cursor-pointer transition-all ${bgClass} ${
                      day.isToday ? "ring-1 ring-secondary" : ""
                    }`}
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
