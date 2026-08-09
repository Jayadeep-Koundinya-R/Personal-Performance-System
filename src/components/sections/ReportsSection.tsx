/*
  📄 Masterwork Executive Reports & PDF Export Studio
  
  Features:
  - 1-Click Executive PDF Report Generation (jsPDF + autotable)
  - 1-Click CSV & JSON Data Export
  - Weekly (7d) vs Monthly (30d) Period Analysis
  - Period Growth Comparison ("+24% completions vs previous period")
  - Habit Performance Breakdown Matrix Table
  - Peak Performance Highlights (Best Day, Top Category, XP Earned)
  - High-Contrast Crisp Glassmorphism Typography
*/

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits, CONFIG } from "@/hooks/use-habits";
import { exportToCSV, exportToJSON, prepareFullExport } from "@/lib/dataExport";
import { FileText, Download, TrendingUp, Calendar, Award, Check, Sparkles, Zap, Shield, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import EmptyState from "@/components/EmptyState";

type Period = "week" | "month";

const ReportsSection = () => {
  const { habits, getMaxStreak, calculateLevel, calculateTotalXP } = useHabits();
  const [period, setPeriod] = useState<Period>("week");
  const reportRef = useRef<HTMLDivElement>(null);

  const daysBack = period === "week" ? 7 : 30;

  // Report Data Calculation
  const report = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysBack);

    // Current period counts
    let currentCompleted = 0;
    let currentPossible = 0;
    const dayNameCounts: Record<string, number> = {};

    // Previous period counts for growth comparison
    let prevCompleted = 0;

    habits.forEach((h) => {
      if (h.archived) return;
      for (let i = 0; i < daysBack; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        currentPossible++;

        if ((h.completedDates || []).includes(ds)) {
          currentCompleted++;
          const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
          dayNameCounts[dayName] = (dayNameCounts[dayName] || 0) + 1;
        }

        // Previous period check
        const pd = new Date(startDate);
        pd.setDate(pd.getDate() - i);
        const pds = pd.toISOString().split("T")[0];
        if ((h.completedDates || []).includes(pds)) {
          prevCompleted++;
        }
      }
    });

    const completionRate = currentPossible > 0 ? Math.round((currentCompleted / currentPossible) * 100) : 0;
    const growthPct = prevCompleted > 0 ? Math.round(((currentCompleted - prevCompleted) / prevCompleted) * 100) : 0;

    // Habit Performance Matrix
    const habitMatrix = habits
      .filter((h) => !h.archived)
      .map((h) => {
        let done = 0;
        for (let i = 0; i < daysBack; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().split("T")[0];
          if ((h.completedDates || []).includes(ds)) done++;
        }
        const rate = Math.min(100, Math.round((done / daysBack) * 100));

        let status: "master" | "strong" | "building" | "at_risk" = "building";
        if (rate >= 80) status = "master";
        else if (rate >= 60) status = "strong";
        else if (rate >= 40) status = "building";
        else status = "at_risk";

        return { habit: h, done, rate, status };
      })
      .sort((a, b) => b.rate - a.rate);

    // Peak Productivity Day
    let bestDay = "Monday";
    let maxDayCount = 0;
    Object.entries(dayNameCounts).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        bestDay = day;
      }
    });

    return { currentCompleted, currentPossible, completionRate, growthPct, habitMatrix, bestDay, daysBack };
  }, [habits, daysBack]);

  // Export PDF Handler
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PERSONAL PERFORMANCE SYSTEM", 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Executive Performance Report (${period.toUpperCase()}LY)`, 14, 28);

      // Stats Summary
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 38);
      doc.text(`Total Habit Completions: ${report.currentCompleted}`, 14, 44);
      doc.text(`Overall Consistency Rate: ${report.completionRate}%`, 14, 50);
      doc.text(`Growth vs Previous Period: ${report.growthPct >= 0 ? "+" : ""}${report.growthPct}%`, 14, 56);

      // Table of Habits
      const tableData = report.habitMatrix.map((item, idx) => [
        `#${idx + 1}`,
        item.habit.name,
        item.habit.category || "General",
        `${item.done} / ${report.daysBack} days`,
        `${item.rate}%`,
        item.status.toUpperCase(),
      ]);

      (doc as any).autoTable({
        startY: 65,
        head: [["Rank", "Habit Name", "Category", "Completions", "Rate %", "Status"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      });

      doc.save(`PPS_Executive_Report_${period}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Executive PDF Report generated & downloaded!");
    } catch (e) {
      console.error("PDF generation failed:", e);
      toast.error("Failed to generate PDF. Downloading CSV backup instead.");
      exportToCSV(habits);
    }
  };

  // Export CSV Data
  const handleExportCSV = () => {
    exportToCSV(habits);
    toast.success("CSV Spreadsheet downloaded!");
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const data = prepareFullExport(habits, []);
    exportToJSON(data);
    toast.success("Full JSON Backup downloaded!");
  };

  const totalXP = calculateTotalXP();
  const currentLevel = calculateLevel();
  const maxStreak = getMaxStreak();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>📄 Executive Performance Reports</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              PDF Studio & Analytics
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Generate executive PDF reports, CSV data exports, period growth comparisons, and habit performance matrices
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={generatePDF}
            className="text-xs bg-primary text-primary-foreground font-extrabold px-4 py-2 rounded-2xl hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>Export Executive PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="text-xs bg-surface border border-border/80 text-foreground px-3.5 py-2 rounded-2xl font-extrabold hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Export CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-pps-green" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="text-xs bg-surface border border-border/80 text-foreground px-3.5 py-2 rounded-2xl font-extrabold hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Backup JSON Data"
          >
            <Download className="w-4 h-4 text-sky-300" />
            <span>JSON Backup</span>
          </button>
        </div>
      </div>

      {/* ── 1. PERIOD SELECTOR BAR ── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono font-extrabold text-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Report Analysis Window:</span>
        </div>

        <div className="flex items-center gap-1 bg-surface border border-border/80 p-1 rounded-2xl">
          <button
            onClick={() => setPeriod("week")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              period === "week" ? "bg-primary text-primary-foreground shadow-xs" : "text-slate-300 hover:text-foreground"
            }`}
          >
            Weekly (7 Days)
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              period === "month" ? "bg-primary text-primary-foreground shadow-xs" : "text-slate-300 hover:text-foreground"
            }`}
          >
            Monthly (30 Days)
          </button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE DASHBOARD SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-xl flex-shrink-0">
            📊
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-extrabold">Total Completions</div>
            <div className="text-xl font-extrabold font-mono text-foreground">{report.currentCompleted}</div>
            <div className="text-[10.5px] text-primary font-mono font-bold">in {report.daysBack} days</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-pps-green/15 border border-pps-green/30 flex items-center justify-center text-xl flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-extrabold">Consistency Rate</div>
            <div className="text-xl font-extrabold font-mono text-foreground">{report.completionRate}%</div>
            <div className="text-[10.5px] text-pps-green font-mono font-bold">Target consistency</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-pps-orange/15 border border-pps-orange/30 flex items-center justify-center text-xl flex-shrink-0">
            📈
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-extrabold">Period Growth</div>
            <div className="text-xl font-extrabold font-mono text-foreground">
              {report.growthPct >= 0 ? `+${report.growthPct}%` : `${report.growthPct}%`}
            </div>
            <div className="text-[10.5px] text-pps-orange font-mono font-bold">vs previous {period}</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-xl flex-shrink-0">
            ⭐
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-extrabold">Peak Productive Day</div>
            <div className="text-xl font-extrabold font-mono text-foreground">{report.bestDay}</div>
            <div className="text-[10.5px] text-secondary font-mono font-bold">Highest output day</div>
          </div>
        </div>
      </div>

      {/* ── 3. HABIT PERFORMANCE BREAKDOWN MATRIX TABLE ── */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>📋 Habit Performance Matrix Table</span>
            </h3>
            <p className="text-[11.5px] text-slate-300 font-medium mt-0.5">
              Habit-by-habit consistency ratings for the {period.toUpperCase()}LY analysis window
            </p>
          </div>
          <span className="text-xs text-slate-300 font-mono font-bold bg-surface border border-border/80 px-2.5 py-1 rounded-xl">
            {report.habitMatrix.length} Habits Evaluated
          </span>
        </div>

        <div className="space-y-2.5">
          {report.habitMatrix.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-3xl p-4">
              <EmptyState
                icon="📈"
                title="No Performance Data Yet"
                description="Start completing habits to generate executive performance analytics and downloadable PDF reports!"
              />
            </div>
          ) : (
            report.habitMatrix.map(({ habit, done, rate, status }, idx) => {
              let statusBadge = (
                <span className="text-[10.5px] font-mono font-bold bg-pps-green/15 text-pps-green border border-pps-green/30 px-2.5 py-0.5 rounded-full">
                  🏆 Master ({rate}%)
                </span>
              );
              if (status === "strong") {
                statusBadge = (
                  <span className="text-[10.5px] font-mono font-bold bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full">
                    🔥 Strong ({rate}%)
                  </span>
                );
              } else if (status === "building") {
                statusBadge = (
                  <span className="text-[10.5px] font-mono font-bold bg-pps-orange/15 text-pps-orange border border-pps-orange/30 px-2.5 py-0.5 rounded-full">
                    🌱 Building ({rate}%)
                  </span>
                );
              } else if (status === "at_risk") {
                statusBadge = (
                  <span className="text-[10.5px] font-mono font-bold bg-destructive/15 text-destructive border border-destructive/30 px-2.5 py-0.5 rounded-full">
                    ⚠️ At-Risk ({rate}%)
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
                      #{idx + 1}
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
                      <div className="text-xs font-mono font-extrabold text-foreground">{done} / {report.daysBack} Days</div>
                      <div className="text-[10px] text-slate-300 font-mono">{rate}% consistency</div>
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

export default ReportsSection;
