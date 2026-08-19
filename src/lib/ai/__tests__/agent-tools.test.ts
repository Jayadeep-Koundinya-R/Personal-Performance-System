import { describe, it, expect } from "vitest";
import {
  normalizeTimeString,
  inferCategory,
  parseCreateHabitTool,
  parseFreezeStreakTool,
  parseScheduleReminderTool,
  parseFocusTimerTool,
  detectAgentAction,
} from "../agentTools";
import { auditHabitPerformance } from "../proactiveAuditor";

describe("Phase 3 AI Agent Tool Engine", () => {
  const mockHabits = [
    { id: "h1", name: "Daily Meditation", category: "Mindset", streak: 14, freezeCredits: 2, completedDates: ["2026-08-17", "2026-08-16"] },
    { id: "h2", name: "Morning Workout", category: "Fitness", streak: 5, freezeCredits: 1, completedDates: ["2026-08-17"] },
    { id: "h3", name: "Read 30 Pages", category: "Learning", streak: 0, freezeCredits: 2, completedDates: [] },
  ];

  describe("Time Normalization & Categorization", () => {
    it("converts 12-hour AM/PM times to 24-hour format", () => {
      expect(normalizeTimeString("7:30 AM").time24).toBe("07:30:00");
      expect(normalizeTimeString("7:30 AM").displayTime).toBe("7:30 AM");
      expect(normalizeTimeString("9 PM").time24).toBe("21:00:00");
      expect(normalizeTimeString("9 PM").displayTime).toBe("9:00 PM");
      expect(normalizeTimeString("12:00 PM").time24).toBe("12:00:00");
    });

    it("infers category based on keywords", () => {
      expect(inferCategory("Evening Yoga")).toBe("Fitness");
      expect(inferCategory("Drink 3L Water")).toBe("Health");
      expect(inferCategory("Learn Spanish on Duolingo")).toBe("Learning");
      expect(inferCategory("Daily Journaling")).toBe("Mindset");
      expect(inferCategory("Clear Email Inbox")).toBe("Productivity");
      expect(inferCategory("Check Mailbox")).toBe("General");
    });
  });

  describe("Autonomous Tool Parsing", () => {
    it("parses CREATE_HABIT tool from natural language", () => {
      const tool = parseCreateHabitTool("Add a daily habit to practice Guitar at 8 PM");
      expect(tool).not.toBeNull();
      expect(tool?.actionType).toBe("CREATE_HABIT");
      expect(tool?.parameters.name).toContain("Practice Guitar");
      expect(tool?.parameters.period).toBe("Daily");
      expect(tool?.parameters.suggestedTime).toBe("8:00 PM");
    });

    it("parses FREEZE_STREAK tool and links to habit", () => {
      const tool = parseFreezeStreakTool("I'm feeling sick today, please freeze my Daily Meditation streak", mockHabits);
      expect(tool).not.toBeNull();
      expect(tool?.actionType).toBe("FREEZE_STREAK");
      expect(tool?.parameters.habitName).toBe("Daily Meditation");
      expect(tool?.parameters.habitId).toBe("h1");
      expect(tool?.parameters.freezeCreditsRemaining).toBe(2);
    });

    it("parses SCHEDULE_REMINDER tool with alarm delivery type", () => {
      const tool = parseScheduleReminderTool("Set an alarm for Morning Workout at 6:30 AM", mockHabits);
      expect(tool).not.toBeNull();
      expect(tool?.actionType).toBe("SCHEDULE_REMINDER");
      expect(tool?.parameters.time).toBe("06:30:00");
      expect(tool?.parameters.displayTime).toBe("6:30 AM");
      expect(tool?.parameters.deliveryType).toBe("alarm");
      expect(tool?.parameters.habitName).toBe("Morning Workout");
    });

    it("parses START_FOCUS_TIMER tool with minutes duration", () => {
      const tool = parseFocusTimerTool("Start a 45 min focus timer for Read 30 Pages", mockHabits);
      expect(tool).not.toBeNull();
      expect(tool?.actionType).toBe("START_FOCUS_TIMER");
      expect(tool?.parameters.durationMinutes).toBe(45);
      expect(tool?.parameters.habitName).toBe("Read 30 Pages");
    });

    it("detects master agent actions from conversational messages", () => {
      const action = detectAgentAction("Launch a 25m pomodoro session", mockHabits);
      expect(action).not.toBeNull();
      expect(action?.actionType).toBe("START_FOCUS_TIMER");
      expect(action?.parameters.durationMinutes).toBe(25);
    });
  });

  describe("Proactive Habit Health Auditor", () => {
    it("identifies struggling habits with 0 completions", () => {
      const recommendations = auditHabitPerformance(mockHabits, [], []);
      const struggling = recommendations.find((r) => r.type === "struggling_habit");
      expect(struggling).toBeDefined();
      expect(struggling?.habitName).toBe("Read 30 Pages");
      expect(struggling?.recommendation).toContain("micro-habit");
    });

    it("recommends missing reminders for habits without scheduled cues", () => {
      const recommendations = auditHabitPerformance(mockHabits, [], []);
      const reminderRec = recommendations.find((r) => r.type === "missing_reminder");
      expect(reminderRec).toBeDefined();
      expect(reminderRec?.recommendation).toContain("time cue");
    });

    it("detects milestone streaks on multiples of 7", () => {
      const recommendations = auditHabitPerformance(mockHabits, [], []);
      const milestone = recommendations.find((r) => r.type === "milestone");
      expect(milestone).toBeDefined();
      expect(milestone?.habitName).toBe("Daily Meditation");
      expect(milestone?.title).toContain("14-Day Streak");
    });
  });
});
