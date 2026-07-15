import { describe, it, expect } from "vitest";

interface MockHabit {
  endTime: string | null;
  completedDates: string[];
}

function getUrgencyLevel(habit: MockHabit, mockTime: Date): "normal" | "urgent" | "overdue" {
  if (!habit.endTime || habit.completedDates.includes(mockTime.toISOString().split("T")[0])) {
    return "normal";
  }

  const [endH, endM] = habit.endTime.split(":").map(Number);
  const end = new Date(mockTime);
  end.setHours(endH, endM, 0, 0);

  const diffMs = end.getTime() - mockTime.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 60 * 60 * 1000) return "urgent"; // 1 hour
  return "normal";
}

describe("Dynamic Urgency Calculations", () => {
  it("should return normal if habit has no end time", () => {
    const habit: MockHabit = { endTime: null, completedDates: [] };
    const mockTime = new Date("2026-07-15T12:00:00");
    expect(getUrgencyLevel(habit, mockTime)).toBe("normal");
  });

  it("should return normal if habit is already completed today", () => {
    const habit: MockHabit = { endTime: "11:00", completedDates: ["2026-07-15"] };
    const mockTime = new Date("2026-07-15T12:00:00"); // past end time, but done
    expect(getUrgencyLevel(habit, mockTime)).toBe("normal");
  });

  it("should return normal if end time is far in the future", () => {
    const habit: MockHabit = { endTime: "15:00", completedDates: [] };
    const mockTime = new Date("2026-07-15T12:00:00"); // 3 hours away
    expect(getUrgencyLevel(habit, mockTime)).toBe("normal");
  });

  it("should return urgent if end time is less than 1 hour away", () => {
    const habit: MockHabit = { endTime: "12:45", completedDates: [] };
    const mockTime = new Date("2026-07-15T12:00:00"); // 45 mins away
    expect(getUrgencyLevel(habit, mockTime)).toBe("urgent");
  });

  it("should return overdue if end time is in the past", () => {
    const habit: MockHabit = { endTime: "11:30", completedDates: [] };
    const mockTime = new Date("2026-07-15T12:00:00"); // 30 mins past end time
    expect(getUrgencyLevel(habit, mockTime)).toBe("overdue");
  });
});
