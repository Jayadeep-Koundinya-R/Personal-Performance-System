import { describe, it, expect } from "vitest";

interface MockHabit {
  id: string;
  name: string;
  streak: number;
  freezeCredits: number;
  lastCompletedDate: string | null;
  completedDates: string[];
  archived?: boolean;
}

function checkAutoFreezeNeeded(
  habit: MockHabit,
  yesterdayStr: string,
  autoStreakFreeze: boolean
): boolean {
  if (!autoStreakFreeze) return false;

  const lastCompleted = habit.lastCompletedDate;
  return !!(
    habit.streak > 0 &&
    habit.freezeCredits > 0 &&
    lastCompleted &&
    lastCompleted < yesterdayStr &&
    !habit.completedDates.includes(yesterdayStr) &&
    !habit.archived
  );
}

describe("Auto Streak Freeze Logic", () => {
  const yesterdayStr = "2026-07-13";

  it("should return true if habit missed yesterday, autoStreakFreeze is enabled, and has credits", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 5,
      freezeCredits: 2,
      lastCompletedDate: "2026-07-12", // Sunday (yesterday was Monday 13th)
      completedDates: ["2026-07-11", "2026-07-12"],
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, true);
    expect(isNeeded).toBe(true);
  });

  it("should return false if autoStreakFreeze is disabled", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 5,
      freezeCredits: 2,
      lastCompletedDate: "2026-07-12",
      completedDates: ["2026-07-11", "2026-07-12"],
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, false);
    expect(isNeeded).toBe(false);
  });

  it("should return false if habit has 0 streak", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 0,
      freezeCredits: 2,
      lastCompletedDate: "2026-07-12",
      completedDates: ["2026-07-11", "2026-07-12"],
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, true);
    expect(isNeeded).toBe(false);
  });

  it("should return false if habit has 0 freeze credits", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 5,
      freezeCredits: 0,
      lastCompletedDate: "2026-07-12",
      completedDates: ["2026-07-11", "2026-07-12"],
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, true);
    expect(isNeeded).toBe(false);
  });

  it("should return false if habit already has yesterday completed", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 5,
      freezeCredits: 2,
      lastCompletedDate: "2026-07-13",
      completedDates: ["2026-07-12", "2026-07-13"],
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, true);
    expect(isNeeded).toBe(false);
  });

  it("should return false if habit was completed today", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 1,
      freezeCredits: 2,
      lastCompletedDate: "2026-07-14", // today
      completedDates: ["2026-07-14"],
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, true);
    expect(isNeeded).toBe(false);
  });

  it("should return false if habit is archived", () => {
    const habit: MockHabit = {
      id: "1",
      name: "Daily Coding",
      streak: 5,
      freezeCredits: 2,
      lastCompletedDate: "2026-07-12",
      completedDates: ["2026-07-11", "2026-07-12"],
      archived: true,
    };

    const isNeeded = checkAutoFreezeNeeded(habit, yesterdayStr, true);
    expect(isNeeded).toBe(false);
  });
});
