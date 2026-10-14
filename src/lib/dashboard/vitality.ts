/**
 * ⚡ Vitality & Performance Scoring Engine
 *
 * Formula:
 * Vitality Score (0-100) =
 *   40% * Habit Completion Rate (Today)
 * + 30% * Focus Target Ratio (Today's minutes vs target, capped at 100%)
 * + 30% * 7-Day Rolling Consistency Velocity
 *
 * All labels and states are strictly computed from the real metric.
 */

export interface VitalityMetrics {
  habitCompletionRate: number;
  todayFocusMinutes: number;
  targetFocusMinutes: number;
  rolling7DayConsistency: number;
}

export interface VitalityResult {
  score: number;
  focusRatio: number;
  label: "Peak Flow" | "Steady Momentum" | "Ignition";
  sub: string;
  ringColor: string;
  textColor: string;
  badgeBg: string;
  tooltipText: string;
}

export function calculateVitalityScore({
  habitCompletionRate = 0,
  todayFocusMinutes = 0,
  targetFocusMinutes = 60,
  rolling7DayConsistency = 0,
}: VitalityMetrics): VitalityResult {
  const safeHabitRate = Math.min(100, Math.max(0, Math.round(habitCompletionRate)));
  const safeTarget = Math.max(1, targetFocusMinutes);
  const safeFocusMinutes = Math.max(0, todayFocusMinutes);
  const focusRatio = Math.min(100, Math.round((safeFocusMinutes / safeTarget) * 100));
  const safe7Day = Math.min(100, Math.max(0, Math.round(rolling7DayConsistency)));

  const rawScore = 0.4 * safeHabitRate + 0.3 * focusRatio + 0.3 * safe7Day;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let label: "Peak Flow" | "Steady Momentum" | "Ignition";
  let sub: string;
  let ringColor: string;
  let textColor: string;
  let badgeBg: string;

  if (score >= 80) {
    label = "Peak Flow";
    sub = "High performance cadence";
    ringColor = "#10b981";
    textColor = "text-emerald-400";
    badgeBg = "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  } else if (score >= 50) {
    label = "Steady Momentum";
    sub = "Consistent daily velocity";
    ringColor = "#6366f1";
    textColor = "text-indigo-400";
    badgeBg = "bg-indigo-500/15 border-indigo-500/30 text-indigo-300";
  } else {
    label = "Ignition";
    sub = "Warming up daily engine";
    ringColor = "#f59e0b";
    textColor = "text-amber-400";
    badgeBg = "bg-amber-500/15 border-amber-500/30 text-amber-300";
  }

  const tooltipText = `Vitality Score: ${score}/100\n• Habit Completion (40%): ${safeHabitRate}%\n• Focus Target (30%): ${safeFocusMinutes}/${safeTarget}m (${focusRatio}%)\n• 7-Day Consistency (30%): ${safe7Day}%`;

  return {
    score,
    focusRatio,
    label,
    sub,
    ringColor,
    textColor,
    badgeBg,
    tooltipText,
  };
}

export function calculateRolling7DayConsistency(
  habits: { completedDates?: string[]; archived?: boolean }[],
  todayStr: string = new Date().toISOString().split("T")[0],
  fallbackRate: number = 0
): number {
  if (!habits || habits.length === 0) return Math.min(100, Math.max(0, Math.round(fallbackRate)));

  const baseDate = new Date(todayStr + "T00:00:00Z");
  let totalDue = 0;
  let totalDone = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().split("T")[0];

    habits.forEach((h) => {
      if (!h.archived) {
        totalDue++;
        if ((h.completedDates || []).includes(ds)) {
          totalDone++;
        }
      }
    });
  }

  return totalDue > 0 ? Math.min(100, Math.round((totalDone / totalDue) * 100)) : Math.min(100, Math.max(0, Math.round(fallbackRate)));
}
