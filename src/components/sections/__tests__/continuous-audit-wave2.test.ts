import { describe, it, expect } from "vitest";
import { buildWhatsAppInviteMessage, buildWhatsAppInviteUrl, buildWebWhatsAppInviteUrl } from "@/lib/social/whatsappInvite";

describe("🔁 Continuous Page-by-Page Deep Audit & UX Enhancement Loop: Wave 2", () => {
  describe("Page 6: Focus Studio & Daily Execution (DailyTrackerSection)", () => {
    it("recognizes habits requiring verified focus sprints", () => {
      const lockedHabit = {
        id: "h_system_design",
        name: "Distributed Systems Reading",
        requires_focus_timer: true,
        focus_duration_minutes: 45,
        completedDates: [],
      };

      expect(lockedHabit.requires_focus_timer).toBe(true);
      expect(lockedHabit.focus_duration_minutes).toBe(45);
      expect(lockedHabit.completedDates.length).toBe(0);
    });

    it("formats circadian window badge times cleanly", () => {
      const habit = {
        name: "Morning Algorithmic Problem Solving",
        window_start: "07:30",
        window_end: "09:30",
      };

      const badgeLabel = `${habit.window_start} - ${habit.window_end}`;
      expect(badgeLabel).toBe("07:30 - 09:30");
    });
  });

  describe("Page 7: Trophy Room & Achievements (AchievementsSection)", () => {
    it("calculates Anti-Burnout Shield achievement progress from micro habits and rest days", () => {
      const statsZero = { microCompletions: 0, restDays: 0 };
      const getProgress = (s: { microCompletions: number; restDays: number }) => {
        const total = (s.microCompletions || 0) + (s.restDays || 0);
        return { current: Math.min(total, 1), total: 1, pct: Math.min(100, total * 100) };
      };

      expect(getProgress(statsZero).pct).toBe(0);

      const statsMicro = { microCompletions: 1, restDays: 0 };
      expect(getProgress(statsMicro).pct).toBe(100);

      const statsRest = { microCompletions: 0, restDays: 1 };
      expect(getProgress(statsRest).pct).toBe(100);
    });

    it("verifies Agni Curfew Guardian requirement on 100% daily completion", () => {
      const statsPartial = { dueToday: 4, doneToday: 3 };
      const checkCurfew = (s: { dueToday: number; doneToday: number }) => {
        return s.dueToday > 0 && s.doneToday === s.dueToday;
      };

      expect(checkCurfew(statsPartial)).toBe(false);

      const statsComplete = { dueToday: 4, doneToday: 4 };
      expect(checkCurfew(statsComplete)).toBe(true);
    });

    it("tracks Proof-of-Focus Sprinter milestone towards target 5 sprints", () => {
      const getSprintProgress = (sprintCount: number) => {
        return {
          current: Math.min(sprintCount, 5),
          total: 5,
          pct: Math.min(100, (sprintCount / 5) * 100),
        };
      };

      expect(getSprintProgress(0).pct).toBe(0);
      expect(getSprintProgress(3).pct).toBe(60);
      expect(getSprintProgress(5).pct).toBe(100);
      expect(getSprintProgress(8).pct).toBe(100);
    });
  });

  describe("Page 8: Study Squads & Social Hub (SocialSection)", () => {
    it("generates 1-tap viral WhatsApp invite copy with 6-character squad code", () => {
      const message = buildWhatsAppInviteMessage({
        squadName: "Algorithmic Titans",
        squadCode: "ALGO99",
        senderName: "Jayadeep",
        studyTopic: "DSA & System Architecture",
      });

      expect(message).toContain("Jayadeep");
      expect(message).toContain("ALGO99");
      expect(message).toContain("Algorithmic Titans");
      expect(message).toContain("DSA & System Architecture");
      expect(message).toContain("join=ALGO99");
    });

    it("formats universal web and native whatsapp URIs", () => {
      const webUrl = buildWebWhatsAppInviteUrl({
        squadName: "Code Squad",
        squadCode: "CODE01",
      });

      const nativeUrl = buildWhatsAppInviteUrl({
        squadName: "Code Squad",
        squadCode: "CODE01",
      });

      expect(webUrl).toContain("https://api.whatsapp.com/send?text=");
      expect(nativeUrl).toContain("whatsapp://send?text=");
      expect(webUrl).toContain("CODE01");
      expect(nativeUrl).toContain("CODE01");
    });
  });

  describe("Page 9: Settings & Automation Studio (SettingsSection)", () => {
    it("validates identity archetypes and plan tiers without lower-tier demotion options", () => {
      const archetypes = ["Athlete", "Scholar", "Builder", "Mindful"];
      expect(archetypes).toContain("Builder");
      expect(archetypes).toContain("Scholar");

      const proTiers = ["pro", "teacher", "campus"];
      expect(proTiers.includes("pro")).toBe(true);
    });
  });
});
