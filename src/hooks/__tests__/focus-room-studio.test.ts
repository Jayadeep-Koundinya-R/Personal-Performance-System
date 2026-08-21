import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusRoom } from "../use-focus-room";
import { ambientAudio } from "@/lib/audio/ambientSynthesizer";

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user_test_123", email: "student@pps.app" },
    isLoggedIn: true,
    isGuest: false,
  }),
}));

// Mock useProfile
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: {
      displayName: "Jordan Lee",
      avatarEmoji: "⚡",
      streak: 9,
      xp: 1850,
    },
  }),
}));

describe("PPS Focus Room Studio & Synced Pomodoro System", () => {
  beforeEach(() => {
    localStorage.clear();
    ambientAudio.stop();
  });

  it("joins and leaves the focus room cleanly with squad peers", () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_1", "CS Study Lab"));

    expect(result.current.isInRoom).toBe(false);

    act(() => {
      result.current.joinRoom();
    });

    expect(result.current.isInRoom).toBe(true);
    // Real presence: only the actual user is present when joining solo (no fake participants)
    expect(result.current.participants.length).toBe(1);
    expect(result.current.participants[0].name).toContain("Jordan Lee (You)");

    act(() => {
      result.current.leaveRoom();
    });

    expect(result.current.isInRoom).toBe(false);
    expect(result.current.participants.length).toBe(0);
  });

  it("toggles camera, microphone and updates current focus task", () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_1", "CS Study Lab"));

    act(() => {
      result.current.joinRoom();
    });

    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.toggleMic();
    });
    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.updateCurrentTask("Solving LeetCode Dynamic Programming");
    });
    expect(result.current.currentTask).toBe("Solving LeetCode Dynamic Programming");
  });

  it("controls squad-wide synced Pomodoro timer", () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_1", "CS Study Lab"));

    expect(result.current.pomodoroMode).toBe("work");
    expect(result.current.timeLeft).toBe(25 * 60);
    expect(result.current.isTimerRunning).toBe(false);

    act(() => {
      result.current.startPomodoro();
    });
    expect(result.current.isTimerRunning).toBe(true);

    act(() => {
      result.current.pausePomodoro();
    });
    expect(result.current.isTimerRunning).toBe(false);

    act(() => {
      result.current.resetPomodoro();
    });
    expect(result.current.timeLeft).toBe(25 * 60);
    expect(result.current.pomodoroMode).toBe("work");
  });

  it("controls ambient soundscape synthesis without throwing", () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_1", "CS Study Lab"));

    expect(result.current.ambience).toBe("none");

    act(() => {
      result.current.setAmbience("lofi");
    });
    expect(result.current.ambience).toBe("lofi");

    act(() => {
      result.current.setAmbienceVolume(0.8);
    });
    expect(result.current.ambienceVolume).toBe(0.8);

    act(() => {
      result.current.setAmbience("none");
    });
    expect(result.current.ambience).toBe("none");
  });

  it("toggles room lock security state", () => {
    const { result } = renderHook(() => useFocusRoom("group_cs_1", "CS Study Lab"));

    expect(result.current.isRoomLocked).toBe(false);

    act(() => {
      result.current.toggleRoomLock();
    });
    expect(result.current.isRoomLocked).toBe(true);
  });
});
