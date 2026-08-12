import { describe, it, expect } from "vitest";
import { parseAndValidateBackup } from "../../lib/dataExport";

describe("Data Backup Restoration & Parsing Rules", () => {
  it("rejects empty or non-string inputs", () => {
    const res = parseAndValidateBackup("");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Empty or invalid backup data");
  });

  it("rejects malformed JSON strings", () => {
    const res = parseAndValidateBackup("{ invalid json content ");
    expect(res.success).toBe(false);
    expect(res.error).toContain("JSON Parse Error");
  });

  it("rejects JSON backups missing both habits and reflections", () => {
    const emptyJson = JSON.stringify({ habits: [], reflections: [] });
    const res = parseAndValidateBackup(emptyJson);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Backup file contains no habits or reflections data");
  });

  it("successfully parses and validates valid backup JSON data", () => {
    const validJson = JSON.stringify({
      habits: [
        {
          id: "habit_1",
          name: "Morning Workout",
          category: "Health",
          priority: "High",
          period: "Daily",
          completedDates: ["2026-08-10", "2026-08-11"],
          streak: 2,
        },
      ],
      reflections: [
        {
          id: "ref_1",
          date: "2026-08-11",
          text: "Felt super energized today!",
          mood: "great",
        },
      ],
      exportDate: "2026-08-12T12:00:00.000Z",
      version: "1.0.0",
    });

    const res = parseAndValidateBackup(validJson);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.habits.length).toBe(1);
    expect(res.data?.habits[0].name).toBe("Morning Workout");
    expect(res.data?.reflections.length).toBe(1);
    expect(res.data?.reflections[0].mood).toBe("great");
  });
});
