// =============================================================================
//  habitUtils.ts
//  Pure, framework-agnostic utility functions for the Personal Performance System.
//
//  ✅ No DOM access (no document.getElementById, no querySelector, etc.)
//  ✅ Fully typed with TypeScript
//  ✅ Safe to import directly into any React component / custom hook
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type HabitPeriod = "Daily" | "Weekly" | "Monthly" | "Today";
export type HabitPriority = "High" | "Medium" | "Low" | "Optional";
export type FilterRange = "today" | "week" | "month" | "all";

export interface Habit {
  id: number;
  name: string;
  category: string;
  priority: HabitPriority;
  period: HabitPeriod;
  /** ISO string — next due date */
  dueDate: string;
  /** Array of ISO date strings "YYYY-MM-DD" when the habit was completed */
  completedDates: string[];
  streak: number;
  lastCompletedDate: string | null;
  /** Freeze credits protect the streak when a day is missed */
  freezeCredits: number;
}

export interface HeatmapCell {
  date: string;       // "YYYY-MM-DD"
  count: number;      // completions that day
  intensity: number;  // 0–4 (for CSS classes: level-0 … level-4)
}

export interface HeatmapData {
  cells: HeatmapCell[];
  grandTotal: number;
  /** [{ label: "Jan", colIndex: number }] */
  monthLabels: { label: string; colIndex: number }[];
  weeks: number;
}

export interface StreakInfo {
  streak: number;
  icon: "🔥" | "💀";
  color: string;
  barPercent: number; // 0–100, full bar = 10 days
}

export interface DailyProgress {
  due: number;
  done: number;
  percent: number;
}

export interface HabitSuccessRate {
  habitId: number;
  name: string;
  doneInPeriod: number;
  percent: number;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a Date set to today at 00:00:00.000 local time. */
export function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns today's date as "YYYY-MM-DD". */
export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Formats an ISO date string to "DD/MM/YYYY" for display.
 * Returns "—" for falsy input.
 */
export function formatDateDMY(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOCAL STORAGE — Hybrid (guest + logged-in)
// ─────────────────────────────────────────────────────────────────────────────

/** Derive a per-user localStorage key from the user's email (or "guest"). */
export function buildStorageKey(email?: string | null): string {
  return `habits_${email ?? "guest"}`;
}

/** Load habits from localStorage for the given storage key. */
export function loadHabitsFromStorage(storageKey: string): Habit[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "null") ?? [];
  } catch {
    return [];
  }
}

/** Persist habits to localStorage for the given storage key. */
export function saveHabitsToStorage(storageKey: string, habits: Habit[]): void {
  localStorage.setItem(storageKey, JSON.stringify(habits));
}

