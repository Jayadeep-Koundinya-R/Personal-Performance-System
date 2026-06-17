import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHabits } from '../../hooks/useHabits';
import {
  getBestStreak,
  getOverallCompletionRate,
  getHabitSuccessRates,
  buildHeatmapData,
} from '../../utils/habitUtils';

export const AnalyticsView: React.FC = () => {
  const { profile } = useAuth();
  const { habits, isLoading } = useHabits();
  const [successWindow, setSuccessWindow] = useState<7 | 30>(7);
  const [heatmapRange, setHeatmapRange] = useState<91 | 182 | 365>(182);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number } | null>(null);

  // 1. General Stats
  const totalXP = profile?.total_xp ?? 0;
  const bestStreak = useMemo(() => getBestStreak(habits), [habits]);
  const overallCompRate = useMemo(() => getOverallCompletionRate(habits), [habits]);
  
  const totalCompletions = useMemo(() => {
    return habits.reduce((sum, h) => sum + (h.completedDates?.length ?? 0), 0);
  }, [habits]);

  // 2. Category Breakdown (Donut Chart)
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    habits.forEach((h) => {
      const completedCount = h.completedDates?.length ?? 0;
      if (completedCount > 0) {
        counts[h.category] = (counts[h.category] ?? 0) + completedCount;
        total += completedCount;
      }
    });

    const colors = [
      '#6366f1', // Indigo
      '#f97316', // Orange
      '#10b981', // Emerald
      '#ec4899', // Pink
      '#eab308', // Yellow
      '#3b82f6', // Blue
      '#8b5cf6', // Purple
    ];

    let colorIndex = 0;
    return Object.entries(counts).map(([name, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const color = colors[colorIndex++ % colors.length];
      return { name, count, pct, color };
    });
  }, [habits]);

  // 3. Success Rates
  const successRates = useMemo(() => {
    return getHabitSuccessRates(habits, successWindow);
  }, [habits, successWindow]);

  // 4. Heatmap Data
  const heatmapData = useMemo(() => {
    return buildHeatmapData(habits, heatmapRange);
  }, [habits, heatmapRange]);

  // SVG Donut Path calculations
  const donutSegments = useMemo(() => {
    let accumulatedPercent = 0;
    return categoryStats.map((stat) => {
      const strokeDasharray = `${stat.pct} ${100 - stat.pct}`;
      const strokeDashoffset = 100 - accumulatedPercent + 25; // +25 to start at 12 o'clock
      accumulatedPercent += stat.pct;
      return {
        ...stat,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categoryStats]);

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 1:
        return 'bg-accent/20 border-accent/10';
      case 2:
        return 'bg-accent/40 border-accent/20';
      case 3:
        return 'bg-accent/75 border-accent/30';
      case 4:
        return 'bg-accent border-accent/45 shadow-glow-accent';
      default:
        return 'bg-surface-3 border-white/5';
    }
  };

  const weekdays = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Syncing stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Analytics & Insights
        </h1>
        <p className="text-muted text-sm mt-1">
          Deep analytics visualizing consistency patterns, category weights, and historical streaks.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-panel p-5 rounded-radius border border-border flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
            Avg Completion
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-syne text-3xl font-extrabold text-text">
              {overallCompRate}%
            </span>
          </div>
          <span className="text-[10px] text-muted mt-2">
            Based on active 30-day window
          </span>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-5 rounded-radius border border-border flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
            Best Streak
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-syne text-3xl font-extrabold text-orange">
              {bestStreak}
            </span>
            <span className="text-sm font-semibold text-muted">days</span>
          </div>
          <span className="text-[10px] text-muted mt-2">
            All-time record across habits
          </span>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-5 rounded-radius border border-border flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
            Total completions
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-syne text-3xl font-extrabold text-accent">
              {totalCompletions}
            </span>
          </div>
          <span className="text-[10px] text-muted mt-2">
            Total ticks processed
          </span>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-5 rounded-radius border border-border flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
            Experience points
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-syne text-3xl font-extrabold text-text-2">
              {totalXP.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-muted">XP</span>
          </div>
          <span className="text-[10px] text-muted mt-2">
            Lifetime accumulated score
          </span>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap (col span 2 or full in layout below) */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-2">Activity Grid</h2>
              <p className="text-xs text-muted">
                Visual index of habit completions over time. Total ticks: {heatmapData.grandTotal}.
              </p>
            </div>
            {/* Range controls */}
            <div className="flex bg-surface-2 p-1 border border-border rounded-radius-sm self-start sm:self-auto">
              {[
                { label: '3M', val: 91 },
                { label: '6M', val: 182 },
                { label: '12M', val: 365 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setHeatmapRange(opt.val as any)}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-radius-sm transition-all ${
                    heatmapRange === opt.val
                      ? 'bg-accent text-white shadow-glow-accent'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Heatmap Grid Wrapper */}
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
              {/* Day Labels */}
              <div className="grid grid-rows-7 text-[10px] font-mono text-muted text-right pr-1 select-none pt-6 h-[112px]">
                {weekdays.map((day, idx) => (
                  <div key={idx} className="h-3.5 flex items-center justify-end leading-none">
                    {day}
                  </div>
                ))}
              </div>

              {/* The Heatmap Grid */}
              <div className="relative flex-1">
                {/* Month labels header */}
                <div className="h-5 relative text-[10px] font-mono text-muted select-none">
                  {heatmapData.monthLabels.map((lbl, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 transform translate-y-0.5"
                      style={{ left: `${lbl.colIndex * 13}px` }}
                    >
                      {lbl.label}
                    </div>
                  ))}
                </div>

                <div
                  className="grid grid-rows-7 grid-flow-col gap-[3px] select-none h-[105px]"
                  style={{
                    gridTemplateColumns: `repeat(${heatmapData.weeks}, minmax(0, 1fr))`,
                    width: `${heatmapData.weeks * 13}px`,
                  }}
                >
                  {heatmapData.cells.map((cell, idx) => (
                    <div
                      key={idx}
                      className={`w-[10px] h-[10px] rounded-[2px] border transition-all cursor-crosshair ${getIntensityClass(
                        cell.intensity
                      )}`}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${cell.date}: ${cell.count} completions`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hover Tooltip display */}
            <div className="h-5 mt-2 flex items-center justify-between text-xs font-mono text-muted border-t border-border/40 pt-2">
              <div>
                {hoveredCell ? (
                  <span>
                    📅 <span className="text-text-2">{hoveredCell.date}</span> :{' '}
                    <span className="text-accent font-bold">{hoveredCell.count} completions</span>
                  </span>
                ) : (
                  <span>Hover over a cell to view counts.</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="w-2.5 h-2.5 bg-surface-3 border border-white/5 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-accent/20 border border-accent/10 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-accent/40 border border-accent/20 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-accent/75 border border-accent/30 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-accent border border-accent/45 rounded-[2px]" />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown (Donut card) */}
        <div className="glass-panel p-6 rounded-radius border border-border space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Category Weight</h2>
            <p className="text-xs text-muted">Breakdown of lifetime completions by category</p>
          </div>

          {categoryStats.length > 0 ? (
            <div className="flex flex-col items-center gap-6">
              {/* Dynamic Donut SVG */}
              <div className="relative w-36 h-36">
                <svg className="w-full h-full" viewBox="0 0 42 42">
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    className="stroke-surface-3"
                    strokeWidth="4"
                  />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="21"
                      cy="21"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="4"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-500 ease-out"
                    />
                  ))}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-syne font-extrabold text-text">
                    {categoryStats.length}
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted">
                    Categories
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-2">
                {categoryStats.map((stat) => (
                  <div key={stat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                      <span className="text-muted truncate font-semibold">{stat.name}</span>
                    </div>
                    <span className="font-mono text-text-2 font-bold pl-2">
                      {stat.count} ({stat.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-center p-4">
              <span className="text-xs text-muted">
                No completions logged yet to map category breakdown.
              </span>
            </div>
          )}
        </div>

        {/* Success Rates Table */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-2">Success Index</h2>
              <p className="text-xs text-muted">Habit performance ratios in active range</p>
            </div>
            {/* Timeframe selector */}
            <div className="flex bg-surface-2 p-0.5 border border-border rounded-radius-sm">
              {[7, 30].map((w) => (
                <button
                  key={w}
                  onClick={() => setSuccessWindow(w as any)}
                  className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-radius-sm transition-all ${
                    successWindow === w
                      ? 'bg-accent text-white'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {w}D
                </button>
              ))}
            </div>
          </div>

          {successRates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted font-mono uppercase tracking-wider">
                    <th className="py-2.5 font-bold">Habit</th>
                    <th className="py-2.5 font-bold text-center">Completed</th>
                    <th className="py-2.5 font-bold text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/45">
                  {successRates.map((rate) => (
                    <tr key={rate.habitId} className="group hover:bg-white/[0.01]">
                      <td className="py-3 font-semibold text-text truncate max-w-[150px]">
                        {rate.name}
                      </td>
                      <td className="py-3 font-mono text-muted text-center">
                        {rate.doneInPeriod} / {successWindow} days
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Success progress bar */}
                          <div className="w-16 bg-surface-3 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${rate.percent}%`,
                                backgroundColor: rate.color,
                              }}
                            />
                          </div>
                          <span
                            style={{ color: rate.color }}
                            className="font-mono font-bold min-w-[36px]"
                          >
                            {rate.percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-center">
              <span className="text-xs text-muted">Create habits to track success metrics.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
