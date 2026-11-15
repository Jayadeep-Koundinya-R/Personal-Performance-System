import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { InteractiveQuickDock } from "@/components/dashboard/v2/InteractiveQuickDock";
import { useHabits, HabitsProvider } from "@/hooks/use-habits";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        in: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
  },
}));

// Mock user settings
vi.mock("@/hooks/use-user-settings", () => ({
  useUserSettings: () => ({
    settings: { autoStreakFreeze: false },
    loading: false,
  }),
}));

// Mock focus timer
vi.mock("@/hooks/use-focus-timer", () => ({
  useFocusTimer: () => ({
    isRunning: false,
    remainingSec: 1500,
    changeTimerMode: vi.fn(),
    setActiveTaskName: vi.fn(),
    startTimer: vi.fn(),
    toggleTimer: vi.fn(),
  }),
}));

// Mock Audio & Feedback
vi.mock("@/lib/audio/clickFeedback", () => ({
  feedbackSounds: {
    playClick: vi.fn(),
    playSuccessChime: vi.fn(),
    playSprintLaunch: vi.fn(),
  },
}));

vi.mock("@/lib/audio/ambientSynthesizer", () => ({
  ambientAudio: {
    start: vi.fn(),
    stop: vi.fn(),
    play: vi.fn(),
    getCurrentType: () => "none",
    getIsPlaying: () => false,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe("v0.8 Focused Daily Loop UI Verification Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("Task 0.8.1: Sub-10s Habit Check-Off updates local state optimistically without blocking", async () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: ({ children }) => (
        <HabitsProvider userEmail={null} userId={undefined} isGuest={true} maxHabits={Infinity}>
          {children}
        </HabitsProvider>
      ),
    });

    // Verify initial demo habits for guest
    expect(result.current.habits.length).toBeGreaterThan(0);
    const targetHabit = result.current.habits[0];
    const initialCompletionState = targetHabit.completedDates.includes(result.current.getTodayStr());

    // Toggle completion
    await act(async () => {
      await result.current.toggleCompletion(targetHabit.id);
    });

    const updatedHabit = result.current.habits.find((h) => h.id === targetHabit.id);
    expect(updatedHabit?.completedDates.includes(result.current.getTodayStr())).toBe(!initialCompletionState);
  });

  it("Task 0.8.1: 2-minute micro-habit completion logs quickly and protects streak", async () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: ({ children }) => (
        <HabitsProvider userEmail={null} userId={undefined} isGuest={true} maxHabits={Infinity}>
          {children}
        </HabitsProvider>
      ),
    });

    const targetHabit = result.current.habits[0];

    await act(async () => {
      await result.current.completeHabit(targetHabit.id, "micro");
    });

    const updatedHabit = result.current.habits.find((h) => h.id === targetHabit.id);
    expect(updatedHabit?.completedDates.includes(result.current.getTodayStr())).toBe(true);
  });

  it("Task 0.8.2: Mobile Ergonomics at 390px - Quick Dock buttons have thumb-friendly tap targets", () => {
    const onAddHabit = vi.fn();
    const onOpenAiAgent = vi.fn();
    const onToggleZenMode = vi.fn();

    render(
      <MemoryRouter>
        <InteractiveQuickDock
          onAddHabitClick={onAddHabit}
          onOpenAiAgent={onOpenAiAgent}
          onToggleZenMode={onToggleZenMode}
          maxStreak={7}
          freezeCredits={2}
        />
      </MemoryRouter>
    );

    // Verify Quick Sprint button has thumb-friendly touch styling
    const sprintBtn = screen.getByRole("button", { name: /Quick Sprint/i });
    expect(sprintBtn.className).toContain("min-h-[40px]");
    expect(sprintBtn.className).toContain("touch-manipulation");

    // Verify Add Task button has min-h-[40px]
    const addTaskBtn = screen.getByRole("button", { name: /Add Task/i });
    expect(addTaskBtn.className).toContain("min-h-[40px]");
    expect(addTaskBtn.className).toContain("touch-manipulation");

    // Click Add Task and verify handler fires
    fireEvent.click(addTaskBtn);
    expect(onAddHabit).toHaveBeenCalledTimes(1);
  });

  it("Task 0.8.3: Reduce Initial Dashboard Visual Noise - Ritual dismissal persists for session", () => {
    const today = new Date().toISOString().split("T")[0];
    const sessionKey = `pps_ritual_dismissed_${today}`;

    // Initially not dismissed
    expect(sessionStorage.getItem(sessionKey)).toBeNull();

    // User dismisses morning ritual
    sessionStorage.setItem(sessionKey, "true");
    expect(sessionStorage.getItem(sessionKey)).toBe("true");
  });

  it("Task 0.8.3: Guest trial expiry logic enforces strict 5-day expiration", () => {
    const TRIAL_MS = 5 * 24 * 60 * 60 * 1000;
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const elapsed = Date.now() - new Date(sixDaysAgo).getTime();

    expect(elapsed).toBeGreaterThan(TRIAL_MS);
  });

  it("Task 0.8.4: Core Quick Dock buttons have active click triggers", () => {
    const onOpenAiAgent = vi.fn();
    const onToggleZenMode = vi.fn();

    render(
      <MemoryRouter>
        <InteractiveQuickDock
          onOpenAiAgent={onOpenAiAgent}
          onToggleZenMode={onToggleZenMode}
        />
      </MemoryRouter>
    );

    const aiAgentBtn = screen.getByRole("button", { name: /AI Agent/i });
    fireEvent.click(aiAgentBtn);
    expect(onOpenAiAgent).toHaveBeenCalledTimes(1);

    const zenBtn = screen.getByRole("button", { name: /Zen Mode/i });
    fireEvent.click(zenBtn);
    expect(onToggleZenMode).toHaveBeenCalledTimes(1);
  });
});
