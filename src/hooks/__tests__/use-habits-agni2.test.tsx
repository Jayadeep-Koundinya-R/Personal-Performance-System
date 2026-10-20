import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { ReactNode } from "react";
import { HabitsProvider, useHabits } from "../use-habits";
import {
  canLogRestDay,
  canLogMicroHabit,
  isWithinCircadianWindow,
} from "@/lib/habits/agniEngine";
import { audioEngine, playHabitCompletionSound } from "@/lib/audio";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    channel: () => ({
      on: () => ({ on: () => ({ subscribe: () => {} }) }),
    }),
    removeChannel: () => {},
  },
}));

// Mock user settings
vi.mock("@/hooks/use-user-settings", () => ({
  useUserSettings: () => ({
    settings: { autoStreakFreeze: false },
    loading: false,
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <HabitsProvider userEmail={null} userId={undefined} maxHabits={Infinity}>
    {children}
  </HabitsProvider>
);

describe("🔥 Agni 2.0 Hardening Engine Test Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Task 1.1: Multi-Tier Habit Completion & Weekly Caps", () => {
    it("canLogRestDay allows up to 2 rest days in a rolling 7-day window", () => {
      const logs: string[] = ["2026-10-10"];
      const check1 = canLogRestDay("2026-10-12", logs);
      expect(check1.allowed).toBe(true);
      expect(check1.countThisWeek).toBe(1);

      const logs2: string[] = ["2026-10-10", "2026-10-12"];
      const check2 = canLogRestDay("2026-10-14", logs2);
      expect(check2.allowed).toBe(false);
      expect(check2.reason).toContain("Maximum 2 rest days per week reached");
    });

    it("canLogRestDay rejects rest day duplicates on the same date", () => {
      const logs: string[] = ["2026-10-15"];
      const check = canLogRestDay("2026-10-15", logs);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("already claimed for today");
    });

    it("canLogRestDay ignores dates older than 7 rolling days", () => {
      const logs: string[] = ["2026-10-01", "2026-10-03"]; // Outside 7-day window for 2026-10-15
      const check = canLogRestDay("2026-10-15", logs);
      expect(check.allowed).toBe(true);
      expect(check.countThisWeek).toBe(0);
    });

    it("canLogMicroHabit allows up to 3 micro completions per habit per week (Monday-Sunday)", () => {
      const habitId = "habit-read-10";
      // Suppose targetDate is Thursday 2026-10-15
      const weekLogs = {
        [habitId]: ["2026-10-12", "2026-10-13"], // Monday, Tuesday
      };
      const check1 = canLogMicroHabit(habitId, "2026-10-14", weekLogs);
      expect(check1.allowed).toBe(true);
      expect(check1.countThisWeek).toBe(2);

      const cappedLogs = {
        [habitId]: ["2026-10-12", "2026-10-13", "2026-10-14"],
      };
      const check2 = canLogMicroHabit(habitId, "2026-10-15", cappedLogs);
      expect(check2.allowed).toBe(false);
      expect(check2.reason).toContain("Weekly micro-habit limit (3/3) reached for this task.");
    });

    it("canLogMicroHabit rejects duplicate micro logging on the same date", () => {
      const habitId = "habit-focus-20";
      const logs = {
        [habitId]: ["2026-10-15"],
      };
      const check = canLogMicroHabit(habitId, "2026-10-15", logs);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("already recorded for today");
    });

    it("tracks multi-tier XP correctly: full (+10), micro (+2), rest (+5)", async () => {
      const { result } = renderHook(() => useHabits(), { wrapper });

      // Add a regular habit
      await act(async () => {
        await result.current.addHabit("Agni Test Habit", "Productivity", "Daily", "High");
      });

      const testHabit = result.current.habits.find((h) => h.name === "Agni Test Habit");
      expect(testHabit).toBeDefined();
      const testHabitId = testHabit!.id;
      const initialXP = result.current.calculateTotalXP();

      // 1. Log a Micro completion (+2 XP)
      await act(async () => {
        await result.current.completeHabit(testHabitId, "micro", "2026-10-15");
      });
      expect(result.current.calculateTotalXP()).toBe(initialXP + 2);

      // 2. Log a Rest Day (+5 Recovery XP)
      await act(async () => {
        await result.current.completeHabit(testHabitId, "rest", "2026-10-15");
      });
      expect(result.current.calculateTotalXP()).toBe(initialXP + 2 + 5);

      // 3. Promote to Full Completion (+10 XP total for habit, replacing micro)
      await act(async () => {
        await result.current.completeHabit(testHabitId, "full", "2026-10-15");
      });
      // Micro removed, full (+10) active, rest (+5) still active => initialXP + 10 + 5
      expect(result.current.calculateTotalXP()).toBe(initialXP + 15);
    });
  });

  describe("Task 1.2: Mechanical Proof-of-Focus Anti-Cheat Locks", () => {
    it("intercepts raw checkbox toggle on timer-locked habit without bypass", async () => {
      const { result } = renderHook(() => useHabits(), { wrapper });

      await act(async () => {
        await result.current.addHabit(
          "Locked Anchor Task",
          "Deep Work",
          "Daily",
          "High",
          null,
          null,
          null,
          "indigo",
          false,
          false,
          true, // requires_focus_timer
          25
        );
      });

      const lockedHabit = result.current.habits.find((h) => h.name === "Locked Anchor Task");
      expect(lockedHabit).toBeDefined();
      const lockedHabitId = lockedHabit!.id;
      const today = result.current.getTodayStr();

      // Raw toggle attempt without bypass
      await act(async () => {
        await result.current.toggleCompletion(lockedHabitId);
      });

      // Anti-cheat intercepts: completedDates should still be empty!
      const habitAfter = result.current.habits.find((h) => h.id === lockedHabitId);
      expect(habitAfter?.completedDates.includes(today)).toBe(false);
    });

    it("verifies and completes timer-locked habit when pps_focus_session_completed is dispatched", async () => {
      const { result } = renderHook(() => useHabits(), { wrapper });

      await act(async () => {
        await result.current.addHabit(
          "Focus Engine Habit",
          "Deep Work",
          "Daily",
          "High",
          null,
          null,
          null,
          "indigo",
          false,
          false,
          true, // requires_focus_timer
          20
        );
      });

      const lockedHabit = result.current.habits.find((h) => h.name === "Focus Engine Habit");
      expect(lockedHabit).toBeDefined();
      const lockedHabitId = lockedHabit!.id;
      const today = result.current.getTodayStr();
      const initialXP = result.current.calculateTotalXP();

      // Simulate timer completion event from useFocusTimer
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("pps_focus_session_completed", {
            detail: {
              habitId: lockedHabitId,
              durationMinutes: 20,
              taskName: "Focus Engine Habit",
            },
          })
        );
      });

      const habit = result.current.habits.find((h) => h.id === lockedHabitId);
      expect(habit?.completedDates.includes(today)).toBe(true);
      expect(result.current.calculateTotalXP()).toBe(initialXP + 10);
    });
  });

  describe("Task 1.3: Circadian Time-Window Gating", () => {
    it("correctly identifies status for standard same-day circadian windows", () => {
      const morning8 = new Date("2026-10-15T08:00:00");
      const morning4 = new Date("2026-10-15T04:00:00");
      const noon12 = new Date("2026-10-15T12:00:00");

      const openCheck = isWithinCircadianWindow("05:00", "09:00", morning8);
      expect(openCheck.isOpen).toBe(true);
      expect(openCheck.status).toBe("open");

      const upcomingCheck = isWithinCircadianWindow("05:00", "09:00", morning4);
      expect(upcomingCheck.isOpen).toBe(false);
      expect(upcomingCheck.status).toBe("upcoming");
      expect(upcomingCheck.label).toContain("Opens at");

      const closedCheck = isWithinCircadianWindow("05:00", "09:00", noon12);
      expect(closedCheck.isOpen).toBe(false);
      expect(closedCheck.status).toBe("closed");
      expect(closedCheck.label).toContain("Window closed at");
    });

    it("correctly supports overnight circadian windows (e.g. 21:00 to 04:00)", () => {
      const night22 = new Date("2026-10-15T22:30:00");
      const night02 = new Date("2026-10-15T02:00:00");
      const midday14 = new Date("2026-10-15T14:00:00");

      const nightOpen = isWithinCircadianWindow("21:00", "04:00", night22);
      expect(nightOpen.isOpen).toBe(true);
      expect(nightOpen.status).toBe("open");

      const earlyOpen = isWithinCircadianWindow("21:00", "04:00", night02);
      expect(earlyOpen.isOpen).toBe(true);
      expect(earlyOpen.status).toBe("open");

      const dayUpcoming = isWithinCircadianWindow("21:00", "04:00", midday14);
      expect(dayUpcoming.isOpen).toBe(false);
      expect(dayUpcoming.status).toBe("upcoming");
    });

    it("returns 'Anytime' open status when no circadian window is configured", () => {
      const check = isWithinCircadianWindow(undefined, undefined);
      expect(check.isOpen).toBe(true);
      expect(check.label).toBe("Anytime");
      expect(check.status).toBe("open");
    });
  });

  describe("Task 1.4: Procedural Web Audio Engine", () => {
    it("audio engine methods execute without throwing", () => {
      expect(() => audioEngine.playDeepWorkChime()).not.toThrow();
      expect(() => audioEngine.playHealthSparkle()).not.toThrow();
      expect(() => audioEngine.playMicroClick()).not.toThrow();
      expect(() => audioEngine.playRestRecoveryChime()).not.toThrow();
      expect(() => playHabitCompletionSound("full", "Health")).not.toThrow();
      expect(() => playHabitCompletionSound("micro")).not.toThrow();
      expect(() => playHabitCompletionSound("rest")).not.toThrow();
    });
  });
});
