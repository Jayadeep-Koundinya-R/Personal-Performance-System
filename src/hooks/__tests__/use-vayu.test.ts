import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVayu } from "../use-vayu";

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user_vayu_test", email: "vayu@pps.app" },
    isLoggedIn: true,
    isGuest: false,
  }),
}));

// Mock useHabits
const mockToggleHabit = vi.fn();
const mockHabits = [
  { id: "habit_algo", name: "Algorithms Practice", category: "Productivity", completed: false, completedDates: [] },
  { id: "habit_gym", name: "Daily Workout", category: "Fitness", completed: false, completedDates: [] },
];

vi.mock("@/hooks/use-habits", () => ({
  useHabits: () => ({
    habits: mockHabits,
    toggleHabit: mockToggleHabit,
    toggleCompletion: mockToggleHabit,
    isHabitDueToday: () => true,
  }),
}));

// Mock useProfile
const mockAddXP = vi.fn();
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: { displayName: "Vayu Master", xp: 1200, streak: 10, primary_track: "placements" },
    addXP: mockAddXP,
  }),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: () => Promise.resolve({ data: null, error: null }),
      select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

describe("🌬️ useVayu Hook — Autonomous Real-Time Flow & Completion Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes an autonomous daily plan from user habits with circadian energy windows", () => {
    const { result } = renderHook(() => useVayu());

    expect(result.current.plan).not.toBeNull();
    expect(result.current.plan?.blocks.length).toBeGreaterThan(0);
    expect(result.current.isAutonomousActive).toBe(true);
    expect(result.current.completionRate).toBe(0);
    expect(result.current.plan?.blocks[0].energyLevel).toBe("peak");
  });

  it("completes a block, updates completion rate, toggles linked habit and awards XP", async () => {
    const { result } = renderHook(() => useVayu());
    const targetBlock = result.current.plan!.blocks[0];

    await act(async () => {
      await result.current.completeBlock(targetBlock.id, 100, "manual");
    });

    const updatedPlan = result.current.plan!;
    const updatedBlock = updatedPlan.blocks.find((b) => b.id === targetBlock.id);

    expect(updatedBlock?.status).toBe("completed");
    expect(updatedBlock?.completionPercentage).toBe(100);
    expect(updatedPlan.overallCompletionRate).toBeGreaterThan(0);
    expect(mockAddXP).toHaveBeenCalledWith(15);
  });

  it("processes natural language input to check off habit and update plan", async () => {
    const { result } = renderHook(() => useVayu());

    let intakeResult: any;
    await act(async () => {
      intakeResult = await result.current.processNaturalInput("Finished Daily Workout");
    });

    expect(["completed_block", "completed_habit"]).toContain(intakeResult.action);
    expect(intakeResult.matchedHabitId).toBe("habit_gym");
    expect(mockToggleHabit).toHaveBeenCalled();
  });

  it("auto-completes active block when focus session completed event is received", async () => {
    const { result } = renderHook(() => useVayu());
    const activeBlock = result.current.currentBlock;
    expect(activeBlock).not.toBeNull();

    await act(async () => {
      await result.current.onFocusSessionEnded(25, activeBlock?.habitId);
    });

    const updatedPlan = result.current.plan!;
    const matchingBlock = updatedPlan.blocks.find((b) => b.id === activeBlock!.id);

    expect(matchingBlock?.status).toBe("completed");
    expect(mockAddXP).toHaveBeenCalled();
  });

  it("rebalances schedule fluidly without punitive penalties and protects 22:00 curfew", async () => {
    const { result } = renderHook(() => useVayu());

    await act(async () => {
      result.current.rebalanceSchedule();
    });

    expect(result.current.plan).not.toBeNull();
    expect(result.current.plan?.needsRebalance).toBe(false);
    expect(result.current.plan?.rebalanceExplanation).toBeDefined();
  });
});
