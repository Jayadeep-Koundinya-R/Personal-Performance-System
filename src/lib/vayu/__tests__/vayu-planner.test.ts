import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCircadianPlan,
  generateVayuPlan,
  rebalanceSchedule,
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

describe("🌬️ Vayu Autonomous Planner & Circadian Rhythm Engine", () => {
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

  it("Task 2.1: constructs an Ultradian 45/15 schedule across circadian energy windows with correct energy levels", () => {
    const habits = [
      { id: "h_code", name: "DSA Algorithms Practice", category: "Productivity", priority: "High", completed: false },
      { id: "h_doc", name: "System Design Review", category: "Learning", priority: "Medium", completed: false },
      { id: "h_fit", name: "Calisthenics & Strength", category: "Fitness", priority: "Medium", completed: false },
    ];

    const plan = generateCircadianPlan({
      userId: "user_circadian_1",
      habits,
      activeTrack: "placements",
      startTimeMinutes: 480, // 08:00 AM
    });

    // Check block sequence
    expect(plan.blocks.length).toBeGreaterThan(5);

    // Morning Prime: Peak Energy Focus (45m) followed by Recharge (15m)
    const firstBlock = plan.blocks[0];
    expect(firstBlock.startTime).toBe("08:00");
    expect(firstBlock.endTime).toBe("08:45");
    expect(firstBlock.durationMinutes).toBe(45);
    expect(firstBlock.energyLevel).toBe("peak");
    expect(firstBlock.habitId).toBe("h_code");

    const rechargeBlock = plan.blocks[1];
    expect(rechargeBlock.startTime).toBe("08:45");
    expect(rechargeBlock.endTime).toBe("09:00");
    expect(rechargeBlock.durationMinutes).toBe(15);
    expect(rechargeBlock.energyLevel).toBe("recharge");
    expect(rechargeBlock.category).toBe("Rest");

    // Verify Agni Curfew block exists at 21:30 - 22:00
    const curfewBlock = plan.blocks.find((b) => b.title.includes("Agni Curfew"));
    expect(curfewBlock).toBeDefined();
    expect(curfewBlock?.startTime).toBe("21:30");
    expect(curfewBlock?.endTime).toBe("22:00");
    expect(curfewBlock?.energyLevel).toBe("recharge");
  });

  it("Task 2.2: Pure rebalanceSchedule shifts pending blocks forward starting at currentTimeStr while preserving completed blocks", () => {
    const habits = [
      { id: "h1", name: "Morning DSA Focus", category: "Productivity", completed: false },
      { id: "h2", name: "Afternoon Drills", category: "Learning", completed: false },
    ];

    const initialPlan = generateCircadianPlan({
      userId: "user_test",
      habits,
      startTimeMinutes: 480, // 08:00 AM
    });

    // Mark the first block as completed
    initialPlan.blocks[0].status = "completed";
    initialPlan.blocks[0].completionPercentage = 100;
    initialPlan.blocks[0].startTime = "08:00";
    initialPlan.blocks[0].endTime = "08:45";

    // Simulate clock is now 11:30 AM ("11:30")
    const rebalanced = rebalanceSchedule(initialPlan, "11:30", "22:00");

    // First block MUST remain untouched
    expect(rebalanced.blocks[0].status).toBe("completed");
    expect(rebalanced.blocks[0].startTime).toBe("08:00");
    expect(rebalanced.blocks[0].endTime).toBe("08:45");

    // Next pending block must start at or after 11:30 AM
    const firstPending = rebalanced.blocks.find((b) => b.status !== "completed");
    expect(firstPending).toBeDefined();
    expect(timeToMinutes(firstPending!.startTime)).toBeGreaterThanOrEqual(timeToMinutes("11:30"));

    // Verify Agni Curfew (22:00) is NEVER breached
    for (const b of rebalanced.blocks) {
      expect(timeToMinutes(b.endTime)).toBeLessThanOrEqual(timeToMinutes("22:00"));
    }

    // Peaceful explanation
    expect(rebalanced.rebalanceExplanation).toContain("zero guilt");
    expect(rebalanced.minutesPushedForward).toBeGreaterThan(0);
    expect(rebalanced.needsRebalance).toBe(false);
  });

  it("rebalances schedule fluidly when the user falls behind using rebalanceVayuSchedule", () => {
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

  it("Task 2.3: parses natural language sprint launch commands client-side in 0ms", async () => {
    const plan = generateVayuPlan({
      userId: "user_vayu_123",
      habits: [{ id: "h_code", name: "LeetCode Hard", completed: false }],
      startTimeMinutes: 540,
    });

    const result = await parseVayuNaturalInput("Start 45m sprint on algorithms", plan);
    expect(result.action).toBe("start_sprint");
    expect(result.suggestedDurationMinutes).toBe(45);
    expect(result.feedback).toContain("focus sprint");
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
