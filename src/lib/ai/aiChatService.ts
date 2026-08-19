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
  model?: string;
  created_at?: string;
  source?: "gemini" | "local";
}

function getChatCacheKey(userId?: string | null): string {
  return userId ? `pps_ai_chat_${userId}` : "pps_ai_chat_guest";
}

/**
 * Loads recent messages for continuous chat memory across sessions.
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

  // 1. If user is logged in, try loading persistent history from Supabase
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, role, content, action_habits, model, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        // Reverse descending query to display in chronological order (oldest to newest)
        const history: ChatMessage[] = data.reverse().map((row: any) => ({
          id: row.id,
          sender: row.role === "user" ? "user" : "ai",
          text: row.content,
          actionHabits: (row.action_habits as any) || undefined,
          model: row.model || "local",
          source: row.model?.includes("gemini") ? "gemini" : "local",
          created_at: row.created_at,
        }));
        // Update user-specific local cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(history));
        } catch {}
        return history;
      }
    } catch (err) {
      console.warn("Could not load cloud chat history, checking user local cache:", err);
    }
  }

  // 2. Fallback to user-scoped localStorage cache (for guest or offline sessions)
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(-10);
      }
    }
  } catch (err) {
    console.error("Error reading local chat cache:", err);
  }

  return [defaultGreeting];
}

/**
 * Persists a message to Supabase (for authenticated users) and user-scoped localStorage.
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
  const cacheKey = getChatCacheKey(userId);

  // 1. Update user-scoped localStorage cache
  try {
    const raw = localStorage.getItem(cacheKey);
    const history: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: message.sender,
      text: message.text,
      actionHabits: message.actionHabits,
      agentAction: message.agentAction,
      model: message.model || "local",
      source: message.model?.includes("gemini") ? "gemini" : "local",
      created_at: new Date().toISOString(),
    };
    history.push(newMsg);
    // Keep last 20 messages in local storage for this specific user/guest
    localStorage.setItem(cacheKey, JSON.stringify(history.slice(-20)));
  } catch (err) {
    console.error("Failed to update local chat cache:", err);
  }

  // 2. Persist to Supabase if authenticated user
  if (userId) {
    try {
      await supabase.from("ai_conversations").insert({
        user_id: userId,
        role: message.sender === "user" ? "user" : "assistant",
        content: message.text,
        action_habits: (message.actionHabits as any) || null,
        intent: message.intent || null,
        model: message.model || "local",
      });
    } catch (err) {
      console.warn("Failed to persist message to Supabase ai_conversations:", err);
    }
  }
}

/**
 * Clears the conversation history in Supabase and user-scoped local cache.
 */
export async function clearConversationHistory(userId?: string | null): Promise<void> {
  const cacheKey = getChatCacheKey(userId);
  try {
    localStorage.removeItem(cacheKey);
  } catch (err) {
    console.error("Failed to clear local chat cache:", err);
  }

  if (userId) {
    try {
      await supabase.from("ai_conversations").delete().eq("user_id", userId);
    } catch (err) {
      console.warn("Failed to clear cloud conversation history:", err);
    }
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

