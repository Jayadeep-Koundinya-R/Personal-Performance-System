/**
 * 🎯 Coach Engine Orchestrator
 *
 * HOW THIS WORKS (Learning Notes):
 * ─────────────────────────────────
 * This is the "brain" that connects everything:
 *
 *   User message
 *     → Intent Classifier (identifies WHAT the user wants)
 *     → Response Templates (generates a personalized reply using habit data)
 *     → Returns the final response
 *
 * This is called the "pipeline" pattern in AI/NLP:
 *   Input → Classify → Generate → Output
 *
 * The same pattern is used in production chatbots at scale.
 * When you upgrade to Gen AI (Phase 2), you'll replace the
 * "Generate" step with an API call, but the classify step
 * stays as a fallback.
 */

import { classifyIntent, type ClassificationResult } from "./intentClassifier";
import { RESPONSE_TEMPLATES, type HabitContext } from "./responseTemplates";

export interface CoachResponse {
  /** The response text to display */
  text: string;
  /** Optional action habits the user can complete from chat */
  actionHabits?: { id: string; name: string }[];
  /** The detected intent (for debugging / analytics) */
  detectedIntent: string;
  /** Confidence score of the classification */
  confidence: number;
}

/**
 * Build a HabitContext object from raw habit and reflection data.
 *
 * This is a "data preparation" step — we compute all the statistics
 * ONCE and pass them to templates, instead of each template
 * re-computing the same values.
 */
export function buildHabitContext(
  habits: any[],
  reflections: any[],
  getMaxStreak: () => number,
  isHabitDueToday: (h: any) => boolean,
  getTodayStr: () => string,
  displayName?: string,
): HabitContext {
  const todayStr = getTodayStr();
  const activeHabits = habits.filter((h) => !h.archived);
  const dueHabits = activeHabits.filter((h) => isHabitDueToday(h));
  const completedToday = dueHabits.filter((h) => (h.completedDates || []).includes(todayStr));
  const pendingToday = dueHabits.filter((h) => !(h.completedDates || []).includes(todayStr));
  const maxStreak = getMaxStreak();

  const totalCompletions = activeHabits.reduce(
    (sum, h) => sum + (h.completedDates?.length || 0),
    0
  );

  const topStreakHabits = [...activeHabits]
    .filter((h) => (h.streak || 0) > 0)
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))
    .slice(0, 3)
    .map((h) => ({ name: h.name, streak: h.streak || 0 }));

  const recentMoods = (reflections || [])
    .slice(0, 3)
    .map((r) => r.mood)
    .filter(Boolean);

  return {
    totalHabits: activeHabits.length,
    dueToday: dueHabits.length,
    completedToday: completedToday.length,
    pendingToday: pendingToday.length,
    completionRate: dueHabits.length > 0
      ? Math.round((completedToday.length / dueHabits.length) * 100)
      : 0,
    maxStreak,
    pendingNames: pendingToday.map((h) => h.name),
    completedNames: completedToday.map((h) => h.name),
    totalCompletions,
    topStreakHabits,
    recentMoods,
    displayName: displayName || "there",
  };
}

/**
 * Main coach function.
 *
 * This is the single entry point that AiChatWidget calls.
 * It replaces the old `generateLocalCoachAdvice()` function.
 *
 * @param message - Raw user message
 * @param context - Pre-built HabitContext
 * @returns CoachResponse with text, optional actions, and debug info
 */
export function getCoachResponse(
  message: string,
  context: HabitContext,
): CoachResponse {
  // Step 1: Classify the intent
  const classification: ClassificationResult = classifyIntent(message);

  // Step 2: Look up the response template for this intent
  const templateFn = RESPONSE_TEMPLATES[classification.intent] || RESPONSE_TEMPLATES["unknown"];

  // Step 3: Generate the response using the template + context
  const response = templateFn(context);

  // Step 4: If the template returned generic action habits with placeholder IDs,
  // try to resolve them to real habit IDs from the pending list
  // (Templates use `pending_0`, `pending_1` etc. as placeholders)
  let resolvedActions = response.actionHabits;
  if (resolvedActions && resolvedActions.length > 0) {
    // The templates create placeholder IDs like "pending_0" — but AiChatWidget
    // needs real habit IDs to call toggleCompletion(). We'll handle this in the
    // widget by matching names. For now, pass them through as-is.
  }

  return {
    text: response.text,
    actionHabits: resolvedActions,
    detectedIntent: classification.intent,
    confidence: classification.confidence,
  };
}
