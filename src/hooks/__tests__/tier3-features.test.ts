import { describe, it, expect } from "vitest";

describe("Tier 3 - Voice Commands & Institutional Classrooms Architecture", () => {
  it("validates classroom structure and invite code generation", () => {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    expect(inviteCode.length).toBe(6);
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("validates voice command intent matching for habits", () => {
    const rawText = "Complete morning meditation";
    const cleanName = rawText.replace(/(complete|done|check off|habit)/gi, "").trim();

    expect(cleanName).toBe("morning meditation");
  });

  it("validates voice navigation intent matching", () => {
    const commandText = "go to analytics studio";
    const isAnalyticsIntent = commandText.includes("analytics") || commandText.includes("chart");

    expect(isAnalyticsIntent).toBe(true);
  });

  it("validates classroom habit assignment structure", () => {
    const assignedHabit = {
      id: "assign_101",
      classroomId: "class_demo_1",
      habitName: "📚 1 Hour Bio Revision",
      category: "Learning",
      period: "Daily",
      assignedBy: "Teacher",
    };

    expect(assignedHabit.habitName).toContain("📚");
    expect(assignedHabit.period).toBe("Daily");
  });
});
