/*
  💡 REACT LESSON: Analytics with proper heatmap
  
  The heatmap now shows month labels, day-of-week labels, 
  tooltip on hover, and a clear color scale legend.
*/

import { useState, useMemo } from "react";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { useSmartInsights, useAiCoachSummary } from "@/hooks/use-insights";
import { Link } from "react-router-dom";

const AnalyticsSection = () => {
  const { habits, calculateTotalXP, getMaxStreak, getTodayStr, isHabitDueToday } = useHabits();
  const { isPro, limits } = useSubscription();
  const insights = useSmartInsights(isPro);
  const coach = useAiCoachSummary(isPro);
  const todayStr = getTodayStr();
  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const doneToday = dueToday.filter((h) => (h.completedDates || []).includes(todayStr));
  const pct = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;

  const totalXP = calculateTotalXP();
  const bestStreak = getMaxStreak();
  const totalDone = habits.reduce((s, h) => s + (h.completedDates || []).length, 0);

  // Weekly chart
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = new Array(7).fill(0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    habits.forEach((h) => { if ((h.completedDates || []).includes(ds)) counts[6 - i]++; });
  }
  const maxCount = Math.max(...counts, 1);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-[22px] font-bold">Analytics</h1><div className="text-[13px] text-muted-foreground mt-0.5">Your performance over time</div></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <div className="rounded-lg p-[18px] px-5 bg-card border border-border">
          <div className="text-[28px] font-bold font-mono">{pct}%</div><div className="text-xs text-muted-foreground mt-1">Avg Completion</div>
        </div>
        <div className="rounded-lg p-[18px] px-5 bg-card border border-border">
          <div className="text-[28px] font-bold font-mono">🔥 {bestStreak}</div><div className="text-xs text-muted-foreground mt-1">Best Streak</div>
        </div>
        <div className="rounded-lg p-[18px] px-5 bg-card border border-border">
          <div className="text-[28px] font-bold font-mono">{totalXP}</div><div className="text-xs text-muted-foreground mt-1">Total XP</div>
        </div>
        <div className="rounded-lg p-[18px] px-5 bg-card border border-border">
          <div className="text-[28px] font-bold font-mono">{totalDone}</div><div className="text-xs text-muted-foreground mt-1">Habits Completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-5">
        {/* Weekly chart */}
        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Weekly Completion Rate</h3>
          <div className="flex items-end gap-2 h-[150px] mt-3">
            {labels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] font-mono font-semibold text-foreground/70">{counts[i]}</div>
                <div className="w-full rounded-t" style={{ height: `${Math.max(Math.round((counts[i] / maxCount) * 100), 4)}%`, background: i === 6 ? "linear-gradient(180deg, hsl(var(--secondary)), hsl(var(--secondary) / 0.6))" : "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))", minHeight: "4px" }} />
                <div className={`text-[10px] font-mono ${i === 6 ? "text-secondary font-bold" : "text-muted-foreground"}`}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per habit success */}
        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Per Habit Success Rate</h3>
          {habits.length === 0 ? <p className="text-muted-foreground text-[13px] text-center py-6">No habits yet.</p> : (
            habits.map((h) => {
              const done = (h.completedDates || []).filter((d) => new Date(d) >= weekAgo).length;
              const hPct = Math.min(Math.round((done / 7) * 100), 100);
              const color = hPct >= 80 ? "hsl(var(--green))" : hPct >= 50 ? "hsl(var(--yellow))" : "hsl(var(--destructive))";
              return (
                <div key={h.id} className="mb-3.5">
                  <div className="flex justify-between text-[13px] mb-1">
                    <span>{h.name}</span>
                    <span className="font-mono" style={{ color }}>{hPct}%</span>
                  </div>
                  <div className="bg-surface rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${hPct}%`, background: color }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-border p-5 rounded-lg">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">📅 Activity Heatmap — Last 6 Months</h3>
        <HeatmapGrid habits={habits} />
      </div>

      {/* Smart Insights & AI Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Smart Insights {isPro ? "✨" : "🔒"}</h3>
          <ul className="space-y-2">
            {insights.map((line, i) => (
              <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">• {line}</li>
            ))}
          </ul>
          {!isPro && (
            <Link to="/pricing" className="text-[11px] text-primary mt-3 inline-block hover:underline">Unlock Pro insights →</Link>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Weekly AI Coach {isPro ? "🤖" : "🔒"}</h3>
          <p className="text-[13px] text-muted-foreground mb-3">{coach.summary}</p>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Suggestions</div>
          {coach.suggestions.map((s, i) => (
            <div key={i} className="text-[13px] mb-1.5">→ {s}</div>
          ))}
        </div>
      </div>

      {!isPro && limits.analyticsDays < Infinity && (
        <p className="text-[11px] text-muted-foreground mt-4">Free plan shows {limits.analyticsDays}-day analytics. Pro unlocks full history.</p>
      )}
    </div>
  );
};

/*
  💡 REACT LESSON: Extracted Component
  
  The heatmap is complex enough to be its own component.
  It receives habits as a "prop" (input) and renders the grid.
  
  useMemo caches the grid computation so it only recalculates
  when habits data actually changes.
*/
function HeatmapGrid({ habits }: { habits: ReturnType<typeof useHabits>["habits"] }) {
  const [hoveredCell, setHoveredCell] = useState<{ ds: string; count: number; x: number; y: number } | null>(null);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

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

  // Colors for light/dark mode — using CSS classes
  const levelClasses = [
    "bg-surface dark:bg-surface",
    "bg-primary/20 dark:bg-[#1e3a5f]",
    "bg-primary/40 dark:bg-[#1e4d8c]",
    "bg-primary/60 dark:bg-[#2563eb]",
    "bg-primary dark:bg-primary",
  ];

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex ml-8 mb-1">
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="text-[10px] text-muted-foreground font-mono absolute"
            style={{ left: `${32 + m.weekIndex * 15}px` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div className="flex mt-5">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-2 pt-0">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-3 text-[9px] text-muted-foreground font-mono flex items-center">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-[2px] cursor-default transition-colors ${levelClasses[cell.level]}`}
                  style={{
                    visibility: cell.visible ? "visible" : "hidden",
                    outline: cell.isToday ? "2px solid hsl(var(--secondary))" : "none",
                    outlineOffset: cell.isToday ? "1px" : "0",
                  }}
                  onMouseEnter={(e) => {
                    if (cell.visible) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({ ds: cell.ds, count: cell.count, x: rect.left, y: rect.top });
                    }
                  }}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg px-3 py-2 text-[11px] shadow-lg pointer-events-none"
          style={{ left: hoveredCell.x - 40, top: hoveredCell.y - 45 }}
        >
          <div className="font-semibold">{hoveredCell.ds}</div>
          <div className="text-muted-foreground">
            {hoveredCell.count > 0 ? `${hoveredCell.count} habit${hoveredCell.count > 1 ? "s" : ""} completed` : "No activity"}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-2 items-center mt-4 text-[11px] text-muted-foreground">
        <span>Less</span>
        {levelClasses.map((cls, i) => (
          <div key={i} className={`w-3 h-3 rounded-[2px] ${cls} ${i === 0 ? "border border-border" : ""}`} />
        ))}
        <span>More</span>
        <span className="ml-auto font-mono text-[10px]">{habits.reduce((s, h) => s + h.completedDates.length, 0)} total contributions</span>
      </div>
    </div>
  );
}

export default AnalyticsSection;
