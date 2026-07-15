import { describe, it, expect } from "vitest";

/**
 * Unit test for the priority categorization logic used in DashboardSection.
 * This extracts and tests the exact same logic that categorizes habits
 * into the four dashboard sections: Critical, High, Medium, Upcoming.
 */

interface MockHabit {
  id: string;
  name: string;
  priority: "High" | "Medium" | "Low" | "Optional";
  period: "Daily" | "Weekly" | "Monthly" | "Today";
  archived?: boolean;
}

/**
 * Mimics the categorization logic from DashboardSection.tsx.
 * `dueToday` simulates `isHabitDueToday(habit)`.
 */
function categorizeHabits(
  habits: MockHabit[],
  isHabitDueToday: (h: MockHabit) => boolean
) {
  const critical: MockHabit[] = [];
  const high: MockHabit[] = [];
  const medium: MockHabit[] = [];
  const upcoming: MockHabit[] = [];

  habits
    .filter((h) => !h.archived)
    .forEach((habit) => {
      switch (habit.priority) {
        case "High":
          if (isHabitDueToday(habit)) critical.push(habit);
          else high.push(habit);
          break;
        case "Medium":
          medium.push(habit);
          break;
        case "Low":
        case "Optional":
        default:
          upcoming.push(habit);
          break;
      }
    });

  return { critical, high, medium, upcoming };
}

describe("Dashboard priority categorization", () => {
  // Simulates a habit that is always due today (e.g. Daily habit)
  const alwaysDue = () => true;
  // Simulates a habit that is NOT due today (e.g. Weekly habit not yet due)
  const neverDue = () => false;

  it("should put each priority in the correct section (all due today)", () => {
    const habits: MockHabit[] = [
      { id: "1", name: "High Task", priority: "High", period: "Daily" },
      { id: "2", name: "Medium Task", priority: "Medium", period: "Daily" },
      { id: "3", name: "Low Task", priority: "Low", period: "Daily" },
      { id: "4", name: "Optional Task", priority: "Optional", period: "Daily" },
    ];

    const result = categorizeHabits(habits, alwaysDue);

    // High + due today → Critical
    expect(result.critical.map((h) => h.name)).toEqual(["High Task"]);
    // No High habits that are NOT due today
    expect(result.high).toEqual([]);
    // Medium → Medium
    expect(result.medium.map((h) => h.name)).toEqual(["Medium Task"]);
    // Low + Optional → Upcoming
    expect(result.upcoming.map((h) => h.name)).toEqual(["Low Task", "Optional Task"]);
  });

  it("should NOT put a Low priority habit in Critical even if due today", () => {
    const habits: MockHabit[] = [
      { id: "1", name: "Low Daily", priority: "Low", period: "Daily" },
    ];

    const result = categorizeHabits(habits, alwaysDue);

    expect(result.critical).toEqual([]);
    expect(result.upcoming.map((h) => h.name)).toEqual(["Low Daily"]);
  });

  it("should put High priority not-due-today habits in High section (not Critical)", () => {
    const habits: MockHabit[] = [
      { id: "1", name: "High Weekly", priority: "High", period: "Weekly" },
    ];

    const result = categorizeHabits(habits, neverDue);

    expect(result.critical).toEqual([]);
    expect(result.high.map((h) => h.name)).toEqual(["High Weekly"]);
  });

  it("should exclude archived habits from all sections", () => {
    const habits: MockHabit[] = [
      { id: "1", name: "Archived High", priority: "High", period: "Daily", archived: true },
      { id: "2", name: "Active Low", priority: "Low", period: "Daily" },
    ];

    const result = categorizeHabits(habits, alwaysDue);

    expect(result.critical).toEqual([]);
    expect(result.high).toEqual([]);
    expect(result.medium).toEqual([]);
    expect(result.upcoming.map((h) => h.name)).toEqual(["Active Low"]);
  });

  it("should handle a mix of due-today and not-due-today habits correctly", () => {
    const habits: MockHabit[] = [
      { id: "1", name: "High Daily", priority: "High", period: "Daily" },
      { id: "2", name: "High Weekly", priority: "High", period: "Weekly" },
      { id: "3", name: "Medium Daily", priority: "Medium", period: "Daily" },
      { id: "4", name: "Low Daily", priority: "Low", period: "Daily" },
    ];

    // Only Daily habits are due today
    const isDueToday = (h: MockHabit) => h.period === "Daily";

    const result = categorizeHabits(habits, isDueToday);

    expect(result.critical.map((h) => h.name)).toEqual(["High Daily"]);
    expect(result.high.map((h) => h.name)).toEqual(["High Weekly"]);
    expect(result.medium.map((h) => h.name)).toEqual(["Medium Daily"]);
    expect(result.upcoming.map((h) => h.name)).toEqual(["Low Daily"]);
  });
});
