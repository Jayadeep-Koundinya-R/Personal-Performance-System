import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusRoom } from "../use-focus-room";

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user_test_456", email: "learner@pps.app" },
    isLoggedIn: true,
    isGuest: false,
  }),
}));

// Mock useProfile
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: {
      displayName: "Morgan Sky",
      avatarEmoji: "🚀",
      streak: 12,
      xp: 2400,
    },
  }),
}));

describe("Daily.co Managed Video Calling Engine in Focus Rooms", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes Daily.co video calling state with safe defaults", () => {
    const { result } = renderHook(() => useFocusRoom("group_algorithms_1", "Algo Mastery"));

    expect(result.current.isInRoom).toBe(false);
    expect(result.current.isCameraOn).toBe(false);
    expect(result.current.isMuted).toBe(true);
    expect(result.current.isDailyConnected).toBe(false);
    expect(result.current.dailyRoomUrl).toBeNull();
    expect(result.current.peerStreams).toEqual({});
  });

  it("joins room, mounts genuine local participant and exposes room controls", async () => {
    const { result } = renderHook(() => useFocusRoom("group_algorithms_1", "Algo Mastery"));

    await act(async () => {
      await result.current.joinRoom();
    });

    expect(result.current.isInRoom).toBe(true);
    expect(result.current.participants.length).toBe(1);
    expect(result.current.participants[0].name).toContain("Morgan Sky (You)");
    expect(result.current.participants[0].userId).toBe("user_test_456");
  });

  it("toggles camera and microphone with state synchronization", async () => {
    const { result } = renderHook(() => useFocusRoom("group_algorithms_1", "Algo Mastery"));

    await act(async () => {
      await result.current.joinRoom();
    });

    expect(result.current.isCameraOn).toBe(false);

    await act(async () => {
      await result.current.toggleCamera();
    });

    expect(result.current.isCameraOn).toBe(true);
    expect(result.current.participants[0].cameraOn).toBe(true);

    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.toggleMic();
    });

    expect(result.current.isMuted).toBe(false);
    expect(result.current.participants[0].isMuted).toBe(false);
  });

  it("leaves room and resets all video streams and participants", async () => {
    const { result } = renderHook(() => useFocusRoom("group_algorithms_1", "Algo Mastery"));

    await act(async () => {
      await result.current.joinRoom();
    });

    expect(result.current.isInRoom).toBe(true);

    await act(async () => {
      await result.current.leaveRoom();
    });

    expect(result.current.isInRoom).toBe(false);
    expect(result.current.participants.length).toBe(0);
    expect(result.current.peerStreams).toEqual({});
    expect(result.current.isDailyConnected).toBe(false);
  });
});
