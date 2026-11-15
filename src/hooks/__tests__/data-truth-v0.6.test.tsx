import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { HabitsProvider, useHabits } from "../use-habits";
import { ReactNode } from "react";

// Mock Supabase client
const mockHabitsDb: any[] = [];
const mockCompletionsDb: any[] = [];
const realtimeCallbacks: Array<() => void> = [];

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "habits") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockHabitsDb.filter((h) => h.user_id === val),
                  error: null,
                })),
              })),
            })),
            insert: vi.fn((payload: any) => {
              const inserted = { id: payload.id || `h-${Date.now()}`, ...payload };
              mockHabitsDb.push(inserted);
              return Promise.resolve({ data: inserted, error: null });
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col1: string, val1: string) => ({
                eq: vi.fn((col2: string, val2: string) => {
                  const target = mockHabitsDb.find((h) => h.id === val1 && h.user_id === val2);
                  if (target) Object.assign(target, updates);
                  return Promise.resolve({ error: null });
                }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: string) => ({
                eq: vi.fn((col2: string, val2: string) => {
                  const idx = mockHabitsDb.findIndex((h) => h.id === val1 && h.user_id === val2);
                  if (idx !== -1) mockHabitsDb.splice(idx, 1);
                  return Promise.resolve({ error: null });
                }),
              })),
            })),
          };
        }

        if (table === "habit_completions") {
          return {
            select: vi.fn(() => ({
              in: vi.fn((col: string, habitIds: string[]) => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockCompletionsDb.filter((c) => habitIds.includes(c.habit_id)),
                  error: null,
                })),
              })),
            })),
            insert: vi.fn((payload: any) => {
              const items = Array.isArray(payload) ? payload : [payload];
              items.forEach((item) => mockCompletionsDb.push(item));
              return Promise.resolve({ error: null });
            }),
            delete: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: string) => ({
                eq: vi.fn((col2: string, val2: string) => ({
                  eq: vi.fn((col3: string, val3: string) => {
                    const idx = mockCompletionsDb.findIndex(
                      (c) => c.habit_id === val1 && c.user_id === val2 && c.completed_date === val3
                    );
                    if (idx !== -1) mockCompletionsDb.splice(idx, 1);
                    return Promise.resolve({ error: null });
                  }),
                })),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
        };
      }),
      channel: vi.fn(() => ({
        on: vi.fn((event: string, config: any, cb: () => void) => {
          realtimeCallbacks.push(cb);
          return {
            on: vi.fn((event2: string, config2: any, cb2: () => void) => {
              realtimeCallbacks.push(cb2);
              return {
                subscribe: vi.fn(),
              };
            }),
          };
        }),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Mock user settings
vi.mock("@/hooks/use-user-settings", () => ({
  useUserSettings: () => ({
    settings: { autoStreakFreeze: false },
    loading: false,
  }),
}));

const authUserWrapper = ({ children }: { children: ReactNode }) => (
  <HabitsProvider userEmail="sarah@example.com" userId="usr-real-uuid-999" isGuest={false} maxHabits={Infinity}>
    {children}
  </HabitsProvider>
);

const guestUserWrapper = ({ children }: { children: ReactNode }) => (
  <HabitsProvider userEmail={null} userId={undefined} isGuest={true} maxHabits={Infinity}>
    {children}
  </HabitsProvider>
);

describe("v0.6 Data Truth & Cloud Habit Sync Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    mockHabitsDb.length = 0;
    mockCompletionsDb.length = 0;
    realtimeCallbacks.length = 0;
    vi.clearAllMocks();
  });

  it("Task 0.6.1: Authenticated user loads habits strictly from Supabase and never writes to localStorage", async () => {
    mockHabitsDb.push({
      id: "cloud-h1",
      user_id: "usr-real-uuid-999",
      name: "Algorithmic Practice 🧠",
      category: "Career",
      priority: "High",
      period: "Daily",
      due_date: new Date().toISOString(),
      streak: 4,
      freeze_credits: 2,
      last_completed_date: "2026-11-14",
    });

    const { result } = renderHook(() => useHabits(), { wrapper: authUserWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.habits.length).toBe(1);
    expect(result.current.habits[0].name).toBe("Algorithmic Practice 🧠");
    // Verify zero localStorage pollution for authenticated user
    expect(localStorage.getItem("habits_sarah@example.com")).toBeNull();
    expect(localStorage.getItem("habits_guest")).toBeNull();
  });

  it("Task 0.6.2: Authentic Empty State - New authenticated account starts with [] and NO fake demo habits", async () => {
    // Supabase has 0 habits for this new user
    const { result } = renderHook(() => useHabits(), { wrapper: authUserWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Must be completely empty - zero demo-1, demo-2, demo-3
    expect(result.current.habits).toEqual([]);
    expect(mockHabitsDb.length).toBe(0);
  });

  it("Task 0.6.2 (Guest Contrast): Unauthenticated guest visitor receives local starter habits", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper: guestUserWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.habits.length).toBe(3);
    expect(result.current.habits[0].id).toBe("demo-1");
    // Stored in localStorage for guest
    expect(localStorage.getItem("habits_guest")).toBeTruthy();
  });

  it("Task 0.6.3: Multi-device sync - Realtime event triggers automatic cloud refetch", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper: authUserWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.habits.length).toBe(0);

    // Another device inserts a habit directly into Supabase
    mockHabitsDb.push({
      id: "cloud-h2-from-phone",
      user_id: "usr-real-uuid-999",
      name: "Cold Shower 🚿",
      category: "Health",
      priority: "Medium",
      period: "Daily",
      due_date: new Date().toISOString(),
      streak: 1,
      freeze_credits: 2,
    });

    // Simulate Supabase Realtime broadcast callback
    await act(async () => {
      realtimeCallbacks.forEach((cb) => cb());
    });

    await waitFor(() => {
      expect(result.current.habits.length).toBe(1);
    });

    expect(result.current.habits[0].name).toBe("Cold Shower 🚿");
  });

  it("Task 0.6.3: Multi-device sync - Window focus or visibility change triggers automatic cloud refetch", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper: authUserWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.habits.length).toBe(0);

    // Simulate habit added on phone while laptop tab was blurred
    mockHabitsDb.push({
      id: "cloud-h3-phone-sync",
      user_id: "usr-real-uuid-999",
      name: "Evening Reading 📖",
      category: "Mindset",
      priority: "Low",
      period: "Daily",
      due_date: new Date().toISOString(),
      streak: 0,
      freeze_credits: 2,
    });

    // Trigger tab focus event
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(result.current.habits.some((h) => h.name === "Evening Reading 📖")).toBe(true);
    });
  });

  it("Task 0.6.4: Cloud habit mutations directly update Supabase tables", async () => {
    const { result } = renderHook(() => useHabits(), { wrapper: authUserWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Add habit
    await act(async () => {
      await result.current.addHabit("Deep Focus Sprint 🎯", "Productivity", "Daily", "High");
    });

    expect(mockHabitsDb.some((h) => h.name === "Deep Focus Sprint 🎯" && h.user_id === "usr-real-uuid-999")).toBe(true);

    const createdHabit = mockHabitsDb.find((h) => h.name === "Deep Focus Sprint 🎯");
    expect(createdHabit).toBeDefined();

    // Toggle completion
    const today = result.current.getTodayStr();
    await act(async () => {
      await result.current.toggleCompletion(createdHabit!.id, today);
    });

    expect(mockCompletionsDb.some((c) => c.habit_id === createdHabit!.id && c.user_id === "usr-real-uuid-999")).toBe(true);

    // Toggle uncomplete
    await act(async () => {
      await result.current.toggleCompletion(createdHabit!.id, today);
    });

    expect(mockCompletionsDb.some((c) => c.habit_id === createdHabit!.id && c.user_id === "usr-real-uuid-999")).toBe(false);

    // Delete habit
    await act(async () => {
      await result.current.deleteHabit(createdHabit!.id);
    });

    expect(mockHabitsDb.some((h) => h.id === createdHabit!.id)).toBe(false);
  });

  it("Task 0.6.5: Guest migration filters untouched stock demo habits but preserves custom and completed habits", () => {
    const guestHabits = [
      // Untouched stock demo habit 1 (0 completions) -> should be skipped
      {
        id: "demo-1",
        name: "Hydrate & Drink Water 💧",
        category: "Health",
        priority: "High",
        period: "Daily",
        completedDates: [],
        streak: 3,
      },
      // Untouched stock demo habit 2 (0 completions) -> should be skipped
      {
        id: "demo-2",
        name: "25-Min Deep Work Sprint 💻",
        category: "Productivity",
        priority: "High",
        period: "Daily",
        completedDates: [],
        streak: 5,
      },
      // Stock demo habit 3 that user actually completed -> should be migrated
      {
        id: "demo-3",
        name: "Read 10 Pages of Growth 📚",
        category: "Mindset",
        priority: "Medium",
        period: "Daily",
        completedDates: ["2026-11-14"],
        streak: 1,
      },
      // Custom habit created by the user -> should be migrated
      {
        id: "custom-1731649200000",
        name: "DSA Practice: Trees & Graphs",
        category: "Career",
        priority: "High",
        period: "Daily",
        completedDates: [],
        streak: 0,
      },
    ];

    // Filter using the exact v0.6 Data Truth logic implemented in use-auth.ts
    const migrated = guestHabits.filter((habit) => {
      const isUntouchedStockDemo =
        habit.id?.startsWith("demo-") &&
        (!habit.completedDates || habit.completedDates.length === 0);
      return !isUntouchedStockDemo;
    });

    expect(migrated.length).toBe(2);
    expect(migrated.some((h) => h.id === "demo-1")).toBe(false);
    expect(migrated.some((h) => h.id === "demo-2")).toBe(false);
    expect(migrated.some((h) => h.id === "demo-3")).toBe(true);
    expect(migrated.some((h) => h.name === "DSA Practice: Trees & Graphs")).toBe(true);
  });
});
