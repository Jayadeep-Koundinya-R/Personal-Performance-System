import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusRoom } from "../use-focus-room";

// Mock Auth
let currentMockUser = {
  id: "user_alice_123",
  email: "alice@example.com",
};

let currentMockProfile = {
  displayName: "Alice (Lead)",
  avatarEmoji: "👩‍💻",
  streak: 10,
  xp: 2400,
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: currentMockUser,
    isLoggedIn: true,
    isGuest: false,
  }),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: currentMockProfile,
    updateProfile: vi.fn(),
  }),
}));

describe("Focus Rooms Stage 2: Real Presence & Synced Group Pomodoro Timer", () => {
  beforeEach(() => {
    localStorage.clear();
    currentMockUser = { id: "user_alice_123", email: "alice@example.com" };
    currentMockProfile = { displayName: "Alice (Lead)", avatarEmoji: "👩‍💻", streak: 10, xp: 2400 };
  });

  it("Stage 2.1: Real Presence — Zero fake participants (No Alex Vance or Elena Rostova)", () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_algorithms", "CS Algorithms Lab"));

    act(() => {
      result.current.joinRoom();
    });

    expect(result.current.isInRoom).toBe(true);

    // CRITICAL CHECK: Ensure NO hardcoded fake participants exist
    const participantNames = result.current.participants.map((p) => p.name);
    expect(participantNames).not.toContain("Alex Vance (Lead)");
    expect(participantNames).not.toContain("Elena Rostova");

    // Only the real user should be present when joining solo
    expect(result.current.participants.length).toBe(1);
    expect(result.current.participants[0].userId).toBe("user_alice_123");
    expect(result.current.participants[0].name).toContain("Alice (Lead)");
  });

  it("Stage 2.2: Synced Group Pomodoro — Zero-drift timestamp calculation for group sprints", async () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_algorithms", "CS Algorithms Lab"));

    act(() => {
      result.current.joinRoom();
    });

    // Start a 25-minute group Pomodoro sprint
    await act(async () => {
      await result.current.startPomodoro();
    });

    expect(result.current.isTimerRunning).toBe(true);
    expect(result.current.pomodoroMode).toBe("work");
    expect(result.current.targetEndAt).toBeDefined();

    // Verify remaining seconds is within 25 minutes (1498 - 1500 sec)
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(1498);
    expect(result.current.timeLeft).toBeLessThanOrEqual(1500);
  });

  it("Stage 2.3: Synced Group Pomodoro — Pause and Reset synchronization", async () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_algorithms", "CS Algorithms Lab"));

    act(() => {
      result.current.joinRoom();
    });

    await act(async () => {
      await result.current.startPomodoro();
    });
    expect(result.current.isTimerRunning).toBe(true);

    // Pause
    await act(async () => {
      await result.current.pausePomodoro();
    });
    expect(result.current.isTimerRunning).toBe(false);

    // Reset back to 25:00
    await act(async () => {
      await result.current.resetPomodoro();
    });
    expect(result.current.isTimerRunning).toBe(false);
    expect(result.current.timeLeft).toBe(25 * 60);
    expect(result.current.pomodoroMode).toBe("work");
  });

  it("Stage 2.4: NaN Protection — Resets and Starts with Event objects or undefined never produce NaN", async () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_algorithms", "CS Algorithms Lab"));

    act(() => {
      result.current.joinRoom();
    });

    // Simulate button click passing a SyntheticEvent object to resetPomodoro
    const mockClickEvent: any = { preventDefault: () => {}, target: {} };
    await act(async () => {
      await result.current.resetPomodoro(mockClickEvent);
    });

    expect(isNaN(result.current.timeLeft)).toBe(false);
    expect(result.current.timeLeft).toBe(25 * 60);

    // Simulate button click passing a SyntheticEvent object to startPomodoro
    await act(async () => {
      await result.current.startPomodoro(mockClickEvent);
    });

    expect(isNaN(result.current.timeLeft)).toBe(false);
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(1498);
  });

  it("Stage 2.5: Customizable Duration — Supports custom focus sprints (50m, 15m, 5m break)", async () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_algorithms", "CS Algorithms Lab"));

    act(() => {
      result.current.joinRoom();
    });

    // 50-minute deep sprint (3000 sec)
    await act(async () => {
      await result.current.startPomodoro(50 * 60, "work", "Deep Thesis Writing");
    });

    expect(result.current.isTimerRunning).toBe(true);
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(2998);
    expect(result.current.timeLeft).toBeLessThanOrEqual(3000);

    // 5-minute break (300 sec)
    await act(async () => {
      await result.current.startPomodoro(5 * 60, "break", "Tea Break");
    });

    expect(result.current.isTimerRunning).toBe(true);
    expect(result.current.pomodoroMode).toBe("break");
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(298);
    expect(result.current.timeLeft).toBeLessThanOrEqual(300);
  });
});
