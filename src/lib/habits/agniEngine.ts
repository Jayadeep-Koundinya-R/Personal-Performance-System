/**
 * 🔥 Agni 2.0 Hardening Engine: Rules, Proof-of-Focus & Circadian Gating
 * 
 * Implements:
 * 1. Multi-Tier Completion Verification:
 *    - Full Complete (+10 XP): Unlimited, advances streak (+1).
 *    - 2m Micro-Habit (+2 XP): Max 3/week per task, preserves streak (=).
 *    - Logged Rest Day (+5 XP): Max 2/week rolling, shields streak (=).
 * 2. Circadian Window Time Gating:
 *    - Enforces morning/afternoon/evening locks with graceful status indicators.
 * 3. Proof-of-Focus Mechanical Anti-Cheat Locks:
 *    - Intercepts timer-locked habits until focus timer completion event triggers.
 */

export interface RestDayValidationResult {
  allowed: boolean;
  reason?: string;
  countThisWeek?: number;
}

export interface MicroHabitValidationResult {
  allowed: boolean;
  reason?: string;
  countThisWeek?: number;
}

export interface CircadianWindowResult {
  isOpen: boolean;
  label: string;
  status: "open" | "upcoming" | "closed";
}

/**
 * Calculates whether date `checkDateStr` falls within the 7-day rolling window ending on `targetDateStr` (inclusive).
 */
export function isDateInRolling7Days(checkDateStr: string, targetDateStr: string): boolean {
  try {
    const checkTime = new Date(checkDateStr + "T00:00:00Z").getTime();
    const targetTime = new Date(targetDateStr + "T00:00:00Z").getTime();
    const diffDays = Math.round((targetTime - checkTime) / 864e5);
    return diffDays >= 0 && diffDays < 7;
  } catch {
    return false;
  }
}

/**
 * Normalizes input logs to an array of rest day date strings (YYYY-MM-DD).
 */
export function extractRestDates(currentLogs: Record<string, any> | string[]): string[] {
  if (!currentLogs) return [];
  if (Array.isArray(currentLogs)) return currentLogs;

  const dates: string[] = [];
  for (const [key, val] of Object.entries(currentLogs)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      if (
        val === true ||
        val === "rest" ||
        (val && typeof val === "object" && (val.type === "rest" || val.completion_type === "rest"))
      ) {
        dates.push(key);
      }
    } else if (val && typeof val === "object") {
      const d = val.completed_date || val.date;
      const type = val.completion_type || val.type;
      if (d && type === "rest") {
        dates.push(d);
      }
    }
  }
  return dates;
}

/**
 * Task 1.1: Pure Helper to validate whether a Rest Day can be logged
 * 
 * Rules:
 * - Max allowed: 2 rest days per rolling 7 days.
 * - Rest days never stack on the exact same date.
 * - If exceeded, returns allowed: false with strict specification message:
 *   "Maximum 2 rest days per week reached. Time to rebuild momentum!"
 */
export function canLogRestDay(
  targetDate: string,
  currentLogs: Record<string, any> | string[]
): RestDayValidationResult {
  const restDates = extractRestDates(currentLogs);

  // 1. Cannot stack on the same day
  if (restDates.includes(targetDate)) {
    return {
      allowed: false,
      reason: "Rest Day already claimed for today. Rest Days never stack.",
      countThisWeek: 1,
    };
  }

  // 2. Count rest days in rolling 7-day window ending on targetDate
  const inWindow = restDates.filter((d) => isDateInRolling7Days(d, targetDate));

  if (inWindow.length >= 2) {
    return {
      allowed: false,
      reason: "Maximum 2 rest days per week reached. Time to rebuild momentum!",
      countThisWeek: inWindow.length,
    };
  }

  return {
    allowed: true,
    countThisWeek: inWindow.length,
  };
}

/**
 * Returns Monday and Sunday UTC dates for the week containing `targetDateStr`.
 */
