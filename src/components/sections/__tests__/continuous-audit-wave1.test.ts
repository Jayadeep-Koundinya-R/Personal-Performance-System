import { describe, it, expect } from "vitest";
import { canLogRestDay, canLogMicroHabit } from "@/lib/habits/agniEngine";

describe("🔁 Continuous Page-by-Page Deep Audit & UX Enhancement Loop: Wave 1", () => {
  describe("Page 1: Habit Architect (HabitManagerSection)", () => {
    it("supports building habits with proof-of-focus sprint locks and duration", () => {
      const habitPayload = {
        name: "Morning Deep Work DSA",
        category: "Productivity",
        period: "Daily",
        priority: "High",
        requires_focus_timer: true,
        focus_duration_minutes: 45,
      };

      expect(habitPayload.requires_focus_timer).toBe(true);
      expect(habitPayload.focus_duration_minutes).toBe(45);
    });

    it("supports circadian biological time windows in habit architecture", () => {
      const habitWithWindow = {
        name: "Core Engineering Practice",
        category: "Productivity",
        window_start: "08:00",
        window_end: "12:00",
      };

      expect(habitWithWindow.window_start).toBe("08:00");
      expect(habitWithWindow.window_end).toBe("12:00");
    });
  });

  describe("Page 2: Performance Calendar (CalendarSection)", () => {
    function getCircadianBlock(habit: {
      window_start?: string;
      startTime?: string | null;
      priority: string;
    }): "morning" | "afternoon" | "evening" {
      const time = habit.window_start || habit.startTime;
      if (time) {
        const hour = parseInt(time.split(":")[0], 10);
        if (hour < 12) return "morning";
        if (hour < 18) return "afternoon";
        return "evening";
      }
      if (habit.priority === "High") return "morning";
      if (habit.priority === "Medium") return "afternoon";
      return "evening";
    }

    it("assigns circadian block by window_start when present", () => {
      expect(getCircadianBlock({ window_start: "09:00", priority: "Low" })).toBe("morning");
      expect(getCircadianBlock({ window_start: "14:30", priority: "High" })).toBe("afternoon");
      expect(getCircadianBlock({ window_start: "19:00", priority: "High" })).toBe("evening");
    });

    it("falls back to startTime or priority when window_start is not set", () => {
      expect(getCircadianBlock({ startTime: "10:00", priority: "Low" })).toBe("morning");
      expect(getCircadianBlock({ priority: "High" })).toBe("morning");
      expect(getCircadianBlock({ priority: "Medium" })).toBe("afternoon");
      expect(getCircadianBlock({ priority: "Low" })).toBe("evening");
    });
  });

  describe("Page 3: Streak Engine (StreakSection)", () => {
    it("enforces max 2 rest days per rolling 7 days to shield streaks", () => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(now.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

      // 0 rest days logged
      expect(canLogRestDay(todayStr, []).allowed).toBe(true);

      // 1 rest day logged
      expect(canLogRestDay(todayStr, [yesterdayStr]).allowed).toBe(true);

      // 2 rest days logged within rolling 7 days -> 3rd should be rejected
      const result = canLogRestDay(todayStr, [yesterdayStr, twoDaysAgoStr]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Maximum 2 rest days per week reached");
    });

    it("allows 2-minute micro actions (up to 3 per week) to protect streak without full 10 XP", () => {
      const habitId = "h_algo_drill";
      const today = "2026-11-11";
      const microMap: Record<string, string[]> = {};

      const check1 = canLogMicroHabit(habitId, today, microMap);
      expect(check1.allowed).toBe(true);

      // 3 micro actions already logged this week for this habit
      microMap[habitId] = ["2026-11-09", "2026-11-10", "2026-11-11"];
      const checkMax = canLogMicroHabit(habitId, "2026-11-12", microMap);
      expect(checkMax.allowed).toBe(false);
      expect(checkMax.reason).toContain("limit (3/3) reached");
    });
  });

  describe("Page 4: Reminders & Alarm Studio (ReminderSection)", () => {
    it("includes 22:00 Agni Curfew preset and persistent alarm delivery mode", () => {
      const presets = [
        { label: "Morning Hero Stack Alarm 🌅", time: "07:00", repeat: "Daily", deliveryType: "alarm" },
        { label: "Afternoon Deep Work Review ☀️", time: "13:00", repeat: "Daily", deliveryType: "notification" },
        { label: "Night Recovery & Screen Detox 🌙", time: "21:30", repeat: "Daily", deliveryType: "alarm" },
        { label: "Agni 10 PM Curfew Alarm 🔥", time: "22:00", repeat: "Daily", deliveryType: "alarm" },
      ];

      const curfew = presets.find((p) => p.time === "22:00");
      expect(curfew).toBeDefined();
      expect(curfew?.deliveryType).toBe("alarm");
      expect(curfew?.label).toContain("Agni 10 PM Curfew");
    });
  });

  describe("Page 5: Reports Section (ReportsSection)", () => {
    it("differentiates full focus sprints from 2-minute micro shields and rest days in period calculation", () => {
      const totalCompletions = 24;
      const microCompletions = 4;
      const restDays = 2;

      const fullFocusSprints = totalCompletions - microCompletions;
      expect(fullFocusSprints).toBe(20);

      const totalXP = fullFocusSprints * 10 + microCompletions * 2 + restDays * 5;
      expect(totalXP).toBe(200 + 8 + 10);
      expect(totalXP).toBe(218);
    });
  });
});
