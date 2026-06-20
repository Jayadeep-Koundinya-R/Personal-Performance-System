import { useState, useMemo, useRef } from "react";
import { useHabits, CONFIG } from "@/hooks/use-habits";
import jsPDF from "jspdf";
import "jspdf-autotable";

type Period = "week" | "month";

const ReportsSection = () => {
  const { habits, getMaxStreak, calculateLevel, calculateTotalXP } = useHabits();
  const [period, setPeriod] = useState<Period>("week");
  const reportRef = useRef<HTMLDivElement>(null);

  const report = useMemo(() => {
    const now = new Date();
    const daysBack = period === "week" ? 7 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Collect data for the period
    const dailyData: { date: string; completed: number; total: number }[] = [];
    let totalCompleted = 0;
    let totalDue = 0;
    const categoryStats: Record<string, { done: number; total: number }> = {};
    const habitPerformance: { name: string; category: string; completed: number; possible: number; rate: number }[] = [];

    for (let i = 0; i < daysBack; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];

      let dayCompleted = 0;
      let dayTotal = 0;

      habits.forEach((h) => {
        // Simple check: if habit existed and was daily/weekly
        if (h.period === "Daily" || h.period === "Today") {
          dayTotal++;
          if (h.completedDates.includes(ds)) {
            dayCompleted++;
          }
        }
      });

      dailyData.unshift({ date: ds, completed: dayCompleted, total: dayTotal });
      totalCompleted += dayCompleted;
      totalDue += dayTotal;
    }

    // Per-habit stats
    habits.forEach((h) => {
      const cat = h.category || "Uncategorized";
      if (!categoryStats[cat]) categoryStats[cat] = { done: 0, total: 0 };

      let done = 0;
      let possible = 0;
      for (let i = 0; i < daysBack; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        if (h.period === "Daily" || h.period === "Today") {
          possible++;
          if (h.completedDates.includes(ds)) {
            done++;
          }
        }
      }
      const rate = possible > 0 ? Math.round((done / possible) * 100) : 0;
      habitPerformance.push({ name: h.name, category: cat, completed: done, possible, rate });
      categoryStats[cat].done += done;
      categoryStats[cat].total += possible;
    });

    const overallRate = totalDue > 0 ? Math.round((totalCompleted / totalDue) * 100) : 0;
    const xpEarned = totalCompleted * CONFIG.XP_PER_COMPLETION;

    // Best & worst day
    let bestDay = dailyData[0];
    let worstDay = dailyData[0];
    dailyData.forEach((d) => {
      const rate = d.total > 0 ? d.completed / d.total : 0;
      const bestRate = bestDay.total > 0 ? bestDay.completed / bestDay.total : 0;
      const worstRate = worstDay.total > 0 ? worstDay.completed / worstDay.total : 1;
      if (rate > bestRate) bestDay = d;
      if (rate < worstRate) worstDay = d;
    });

    return {
      period,
      daysBack,
      startDate: startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      endDate: now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      totalCompleted,
      totalDue,
      overallRate,
      xpEarned,
      dailyData,
      categoryStats,
      habitPerformance: habitPerformance.sort((a, b) => b.rate - a.rate),
      bestDay,
      worstDay,
      maxStreak: getMaxStreak(),
      level: calculateLevel(),
      totalXP: calculateTotalXP(),
    };
  }, [habits, period, getMaxStreak, calculateLevel, calculateTotalXP]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241);
    doc.text("Performance Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`${report.startDate} — ${report.endDate} | PPS`, 14, 30);

    // Summary stats
    let y = 42;
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("Summary", 14, y);
    y += 8;

    const summaryData = [
      ["Completion Rate", `${report.overallRate}%`],
      ["Tasks Completed", `${report.totalCompleted}`],
      ["XP Earned", `${report.xpEarned}`],
      ["Best Streak", `${report.maxStreak}`],
      ["Level", `${report.level}`],
      ["Total XP", `${report.totalXP}`],
    ];

    (doc as any).autoTable({
      startY: y,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      margin: { left: 14 },
      tableWidth: pageWidth - 28,
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Category breakdown
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("Category Breakdown", 14, y);
    y += 8;

    const categoryData = Object.entries(report.categoryStats).map(([cat, s]) => {
      const rate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
      return [cat, `${s.done}/${s.total}`, `${rate}%`];
    });

    if (categoryData.length > 0) {
      (doc as any).autoTable({
        startY: y,
        head: [["Category", "Completed", "Rate"]],
        body: categoryData,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        margin: { left: 14 },
        tableWidth: pageWidth - 28,
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }

    // Habit performance
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("Habit Performance", 14, y);
    y += 8;

    const habitData = report.habitPerformance.map(h => [
      h.name, h.category, `${h.completed}/${h.possible}`, `${h.rate}%`,
    ]);

    if (habitData.length > 0) {
      (doc as any).autoTable({
        startY: y,
        head: [["Habit", "Category", "Done", "Rate"]],
        body: habitData,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        margin: { left: 14 },
        tableWidth: pageWidth - 28,
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || y;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by PPS — ${new Date().toLocaleDateString()}`, 14, Math.min(finalY + 16, 285));

    doc.save(`PPS_Report_${report.startDate}_${report.endDate}.pdf`);
  };

  const maxDailyTotal = Math.max(...report.dailyData.map((d) => d.total), 1);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-[22px] font-bold">Performance Reports</h1>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            {report.startDate} — {report.endDate}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface border border-border rounded-xl p-1">
            <button
              onClick={() => setPeriod("week")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                period === "week" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                period === "month" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
          </div>
          <button
            onClick={exportPDF}
            className="bg-gradient-to-br from-primary to-[hsl(var(--secondary))] text-primary-foreground px-5 py-2 rounded-lg text-[13px] font-semibold hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div ref={reportRef}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
          <ReportStat icon="📊" label="Completion Rate" value={`${report.overallRate}%`} />
          <ReportStat icon="✅" label="Completed" value={`${report.totalCompleted}`} />
          <ReportStat icon="⚡" label="XP Earned" value={`${report.xpEarned}`} />
          <ReportStat icon="🔥" label="Best Streak" value={`${report.maxStreak}`} />
        </div>

        {/* Daily Chart */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Daily Completion Trend
          </h3>
          <div className="flex items-end gap-1 h-[160px]">
            {report.dailyData.map((d, i) => {
              const rate = d.total > 0 ? d.completed / d.total : 0;
              const h = Math.max(rate * 100, 2);
              const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: "narrow" });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 bg-popover border border-border rounded-lg px-2 py-1 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md pointer-events-none">
                    {d.date}: {d.completed}/{d.total}
                  </div>
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${h}%`,
                      background:
                        rate >= 0.8
                          ? "hsl(var(--green))"
                          : rate >= 0.5
                          ? "hsl(var(--orange))"
                          : rate > 0
                          ? "hsl(var(--yellow))"
                          : "hsl(var(--border))",
                      minHeight: "3px",
                    }}
                  />
                  {period === "week" && (
                    <div className="text-[9px] text-muted-foreground font-mono">{dayLabel}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Category Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(report.categoryStats).map(([cat, s]) => {
                const rate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-semibold">{cat}</span>
                      <span className="text-muted-foreground font-mono">
                        {s.done}/{s.total} ({rate}%)
                      </span>
                    </div>
                    <div className="bg-surface rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(report.categoryStats).length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">No data yet</div>
              )}
            </div>
          </div>

          {/* Highlights */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Highlights
            </h3>
            <div className="space-y-3">
              <HighlightRow
                icon="🏆"
                label="Best Day"
                value={`${new Date(report.bestDay.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — ${report.bestDay.completed}/${report.bestDay.total}`}
              />
              <HighlightRow
                icon="📉"
                label="Needs Work"
                value={`${new Date(report.worstDay.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — ${report.worstDay.completed}/${report.worstDay.total}`}
              />
              <HighlightRow icon="⬆️" label="Level" value={`Level ${report.level}`} />
              <HighlightRow icon="💎" label="Total XP" value={`${report.totalXP} XP`} />
              <HighlightRow
                icon="📋"
                label="Habits Tracked"
                value={`${habits.length} active`}
              />
            </div>
          </div>
        </div>

        {/* Per-Habit Table */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Habit Performance
          </h3>
          {report.habitPerformance.length === 0 ? (
            <div className="text-center text-muted-foreground text-[13px] py-6">
              No habit data for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Habit
                    </th>
                    <th className="text-left py-2 px-3 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Category
                    </th>
                    <th className="text-center py-2 px-3 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Done
                    </th>
                    <th className="text-center py-2 px-3 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Rate
                    </th>
                    <th className="text-left py-2 px-3 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold w-[120px]">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.habitPerformance.map((h, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold">{h.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{h.category}</td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {h.completed}/{h.possible}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">
                        <span
                          className={
                            h.rate >= 80
                              ? "text-pps-green"
                              : h.rate >= 50
                              ? "text-pps-orange"
                              : "text-destructive"
                          }
                        >
                          {h.rate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="bg-surface rounded-full h-1.5 w-full">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${h.rate}%`,
                              background:
                                h.rate >= 80
                                  ? "hsl(var(--green))"
                                  : h.rate >= 50
                                  ? "hsl(var(--orange))"
                                  : "hsl(var(--destructive))",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function ReportStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function HighlightRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-surface/60 border border-border/60 rounded-lg">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-[13px] font-semibold">{value}</div>
      </div>
    </div>
  );
}

export default ReportsSection;
