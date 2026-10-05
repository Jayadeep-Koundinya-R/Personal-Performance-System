import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateVayuPlan,
  rebalanceVayuSchedule,
  parseVayuNaturalInput,
  timeToMinutes,
  minutesToTime,
  formatDisplayTime,
} from "../vayuPlanner";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("🌬️ Vayu Autonomous Planner & Input Audit Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts between minutes and HH:MM formats accurately", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(formatDisplayTime("09:30")).toBe("9:30 AM");
    expect(formatDisplayTime("14:45")).toBe("2:45 PM");
    expect(formatDisplayTime("00:15")).toBe("12:15 AM");
  });

  it("generates a structured daily flow with DOMPurify sanitization on directives", () => {
    const habits = [
      { id: "h1", name: "Deep Work Sprint", category: "Productivity", completed: false },
      { id: "h2", name: "Strength Training", category: "Fitness", completed: false },
    ];

    const plan = generateVayuPlan({
      userId: "user_vayu_123",
      habits,
      userDirective: 'Focus on machine learning <script>alert("hacked")</script>',
      startTimeMinutes: 540, // 09:00 AM
    });

    expect(plan.blocks.length).toBeGreaterThanOrEqual(3);
    expect(plan.blocks[0].startTime).toBe("09:00");
    expect(plan.blocks[0].durationMinutes).toBe(45);
    expect(plan.blocks[0].habitId).toBe("h1");
    expect(plan.totalTargetMinutes).toBeGreaterThan(60);
    expect(plan.aiStrategySummary).toContain("machine learning");
    expect(plan.aiStrategySummary).not.toContain("<script>");
  });

  it("rebalances schedule fluidly when the user falls behind", () => {
    const habits = [
      { id: "h1", name: "Algorithms Practice", category: "Productivity", completed: false },
    ];

    const plan = generateVayuPlan({
      userId: "user_vayu_123",
      habits,
      startTimeMinutes: 540, // 09:00 AM (09:00 - 09:45)
    });

    // Simulate clock advancing to 11:00 AM (660 mins)
    const rebalanced = rebalanceVayuSchedule(plan, 660);

    const firstBlockStart = timeToMinutes(rebalanced.blocks[0].startTime);
    expect(firstBlockStart).toBeGreaterThanOrEqual(660);
    expect(rebalanced.blocks[0].status).toBe("delayed");
  });

  it("parses natural language input using Phase 1 intent classifier and token matching", async () => {
    const plan = generateVayuPlan({
      userId: "user_vayu_123",
      habits: [{ id: "h_code", name: "LeetCode Hard", completed: false }],
      startTimeMinutes: 540,
    });

    // Test exact block completion
    const result1 = await parseVayuNaturalInput("Done with LeetCode Hard", plan);
    expect(result1.action).toBe("completed_block");
    expect(result1.completionPercentage).toBe(100);
    expect(result1.xpAwarded).toBe(15);

    // Test partial percentage completion
    const result2 = await parseVayuNaturalInput("Completed 50% of LeetCode Hard", plan);
    expect(result2.completionPercentage).toBe(50);
  });

  it("handles schedule rebalancing intent from Phase 1 classifier without regex", async () => {
    const plan = generateVayuPlan({ userId: "u1", habits: [] });
    const result = await parseVayuNaturalInput("What is my schedule for today?", plan);
    expect(result.action).toBe("schedule_rebalanced");
  });

  it("falls back to Gemini edge function when confidence is low or intent is unknown", async () => {
    const plan = generateVayuPlan({ userId: "u1", habits: [{ id: "h1", name: "Yoga" }] });
    
    // Mock low-confidence Gemini edge function response
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        text: "I noticed you completed your Yoga practice. Great job!",
        fallback: false,
      },
      error: null,
    });

    // Ambiguous user phrase with low local confidence
    const result = await parseVayuNaturalInput("kudos session wraps", plan, [{ id: "h1", name: "Yoga" }]);

    expect(supabase.functions.invoke).toHaveBeenCalledWith("ai-coach-chat", expect.any(Object));
    expect(["completed_block", "completed_habit"]).toContain(result.action);
    expect(result.matchedHabitId).toBe("h1");
  });

  it("strictly sanitizes input using DOMPurify to neutralize script injection", async () => {
    const plan = generateVayuPlan({ userId: "u1", habits: [] });
    const dirtyInput = '<script>alert(1)</script><img src=x onerror=alert(2)>Hello';

    const result = await parseVayuNaturalInput(dirtyInput, plan);

    expect(result.feedback).not.toContain("<script");
    expect(result.feedback).not.toContain("onerror");
  });
});
