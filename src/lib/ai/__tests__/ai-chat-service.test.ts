import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatchCoachMessage,
  loadConversationHistory,
  saveConversationMessage,
  clearConversationHistory,
} from "../aiChatService";
import type { HabitContext } from "../responseTemplates";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe("Phase 2 AI Coaching & Conversation Memory Service", () => {
  const mockHabitContext: HabitContext = {
    totalHabits: 3,
    dueToday: 2,
    completedToday: 1,
    pendingToday: 1,
    completionRate: 50,
    maxStreak: 5,
    pendingNames: ["Deep Work"],
    completedNames: ["Morning Meditation"],
    totalCompletions: 12,
    topStreakHabits: [{ name: "Morning Meditation", streak: 5 }],
    recentMoods: ["Focused"],
    displayName: "Alex",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Pro-Only Gating and Routing", () => {
    it("routes Pro users to Gemini 2.0 Edge Function when active", async () => {
      // Mock successful Gemini 2.0 response from Edge Function
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: {
          text: "Here is your customized Gemini 2.0 deep performance coaching.",
          model: "gemini-2.0-flash",
          isPro: true,
        },
        error: null,
      });

      const result = await dispatchCoachMessage({
        message: "How can I improve my deep work focus?",
        habitContext: mockHabitContext,
        isPro: true,
        userId: "user-123",
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith("ai-coach-chat", expect.any(Object));
      expect(result.source).toBe("gemini");
      expect(result.model).toBe("gemini-2.0-flash");
      expect(result.text).toContain("Gemini 2.0");
    });

    it("routes Free users directly to local coach without calling Edge Function", async () => {
      const result = await dispatchCoachMessage({
        message: "Roast my performance",
        habitContext: mockHabitContext,
        isPro: false,
        userId: "free-user-456",
      });

      // Edge function should NOT be invoked for free users (no wasted API calls)
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(result.source).toBe("local");
      expect(result.model).toBe("local-smart-engine");
      expect(result.detectedIntent).toBe("roast");
      expect(result.text.length).toBeGreaterThan(0);
    });

    it("gracefully falls back to local coach if Gemini key is unconfigured (dormant state)", async () => {
      // Mock edge function returning fallback when GEMINI_API_KEY is not set
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: {
          error: "GEMINI_NOT_CONFIGURED",
          fallback: true,
          message: "Gemini API key is not configured on server",
        },
        error: null,
      });

      const result = await dispatchCoachMessage({
        message: "Audit my day",
        habitContext: mockHabitContext,
        isPro: true,
        userId: "pro-user-789",
      });

      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(result.source).toBe("local");
      expect(result.model).toBe("local-smart-engine");
      expect(result.detectedIntent).toBe("audit");
      expect(result.text).toContain("DAILY AUDIT");
    });

    it("gracefully falls back to local coach if edge function throws an error", async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(new Error("Network timeout"));

      const result = await dispatchCoachMessage({
        message: "Motivate me today",
        habitContext: mockHabitContext,
        isPro: true,
        userId: "pro-user-789",
      });

      expect(result.source).toBe("local");
      expect(result.detectedIntent).toBe("motivation");
      expect(result.text.length).toBeGreaterThan(0);
    });
  });

  describe("Conversation Memory & Persistence", () => {
    it("loads default greeting when no conversation history exists", async () => {
      const history = await loadConversationHistory("user-123");
      expect(history.length).toBe(1);
      expect(history[0].id).toBe("greeting");
      expect(history[0].sender).toBe("ai");
    });

    it("saves messages to user-scoped localStorage cache", async () => {
      await saveConversationMessage("user-123", {
        sender: "user",
        text: "Can I protect my streak?",
      });

      const raw = localStorage.getItem("pps_ai_chat_user-123");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].text).toBe("Can I protect my streak?");
    });

    it("isolates guest conversation history from authenticated user accounts", async () => {
      // Guest adds a message
      await saveConversationMessage(null, {
        sender: "user",
        text: "Guest trial question",
      });

      // Guest cache has it
      expect(localStorage.getItem("pps_ai_chat_guest")).toBeTruthy();

      // Brand new authenticated user should NOT receive the guest message
      const userHistory = await loadConversationHistory("new-user-456");
      expect(userHistory.length).toBe(1);
      expect(userHistory[0].id).toBe("greeting");
      expect(userHistory[0].text).not.toContain("Guest trial question");
    });

    it("clears conversation history in localStorage and cloud", async () => {
      localStorage.setItem("pps_ai_chat_user-123", JSON.stringify([{ id: "1", text: "test" }]));

      await clearConversationHistory("user-123");

      expect(localStorage.getItem("pps_ai_chat_user-123")).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("ai_conversations");
    });
  });
});

