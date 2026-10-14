/**
 * 🌿 Anti-Burnout Rest Day & Micro-Habit Rules Engine
 *
 * Rules:
 * 1. Rest Day grants Recovery XP at most 2 times per week and NEVER stacks.
 * 2. 2-minute Micro completion is a distinct "partial" state:
 *    - Protects the streak at most 3 times per habit per week.
 *    - Gives no full XP (+0 full completion XP).
 *    - Does NOT count toward Perfect Day or leaderboards.
 *    - Shows as a lighter/partial state in the heatmap.
 *    - Implemented completely client-side & transparently with zero DB schema changes.
 */

export const REST_DAY_CONFIG = {
  MAX_RECOVERY_XP_PER_WEEK: 2,
  RECOVERY_XP_AMOUNT: 5,
  MAX_MICRO_PER_HABIT_PER_WEEK: 3,
  STORAGE_KEY_RECOVERY_DATES: "pps_recovery_xp_claimed_dates",
  STORAGE_KEY_MICRO_COMPLETIONS: "pps_micro_completions",
};

/**
 * Calculates whether date `d` is within the 7-day rolling window ending on `targetDate`
 */
export function isDateIn7DayWindow(checkDateStr: string, targetDateStr: string): boolean {
  try {
    const checkTime = new Date(checkDateStr + "T00:00:00Z").getTime();
    const targetTime = new Date(targetDateStr + "T00:00:00Z").getTime();
    const diffDays = Math.round((targetTime - checkTime) / 864e5);
    return diffDays >= 0 && diffDays < 7;
  } catch {
    return false;
  }
}

// ─── RECOVERY XP RECOVERY ENGINE ────────────────────────────

export function getRecoveryXPClaimedDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REST_DAY_CONFIG.STORAGE_KEY_RECOVERY_DATES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecoveryXPClaimedDates(dates: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REST_DAY_CONFIG.STORAGE_KEY_RECOVERY_DATES, JSON.stringify(dates));
  } catch {}
}

export function getRecoveryXPCountInWeek(targetDateStr: string, claimedDates?: string[]): number {
  const dates = claimedDates || getRecoveryXPClaimedDates();
  return dates.filter((d) => isDateIn7DayWindow(d, targetDateStr)).length;
}

export interface RecoveryXPCheck {
  allowed: boolean;
  reason?: string;
  countThisWeek: number;
}

export function canClaimRecoveryXP(targetDateStr: string, claimedDates?: string[]): RecoveryXPCheck {
  const dates = claimedDates || getRecoveryXPClaimedDates();
  const countThisWeek = getRecoveryXPCountInWeek(targetDateStr, dates);

  // 1. Never stacks on the same day
  if (dates.includes(targetDateStr)) {
    return {
      allowed: false,
      reason: "Recovery XP already claimed for today. Rest Days never stack.",
      countThisWeek,
    };
  }

  // 2. Cap at most 2 times per week
  if (countThisWeek >= REST_DAY_CONFIG.MAX_RECOVERY_XP_PER_WEEK) {
    return {
      allowed: false,
      reason: `Weekly limit reached (${countThisWeek}/${REST_DAY_CONFIG.MAX_RECOVERY_XP_PER_WEEK} times this week).`,
      countThisWeek,
    };
  }

  return {
    allowed: true,
    countThisWeek,
  };
}

export function claimRecoveryXP(targetDateStr: string): { success: boolean; xpAwarded: number; reason?: string } {
  const dates = getRecoveryXPClaimedDates();
  const check = canClaimRecoveryXP(targetDateStr, dates);
  if (!check.allowed) {
    return {
      success: false,
      xpAwarded: 0,
      reason: check.reason,
    };
  }

  const updated = [...dates, targetDateStr];
  saveRecoveryXPClaimedDates(updated);
  return {
    success: true,
    xpAwarded: REST_DAY_CONFIG.RECOVERY_XP_AMOUNT,
  };
}

// ─── 2-MINUTE MICRO COMPLETION ENGINE ────────────────────────

export type MicroCompletionsMap = Record<string, string[]>; // habitId -> string[] of dates

export function getMicroCompletionsMap(): MicroCompletionsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REST_DAY_CONFIG.STORAGE_KEY_MICRO_COMPLETIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMicroCompletionsMap(data: MicroCompletionsMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REST_DAY_CONFIG.STORAGE_KEY_MICRO_COMPLETIONS, JSON.stringify(data));
  } catch {}
}

export function isMicroCompleted(habitId: string, dateStr: string, customMap?: MicroCompletionsMap): boolean {
  const map = customMap || getMicroCompletionsMap();
  const habitDates = map[habitId] || [];
  return habitDates.includes(dateStr);
}

export function getMicroCountInWeek(habitId: string, targetDateStr: string, customMap?: MicroCompletionsMap): number {
  const map = customMap || getMicroCompletionsMap();
  const dates = map[habitId] || [];
  return dates.filter((d) => isDateIn7DayWindow(d, targetDateStr)).length;
}

export interface MicroCheck {
  allowed: boolean;
  reason?: string;
  countThisWeek: number;
}

export function canLogMicroCompletion(
  habitId: string,
  targetDateStr: string,
  customMap?: MicroCompletionsMap
): MicroCheck {
  const map = customMap || getMicroCompletionsMap();
  const countThisWeek = getMicroCountInWeek(habitId, targetDateStr, map);

  if (isMicroCompleted(habitId, targetDateStr, map)) {
    return {
      allowed: false,
      reason: "Micro completion already recorded for today.",
      countThisWeek,
    };
  }

  if (countThisWeek >= REST_DAY_CONFIG.MAX_MICRO_PER_HABIT_PER_WEEK) {
    return {
      allowed: false,
      reason: `Micro streak shield cap reached (${countThisWeek}/${REST_DAY_CONFIG.MAX_MICRO_PER_HABIT_PER_WEEK} per habit this week). Full completion required.`,
      countThisWeek,
    };
  }

  return {
    allowed: true,
    countThisWeek,
  };
}

export function logMicroCompletion(
  habitId: string,
  targetDateStr: string
): { success: boolean; reason?: string; countThisWeek: number } {
  const map = getMicroCompletionsMap();
  const check = canLogMicroCompletion(habitId, targetDateStr, map);
  if (!check.allowed) {
    return { success: false, reason: check.reason, countThisWeek: check.countThisWeek };
  }

  const habitDates = map[habitId] || [];
  map[habitId] = [...habitDates, targetDateStr];
  saveMicroCompletionsMap(map);
  return { success: true, countThisWeek: check.countThisWeek + 1 };
}

export function removeMicroCompletion(habitId: string, targetDateStr: string): void {
  const map = getMicroCompletionsMap();
  if (!map[habitId]) return;
  map[habitId] = map[habitId].filter((d) => d !== targetDateStr);
  if (map[habitId].length === 0) {
    delete map[habitId];
  }
  saveMicroCompletionsMap(map);
}
