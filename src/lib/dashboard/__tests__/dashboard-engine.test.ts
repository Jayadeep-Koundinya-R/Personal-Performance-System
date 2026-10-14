import { describe, it, expect } from "vitest";
import { calculateVitalityScore, calculateRolling7DayConsistency } from "../vitality";
import { getNextBestAction, ActionCandidateHabit, STARTER_HABIT_STACK } from "../recommendations";
import {
  canClaimRecoveryXP,
  claimRecoveryXP,
  canLogMicroCompletion,
  REST_DAY_CONFIG,
} from "../microHabits";
import {
  calculateWeeklyFocusCurveData,
  calculateExecutiveRecords,
  checkCircadianDataSufficiency,
  calculateHeatmapCellState,
} from "../analytics";
import { isKeyboardTargetInteractive, canFireGlobalShortcut } from "@/lib/utils/keyboard";

describe("Stage 0: Dashboard Engine Unit Tests", () => {
  describe("1. Vitality Scoring Formula", () => {
    it("correctly computes score with documented weights: 40% habits, 30% focus, 30% consistency", () => {
      // 100% habits, 100% focus (60/60m), 100% consistency = 100
      const maxResult = calculateVitalityScore({
        habitCompletionRate: 100,
        todayFocusMinutes: 60,
        targetFocusMinutes: 60,
        rolling7DayConsistency: 100,
      });
      expect(maxResult.score).toBe(100);
      expect(maxResult.label).toBe("Peak Flow");
      expect(maxResult.tooltipText).toContain("Vitality Score: 100/100");

      // 50% habits (20), 50% focus (30/60 = 15), 50% consistency (15) = 50
      const midResult = calculateVitalityScore({
        habitCompletionRate: 50,
        todayFocusMinutes: 30,
        targetFocusMinutes: 60,
        rolling7DayConsistency: 50,
      });
      expect(midResult.score).toBe(50);
      expect(midResult.label).toBe("Steady Momentum");

      // 0% habits (0), 0% focus (0), 20% consistency (6) = 6
      const lowResult = calculateVitalityScore({
        habitCompletionRate: 0,
        todayFocusMinutes: 0,
        targetFocusMinutes: 60,
        rolling7DayConsistency: 20,
      });
      expect(lowResult.score).toBe(6);
      expect(lowResult.label).toBe("Ignition");
    });

    it("caps focus target ratio at 100% and clamps score between 0 and 100", () => {
      const overachieved = calculateVitalityScore({
        habitCompletionRate: 100,
        todayFocusMinutes: 120, // double target
        targetFocusMinutes: 60,
        rolling7DayConsistency: 100,
      });
      expect(overachieved.score).toBe(100);
      expect(overachieved.focusRatio).toBe(100);
    });

    it("computes rolling 7-day consistency across past 7 days", () => {
      const habits = [
        {
          id: "1",
          completedDates: ["2026-10-13", "2026-10-12", "2026-10-11"],
          archived: false,
        },
      ];
      // 3 days completed out of 7 days = 3/7 = ~43%
      const rate = calculateRolling7DayConsistency(habits, "2026-10-13");
      expect(rate).toBe(43);
    });
  });

  describe("2. Next Best Action (NBA) Pure Rule Hierarchy", () => {
    it("prioritizes habit in the current time block over other habits", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "h1",
          name: "Morning Run",
          priority: "Low",
          startTime: "09:00",
          endTime: "10:00",
          completedDates: [],
        },
        {
          id: "h2",
          name: "Evening Reading",
          priority: "High",
          startTime: "18:00",
          endTime: "19:00",
          completedDates: [],
        },
      ];

      // At 09:30, h1 is active in current block, even though h2 has higher priority
      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
        currentTimeStr: "09:30",
      });
      expect(nba?.id).toBe("h1");
    });

    it("prioritizes nearest end time when neither or both are in the current block", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "h1",
          name: "Sprint Later",
          priority: "High",
          startTime: "16:00",
          endTime: "17:00",
          completedDates: [],
        },
        {
          id: "h2",
          name: "Sprint Sooner",
          priority: "High",
          startTime: "13:00",
          endTime: "14:00",
          completedDates: [],
        },
      ];

      // At 11:00, h2 ends sooner (14:00 vs 17:00)
      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
        currentTimeStr: "11:00",
      });
      expect(nba?.id).toBe("h2");
    });

    it("prioritizes highest priority when time blocks are not distinguishing", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "low",
          name: "Drink water",
          priority: "Low",
          completedDates: [],
        },
        {
          id: "high",
          name: "DSA Practice",
          priority: "High",
          completedDates: [],
        },
        {
          id: "med",
          name: "Review notes",
          priority: "Medium",
          completedDates: [],
        },
      ];

      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
      });
      expect(nba?.id).toBe("high");
    });

    it("uses streak-at-risk as a tiebreaker when priority is identical", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "newbie",
          name: "Clean Desk",
          priority: "High",
          streak: 1,
          completedDates: [],
        },
        {
          id: "veteran",
          name: "Core CS System Design",
          priority: "High",
          streak: 21,
          completedDates: [],
        },
      ];

      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
      });
      expect(nba?.id).toBe("veteran");
    });

    it("returns null if all habits are completed or skipped", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "done",
          name: "Already finished",
          priority: "High",
          completedDates: ["2026-10-13"],
        },
        {
          id: "skipped",
          name: "Rest day item",
          priority: "High",
          completedDates: [],
        },
      ];

      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
        skippedHabits: { skipped: "Rest" },
      });
      expect(nba).toBeNull();
    });
  });

  describe("3. Rest Day & Micro-Habit Caps and Loopholes", () => {
    it("prevents Rest Day from stacking on the same day", () => {
      const claimed = ["2026-10-13"];
      const check = canClaimRecoveryXP("2026-10-13", claimed);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("never stack");
    });

    it("caps Recovery XP at at most 2 times per 7-day period", () => {
      const claimed = ["2026-10-11", "2026-10-12"];
      const check = canClaimRecoveryXP("2026-10-13", claimed);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Weekly limit reached");

      // But allowed if an older day falls outside the 7-day window
      const olderClaimed = ["2026-09-01", "2026-10-12"];
      const check2 = canClaimRecoveryXP("2026-10-13", olderClaimed);
      expect(check2.allowed).toBe(true);
      expect(check2.countThisWeek).toBe(1);
    });

    it("caps 2-minute micro completion at at most 3 times per habit per week", () => {
      const habitId = "habit-42";
      const customMap = {
        [habitId]: ["2026-10-10", "2026-10-11", "2026-10-12"],
      };

      const check = canLogMicroCompletion(habitId, "2026-10-13", customMap);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("cap reached (3/3 per habit this week)");

      // Different habit has its own independent 3-times cap
      const checkOther = canLogMicroCompletion("habit-99", "2026-10-13", customMap);
      expect(checkOther.allowed).toBe(true);
    });

    it("rejects duplicate micro-completion on the exact same date", () => {
      const habitId = "habit-42";
      const customMap = {
        [habitId]: ["2026-10-13"],
      };
      const check = canLogMicroCompletion(habitId, "2026-10-13", customMap);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("already recorded for today");
    });
  });

  describe("4. Keyboard Shortcut Conflict Prevention", () => {
    it("prevents global Space and single-letter hotkeys in interactive inputs and buttons", () => {
      const input = document.createElement("input");
      expect(isKeyboardTargetInteractive(input)).toBe(true);

      const textarea = document.createElement("textarea");
      expect(isKeyboardTargetInteractive(textarea)).toBe(true);

      const select = document.createElement("select");
      expect(isKeyboardTargetInteractive(select)).toBe(true);

      const button = document.createElement("button");
      expect(isKeyboardTargetInteractive(button)).toBe(true);

      const buttonInnerSpan = document.createElement("span");
      button.appendChild(buttonInnerSpan);
      expect(isKeyboardTargetInteractive(buttonInnerSpan)).toBe(true);

      const div = document.createElement("div");
      expect(isKeyboardTargetInteractive(div)).toBe(false);

      const eventOnButton = { target: button } as unknown as KeyboardEvent;
      expect(canFireGlobalShortcut(eventOnButton)).toBe(false);

      const eventOnDiv = { target: div } as unknown as KeyboardEvent;
      expect(canFireGlobalShortcut(eventOnDiv)).toBe(true);
    });

    it("prevents global shortcuts when a modal dialog is open in the DOM", () => {
      const div = document.createElement("div");
      const eventOnDiv = { target: div } as unknown as KeyboardEvent;

      // No modal open
      expect(canFireGlobalShortcut(eventOnDiv)).toBe(true);

      // Modal open
      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      document.body.appendChild(dialog);

      expect(canFireGlobalShortcut(eventOnDiv)).toBe(false);

      // Cleanup
      document.body.removeChild(dialog);
      expect(canFireGlobalShortcut(eventOnDiv)).toBe(true);
    });
  });

  describe("5. Stage 1: Next Best Action & Starter Stack Integrity", () => {
    it("returns null when habits array is empty", () => {
      const nba = getNextBestAction({
        habits: [],
        todayStr: "2026-10-13",
      });
      expect(nba).toBeNull();
    });

    it("returns null when all due habits are completed today", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "h1",
          name: "Deep Work Sprint",
          priority: "High",
          completedDates: ["2026-10-13"],
        },
        {
          id: "h2",
          name: "Hydration",
          priority: "Medium",
          completedDates: ["2026-10-13"],
        },
      ];
      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
      });
      expect(nba).toBeNull();
    });

    it("returns null when all remaining habits are skipped today", () => {
      const habits: ActionCandidateHabit[] = [
        {
          id: "h1",
          name: "Workout",
          priority: "High",
          completedDates: [],
        },
      ];
      const nba = getNextBestAction({
        habits,
        todayStr: "2026-10-13",
        skippedHabits: { h1: "Injury rest" },
      });
      expect(nba).toBeNull();
    });

    it("verifies STARTER_HABIT_STACK contains exactly 3 curated high-impact habits", () => {
      expect(STARTER_HABIT_STACK).toHaveLength(3);
      expect(STARTER_HABIT_STACK[0].name).toContain("Deep Work Sprint");
      expect(STARTER_HABIT_STACK[0].priority).toBe("High");
      expect(STARTER_HABIT_STACK[1].name).toContain("Hydration");
      expect(STARTER_HABIT_STACK[2].name).toContain("Read 10 Pages");
      for (const item of STARTER_HABIT_STACK) {
        expect(item.time).toMatch(/^\d{2}:\d{2}$/);
        expect(["Productivity", "Health", "Mindset"]).toContain(item.category);
      }
    });
  });

  describe("5. Hub Summary Tiles Metric Derivations", () => {
    it("computes focus studio target completion percentage correctly", () => {
      const minutes = 50;
      const target = 180;
      const pct = Math.min(100, Math.round((minutes / target) * 100));
      expect(pct).toBe(28);

      const capped = Math.min(100, Math.round((250 / target) * 100));
      expect(capped).toBe(100);
    });

    it("correctly identifies whether daily reflection has been recorded for today", () => {
      const reflections = [
        { date: "2026-10-12", score: 8 },
        { date: "2026-10-13", score: 9 },
      ];
      expect(reflections.some((r) => r.date === "2026-10-13")).toBe(true);
      expect(reflections.some((r) => r.date === "2026-10-14")).toBe(false);
    });

    it("calculates nearest impending reminder with midnight rollover", () => {
      const reminders = [
        { id: "1", time: "09:00", enabled: true },
        { id: "2", time: "21:30", enabled: true },
        { id: "3", time: "14:00", enabled: false },
      ];

      const currentMins = 18 * 60 + 0; // 18:00
      const active = reminders.filter((r) => r.enabled);

      const sorted = [...active].sort((a, b) => {
        const [ha, ma] = a.time.split(":").map(Number);
        const [hb, mb] = b.time.split(":").map(Number);
        const minA = ha * 60 + ma;
        const minB = hb * 60 + mb;
        const diffA = minA >= currentMins ? minA - currentMins : minA + 1440 - currentMins;
        const diffB = minB >= currentMins ? minB - currentMins : minB + 1440 - currentMins;
        return diffA - diffB;
      });

      expect(sorted[0].id).toBe("2");
    });
  });

  describe("6. Stage 3: Analytics and Records Engine", () => {
    it("computes 7-day weekly focus curve data and peak day correctly", () => {
      const minutesMap: Record<string, number> = {
        "2026-10-07": 45,
        "2026-10-08": 60,
        "2026-10-09": 120,
        "2026-10-10": 180, // meets target
        "2026-10-11": 90,
        "2026-10-12": 210, // peak
        "2026-10-13": 50,
      };

      const curve = calculateWeeklyFocusCurveData(
        "2026-10-13",
        (ds) => minutesMap[ds] || 0,
        180
      );

      expect(curve.days).toHaveLength(7);
      expect(curve.totalMinutes).toBe(755);
      expect(curve.averageMinutes).toBe(108);
      expect(curve.peakDay?.dateStr).toBe("2026-10-12");
      expect(curve.peakDay?.focusMinutes).toBe(210);

      // Verify meetsTarget flag
      const day180 = curve.days.find((d) => d.dateStr === "2026-10-10");
      expect(day180?.meetsTarget).toBe(true);

      const day45 = curve.days.find((d) => d.dateStr === "2026-10-07");
      expect(day45?.meetsTarget).toBe(false);
    });

    it("calculates executive records (best streak, best week, total focus hours)", () => {
      const habits = [
        { streak: 5, completedDates: ["2026-10-01", "2026-10-02", "2026-10-03"] },
        { streak: 12, completedDates: ["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05"] },
        { streak: 8, completedDates: ["2026-10-02", "2026-10-03", "2026-10-04"] },
      ];

      const dates = [
        "2026-10-01",
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
      ];

      const focusMap: Record<string, number> = {
        "2026-10-01": 60,
        "2026-10-02": 120,
        "2026-10-03": 90,
      };

      const records = calculateExecutiveRecords(
        habits,
        dates,
        (ds) => focusMap[ds] || 0
      );

      expect(records.bestStreak).toBe(12);
      expect(records.totalLifetimeCompletions).toBe(10);
      expect(records.bestWeekCompletions).toBe(10);
      expect(records.totalFocusMinutes).toBe(270);
      expect(records.totalFocusHours).toBe(4.5); // 270 / 60
    });

    it("strictly guards circadian/energy correlation: rejects < 14 days and accepts >= 14 days", () => {
      const checkUnder = checkCircadianDataSufficiency(8, 14);
      expect(checkUnder.sufficient).toBe(false);
      expect(checkUnder.progressPct).toBe(57);
      expect(checkUnder.message).toContain("requires at least 14 days");
      expect(checkUnder.message).toContain("Currently logged: 8 of 14 days");

      const checkExact = checkCircadianDataSufficiency(14, 14);
      expect(checkExact.sufficient).toBe(true);
      expect(checkExact.progressPct).toBe(100);

      const checkAbove = checkCircadianDataSufficiency(22, 14);
      expect(checkAbove.sufficient).toBe(true);
    });

    it("correctly derives heatmap cell state with distinct 2m micro completion partial level", () => {
      // Empty day
      expect(calculateHeatmapCellState(0, 0, 4)).toBe("empty");

      // 0 full completions, but 1+ micro completions -> distinct partial state!
      expect(calculateHeatmapCellState(0, 2, 4)).toBe("micro_partial");

      // Full completions scaling
      expect(calculateHeatmapCellState(1, 0, 4)).toBe("level_1"); // 25%
      expect(calculateHeatmapCellState(2, 0, 4)).toBe("level_2"); // 50%
      expect(calculateHeatmapCellState(3, 0, 4)).toBe("level_3"); // 75%
      expect(calculateHeatmapCellState(4, 0, 4)).toBe("level_4"); // 100%
    });
  });
});


