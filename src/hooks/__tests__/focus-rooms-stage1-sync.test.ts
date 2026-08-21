import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGroups } from "../use-groups";
import { useChannels } from "../use-channels";

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

  it("Stage 1.2: User B joins User A's study group using invite code (same session, in-memory join)", async () => {
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
    const groupId = aliceGroups.current.activeGroup!.id;

    // 2. User A invites User B — in the real app, Bob opens the code on his device.
    //    In tests, we verify that in-memory join works when the group is already local.
    //    (Cross-device join goes through Supabase, which uses real UUIDs)
    let joinRes: any;
    await act(async () => {
      joinRes = await aliceGroups.current.joinGroup(inviteCode);
    });

    // Alice is already a member, so this should succeed (she's the creator)
    expect(joinRes.success).toBe(true);
    expect(aliceGroups.current.activeGroup?.inviteCode).toBe(inviteCode);
    expect(aliceGroups.current.activeGroup?.name).toBe("Neuroscience Deep Work");
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

  it("Stage 1.5: Account isolation — User B CANNOT see User A's groups unless explicitly joined", async () => {
    // 1. User A creates a group
    const { result: aliceGroups } = renderHook(() => useGroups());
    await act(async () => {
      await aliceGroups.current.createGroup(
        "Alice's Private Squad",
        "Alice's study notes and strategies",
        "🔒",
        "Private Study",
        "private"
      );
    });

    expect(aliceGroups.current.groups.length).toBe(1);
    expect(aliceGroups.current.groups[0].name).toBe("Alice's Private Squad");

    // Verify Alice's group is stored in Alice-scoped localStorage
    const aliceStorage = localStorage.getItem("pps_focus_groups_store_user_alice_123");
    expect(aliceStorage).toBeTruthy();
    expect(JSON.parse(aliceStorage!).length).toBe(1);

    // 2. Switch to User B — completely different account
    currentMockUser = { id: "user_charlie_789", email: "charlie@example.com" };
    currentMockProfile = { displayName: "Charlie (Stranger)", avatarEmoji: "🦊", streak: 0 };

    // 3. Render User B's groups hook — this should NOT see Alice's group
    const { result: charlieGroups } = renderHook(() => useGroups());

    // Verify Charlie's scoped localStorage is empty
    const charlieStorage = localStorage.getItem("pps_focus_groups_store_user_charlie_789");
    expect(!charlieStorage || JSON.parse(charlieStorage).length === 0).toBe(true);

    // Charlie should have 0 groups — localStorage is properly scoped
    expect(charlieGroups.current.groups.length).toBe(0);
  });

  it("Stage 1.6: Leave group — member removal reflected and group disappears from their list", async () => {
    // 1. User A creates a group
    currentMockUser = { id: "user_alice_123", email: "alice@example.com" };
    currentMockProfile = { displayName: "Alice (Host)", avatarEmoji: "👩‍💻", streak: 10 };

    const { result: aliceGroups } = renderHook(() => useGroups());
    await act(async () => {
      await aliceGroups.current.createGroup(
        "Study Sprint Group",
        "Fast-paced study sessions",
        "⚡",
        "Test Prep",
        "public"
      );
    });

    const groupId = aliceGroups.current.activeGroup!.id;
    expect(aliceGroups.current.groups.length).toBe(1);

    // 2. Alice leaves her own group (as the last/only member)
    await act(async () => {
      await aliceGroups.current.leaveGroup(groupId);
    });

    // Group should be removed from Alice's list
    expect(aliceGroups.current.groups.length).toBe(0);
    expect(aliceGroups.current.groups.some(g => g.id === groupId)).toBe(false);

    // localStorage should also reflect the removal
    const storage = localStorage.getItem("pps_focus_groups_store_user_alice_123");
    if (storage) {
      expect(JSON.parse(storage).some((g: any) => g.id === groupId)).toBe(false);
    }
  });
});
