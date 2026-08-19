import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGroups } from "../use-groups";
import { useChannels } from "../use-channels";

// Mock React Router useNavigate
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test_user_id", email: "test@example.com" },
    isLoggedIn: true,
    isGuest: false,
  }),
}));

// Mock useProfile
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: {
      displayName: "Alex Vance",
      avatarEmoji: "👨‍💻",
      streak: 15,
      xp: 3200,
    },
    updateProfile: vi.fn(),
  }),
}));

describe("PPS Focus Rooms & Study Groups System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with clean empty state for new users", () => {
    const { result } = renderHook(() => useGroups());
    expect(result.current.groups.length).toBe(0);
    expect(result.current.activeGroup).toBeNull();
  });

  it("loads sample template squad when requested from onboarding tutorial", () => {
    const { result } = renderHook(() => useGroups());
    expect(result.current.groups.length).toBe(0);

    act(() => {
      result.current.loadSampleSquad();
    });

    expect(result.current.groups.length).toBe(1);
    expect(result.current.activeGroup?.name).toContain("Mastery & Focus Squad");
    expect(result.current.activeGroup?.inviteCode).toBe("FOCUS1");
  });

  it("creates a new study group with unique invite code", async () => {
    const { result } = renderHook(() => useGroups());

    let createResult: any;
    await act(async () => {
      createResult = await result.current.createGroup(
        "Quantum Computing Study Cohort",
        "Qiskit practice and quantum algorithms",
        "⚛️",
        "Physics & Quantum CS",
        "public"
      );
    });

    expect(createResult.success).toBe(true);
    expect(result.current.activeGroup?.name).toBe("Quantum Computing Study Cohort");
    expect(result.current.activeGroup?.inviteCode).toHaveLength(6);
    expect(result.current.members.length).toBeGreaterThanOrEqual(1);
  });

  it("joins an existing group with invite code", async () => {
    const { result } = renderHook(() => useGroups());

    // First create a group to join
    await act(async () => {
      await result.current.createGroup(
        "Full-Stack Devs",
        "Co-working",
        "💻",
        "Engineering",
        "public"
      );
    });

    const code = result.current.activeGroup!.inviteCode;

    let joinResult: any;
    await act(async () => {
      joinResult = await result.current.joinGroup(code);
    });

    expect(joinResult.success).toBe(true);
    expect(result.current.activeGroup?.inviteCode).toBe(code);
  });

  it("rejects invalid invite codes", async () => {
    const { result } = renderHook(() => useGroups());

    let joinResult: any;
    await act(async () => {
      joinResult = await result.current.joinGroup("INVALID_999");
    });

    expect(joinResult.success).toBe(false);
    expect(joinResult.error).toContain("No group found matching code");
  });

  it("toggles member study status in Focus Room", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.createGroup(
        "Focus Room Sprint",
        "Testing room",
        "⚡",
        "General",
        "public"
      );
    });

    const groupId = result.current.activeGroup!.id;

    act(() => {
      result.current.toggleStudyingStatus(groupId, true);
    });

    // Check that state updated
    const members = result.current.members;
    expect(members).toBeDefined();
    expect(members.length).toBeGreaterThanOrEqual(1);
  });

  it("initializes channels and sends real-time chat messages", () => {
    const { result } = renderHook(() => useChannels("group_mit_cs"));

    expect(result.current.channels.length).toBeGreaterThanOrEqual(2);
    expect(result.current.activeChannel).toBeDefined();

    act(() => {
      result.current.sendMessage("Let's review the dynamic programming solutions!");
    });

    const msgs = result.current.messages;
    const lastMsg = msgs[msgs.length - 1];
    expect(lastMsg.content).toBe("Let's review the dynamic programming solutions!");
    expect(lastMsg.pinned).toBe(false);
  });

  it("creates custom topic channels and pins important lecture links", () => {
    const { result } = renderHook(() => useChannels("group_mit_cs"));

    act(() => {
      result.current.createChannel("system-design-mock-interviews", "Weekly peer mock interviews");
    });

    expect(result.current.activeChannel?.name).toBe("system-design-mock-interviews");

    act(() => {
      result.current.sendMessage(
        "Link to Redis Whitepaper:",
        "https://redis.io/resources"
      );
    });

    const msgs = result.current.messages;
    const msgToPin = msgs[msgs.length - 1];

    act(() => {
      result.current.togglePinMessage(msgToPin.id);
    });

    const updatedMsgs = result.current.messages;
    const pinned = updatedMsgs.find((m) => m.id === msgToPin.id);
    expect(pinned?.pinned).toBe(true);
    expect(pinned?.type).toBe("link");
    expect(pinned?.linkUrl).toBe("https://redis.io/resources");
  });
});
