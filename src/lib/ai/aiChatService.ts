/**
 * 🤖 AI Chat Service & Conversation Memory Manager
 *
 * HOW THIS WORKS (Phase 2 Pro AI Roadmap):
 * ─────────────────────────────────────────
 * 1. Conversation Memory:
 *    - Persists chat messages to the `ai_conversations` Supabase table per user.
 *    - Automatically retrieves the last 10 messages across sessions for a continuous experience.
 *    - Synchronizes to local storage for instant offline/guest loading.
 *
 * 2. Smart Pro Routing & Gating:
 *    - Pro users are routed to the `ai-coach-chat` Edge Function (powered by Gemini 2.0 Flash).
 *    - Free users or non-subscribers are served directly by the local rule-based Coach Engine.
 *    - If the Gemini API key is not yet configured or the network is offline, Pro users seamlessly
 *      fall back to the local Coach Engine with zero disruption or error alerts.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCoachResponse, type CoachResponse } from "./coachEngine";
import { detectAgentAction, type AgentActionPayload } from "./agentTools";
import type { HabitContext } from "./responseTemplates";

export interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  actionHabits?: { id: string; name: string }[];
  agentAction?: AgentActionPayload;
  intent?: string;
  model?: string;
  created_at?: string;
  source?: "gemini" | "local";
}

function getChatCacheKey(userId?: string | null): string {
  return userId ? `pps_ai_chat_${userId}` : "pps_ai_chat_guest";
}

const DEFAULT_GREETING: ChatMessage = {
  id: "greeting",
  sender: "ai",
  text: "Hey! I'm your AI Performance Coach & Agent. Ask me for a performance roast, daily audit, or ask me to create habits, schedule alarms, or start focus timers!",
  source: "local",
  model: "local",
  created_at: new Date().toISOString(),
};

/**
 * Loads conversation history for the given user from Supabase or guest local cache.
 * Returns up to 20 previous messages in chronological order.
 */
export async function loadConversationHistory(userId?: string | null): Promise<ChatMessage[]> {
  const isGuest = !userId || userId === "guest_local" || userId.startsWith("guest");

  if (isGuest) {
    const cacheKey = getChatCacheKey(userId);
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Failed to parse guest chat cache:", err);
    }
    return [DEFAULT_GREETING];
  }

  try {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Failed to load chat history from database:", error);
      return [DEFAULT_GREETING];
    }

    if (data && data.length > 0) {
      const mapped: ChatMessage[] = data.map((row: any) => ({
        id: row.id,
        sender: row.role === "assistant" ? "ai" : "user",
        text: row.content,
        actionHabits: (row.action_habits as any) || undefined,
        intent: row.intent || undefined,
        model: row.model || "local",
        source: row.model?.includes("gemini") ? "gemini" : "local",
        created_at: row.created_at,
      }));
      return mapped;
    }

    return [DEFAULT_GREETING];
  } catch (err) {
    console.error("Network error fetching chat history:", err);
    return [DEFAULT_GREETING];
  }
}

/**
 * Persists a new chat message to Supabase ai_conversations table (or local storage for guests).
 */