// ─────────────────────────────────────────────────────────────────────────────
//  DUE DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Generates the initial due date ISO string based on a habit's period. */
export function generateInitialDueDate(period: HabitPeriod): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (period === "Weekly")  d.setDate(d.getDate() + 7);
  if (period === "Monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/**
 * Advances a habit's `dueDate` to the next occurrence based on its period.
 * Returns a **new** habit object (immutable — safe for React state).
 */
export function advanceNextDueDate(habit: Habit): Habit {
  const d = new Date(habit.dueDate);
  switch (habit.period) {
    case "Daily":   d.setDate(d.getDate() + 1);   break;
    case "Weekly":  d.setDate(d.getDate() + 7);   break;
    case "Monthly": d.setMonth(d.getMonth() + 1); break;
    default: break;
  }
  return { ...habit, dueDate: d.toISOString() };
}

/** Returns true if a habit's due date is today or in the past. */
export function isHabitDueToday(habit: Habit): boolean {
  const today = getToday();
  const due   = new Date(habit.dueDate);
  due.setHours(0, 0, 0, 0);
  return (due.getTime() - today.getTime()) / 864e5 <= 0;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STREAK CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts a consecutive daily streak from an array of "YYYY-MM-DD" date strings.
 * Walks backwards from the most recent date; breaks on any gap > 1 day.
 */
export function calculateStreakFromDates(dates: string[]): number {
  if (!dates?.length) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.round(
      (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) / 864e5
    );
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Processes the daily reset for a single habit.
 * - If the habit's due date has passed and it was not completed, burns a freeze
 *   credit or resets the streak to 0.
 * - Advances the due date forward until it is >= today.
 *
 * Returns a **new** habit object (immutable — safe for React state), plus a
 * boolean indicating whether anything changed.
 */
export function applyDailyResetToHabit(
  habit: Habit,
  today: Date = getToday()
): { habit: Habit; changed: boolean } {
  if (habit.period === "Today") return { habit, changed: false };

  let current = { ...habit };
  let changed = false;

  let dueDate = new Date(current.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  while (dueDate < today) {
    const dueDateStr   = dueDate.toISOString().split("T")[0];
    const wasCompleted = current.completedDates.includes(dueDateStr);

    if (!wasCompleted && current.streak > 0) {
      if (current.freezeCredits > 0) {
        current = { ...current, freezeCredits: current.freezeCredits - 1 };
      } else {
        current = { ...current, streak: 0 };
      }
    }

    current  = advanceNextDueDate(current);
    dueDate  = new Date(current.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    changed  = true;
  }

  return { habit: current, changed };
}

/**
 * Runs `applyDailyResetToHabit` across the entire habits array.
 * Returns a new array (immutable) and a flag if any habit was modified.
 */
export function applyDailyResetToAll(
  habits: Habit[],
  today: Date = getToday()
): { habits: Habit[]; changed: boolean } {
  let changed = false;
  const updated = habits.map((h) => {
    const result = applyDailyResetToHabit(h, today);
    if (result.changed) changed = true;
    return result.habit;
  });
  return { habits: updated, changed };
}

// ─────────────────────────────────────────────────────────────────────────────
//  HABIT CRUD (pure — returns new arrays / objects, no mutation)
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new Habit object. */
export function createHabit(
  name: string,
  category: string,
  period: HabitPeriod,
  priority: HabitPriority,
  startDate?: string | null
): Habit {
  const dueDate = startDate
    ? new Date(startDate + "T12:00:00").toISOString()
    : generateInitialDueDate(period);

  return {
    id:                Date.now(),
    name:              name.trim(),
    category:          category.trim() || "Uncategorized",
    priority,
    period,
    dueDate,
    completedDates:    [],
    streak:            0,
    lastCompletedDate: null,
    freezeCredits:     2,
  };
}

/** Returns a new habits array with the given habit added. */
export function addHabit(habits: Habit[], newHabit: Habit): Habit[] {
  return [...habits, newHabit];
}

/** Returns a new habits array with the given habit removed by id. */
export function deleteHabit(habits: Habit[], id: number): Habit[] {
  return habits.filter((h) => h.id !== id);
}

/** Returns a new habits array with one habit replaced by an edited version. */
export function editHabit(habits: Habit[], updated: Habit): Habit[] {
  return habits.map((h) => (h.id === updated.id ? updated : h));
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPLETION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggles a habit's completion for today.
 * Returns a **new** habit object (immutable — safe for React state).
 */
export function toggleHabitCompletion(habit: Habit, isCompleted: boolean): Habit {
  const todayStr = getTodayStr();
  let updated = { ...habit, completedDates: [...habit.completedDates] };

  if (isCompleted) {
    // Mark complete
    if (!updated.completedDates.includes(todayStr)) {
      updated.completedDates.push(todayStr);
    }

    if (updated.lastCompletedDate) {
      const diff = Math.round(
        (new Date(todayStr).getTime() - new Date(updated.lastCompletedDate).getTime()) / 864e5
      );
      if (diff === 1)      updated.streak++;
      else if (diff > 1)   updated.streak = 1; // gap; daily reset handles freeze
      // diff === 0 → same day, do nothing
    } else {
      updated.streak = 1;
    }
    updated.lastCompletedDate = todayStr;

  } else {
    // Unmark complete
    updated.completedDates = updated.completedDates.filter((d) => d !== todayStr);

    if (updated.completedDates.length > 0) {
      updated.completedDates.sort();
      updated.lastCompletedDate =
        updated.completedDates[updated.completedDates.length - 1];
      updated.streak = calculateStreakFromDates(updated.completedDates);
    } else {
      updated.lastCompletedDate = null;
      updated.streak = 0;
    }
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEATMAP DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds all data needed to render the activity heatmap.
 * No DOM access — returns structured data your component can render.
 *
 * @param habits   The full habits array.
 * @param days     Number of days to display (91 | 182 | 365).
 */
export function buildHeatmapData(habits: Habit[], days: number = 182): HeatmapData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build completion count map: "YYYY-MM-DD" → count
  const countMap: Record<string, number> = {};
  let grandTotal = 0;
  habits.forEach((h) => {
    (h.completedDates ?? []).forEach((d) => {
      countMap[d] = (countMap[d] ?? 0) + 1;
      grandTotal++;
    });
  });

  // Find start date: Monday of the week `days` ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days + 1);
  const dow = startDate.getDay(); // 0 = Sun
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const habitTotal = habits.length || 1;
  const weeks      = Math.ceil(days / 7);
  const cells: HeatmapCell[] = [];
  const monthsSeen: Record<string, boolean> = {};
  const monthLabels: HeatmapData["monthLabels"] = [];

  let col = 0;
  let d   = new Date(startDate);

  while (col < weeks) {
    for (let row = 0; row < 7; row++) {
      const dateStr = d.toISOString().split("T")[0];
      const count   = countMap[dateStr] ?? 0;

      // Month labels
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthsSeen[monthKey]) {
        monthsSeen[monthKey] = true;
        monthLabels.push({
          label:    d.toLocaleString("en-GB", { month: "short" }),
          colIndex: col,
        });
      }

      // Intensity: 0 = none, 1–4 proportional to (count / habitTotal)
      const ratio = count / habitTotal;
      const intensity =
        count === 0    ? 0 :
        ratio < 0.25   ? 1 :
        ratio < 0.5    ? 2 :
        ratio < 0.75   ? 3 : 4;

      cells.push({ date: dateStr, count, intensity });

      d.setDate(d.getDate() + 1);
    }
    col++;
  }

  return { cells, grandTotal, monthLabels, weeks };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STREAK DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns display properties for a habit's streak card. */
export function getStreakInfo(habit: Habit): StreakInfo {
  const streak = habit.streak ?? 0;
  const icon: StreakInfo["icon"]  = streak === 0 ? "💀" : "🔥";
  const color =
    streak === 0  ? "#ef4444" :
    streak >= 7   ? "#f97316" : "#6366f1";
  const barPercent = Math.min(streak * 10, 100); // full at 10 days

  return { streak, icon, color, barPercent };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PROGRESS & STATS
// ─────────────────────────────────────────────────────────────────────────────

/** Calculates today's due / done progress across all habits. */
export function getDailyProgress(habits: Habit[]): DailyProgress {
  const todayStr = getTodayStr();
  let due = 0;
  let done = 0;
  habits.forEach((h) => {
    if (isHabitDueToday(h)) {
      due++;
      if (h.completedDates.includes(todayStr)) done++;
    }
  });
  const percent = due > 0 ? Math.round((done / due) * 100) : 0;
  return { due, done, percent };
}

/** XP awarded per habit completion. */
export const XP_PER_COMPLETION = 10;

/** Total XP earned across all habits. */
export function calculateTotalXP(habits: Habit[]): number {
  return habits.reduce(
    (sum, h) => sum + h.completedDates.length * XP_PER_COMPLETION,
    0
  );
}

/** Best streak across all habits. */
export function getBestStreak(habits: Habit[]): number {
  return Math.max(0, ...habits.map((h) => h.streak ?? 0));
}

/** Overall completion % across all habits (completedDates vs total opportunities). */
export function getOverallCompletionRate(habits: Habit[]): number {
  const total = habits.reduce((s, h) => s + h.completedDates.length, 0);
  const possible = habits.length * 30; // rough 30-day window
  return possible > 0 ? Math.round((total / possible) * 100) : 0;
}

/**
 * Per-habit success rate (last `windowDays` days).
 * Returns an array sorted by percent descending.
 */
export function getHabitSuccessRates(
  habits: Habit[],
  windowDays: number = 7
): HabitSuccessRate[] {
  const windowAgo = new Date();
  windowAgo.setDate(windowAgo.getDate() - windowDays);

  return habits
    .map((h) => {
      const done   = h.completedDates.filter((d) => new Date(d) >= windowAgo).length;
      const pct    = Math.min(Math.round((done / windowDays) * 100), 100);
      const color  = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
      return { habitId: h.id, name: h.name, doneInPeriod: done, percent: pct, color };
    })
    .sort((a, b) => b.percent - a.percent);
}

/**
 * Points earned within a date filter window.
 *
 * @param habits       The habits array.
 * @param filter       "today" | "week" | "month" | "all"
 * @param xpPerCompletion  Defaults to XP_PER_COMPLETION (10).
 */
export function calculatePeriodPoints(
  habits: Habit[],
  filter: FilterRange = "week",
  xpPerCompletion: number = XP_PER_COMPLETION
): number {
  const today        = getToday();
  const startOfWeek  = new Date(today); startOfWeek.setDate(today.getDate() - 6);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const inWindow = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    switch (filter) {
      case "today": return date.toDateString() === today.toDateString();
      case "week":  return date >= startOfWeek;
      case "month": return date >= startOfMonth;
      default:      return true;
    }
  };

  return habits.reduce((sum, h) => {
    return sum + h.completedDates.filter(inWindow).length * xpPerCompletion;
  }, 0);
}
