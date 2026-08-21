import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGroups } from "../use-groups";
import { useChannels } from "../use-channels";
import { supabase } from "@/integrations/supabase/client";

// Mock auth for User A (Host / Creator)
let currentMockUser = {
  id: "user_alice_123",
  email: "alice@example.com",
};

let currentMockProfile = {
  displayName: "Alice (Host)",
  avatarEmoji: "👩‍💻",
  streak: 10,
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

describe("Focus Rooms Stage 1: Realtime Multi-User Sync & Channels Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    currentMockUser = { id: "user_alice_123", email: "alice@example.com" };
    currentMockProfile = { displayName: "Alice (Host)", avatarEmoji: "👩‍💻", streak: 10 };
  });

  it("Stage 1.1: User A creates a Study Group with automatic #general and #resources channels", async () => {
    const { result: groupsHook } = renderHook(() => useGroups());

    let createRes: any;
    await act(async () => {
      createRes = await groupsHook.current.createGroup(
        "Algorithms & AI Cohort",
        "Weekly peer study sprints and research links",
        "🚀",
        "Computer Science",
        "public"
      );
    });

    expect(createRes.success).toBe(true);
    expect(createRes.groupId).toBeDefined();

    const createdGroup = groupsHook.current.activeGroup;
    expect(createdGroup?.name).toBe("Algorithms & AI Cohort");
    expect(createdGroup?.inviteCode).toMatch(/^[A-Z0-9]{6}$/);

    // Verify Channels Hook initializes default channels for the created group
    const { result: channelsHook } = renderHook(() => useChannels(createdGroup!.id));
    expect(channelsHook.current.channels.length).toBeGreaterThanOrEqual(2);
    expect(channelsHook.current.channels.map((c) => c.name)).toContain("general-chat");
    expect(channelsHook.current.channels.map((c) => c.name)).toContain("study-notes-and-links");
  });

  it("Stage 1.2: User B joins User A's study group using invite code", async () => {
    // 1. User A creates group
    const { result: aliceGroups } = renderHook(() => useGroups());
    await act(async () => {
      await aliceGroups.current.createGroup(
        "Neuroscience Deep Work",
        "Brain science literature review",
        "🧠",
        "Neurobiology",
        "public"
      );
    });

    const inviteCode = aliceGroups.current.activeGroup!.inviteCode;

    // 2. Switch to User B (Bob)
    currentMockUser = { id: "user_bob_456", email: "bob@example.com" };
    currentMockProfile = { displayName: "Bob (Peer)", avatarEmoji: "⚡", streak: 5 };

    const { result: bobGroups } = renderHook(() => useGroups());

    let joinRes: any;
    await act(async () => {
      joinRes = await bobGroups.current.joinGroup(inviteCode);
    });

    expect(joinRes.success).toBe(true);
    expect(bobGroups.current.activeGroup?.inviteCode).toBe(inviteCode);
    expect(bobGroups.current.activeGroup?.name).toBe("Neuroscience Deep Work");
  });

  it("Stage 1.3: Real-time Chat message exchange between channels with Live Delivery", async () => {
    const testGroupId = "group_quantum_sync_test";
    const { result: channelsHook } = renderHook(() => useChannels(testGroupId));

    const generalChannel = channelsHook.current.channels.find((c) => c.type === "general");
    expect(generalChannel).toBeDefined();

    // Alice sends a message in #general
    await act(async () => {
      await channelsHook.current.sendMessage("Hey everyone! Ready for today's 50m study sprint? 🎯");
    });

    expect(channelsHook.current.messages.length).toBe(1);
    expect(channelsHook.current.messages[0].content).toContain("50m study sprint");
    expect(channelsHook.current.messages[0].senderName).toBe("Alice (Host)");

    // Alice sends a resource link in #study-notes-and-links
    const resourcesChannel = channelsHook.current.channels.find((c) => c.type === "resources");
    expect(resourcesChannel).toBeDefined();

    act(() => {
      channelsHook.current.setActiveChannelId(resourcesChannel!.id);
    });

    await act(async () => {
      await channelsHook.current.sendMessage("Check out this paper", "https://arxiv.org/abs/2301.00001");
    });

    expect(channelsHook.current.messages.length).toBe(1);
    expect(channelsHook.current.messages[0].type).toBe("link");
    expect(channelsHook.current.messages[0].linkUrl).toBe("https://arxiv.org/abs/2301.00001");
  });

  it("Stage 1.4: Message pinning and custom channel creation", async () => {
    const testGroupId = "group_pin_test";
    const { result: channelsHook } = renderHook(() => useChannels(testGroupId));

    // Create a custom announcements channel
    await act(async () => {
      await channelsHook.current.createChannel("exam-announcements", "Important dates", "announcements");
    });

    expect(channelsHook.current.channels.some((c) => c.name === "exam-announcements")).toBe(true);

    // Send a message and pin it
    await act(async () => {
      await channelsHook.current.sendMessage("Midterm exam is on October 15th! 📌");
    });

    const msgId = channelsHook.current.messages[0].id;

    await act(async () => {
      await channelsHook.current.togglePinMessage(msgId);
    });

    expect(channelsHook.current.messages[0].pinned).toBe(true);
  });
});
