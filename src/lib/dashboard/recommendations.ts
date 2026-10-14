/**
 * ⚡ Next Best Action (NBA) Recommendation Engine
 *
 * Rule Hierarchy:
 * 1. Habit in the current time block (actively occurring now)
 * 2. Nearest end time / impending deadline
 * 3. Highest priority (High > Medium > Low > Optional)
 * 4. Streak-at-risk as tiebreaker (higher current streak at risk of resetting)
 */

export interface ActionCandidateHabit {
  id: string;
  name: string;
  priority: "High" | "Medium" | "Low" | "Optional" | string;
  period?: "Daily" | "Weekly" | "Monthly" | "Today" | string;
  completedDates?: string[];
  archived?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  streak?: number;
  lastCompletedDate?: string | null;
  category?: string;
  [key: string]: any;
}

export interface NextBestActionOptions {
  habits: ActionCandidateHabit[];
  todayStr: string;
  currentTimeStr?: string; // "HH:MM" 24h format
  skippedHabits?: Record<string, string>;
}

export function getCurrentTimeHHMM(d: Date = new Date()): string {
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

const PRIORITY_SCORES: Record<string, number> = {
  High: 4,
  Medium: 3,
  Low: 2,
  Optional: 1,
};

export function getNextBestAction({
  habits = [],
  todayStr,
  currentTimeStr,
  skippedHabits = {},
}: NextBestActionOptions): ActionCandidateHabit | null {
  const nowStr = currentTimeStr || getCurrentTimeHHMM();
  const currentMinutes = parseTimeToMinutes(nowStr) ?? 720; // Default midday if unparseable

  // 1. Filter to eligible pending habits
  const pending = habits.filter((h) => {
    if (h.archived) return false;
    if (skippedHabits[h.id]) return false;
    const isDone = (h.completedDates || []).includes(todayStr);
    if (isDone) return false;
    return true;
  });

  if (pending.length === 0) return null;

  // 2. Rank candidates by the defined hierarchy
  const sorted = [...pending].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime);
    const aEnd = parseTimeToMinutes(a.endTime);
    const bStart = parseTimeToMinutes(b.startTime);
    const bEnd = parseTimeToMinutes(b.endTime);

    // Rule 1: Habit in current time block
    const aInBlock =
      aStart !== null
        ? currentMinutes >= aStart && (aEnd !== null ? currentMinutes <= aEnd : currentMinutes <= aStart + 120)
        : false;
    const bInBlock =
      bStart !== null
        ? currentMinutes >= bStart && (bEnd !== null ? currentMinutes <= bEnd : currentMinutes <= bStart + 120)
        : false;

    if (aInBlock !== bInBlock) {
      return aInBlock ? -1 : 1;
    }

    // Rule 2: Nearest end time (earliest deadline among future or active end times)
    const getEffectiveEndTime = (start: number | null, end: number | null) => {
      if (end !== null) return end;
      if (start !== null) return start + 60; // Estimated 1h block
      return null;
    };

    const aEffEnd = getEffectiveEndTime(aStart, aEnd);
    const bEffEnd = getEffectiveEndTime(bStart, bEnd);

    if (aEffEnd !== null && bEffEnd !== null) {
      if (aEffEnd !== bEffEnd) {
        return aEffEnd - bEffEnd; // Earlier end time wins
      }
    } else if (aEffEnd !== null && bEffEnd === null) {
      return -1; // Explicit time is more urgent than unscheduled
    } else if (aEffEnd === null && bEffEnd !== null) {
      return 1;
    }

    // Rule 3: Highest priority
    const aPriority = PRIORITY_SCORES[a.priority] || 1;
    const bPriority = PRIORITY_SCORES[b.priority] || 1;
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority wins
    }

    // Rule 4: Streak-at-risk as tiebreaker
    const aStreak = a.streak || 0;
    const bStreak = b.streak || 0;
    if (aStreak !== bStreak) {
      return bStreak - aStreak; // Higher streak at risk wins
    }

    // Deterministic tiebreaker: alphabetical
    return a.name.localeCompare(b.name);
  });

  return sorted[0] || null;
}

export interface StarterHabitItem {
  name: string;
  category: string;
  period: "Daily" | "Weekly" | "Monthly" | "Today";
  priority: "High" | "Medium" | "Low" | "Optional";
  time: string;
  color: string;
  description?: string;
}

export const STARTER_HABIT_STACK: StarterHabitItem[] = [
  {
    name: "💻 20-min Deep Work Sprint",
    category: "Productivity",
    period: "Daily",
    priority: "High",
    time: "09:00",
    color: "indigo",
    description: "Focused single-task sprint on your #1 objective.",
  },
  {
    name: "💧 Morning Sunlight & Hydration",
    category: "Health",
    period: "Daily",
    priority: "High",
    time: "07:30",
    color: "sky",
    description: "Anchor circadian rhythm and replenish water.",
  },
  {
    name: "📚 Read 10 Pages of Growth",
    category: "Mindset",
    period: "Daily",
    priority: "Medium",
    time: "20:30",
    color: "emerald",
    description: "Consistent compounding knowledge before evening wind-down.",
  },
];
