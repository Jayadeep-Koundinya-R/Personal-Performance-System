import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { HabitsProvider, useHabits } from "../use-habits";
import { ReactNode } from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    channel: () => ({
      on: () => ({ on: () => ({ subscribe: () => {} }) }),
    }),
    removeChannel: () => {},
  },
}));

// Mock user settings
vi.mock("@/hooks/use-user-settings", () => ({
  useUserSettings: () => ({
    settings: { autoStreakFreeze: false },
    loading: false,
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <HabitsProvider userEmail={null} userId={undefined} maxHabits={Infinity}>
    {children}
  </HabitsProvider>
);

describe("useHabits Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("injects default starter habits ONLY when saved habits key is null (first-time visitor)", () => {
    const { result } = renderHook(() => useHabits(), { wrapper });

    expect(result.current.habits.length).toBe(3);
    expect(result.current.habits[0].name).toContain("Hydrate");
    expect(result.current.habits[1].name).toContain("Deep Work");
  });

  it("does NOT inject starter habits for an existing guest who deleted all habits (saved is '[]')", () => {
    localStorage.setItem("habits_guest", "[]");

    const { result } = renderHook(() => useHabits(), { wrapper });

    expect(result.current.habits.length).toBe(0);
  });

  it("adds a new habit in guest mode and persists it to localStorage", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper });

    await act(async () => {
      await result.current.addHabit("Morning Exercise", "Health", "Daily", "High");
    });

    expect(result.current.habits.some((h) => h.name === "Morning Exercise")).toBe(true);
    const stored = JSON.parse(localStorage.getItem("habits_guest") || "[]");
    expect(stored.some((h: any) => h.name === "Morning Exercise")).toBe(true);
  });

  it("edits an existing habit", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper });
    const habitId = result.current.habits[0].id;

    await act(async () => {
      await result.current.updateHabit(habitId, { name: "Hydrate Super 💧" });
    });

    expect(result.current.habits.find((h) => h.id === habitId)?.name).toBe("Hydrate Super 💧");
  });

  it("deletes a habit", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper });
    const initialCount = result.current.habits.length;
    const targetId = result.current.habits[0].id;

    await act(async () => {
      await result.current.deleteHabit(targetId);
    });

    expect(result.current.habits.length).toBe(initialCount - 1);
    expect(result.current.habits.some((h) => h.id === targetId)).toBe(false);
  });

  it("prevents duplicate habit completions on the same date", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper });
    const targetId = result.current.habits[0].id;
    const today = result.current.getTodayStr();

    await act(async () => {
      await result.current.toggleCompletion(targetId, today);
    });

    const habitAfterFirst = result.current.habits.find((h) => h.id === targetId);
    expect(habitAfterFirst?.completedDates.filter((d) => d === today).length).toBe(1);

    // Toggling again on completed date uncompletes it
    await act(async () => {
      await result.current.toggleCompletion(targetId, today);
    });

    const habitAfterSecond = result.current.habits.find((h) => h.id === targetId);
    expect(habitAfterSecond?.completedDates.includes(today)).toBe(false);
  });

  it("calculates total XP and level rank accurately", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper });
    const initialXP = result.current.calculateTotalXP();

    await act(async () => {
      await result.current.toggleCompletion(result.current.habits[0].id);
    });

    expect(result.current.calculateTotalXP()).toBe(initialXP + 10);
  });
});
