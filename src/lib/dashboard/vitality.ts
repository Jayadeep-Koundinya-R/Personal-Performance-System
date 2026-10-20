/**
 * ⚡ Vitality & Performance Scoring Engine
 *
 * Formula:
 * Vitality Score (0-100) =
 *   40% * Habit Completion Rate (Today)
 * + 30% * Focus Target Ratio (Today's minutes vs target, capped at 100%)
 * + 30% * 7-Day Rolling Consistency Velocity
 *
 * All labels, tiers, and states are strictly computed from real metrics.
 */

export type VitalityTier = "Dormant" | "Building" | "Optimal" | "Peak Flow";

export interface VitalityParams {
  completionRate?: number;
  habitCompletionRate?: number;
  todayFocusMinutes: number;
  targetFocusMinutes: number;
  weeklyConsistencyRate?: number;
  rolling7DayConsistency?: number;
}

export interface VitalityResult {
  score: number;
  tier: VitalityTier;
  breakdown: string;
  focusRatio: number;
  label: string;
  sub: string;
  ringColor: string;
  textColor: string;
  badgeBg: string;
  tooltipText: string;
}

/**
 * Pure calculation helper for Vitality Score
 */
export function calculateVitalityScore(params: {
  completionRate?: number;
  habitCompletionRate?: number;
  todayFocusMinutes: number;
  targetFocusMinutes: number;
  weeklyConsistencyRate?: number;
  rolling7DayConsistency?: number;
}): VitalityResult {
  const habitRateInput = params.completionRate ?? params.habitCompletionRate ?? 0;
  const consistencyInput = params.weeklyConsistencyRate ?? params.rolling7DayConsistency ?? 0;

  const safeHabitRate = Math.min(100, Math.max(0, Math.round(habitRateInput)));
  const safeTarget = Math.max(1, params.targetFocusMinutes || 60);
  const safeFocusMinutes = Math.max(0, params.todayFocusMinutes || 0);
  const focusRatio = Math.min(100, Math.round((safeFocusMinutes / safeTarget) * 100));
  const safeConsistency = Math.min(100, Math.max(0, Math.round(consistencyInput)));

  const rawScore = 0.4 * safeHabitRate + 0.3 * focusRatio + 0.3 * safeConsistency;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let tier: VitalityTier;
  let label: string;
  let sub: string;
  let ringColor: string;
  let textColor: string;
  let badgeBg: string;

  if (score >= 80) {
    tier = "Peak Flow";
    label = "Peak Flow";
    sub = "High performance cadence";
    ringColor = "#10b981";
    textColor = "text-emerald-400";
    badgeBg = "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  } else if (score >= 50) {
    tier = "Optimal";
    label = "Steady Momentum";
    sub = "Consistent daily velocity";
    ringColor = "#6366f1";
    textColor = "text-indigo-400";
    badgeBg = "bg-indigo-500/15 border-indigo-500/30 text-indigo-300";
  } else if (score >= 25) {
    tier = "Building";
    label = "Building";
    sub = "Solid steady momentum";
    ringColor = "#3b82f6";
    textColor = "text-blue-400";
    badgeBg = "bg-blue-500/15 border-blue-500/30 text-blue-300";
  } else {
    tier = "Dormant";
    label = "Ignition";
    sub = "Warming up daily engine";
    ringColor = "#f59e0b";
    textColor = "text-amber-400";
    badgeBg = "bg-amber-500/15 border-amber-500/30 text-amber-300";
  }

  const breakdown = `Habits (40%): ${safeHabitRate}% | Focus (30%): ${safeFocusMinutes}/${safeTarget}m (${focusRatio}%) | Consistency (30%): ${safeConsistency}%`;
  const tooltipText = `Vitality Score: ${score}/100 [${tier}]\n• Habit Completion (40%): ${safeHabitRate}%\n• Focus Target (30%): ${safeFocusMinutes}/${safeTarget}m (${focusRatio}%)\n• Weekly Consistency (30%): ${safeConsistency}%`;

  return {
    score,
    tier,
    breakdown,
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

  return totalDue > 0
    ? Math.min(100, Math.round((totalDone / totalDue) * 100))
    : Math.min(100, Math.max(0, Math.round(fallbackRate)));
}
