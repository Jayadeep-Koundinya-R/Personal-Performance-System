/**
 * 🧠 Intent Classifier Engine
 *
 * HOW THIS WORKS (Learning Notes):
 * ─────────────────────────────────
 * A "rule-based" chatbot doesn't use an AI model — it uses PATTERN MATCHING.
 * We define a list of "intents" (what the user WANTS), each with keywords.
 *
 * When a user sends a message, we:
 *   1. Normalize it (lowercase, strip punctuation)
 *   2. Score every intent by counting how many of its keywords appear
 *   3. Return the highest-scoring intent (+ a confidence score 0-1)
 *
 * This is the same technique used in early Siri, Alexa, and most FAQ chatbots.
 * It's fast, free, and works offline — perfect for the free tier.
 *
 * FUTURE UPGRADE PATH:
 * When you move to Gen AI (Phase 2), this classifier becomes a "fallback"
 * that only runs when the API is unavailable. The architecture is designed
 * so you can swap in a real AI classifier later without changing the rest.
 */

export interface Intent {
  /** Unique identifier for this intent */
  name: string;
  /** Human-readable label shown in debug/logs */
  label: string;
  /** Keywords that signal this intent. More matches = higher confidence. */
  keywords: string[];
  /** Partial-match patterns (substring matching, e.g. "procrastinat" matches "procrastinating") */
  partials: string[];
  /** Bonus weight — boost intents that are more specific (default 1) */
  weight: number;
}

export interface ClassificationResult {
  /** The matched intent name */
  intent: string;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** All scored intents for debugging */
  scores: { intent: string; score: number }[];
}

/**
 * Master intent registry.
 *
 * HOW TO ADD A NEW INTENT:
 * 1. Add an object with name, label, keywords, partials, and weight.
 * 2. Add a matching response template in responseTemplates.ts
 * 3. That's it — the engine picks it up automatically.
 */
export const INTENT_REGISTRY: Intent[] = [
  {
    name: "greeting",
    label: "Greeting",
    keywords: ["hi", "hello", "hey", "yo", "sup", "howdy", "greetings", "good morning", "good evening", "good afternoon"],
    partials: [],
    weight: 0.8, // slightly lower weight so specific intents win over casual greetings
  },
  {
    name: "roast",
    label: "Performance Roast",
    keywords: ["roast", "burn", "flame", "drag", "criticize", "destroy", "savage", "brutal", "harsh", "mean"],
    partials: [],
    weight: 1.2,
  },
  {
    name: "audit",
    label: "Daily Audit",
    keywords: ["audit", "pending", "remaining", "left", "todo", "checklist", "what's left", "status", "progress", "overview"],
    partials: [],
    weight: 1.0,
  },
  {
    name: "motivation",
    label: "Motivation Boost",
    keywords: ["motivate", "inspire", "encourage", "push", "lazy", "unmotivated", "tired", "give up", "cant do it", "i quit"],
    partials: ["motiv", "inspir", "encour"],
    weight: 1.0,
  },
  {
    name: "focus",
    label: "Focus & Deep Work",
    keywords: ["focus", "concentrate", "distracted", "attention", "deep work", "flow state", "zone", "scattered", "procrastinate", "procrastinating", "procrastination"],
    partials: ["procrastinat", "distract"],
    weight: 1.0,
  },
  {
    name: "streak",
    label: "Streak & Consistency",
    keywords: ["streak", "consistent", "chain", "freeze", "shield", "miss", "skip", "break", "lost", "broken"],
    partials: ["consist"],
    weight: 1.0,
  },
  {
    name: "stats",
    label: "My Statistics",
    keywords: ["stats", "statistics", "numbers", "data", "performance", "score", "xp", "level", "points", "rank"],
    partials: ["statistic"],
    weight: 1.0,
  },
  {
    name: "weekly_review",
    label: "Weekly Review",
    keywords: ["week", "weekly", "review", "recap", "summary", "last 7 days", "this week", "past week"],
    partials: [],
    weight: 1.0,
  },
  {
    name: "habit_suggest",
    label: "Habit Suggestions",
    keywords: ["suggest", "recommend", "idea", "new habit", "what should i track", "add habit", "create habit"],
    partials: ["suggest", "recommend"],
    weight: 1.0,
  },
  {
    name: "time_management",
    label: "Time Management",
    keywords: ["time", "schedule", "when", "best time", "morning", "evening", "daily routine", "plan my day", "daily plan"],
    partials: [],
    weight: 0.9,
  },
  {
    name: "celebrate",
    label: "Celebration",
    keywords: ["done", "finished", "completed", "perfect", "100%", "all done", "crushed it", "nailed it", "yay", "woohoo"],
    partials: ["celebrat", "accomplish"],
    weight: 1.0,
  },
  {
    name: "sleep",
    label: "Sleep & Recovery",
    keywords: ["sleep", "rest", "nap", "insomnia", "tired", "exhausted", "burnout", "recovery", "recharge"],
    partials: ["exhaust"],
    weight: 0.9,
  },
  {
    name: "exercise",
    label: "Exercise & Fitness",
    keywords: ["exercise", "workout", "workout routine", "gym", "gym routine", "run", "jog", "fitness", "push ups", "training", "cardio", "yoga", "exercises"],
    partials: ["exercis", "workout"],
    weight: 1.0,
  },
  {
    name: "help",
    label: "Help & Capabilities",
    keywords: ["help", "what can you do", "commands", "features", "abilities", "how to use", "guide", "tutorial"],
    partials: [],
    weight: 0.8,
  },
  {
    name: "compare",
    label: "Progress Comparison",
    keywords: ["compare", "versus", "vs", "better", "worse", "improvement", "compared to", "last week", "yesterday"],
    partials: ["compar", "improv"],
    weight: 1.0,
  },
  {
    name: "create_habit",
    label: "Create Habit Action",
    keywords: ["create habit", "add habit", "new habit", "add a habit", "create a habit", "track a new habit", "start a habit", "set up habit"],
    partials: [],
    weight: 1.3,
  },
  {
    name: "freeze_streak",
    label: "Streak Freeze Action",
    keywords: ["freeze streak", "freeze my streak", "protect streak", "shield streak", "streak freeze", "sick today", "vacation freeze", "save streak"],
    partials: ["freez"],
    weight: 1.3,
  },
  {
    name: "schedule_reminder",
    label: "Schedule Reminder / Alarm",
    keywords: ["set reminder", "set alarm", "schedule reminder", "remind me", "alarm at", "reminder at", "daily alarm", "set a reminder"],
    partials: [],
    weight: 1.3,
  },
  {
    name: "start_timer",
    label: "Start Focus Timer",
    keywords: ["start focus", "start timer", "pomodoro session", "deep work timer", "focus timer", "launch timer", "focus session", "start a timer"],
    partials: ["pomodoro"],
    weight: 1.3,
  },
  {
    name: "gratitude",
    label: "Gratitude & Reflection",
    keywords: ["grateful", "thankful", "appreciate", "gratitude", "blessed", "lucky", "reflection", "journal"],
    partials: ["grat"],
    weight: 0.8,
  },
];

