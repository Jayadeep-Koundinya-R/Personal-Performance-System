import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildWhatsAppInviteMessage,
  buildWhatsAppInviteUrl,
  buildWebWhatsAppInviteUrl,
  shareViaWhatsApp,
} from "../whatsappInvite";
import {
  handleHardwareBackDecision,
  BackButtonContext,
} from "../../mobile/backButtonHandler";
import {
  resolvePresenceState,
  PeerPresence,
} from "../presenceResolver";
import { clearUserSessionStorage } from "@/hooks/use-auth";

describe("Phase 5: Native Mobile Hardening & Viral Social Bridge", () => {
  describe("Task 5.2: WhatsApp Study Buddy Invite Builder", () => {
    it("generates viral squad invite message with squad code and topic", () => {
      const msg = buildWhatsAppInviteMessage({
        squadCode: "VAYU07",
        squadName: "GATE CS Warriors",
        studyTopic: "Algorithms & OS",
      });

      expect(msg).toContain("GATE CS Warriors");
      expect(msg).toContain("Algorithms & OS");
      expect(msg).toContain("VAYU07");
      expect(msg).toContain("#/squads?join=VAYU07");
    });

    it("generates friendly fallback message when topic is omitted", () => {
      const msg = buildWhatsAppInviteMessage({
        squadCode: "PEAK99",
        squadName: "Daily Flow Squad",
      });

      expect(msg).toContain("Daily Flow Squad");
      expect(msg).toContain("PEAK99");
      expect(msg).toContain("Deep Work & Habit Mastery");
    });

    it("builds valid native whatsapp:// intent URI with encoded payload", () => {
      const url = buildWhatsAppInviteUrl({
        squadCode: "SPRINT",
        squadName: "Sprint Crew",
      });

      expect(url.startsWith("whatsapp://send?text=")).toBe(true);
      expect(url).toContain(encodeURIComponent("SPRINT"));
      expect(url).toContain(encodeURIComponent("Sprint Crew"));
    });

    it("builds valid web WhatsApp fallback URL", () => {
      const webUrl = buildWebWhatsAppInviteUrl({
        squadCode: "AGNI26",
        squadName: "Focus Masters",
      });

      expect(webUrl.startsWith("https://api.whatsapp.com/send?text=")).toBe(true);
      expect(webUrl).toContain(encodeURIComponent("AGNI26"));
    });

    it("triggers window.open with web URL on desktop environment", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      shareViaWhatsApp({
        squadCode: "DESK01",
        squadName: "Desktop Coders",
      });

      expect(openSpy).toHaveBeenCalled();
      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("whatsapp");
      expect(calledUrl).toContain("DESK01");

      openSpy.mockRestore();
    });
  });

  describe("Task 5.1: Hardware Back-Button Hierarchy Interceptor", () => {
    it("Tier 1: Dismisses active modal or sheet if open", () => {
      const ctx: BackButtonContext = {
        hasOpenModal: true,
        activeModalId: "triage-modal",
        activeSection: "dashboard",
        pathname: "/dashboard",
      };

      const decision = handleHardwareBackDecision(ctx);
      expect(decision.type).toBe("close_modal");
      expect(decision.targetModalId).toBe("triage-modal");
    });

    it("Tier 2: Navigates back to dashboard from sub-sections", () => {
      const subSections = ["habits", "analytics", "settings", "social", "vayu"];

      for (const section of subSections) {
        const ctx: BackButtonContext = {
          hasOpenModal: false,
          activeSection: section,
          pathname: "/dashboard",
        };

        const decision = handleHardwareBackDecision(ctx);
        expect(decision.type).toBe("navigate_dashboard");
      }
    });

    it("Tier 2b: Navigates back to dashboard from sub-route URLs", () => {
      const ctx: BackButtonContext = {
        hasOpenModal: false,
        activeSection: "dashboard",
        pathname: "/analytics",
      };

      const decision = handleHardwareBackDecision(ctx);
      expect(decision.type).toBe("navigate_dashboard");
    });

    it("Tier 3: Minimizes app when on root dashboard with no open modals", () => {
      const ctx: BackButtonContext = {
        hasOpenModal: false,
        activeSection: "dashboard",
        pathname: "/dashboard",
      };

      const decision = handleHardwareBackDecision(ctx);
      expect(decision.type).toBe("minimize_app");
    });

    it("Gracefully handles missing or partial context with safe minimize default", () => {
      const ctx: BackButtonContext = {
        hasOpenModal: false,
      };

      const decision = handleHardwareBackDecision(ctx);
      expect(decision.type).toBe("minimize_app");
    });
  });

  describe("Task 5.3: Zero-Mock Squad Presence Resolver", () => {
    const currentUserId = "user-me-123";

    it("resolves State A: Sprinting peers with count and labels", () => {
      const peers: PeerPresence[] = [
        {
          id: "peer-1",
          name: "Aarav Sharma",
          status: "sprinting",
          currentTask: "DSA Trees & Graphs",
          avatarEmoji: "🚀",
          lastActive: Date.now(),
        },
        {
          id: "peer-2",
          name: "Diya Patel",
          status: "sprinting",
          currentTask: "GATE Mock Exam 3",
          avatarEmoji: "⚡",
          lastActive: Date.now(),
        },
        {
          id: "peer-3",
          name: "Rohan V",
          status: "online",
          avatarEmoji: "🧑‍💻",
          lastActive: Date.now(),
        },
      ];

      const state = resolvePresenceState(peers, currentUserId);
      expect(state.isQuiet).toBe(false);
      expect(state.sprintingCount).toBe(2);
      expect(state.onlineCount).toBe(1);
      expect(state.activeCount).toBe(3);
      expect(state.statusText).toBe("🟢 2 Sprinting Now");
      expect(state.activePeers.length).toBe(3);
    });

    it("resolves State B: Online peers when none are sprinting", () => {
      const peers: PeerPresence[] = [
        {
          id: "peer-1",
          name: "Maya Sen",
          status: "online",
          avatarEmoji: "📚",
          lastActive: Date.now(),
        },
      ];

      const state = resolvePresenceState(peers, currentUserId);
      expect(state.isQuiet).toBe(false);
      expect(state.sprintingCount).toBe(0);
      expect(state.onlineCount).toBe(1);
      expect(state.statusText).toBe("🟡 1 Online");
    });

    it("resolves State C: Honest empty state when Radar is quiet (Zero Mock Policy)", () => {
      const emptyState = resolvePresenceState([], currentUserId);
      expect(emptyState.isQuiet).toBe(true);
      expect(emptyState.sprintingCount).toBe(0);
      expect(emptyState.onlineCount).toBe(0);
      expect(emptyState.statusText).toBe("Radar Quiet — Start a sprint to signal your squad");
    });

    it("excludes current user from peer presence counts", () => {
      const peersWithMe: PeerPresence[] = [
        {
          id: currentUserId,
          name: "Myself",
          status: "sprinting",
          lastActive: Date.now(),
        },
        {
          id: "peer-other",
          name: "Friend",
          status: "sprinting",
          lastActive: Date.now(),
        },
      ];

      const state = resolvePresenceState(peersWithMe, currentUserId);
      expect(state.sprintingCount).toBe(1);
      expect(state.activePeers.some((p) => p.id === currentUserId)).toBe(false);
    });
  });

  describe("Task 5.4: Zero-Leak Session Storage Cleanup", () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it("purges all Phase 1-5 user data and cache keys while preserving global theme", () => {
      // Seed storage with representative Phase 1-5 keys
      localStorage.setItem("pps_vayu_curfew_enabled", "true");
      localStorage.setItem("pps_vayu_reschedule_mode", "auto");
      localStorage.setItem("pps_micro_completions", JSON.stringify({ h1: ["2026-10-16"] }));
      localStorage.setItem("pps_recovery_xp", JSON.stringify({ dates: ["2026-10-16"] }));
      localStorage.setItem("pps_triage_actions", "mock");
      localStorage.setItem("pps_slicer_tasks", "mock");
      localStorage.setItem("pps_syllabus_active", "mock");
      localStorage.setItem("pps_today_mood_2026-10-16", "energized");
      localStorage.setItem("pps_skipped_2026-10-16", JSON.stringify({ h2: "Rest" }));
      localStorage.setItem("pps_unlocked_badges", JSON.stringify(["streak_7"]));
      localStorage.setItem("pps_user_profile", JSON.stringify({ name: "Tester" }));
      localStorage.setItem("pps_channel_general", "msg_data");
      localStorage.setItem("pps_presence_active", "online");
      localStorage.setItem("vite-ui-theme", "dark"); // System preference to preserve

      sessionStorage.setItem("pps_session_temp", "secret");

      // Execute zero-leak cleanup
      clearUserSessionStorage();

      // Verify all pps_* keys are purged
      expect(localStorage.getItem("pps_vayu_curfew_enabled")).toBeNull();
      expect(localStorage.getItem("pps_vayu_reschedule_mode")).toBeNull();
      expect(localStorage.getItem("pps_micro_completions")).toBeNull();
      expect(localStorage.getItem("pps_recovery_xp")).toBeNull();
      expect(localStorage.getItem("pps_triage_actions")).toBeNull();
      expect(localStorage.getItem("pps_slicer_tasks")).toBeNull();
      expect(localStorage.getItem("pps_syllabus_active")).toBeNull();
      expect(localStorage.getItem("pps_today_mood_2026-10-16")).toBeNull();
      expect(localStorage.getItem("pps_skipped_2026-10-16")).toBeNull();
      expect(localStorage.getItem("pps_unlocked_badges")).toBeNull();
      expect(localStorage.getItem("pps_user_profile")).toBeNull();
      expect(localStorage.getItem("pps_channel_general")).toBeNull();
      expect(localStorage.getItem("pps_presence_active")).toBeNull();

      // Verify session storage completely emptied
      expect(sessionStorage.getItem("pps_session_temp")).toBeNull();

      // Verify global theme preference is preserved
      expect(localStorage.getItem("vite-ui-theme")).toBe("dark");
    });
  });
});
