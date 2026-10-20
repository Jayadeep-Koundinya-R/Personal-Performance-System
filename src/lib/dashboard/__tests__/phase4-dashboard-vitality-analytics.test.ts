import { describe, it, expect } from "vitest";
import { calculateVitalityScore } from "@/components/dashboard/v2/MomentumCommandDeck";
import {
  calculateVitalityScore as calcVitalityFromLib,
  calculateRolling7DayConsistency,
} from "@/lib/dashboard/vitality";
import {
  calculateWeeklyFocusCurveData,
  calculateExecutiveRecords,
  checkCircadianDataSufficiency,
  calculateHeatmapCellState,
} from "@/lib/dashboard/analytics";
import { TRACK_PRESETS } from "@/constants/onboardingPresets";

describe("Phase 4: Dashboard V2 Deep Polish & Analytics Studio", () => {
  describe("Task 4.1: Unified Momentum Command Deck & Vitality Formula", () => {
    it("exports calculateVitalityScore from MomentumCommandDeck with exact signature and return contract", () => {
      const res = calculateVitalityScore({
        completionRate: 100,
        todayFocusMinutes: 120,
        targetFocusMinutes: 120,
        weeklyConsistencyRate: 100,
      });

      expect(res.score).toBe(100);
      expect(res.tier).toBe("Peak Flow");
      expect(res.breakdown).toContain("Habits (40%): 100%");
      expect(res.breakdown).toContain("Focus (30%): 120/120m (100%)");
      expect(res.breakdown).toContain("Consistency (30%): 100%");
    });

    it("verifies tier transitions across all ranges: Peak Flow, Optimal, Building, and Dormant", () => {
      // 1. Peak Flow (score >= 80)
      const peak = calculateVitalityScore({
        completionRate: 85,
        todayFocusMinutes: 120,
        targetFocusMinutes: 120,
        weeklyConsistencyRate: 80,
      });
      expect(peak.score).toBeGreaterThanOrEqual(80);
      expect(peak.tier).toBe("Peak Flow");

      // 2. Optimal (score >= 50 and < 80)
      const optimal = calculateVitalityScore({
        completionRate: 60,
        todayFocusMinutes: 60,
        targetFocusMinutes: 120, // 50%
        weeklyConsistencyRate: 50,
      });
      // 0.4*60 + 0.3*50 + 0.3*50 = 24 + 15 + 15 = 54
      expect(optimal.score).toBe(54);
      expect(optimal.tier).toBe("Optimal");

      // 3. Building (score >= 25 and < 50)
      const building = calculateVitalityScore({
        completionRate: 30,
        todayFocusMinutes: 40,
        targetFocusMinutes: 120, // 33%
        weeklyConsistencyRate: 30,
      });
      // 0.4*30 + 0.3*33 + 0.3*30 = 12 + 10 + 9 = 31
      expect(building.score).toBe(31);
      expect(building.tier).toBe("Building");

      // 4. Dormant (score < 25)
      const dormant = calculateVitalityScore({
        completionRate: 10,
        todayFocusMinutes: 0,
        targetFocusMinutes: 120,
        weeklyConsistencyRate: 10,
      });
      // 0.4*10 + 0 + 0.3*10 = 7
      expect(dormant.score).toBe(7);
      expect(dormant.tier).toBe("Dormant");
    });

    it("handles zero, negative, or invalid target focus minutes gracefully", () => {
      const safeZero = calculateVitalityScore({
        completionRate: 50,
        todayFocusMinutes: 30,
        targetFocusMinutes: 0,
        weeklyConsistencyRate: 50,
      });
      expect(safeZero.score).toBeGreaterThan(0);
      expect(safeZero.focusRatio).toBe(50);

      const safeNegative = calculateVitalityScore({
        completionRate: -20,
        todayFocusMinutes: -10,
        targetFocusMinutes: -50,
        weeklyConsistencyRate: -30,
      });
      expect(safeNegative.score).toBe(0);
      expect(safeNegative.tier).toBe("Dormant");
    });
  });

  describe("Task 4.2: Track-Adaptive Anchor Habit Presets", () => {
    it("provides curated anchor habits for Placements, Exams, Coding, and Fitness tracks", () => {
      // 1. Placements track
      expect(TRACK_PRESETS.placements).toBeDefined();
      expect(TRACK_PRESETS.placements.anchorHabits.length).toBeGreaterThanOrEqual(3);
      expect(TRACK_PRESETS.placements.anchorHabits.some((h) => h.title.includes("DSA") || h.title.includes("LeetCode"))).toBe(true);

      // 2. Competitive Exams track
      expect(TRACK_PRESETS.competitive_exams).toBeDefined();
      expect(TRACK_PRESETS.competitive_exams.anchorHabits.length).toBeGreaterThanOrEqual(3);
      expect(TRACK_PRESETS.competitive_exams.anchorHabits.some((h) => h.title.includes("MCQ") || h.title.includes("Mock"))).toBe(true);

      // 3. Core Coding & SaaS track
      expect(TRACK_PRESETS.core_coding).toBeDefined();
      expect(TRACK_PRESETS.core_coding.anchorHabits.length).toBeGreaterThanOrEqual(3);
      expect(TRACK_PRESETS.core_coding.anchorHabits.some((h) => h.title.includes("Git") || h.title.includes("Feature"))).toBe(true);

      // 4. Fitness & Health track
      expect(TRACK_PRESETS.fitness).toBeDefined();
      expect(TRACK_PRESETS.fitness.anchorHabits.length).toBeGreaterThanOrEqual(3);
      expect(TRACK_PRESETS.fitness.anchorHabits.some((h) => h.title.includes("Workout") || h.title.includes("Nutrition"))).toBe(true);
    });
  });

  describe("Task 4.3 & 4.4: Analytics Studio & Data Honesty (Zero Mock Policy)", () => {
    it("strictly blocks circadian energy correlation curves when logged days < 14", () => {
      const checkUnder = checkCircadianDataSufficiency(5, 14);
      expect(checkUnder.sufficient).toBe(false);
      expect(checkUnder.loggedDaysCount).toBe(5);
      expect(checkUnder.requiredDaysCount).toBe(14);
      expect(checkUnder.progressPct).toBe(36);
      expect(checkUnder.message).toContain("requires at least 14 days");

      const checkExact = checkCircadianDataSufficiency(14, 14);
      expect(checkExact.sufficient).toBe(true);
      expect(checkExact.progressPct).toBe(100);
      expect(checkExact.message).toContain("Statistically sufficient");

      const checkOver = checkCircadianDataSufficiency(25, 14);
      expect(checkOver.sufficient).toBe(true);
      expect(checkOver.progressPct).toBe(100);
    });

    it("accurately computes 7-day focus curve with peak day telemetry", () => {
      const minutesMap: Record<string, number> = {
        "2026-10-15": 120,
        "2026-10-14": 180,
        "2026-10-13": 210, // Peak Day
        "2026-10-12": 90,
        "2026-10-11": 150,
        "2026-10-10": 60,
        "2026-10-09": 100,
      };

      const curve = calculateWeeklyFocusCurveData(
        "2026-10-15",
        (ds) => minutesMap[ds] || 0,
        180
      );

      expect(curve.days.length).toBe(7);
      expect(curve.totalMinutes).toBe(120 + 180 + 210 + 90 + 150 + 60 + 100);
      expect(curve.averageMinutes).toBe(Math.round(curve.totalMinutes / 7));
      expect(curve.peakDay).toBeDefined();
      expect(curve.peakDay?.dateStr).toBe("2026-10-13");
      expect(curve.peakDay?.focusMinutes).toBe(210);
    });

    it("computes executive records without synthetic placeholders", () => {
      const habits = [
        { id: "h1", streak: 12, completedDates: ["2026-10-14", "2026-10-15"] },
        { id: "h2", streak: 5, completedDates: ["2026-10-13", "2026-10-14", "2026-10-15"] },
      ];
      const dates = ["2026-10-13", "2026-10-14", "2026-10-15"];

      const records = calculateExecutiveRecords(habits, dates, (ds) => (ds === "2026-10-15" ? 120 : 60));

      expect(records.bestStreak).toBe(12);
      expect(records.totalLifetimeCompletions).toBe(5);
      expect(records.totalFocusMinutes).toBe(60 + 60 + 120);
      expect(records.totalFocusHours).toBe(4.0);
    });

    it("correctly models 2m micro completion partial state in activity heatmap", () => {
      // 0 full completions, but > 0 micro completions -> distinct partial state
      const microOnlyState = calculateHeatmapCellState(0, 2, 5);
      expect(microOnlyState).toBe("micro_partial");

      // 0 full and 0 micro -> empty
      const emptyState = calculateHeatmapCellState(0, 0, 5);
      expect(emptyState).toBe("empty");

      // Full completions determine levels 1-4
      expect(calculateHeatmapCellState(1, 0, 5)).toBe("level_1"); // 20%
      expect(calculateHeatmapCellState(2, 0, 5)).toBe("level_2"); // 40%
      expect(calculateHeatmapCellState(3, 0, 5)).toBe("level_3"); // 60%
      expect(calculateHeatmapCellState(5, 0, 5)).toBe("level_4"); // 100%
    });
  });
});