export async function persistChatMessage(message: ChatMessage, userId?: string | null): Promise<void> {
  const isGuest = !userId || userId === "guest_local" || userId.startsWith("guest");
  const cacheKey = getChatCacheKey(userId);

  // Always update local cache for instant client-side responsiveness
  try {
    const raw = localStorage.getItem(cacheKey);
    const prev: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const updated = [...prev.filter((m) => m.id !== "greeting"), message].slice(-20);
    localStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch {}

  if (isGuest) return;

  try {
    const { error } = await supabase.from("ai_conversations").insert({
      user_id: userId!,
      role: message.sender === "ai" ? "assistant" : "user",
      content: message.text,
      action_habits: (message.actionHabits as any) || [],
      intent: message.intent || null,
      model: message.model || "local",
    });

    if (error) {
      console.error("Failed to save chat message to Supabase:", error);
    }
  } catch (err) {
    console.error("Network error saving chat message to Supabase:", err);
  }
}

/**
 * Convenience wrapper for saving conversation messages.
 */
export async function saveConversationMessage(
  userId: string | null | undefined,
  message: {
    sender: "ai" | "user";
    text: string;
    actionHabits?: { id: string; name: string }[];
    agentAction?: AgentActionPayload;
    intent?: string;
    model?: string;
  }
): Promise<void> {
  const fullMsg: ChatMessage = {
    id: Date.now().toString(),
    sender: message.sender,
    text: message.text,
    actionHabits: message.actionHabits,
    agentAction: message.agentAction,
    intent: message.intent,
    model: message.model || "local",
    source: message.model?.includes("gemini") ? "gemini" : "local",
    created_at: new Date().toISOString(),
  };
  await persistChatMessage(fullMsg, userId);
}

/**
 * Clears the conversation history from Supabase and local cache.
 */
export async function clearConversationHistory(userId?: string | null): Promise<void> {
  const isGuest = !userId || userId === "guest_local" || userId.startsWith("guest");
  const cacheKey = getChatCacheKey(userId);

  try {
    localStorage.removeItem(cacheKey);
  } catch (err) {
    console.error("Failed to clear local chat cache:", err);
  }

  if (isGuest) return;

  try {
    const { error } = await supabase.from("ai_conversations").delete().eq("user_id", userId!);
    if (error) {
      console.error("Failed to delete chat conversations from database:", error);
    }
  } catch (err) {
    console.error("Network error deleting chat conversations from database:", err);
  }
}

export interface DispatchCoachOptions {
  message: string;
  habitContext: HabitContext;
  isPro: boolean;
  userId?: string | null;
  habits?: any[];
  reflections?: any[];
  chatHistory?: ChatMessage[];
}

export interface DispatchCoachResult {
  text: string;
  actionHabits?: { id: string; name: string }[];
  agentAction?: AgentActionPayload;
  model: string;
  source: "gemini" | "local";
  detectedIntent?: string;
}

/**
 * Dispatches the user's message through the Pro / Gemini pipeline or Local Coach Engine.
 */
export async function dispatchCoachMessage(options: {
  message: string;
  habitContext: HabitContext;
  isPro: boolean;
  userId?: string | null;
  habits?: any[];
  reflections?: any[];
  chatHistory?: ChatMessage[];
}): Promise<DispatchCoachResult> {
  const { message, habitContext, isPro, habits, reflections, chatHistory } = options;

  // Detect any action tool request from natural language (e.g. create habit, freeze streak, schedule reminder, start timer)
  const detectedAction = detectAgentAction(message, habits || []);

  // 1. Pro Users: Attempt to invoke Supabase Edge Function (Gemini 2.0 Flash)
  if (isPro) {
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach-chat", {
        body: {
          message,
          habits: (habits || []).map((h) => ({
            name: h.name,
            category: h.category,
            streak: h.streak,
            lastCompletedDate: h.lastCompletedDate,
            period: h.period,
          })),
          reflections: (reflections || []).map((r) => ({
            date: r.date,
            mood: r.mood,
            text: r.text,
          })),
          chatHistory: (chatHistory || []).slice(-10).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        },
      });

      // If Gemini response succeeded
      if (!error && data?.text && !data?.fallback) {
        return {
          text: data.text,
          agentAction: detectedAction || data.agentAction,
          model: data.model || "gemini-2.0-flash",
          source: "gemini",
        };
      }

      // If Edge Function flagged fallback (e.g. GEMINI_NOT_CONFIGURED or PRO_REQUIRED)
      if (data?.fallback) {
        console.log("ℹ️ Pro AI Edge Function returned fallback indicator:", data.message);
      }
    } catch (edgeError) {
      console.warn("⚠️ Pro AI Edge Function unavailable, falling back to local engine:", edgeError);
    }
  }

  // 2. Free Users OR Pro Fallback: Run local smart rule-based engine
  const localResponse: CoachResponse = getCoachResponse(message, habitContext);

  return {
    text: localResponse.text,
    actionHabits: localResponse.actionHabits,
    agentAction: detectedAction || undefined,
    model: "local-smart-engine",
    source: "local",
    detectedIntent: localResponse.detectedIntent,
  };
}