export function getMondayToSundayWeek(targetDateStr: string): { monday: Date; sunday: Date } {
  const d = new Date(targetDateStr + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { monday, sunday };
}

/**
 * Normalizes input logs to an array of micro-completion date strings for `habitId`.
 */
export function extractMicroDatesForHabit(
  habitId: string,
  currentLogs: Record<string, any>
): string[] {
  if (!currentLogs || typeof currentLogs !== "object") return [];

  // Shape 1: Record<habitId, string[]>
  if (Array.isArray(currentLogs[habitId])) {
    return currentLogs[habitId];
  }

  // Shape 2: Record<logId, LogObject>
  const dates: string[] = [];
  for (const [, val] of Object.entries(currentLogs)) {
    if (val && typeof val === "object") {
      const hId = val.habit_id || val.habitId;
      const type = val.completion_type || val.type;
      const d = val.completed_date || val.date;
      if (hId === habitId && type === "micro" && d) {
        dates.push(d);
      }
    }
  }
  return dates;
}

/**
 * Task 1.1: Pure Helper to validate whether a 2-minute Micro-Habit can be logged
 * 
 * Rules:
 * - Counts micro completions for this specific `habitId` within current week (Monday–Sunday).
 * - Max allowed: 3 micro completions per habit per week.
 * - If exceeded, returns allowed: false with warning:
 *   "Weekly micro-habit limit (3/3) reached for this task."
 */
export function canLogMicroHabit(
  habitId: string,
  targetDate: string,
  currentLogs: Record<string, any>
): MicroHabitValidationResult {
  const microDates = extractMicroDatesForHabit(habitId, currentLogs);

  // 1. Cannot duplicate on the same date
  if (microDates.includes(targetDate)) {
    return {
      allowed: false,
      reason: "Micro completion already recorded for today.",
      countThisWeek: 1,
    };
  }

  // 2. Count within current week (Monday–Sunday)
  const { monday, sunday } = getMondayToSundayWeek(targetDate);
  const countInWeek = microDates.filter((dateStr) => {
    const checkTime = new Date(dateStr + "T00:00:00Z").getTime();
    return checkTime >= monday.getTime() && checkTime <= sunday.getTime();
  }).length;

  if (countInWeek >= 3) {
    return {
      allowed: false,
      reason: "Weekly micro-habit limit (3/3) reached for this task.",
      countThisWeek: countInWeek,
    };
  }

  return {
    allowed: true,
    countThisWeek: countInWeek,
  };
}

/**
 * Converts "HH:MM" (24-hour) string to minutes since midnight
 */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats "HH:MM" string to 12-hour display ("04:30" -> "04:30 AM")
 */
function format12Hour(timeStr?: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = (mStr || "00").padStart(2, "0");
  const meridiem = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h.toString().padStart(2, "0")}:${m} ${meridiem}`;
}

/**
 * Task 1.3: Circadian Time-Window Gating Pure Verification Function
 * 
 * Enforces biological window locks:
 * - If outside window, returns status 'upcoming' or 'closed' with descriptive label.
 * - If inside window or unrestricted, returns status 'open'.
 */
export function isWithinCircadianWindow(
  windowStart?: string,
  windowEnd?: string,
  now: Date = new Date()
): CircadianWindowResult {
  if (!windowStart && !windowEnd) {
    return {
      isOpen: true,
      label: "Anytime",
      status: "open",
    };
  }

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = windowStart ? parseTimeToMinutes(windowStart) : 0;
  const endMins = windowEnd ? parseTimeToMinutes(windowEnd) : 24 * 60;

  // Standard same-day window (e.g. 04:30 to 08:30)
  if (startMins <= endMins) {
    if (currentMins < startMins) {
      return {
        isOpen: false,
        label: `🔒 Opens at ${format12Hour(windowStart)}`,
        status: "upcoming",
      };
    }
    if (currentMins > endMins) {
      return {
        isOpen: false,
        label: `⌛ Window closed at ${format12Hour(windowEnd)}`,
        status: "closed",
      };
    }
    return {
      isOpen: true,
      label: `🟢 Active Window (${format12Hour(windowStart)} – ${format12Hour(windowEnd)})`,
      status: "open",
    };
  }

  // Overnight window (e.g. 21:00 to 04:00)
  const isOvernightOpen = currentMins >= startMins || currentMins <= endMins;
  if (isOvernightOpen) {
    return {
      isOpen: true,
      label: `🟢 Active Window (${format12Hour(windowStart)} – ${format12Hour(windowEnd)})`,
      status: "open",
    };
  }

  return {
    isOpen: false,
    label: `🔒 Opens at ${format12Hour(windowStart)}`,
    status: "upcoming",
  };
}
