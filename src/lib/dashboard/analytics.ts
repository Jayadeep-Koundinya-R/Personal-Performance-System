/**
 * 📊 Analytics & Executive Records Engine
 *
 * Pure, testable computational utilities for:
 * 1. Weekly focus minutes curve and trajectory.
 * 2. Executive records (best streak, best 7-day week, total focus hours).
 * 3. 14-day threshold guard for energy/circadian biological correlations.
 * 4. Heatmap cell state derivation including 2-minute micro-habit partial states.
 */

export interface WeeklyFocusDay {
  dateStr: string;
  dayLabel: string; // "Mon", "Tue", etc.
  focusMinutes: number;
  meetsTarget: boolean;
}

export interface WeeklyFocusCurveResult {
  days: WeeklyFocusDay[];
  totalMinutes: number;
  averageMinutes: number;
  peakDay: WeeklyFocusDay | null;
  targetMinutes: number;
}

/**
 * Calculates 7-day focus curve data ending on `endDateStr`
 */
export function calculateWeeklyFocusCurveData(
  endDateStr: string,
  getMinutesForDate: (dateStr: string) => number,
  targetMinutes = 180
): WeeklyFocusCurveResult {
  const days: WeeklyFocusDay[] = [];
  const end = new Date(endDateStr + "T00:00:00Z");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = dayNames[d.getUTCDay()];
    const focusMinutes = Math.max(0, getMinutesForDate(dateStr) || 0);

    days.push({
      dateStr,
      dayLabel,
      focusMinutes,
      meetsTarget: focusMinutes >= targetMinutes,
    });
  }

  const totalMinutes = days.reduce((acc, d) => acc + d.focusMinutes, 0);
  const averageMinutes = Math.round(totalMinutes / 7);
  const peakDay = days.reduce<WeeklyFocusDay | null>((peak, current) => {
    if (!peak || current.focusMinutes > peak.focusMinutes) return current;
    return peak;
  }, null);

  return {
    days,
    totalMinutes,
    averageMinutes,
    peakDay,
    targetMinutes,
  };
}

export interface ExecutiveRecords {
  bestStreak: number;
  bestWeekCompletions: number;
  bestWeekFocusMinutes: number;
  totalFocusMinutes: number;
  totalFocusHours: number;
  totalLifetimeCompletions: number;
}

/**
 * Computes executive records over historical dates
 */
export function calculateExecutiveRecords(
  habits: Array<{ completedDates?: string[]; streak?: number }>,
  allDates: string[],
  getFocusMinutesForDate: (dateStr: string) => number
): ExecutiveRecords {
  // 1. Best streak
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  // 2. Total lifetime completions
  const completionDateCounts: Record<string, number> = {};
  let totalLifetimeCompletions = 0;

  habits.forEach((h) => {
    (h.completedDates || []).forEach((ds) => {
      completionDateCounts[ds] = (completionDateCounts[ds] || 0) + 1;
      totalLifetimeCompletions++;
    });
  });

  // 3. Best 7-day rolling week (completions and focus minutes)
  let bestWeekCompletions = 0;
  let bestWeekFocusMinutes = 0;

  // Scan rolling 7-day windows in allDates
  for (let i = 0; i <= allDates.length - 7; i++) {
    const window7 = allDates.slice(i, i + 7);
    const windowCompletions = window7.reduce((sum, ds) => sum + (completionDateCounts[ds] || 0), 0);
    const windowFocusMinutes = window7.reduce((sum, ds) => sum + (getFocusMinutesForDate(ds) || 0), 0);

    if (windowCompletions > bestWeekCompletions) bestWeekCompletions = windowCompletions;
    if (windowFocusMinutes > bestWeekFocusMinutes) bestWeekFocusMinutes = windowFocusMinutes;
  }

  // 4. Total focus minutes and hours
  let totalFocusMinutes = 0;
  allDates.forEach((ds) => {
    totalFocusMinutes += getFocusMinutesForDate(ds) || 0;
  });

  const totalFocusHours = Number((totalFocusMinutes / 60).toFixed(1));

  return {
    bestStreak,
    bestWeekCompletions,
    bestWeekFocusMinutes,
    totalFocusMinutes,
    totalFocusHours,
    totalLifetimeCompletions,
  };
}

export interface CircadianDataCheck {
  sufficient: boolean;
  loggedDaysCount: number;
  requiredDaysCount: number;
  progressPct: number;
  message: string;
}

/**
 * Guard rule: Any energy/circadian correlation chart shows only with at least 14 days of data;
 * otherwise return an honest "needs more data" assessment. No fake curves.
 */
export function checkCircadianDataSufficiency(
  loggedMoodDaysCount: number,
  requiredDaysCount = 14
): CircadianDataCheck {
  const sufficient = loggedMoodDaysCount >= requiredDaysCount;
  const progressPct = Math.min(100, Math.round((loggedMoodDaysCount / requiredDaysCount) * 100));

  return {
    sufficient,
    loggedDaysCount: loggedMoodDaysCount,
    requiredDaysCount,
    progressPct,
    message: sufficient
      ? `Statistically sufficient dataset (${loggedMoodDaysCount} days) to plot circadian efficiency.`
      : `Circadian and energy correlation requires at least ${requiredDaysCount} days of logged performance data to compute statistically valid biological curves. Currently logged: ${loggedMoodDaysCount} of ${requiredDaysCount} days.`,
  };
}

export type HeatmapCellState = "empty" | "micro_partial" | "level_1" | "level_2" | "level_3" | "level_4";

/**
 * Determines heatmap cell level including 2m micro completion partial state
 */
export function calculateHeatmapCellState(
  fullCompletions: number,
  microCompletions: number,
  totalHabits: number
): HeatmapCellState {
  if (fullCompletions === 0 && microCompletions > 0) {
    return "micro_partial";
  }

  if (fullCompletions === 0) {
    return "empty";
  }

  const habitCount = Math.max(1, totalHabits);
  const ratio = fullCompletions / habitCount;

  if (ratio <= 0.25) return "level_1";
  if (ratio <= 0.5) return "level_2";
  if (ratio <= 0.75) return "level_3";
  return "level_4";
}