/**
 * Normalize a user message for matching.
 * Strips punctuation, lowercases, trims whitespace.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // replace punctuation with spaces
    .replace(/\s+/g, " ")     // collapse multiple spaces
    .trim();
}

/**
 * Classify a user message into an intent.
 *
 * HOW THE SCORING WORKS:
 *   - Each exact keyword match in the message → +1 point
 *   - Each partial (substring) match → +0.7 points
 *   - Final score = (raw points × intent weight) / total keywords in intent
 *   - The normalization by keyword count prevents intents with many keywords
 *     from always winning just because they have more chances to match.
 *
 * @param message - The raw user message
 * @returns ClassificationResult with the winning intent and confidence
 */
export function classifyIntent(message: string): ClassificationResult {
  const normalized = normalize(message);
  const words = normalized.split(" ");

  const scores: { intent: string; score: number }[] = [];

  for (const intent of INTENT_REGISTRY) {
    let rawScore = 0;

    // Exact keyword matching
    for (const keyword of intent.keywords) {
      if (keyword.includes(" ")) {
        // Multi-word keyword: check as substring
        if (normalized.includes(keyword)) {
          rawScore += 1;
        }
      } else {
        // Single-word keyword: check in word list
        if (words.includes(keyword)) {
          rawScore += 1;
        }
      }
    }

    // Partial/substring matching (for stems like "procrastinat" → "procrastinating")
    for (const partial of intent.partials) {
      if (normalized.includes(partial)) {
        rawScore += 0.7;
      }
    }

    // Weighted + normalized score
    const totalPatterns = intent.keywords.length + intent.partials.length;
    const normalizedScore = totalPatterns > 0
      ? (rawScore * intent.weight) / Math.sqrt(totalPatterns) // sqrt normalization
      : 0;

    scores.push({ intent: intent.name, score: normalizedScore });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0]?.score ?? 0;
  const topIntent = scores[0]?.intent ?? "unknown";

  // Calculate confidence (0-1) — we cap the raw score contribution
  const confidence = Math.min(topScore / 1.5, 1);

  return {
    intent: confidence >= 0.15 ? topIntent : "unknown",
    confidence,
    scores,
  };
}
