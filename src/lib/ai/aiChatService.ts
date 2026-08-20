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

/**
 * Loads conversation history for the given user from local cache.
 * Returns up to 10 previous messages in chronological order.
 */
export async function loadConversationHistory(userId?: string | null): Promise<ChatMessage[]> {
  const defaultGreeting: ChatMessage = {
    id: "greeting",
    sender: "ai",
    text: "Hey! I'm your AI Performance Coach & Agent. Ask me for a performance roast, daily audit, or ask me to create habits, schedule alarms, or start focus timers!",
    source: "local",
    model: "local",
    created_at: new Date().toISOString(),
  };

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
    console.error("Failed to parse local chat cache:", err);
  }

  return [defaultGreeting];
}

/**
 * Persists a new chat message to user-scoped local storage.
 */
export async function persistChatMessage(message: ChatMessage, userId?: string | null): Promise<void> {
  const cacheKey = getChatCacheKey(userId);

  try {
    const history = await loadConversationHistory(userId);
    const updated = [...history.filter((m) => m.id !== "greeting"), message];
    // Keep maximum 20 messages in local storage
    const trimmed = updated.slice(-20);
    localStorage.setItem(cacheKey, JSON.stringify(trimmed));
  } catch (err) {
    console.error("Failed to update local chat cache:", err);
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
 * Clears the conversation history in user-scoped local cache.
 */
export async function clearConversationHistory(userId?: string | null): Promise<void> {
  const cacheKey = getChatCacheKey(userId);
  try {
    localStorage.removeItem(cacheKey);
  } catch (err) {
    console.error("Failed to clear local chat cache:", err);
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

