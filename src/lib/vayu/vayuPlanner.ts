/**
 * 🌬️ Vayu Autonomous Planner & Circadian Rhythm Engine (Tasks 2.1 – 2.3)
 * 
 * Implements:
 * 1. 45/15 Dynamic Circadian Rhythm Generator aligned with 4 biological energy windows:
 *    - Morning Prime (08:00 – 12:00): Peak energy, high-cognitive deep work.
 *    - Afternoon Dip (13:00 – 16:00): Medium energy, tactical execution & drills.
 *    - Evening Consolidation (17:00 – 21:00): Medium/Recharge energy, physical vitality & review.
 *    - Agni Curfew (21:30 – 22:00): Vital recharge, digital wind-down & reflection.
 * 2. Zero-Guilt Fluid Schedule Rebalancer (`rebalanceSchedule`):
 *    - Shifts uncompleted blocks forward starting at currentTimeStr.
 *    - Preserves completed blocks and historical times.
 *    - Dynamically compresses later blocks and recharge buffers to protect the 22:00 Agni Curfew.
 *    - Attaches peaceful, stoic rebalance explanation.
 * 3. Ambient Natural Language Intent Classifier:
 *    - 0ms client-side keyword & token matching with Gemini edge function fallback.
 *    - Strict DOMPurify sanitization.
 */

import {
  VayuDailyPlan,
  VayuTimeBlock,
  VayuNaturalInputResult,
  VayuBlockCategory,
  VayuBlockStatus,
  VayuEnergyLevel,
} from "./types";
import { sanitizeWithDOMPurify } from "@/lib/security";
import { classifyIntent } from "@/lib/ai/intentClassifier";
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility: Converts "HH:MM" (24-hour) string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Utility: Converts minutes since midnight to "HH:MM" (24-hour) string
 */
export function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(mins, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Formats "HH:MM" 24h string to 12h display (e.g. "09:30" -> "9:30 AM")
 */
export function formatDisplayTime(timeStr: string): string {
  const mins = timeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const meridiem = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${meridiem}`;
}

export interface GeneratePlanOptions {
  userId: string;
  habits?: Array<{
    id: string;
    name: string;
    category?: string;
    priority?: string;
    period?: string;
    completed?: boolean;
    frequency?: string;
    archived?: boolean;
    completedDates?: string[];
  }>;
  activeTrack?: string; // "placements" | "gate" | "upsc" | "coding" | "fitness" | string
  userDirective?: string; // Optional user prompt: "I have 4 hours today, prioritize exam prep"
  targetDate?: string;    // YYYY-MM-DD
  startTimeMinutes?: number; // Starting minute of the day
  curfewTimeStr?: string; // default "22:00"
}

/**
 * Map habit category string to structured VayuBlockCategory
 */
function mapCategory(habitCategory?: string): VayuBlockCategory {
  const cat = (habitCategory || "").toLowerCase();
  if (cat.includes("product") || cat.includes("work") || cat.includes("code") || cat.includes("dev")) return "Deep Work";
  if (cat.includes("learn") || cat.includes("study") || cat.includes("read")) return "Learning";
  if (cat.includes("fit") || cat.includes("health") || cat.includes("walk") || cat.includes("gym")) return "Health";
  if (cat.includes("mind") || cat.includes("spirit") || cat.includes("meditat") || cat.includes("journal")) return "Mindset";
  if (cat.includes("rest") || cat.includes("break")) return "Rest";
  return "Custom";
}

/**
 * Track-adaptive titles for biological fallback slots (Zero Mock Policy compliant)
 */
function getTrackAdaptiveTitles(track?: string) {
  const t = (track || "").toLowerCase();
  if (t.includes("placement")) {
    return {
      morningDeep: "DSA Mastery: Core Algorithms & Data Structures",
      afternoonDrill: "Technical Problem Solving & System Drills",
      eveningVitality: "Physical Vitality & Calisthenics",
      eveningReview: "Mock Testing & Placement Prep Review",
    };
  }
  if (t.includes("gate")) {
    return {
      morningDeep: "GATE Core Theory & Mathematical Foundations",
      afternoonDrill: "Previous Year Question Drills & Formula Recall",
      eveningVitality: "Physical Vitality & Active Recovery",
      eveningReview: "Mock Testing & Spaced Repetition Review",
    };
  }
  if (t.includes("upsc")) {
    return {
      morningDeep: "Core General Studies: Analytical Reading",
      afternoonDrill: "Current Affairs Synthesis & Editorial Notes",
      eveningVitality: "Physical Vitality & Calisthenics",
      eveningReview: "Answer Writing Practice & Subject Review",
    };
  }
  if (t.includes("code") || t.includes("engineering")) {
    return {
      morningDeep: "Deep Work Sprint: Core Architecture & Implementation",
      afternoonDrill: "Code Review, Testing & Practice Drills",
      eveningVitality: "Physical Vitality & Calisthenics",
      eveningReview: "Technical Reading & System Debrief",
    };
  }
  if (t.includes("fit") || t.includes("health")) {
    return {
      morningDeep: "High-Energy Deep Focus & Knowledge Mastery",
      afternoonDrill: "Mindful Execution & Movement Optimization",
      eveningVitality: "Targeted Strength Training & Conditioning",
      eveningReview: "Mobility, Hydration & Recovery Review",
    };
  }
  return {
    morningDeep: "Morning Prime: High-Cognitive Deep Work",
    afternoonDrill: "Afternoon Execution: Practice Drills & Review",
    eveningVitality: "Physical Vitality & Calisthenics",
    eveningReview: "Evening Debrief & Habit Consolidation",
  };
}

/**
 * Task 2.1: 45/15 Dynamic Circadian Rhythm Generator
 * 
 * Constructs an Ultradian 45/15 schedule aligned with 4 human biological energy curves:
 * - Morning Prime (08:00 – 12:00): Peak energy (DSA, core engineering, theory).
 * - Afternoon Dip (13:00 – 16:00): Medium energy (practice drills, revision, quick admin).
 * - Evening Consolidation (17:00 – 21:00): Medium/Recharge energy (vitality, mock tests, habit review).
 * - Agni Curfew (21:30 – 22:00): Recharge energy (screen cutoff, digital wind-down).
 */
export function generateCircadianPlan(options: GeneratePlanOptions): VayuDailyPlan {
  const sanitizedDirective = sanitizeWithDOMPurify(options.userDirective || "");
  const todayStr = options.targetDate || new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Starting time of the plan: defaults to 08:00 AM for the complete circadian day flow
  const baseStartMinutes = options.startTimeMinutes !== undefined
    ? options.startTimeMinutes
    : 8 * 60;

  const curfewMinutes = timeToMinutes(options.curfewTimeStr || "22:00");
  const trackTitles = getTrackAdaptiveTitles(options.activeTrack);

  // 1. Filter active habits due today (uncompleted & unarchived)
  const rawHabits = options.habits || [];
  const pendingHabits = rawHabits.filter((h) => {
    if (h.archived) return false;
    if (h.completed) return false;
    if (h.completedDates && h.completedDates.includes(todayStr)) return false;
    return true;
  });

  // Separate habits into biological window preferences
  const morningQueue: typeof pendingHabits = [];
  const afternoonQueue: typeof pendingHabits = [];
  const eveningQueue: typeof pendingHabits = [];

  for (const h of pendingHabits) {
    const cat = (h.category || "").toLowerCase();
    const prio = (h.priority || "").toLowerCase();
    if (prio === "high" || cat.includes("product") || cat.includes("code") || cat.includes("work")) {
      morningQueue.push(h);
    } else if (cat.includes("fit") || cat.includes("health") || cat.includes("mind") || cat.includes("walk")) {
      eveningQueue.push(h);
    } else {
      afternoonQueue.push(h);
    }
  }

  // Fallback balancer: if morning queue is empty, shift from others
  const pullNextHabit = (preferredQueue: typeof pendingHabits) => {
    if (preferredQueue.length > 0) return preferredQueue.shift();
    if (morningQueue.length > 0) return morningQueue.shift();
    if (afternoonQueue.length > 0) return afternoonQueue.shift();
    if (eveningQueue.length > 0) return eveningQueue.shift();
    return null;
  };

  const blocks: VayuTimeBlock[] = [];
  let blockIndex = 1;

  // Helper to add an ultradian cycle (45m focus + 15m vital recharge)
  const addUltradianCycle = (
    startMins: number,
    focusTitle: string,
    focusCategory: VayuBlockCategory,
    focusEnergy: VayuEnergyLevel,
    rechargeTitle: string,
    preferredHabitQueue: typeof pendingHabits,
    focusDescription?: string
  ) => {
    if (startMins >= curfewMinutes) return;

    const matchedHabit = pullNextHabit(preferredHabitQueue);
    const title = matchedHabit ? matchedHabit.name : focusTitle;
    const category = matchedHabit ? mapCategory(matchedHabit.category) : focusCategory;
    const desc = focusDescription || (matchedHabit ? `Focused execution: ${matchedHabit.name}` : "High-cognitive focus sprint with zero distractions.");
    const duration = matchedHabit?.focus_duration_minutes || 45;

    // Focus sprint (duration dynamically inherits habit focus duration or 45m)
    blocks.push({
      id: `vayu_block_${blockIndex++}`,
      title: sanitizeWithDOMPurify(title),
      description: sanitizeWithDOMPurify(desc),
      category,
      habitId: matchedHabit?.id,
      linkedHabitId: matchedHabit?.id,
      habitName: matchedHabit ? sanitizeWithDOMPurify(matchedHabit.name) : undefined,
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(startMins + duration),
      durationMinutes: duration,
      status: "pending",
      energyLevel: focusEnergy,
      completionPercentage: 0,
      xpAwarded: 0,
      autoManaged: true,
    });

    // 15-min vital recharge break
    if (startMins + duration < curfewMinutes) {
      blocks.push({
        id: `vayu_block_${blockIndex++}`,
        title: sanitizeWithDOMPurify(rechargeTitle),
        description: sanitizeWithDOMPurify("Hydrate, step away from screens, restore mental bandwidth."),
        category: "Rest",
        startTime: minutesToTime(startMins + duration),
        endTime: minutesToTime(startMins + duration + 15),
        durationMinutes: 15,
        status: "pending",
        energyLevel: "recharge",
        completionPercentage: 0,
        xpAwarded: 0,
        autoManaged: true,
      });
    }
  };

  // ── Window 1: Morning Prime (08:00 – 12:00) — Peak Energy (45/15 x 4 cycles) ──
  const morningSlots = [
    { start: 8 * 60, title: trackTitles.morningDeep, desc: "Prime cognitive sprint on core difficult concepts." },
    { start: 9 * 60, title: "Deep Work Sprint: Complex Engineering & Problem Solving", desc: "Core algorithms and deep structural theory." },
    { start: 10 * 60, title: "Deep Work Sprint: Targeted Concept Mastery", desc: "Focus on hardest high-yield milestones." },
    { start: 11 * 60, title: "Deep Work Sprint: Core Theory Synthesis", desc: "Consolidate morning deep insights." },
  ];

  for (const slot of morningSlots) {
    if (slot.start >= baseStartMinutes) {
      addUltradianCycle(
        slot.start,
        slot.title,
        "Deep Work",
        "peak",
        "Vayu Prana: Mindful Recharge & Hydration",
        morningQueue,
        slot.desc
      );
    }
  }

  // ── Window 2: Afternoon Dip (13:00 – 16:00) — Medium Energy (45/15 x 3 cycles) ──
  const afternoonSlots = [
    { start: 13 * 60, title: trackTitles.afternoonDrill, desc: "Tactical drills, documentation & problem sets." },
    { start: 14 * 60, title: "Medium-Cognitive Drill: Revision & Spaced Practice", desc: "Practice question banks and quick active recall." },
    { start: 15 * 60, title: "Administrative & Code Review Sprint", desc: "Triage backlog, clear technical debt & organize notes." },
  ];

  for (const slot of afternoonSlots) {
    if (slot.start >= baseStartMinutes) {
      addUltradianCycle(
        slot.start,
        slot.title,
        "Learning",
        "medium",
        "Ultradian Reset: Posture, Breath & Hydration",
        afternoonQueue,
        slot.desc
      );
    }
  }

  // ── Window 3: Evening Consolidation (17:00 – 21:00) — Medium/Vitality (45/15 x 4 cycles) ──
  const eveningSlots = [
    { start: 17 * 60, title: trackTitles.eveningVitality, cat: "Health" as VayuBlockCategory, desc: "Physical vitality, calisthenics or aerobic movement." },
    { start: 18 * 60, title: trackTitles.eveningReview, cat: "Learning" as VayuBlockCategory, desc: "Mock testing, timed practice & system review." },
    { start: 19 * 60, title: "Active Recall & Syllabus Synthesis", cat: "Learning" as VayuBlockCategory, desc: "Spaced retrieval of daily milestones." },
    { start: 20 * 60, title: "Daily Habit Debrief & Insights Review", cat: "Mindset" as VayuBlockCategory, desc: "Review daily wins, log reflections and audit XP." },
  ];

  for (const slot of eveningSlots) {
    if (slot.start >= baseStartMinutes) {
      addUltradianCycle(
        slot.start,
        slot.title,
        slot.cat,
        "medium",
        "Evening Respiration: Calm Walking & Hydration",
        eveningQueue,
        slot.desc
      );
    }
  }

  // ── Window 4: Agni Curfew (21:30 – 22:00) — Recharge Energy ──
  if (baseStartMinutes <= 21 * 60 + 30) {
    blocks.push({
      id: `vayu_block_${blockIndex++}`,
      title: sanitizeWithDOMPurify("Agni Curfew: Screen Cutoff & Journaling"),
      description: sanitizeWithDOMPurify("Digital wind-down, sleep environment preparation, zero blue light."),
      category: "Mindset",
      startTime: "21:30",
      endTime: "22:00",
      durationMinutes: 30,
      status: "pending",
      energyLevel: "recharge",
      completionPercentage: 0,
      xpAwarded: 0,
      autoManaged: true,
    });
  }

  // Fallback: If current time is late or baseStartMinutes produced fewer than 3 blocks, ensure at least 3 blocks starting from baseStartMinutes
  if (blocks.length < 3) {
    let cursor = baseStartMinutes;
    while (blocks.length < 3 && cursor + 45 <= curfewMinutes) {
      addUltradianCycle(
        cursor,
        trackTitles.morningDeep,
        "Deep Work",
        "peak",
        "Vayu Prana: Mindful Recharge",
        morningQueue
      );
      cursor += 60;
    }
  }

  const totalMinutes = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  const strategySummary = sanitizedDirective
    ? `Tailored circadian flow incorporating directive: "${sanitizedDirective}". Balanced for sustained cognitive stamina.`
    : `Circadian 45/15 Ultradian flow tailored to ${options.activeTrack || "your daily focus"}. Peak focus morning, tactical afternoon, consolidation evening.`;

  return {
    id: `vayu_plan_${todayStr}_${Math.random().toString(36).slice(2, 8)}`,
    userId: options.userId,
    date: todayStr,
    blocks,
    totalTargetMinutes: totalMinutes,
    completedMinutes: 0,
    overallCompletionRate: 0,
    aiStrategySummary: sanitizeWithDOMPurify(strategySummary),
    currentVitalFocus: blocks[0]?.title || "Daily Flow",
    lastRecalibratedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    needsRebalance: false,
    minutesPushedForward: 0,
  };
}

/**
 * Backward compatible alias for generateCircadianPlan
 */
export const generateVayuPlan = generateCircadianPlan;

/**
 * Task 2.2: Pure Zero-Guilt Fluid Schedule Rebalancer
 * 
 * Rules:
 * - Pure function: (currentPlan, currentTimeStr, curfewTimeStr) => newPlan
 * - Slides pending/in-progress blocks forward starting at currentTimeStr.
 * - Preserves completed blocks and their historical start/end times.
 * - Compresses remaining blocks dynamically so Agni Curfew (22:00) is never breached.
 * - Computes minutesPushedForward and attaches a peaceful, stoic rebalanceExplanation.
 */
export function rebalanceSchedule(
  currentPlan: VayuDailyPlan,
  currentTimeStr: string, // "HH:MM"
  curfewTimeStr: string = "22:00"
): VayuDailyPlan {
  if (!currentPlan || !currentPlan.blocks || currentPlan.blocks.length === 0) {
    return {
      ...currentPlan,
      needsRebalance: false,
      minutesPushedForward: 0,
    };
  }

  const currentMinutes = timeToMinutes(currentTimeStr);
  const curfewMinutes = timeToMinutes(curfewTimeStr);

  // 1. Separate completed blocks from uncompleted blocks
  const completedBlocks: VayuTimeBlock[] = [];
  const uncompletedBlocks: VayuTimeBlock[] = [];

  for (const block of currentPlan.blocks) {
    if (block.status === "completed" || block.completionPercentage === 100) {
      completedBlocks.push(block);
    } else {
      uncompletedBlocks.push(block);
    }
  }

  // If no uncompleted blocks, nothing to rebalance
  if (uncompletedBlocks.length === 0) {
    return {
      ...currentPlan,
      needsRebalance: false,
      minutesPushedForward: 0,
      rebalanceExplanation: sanitizeWithDOMPurify("All scheduled blocks completed for today. Agni Curfew fully protected."),
      lastRecalibratedAt: new Date().toISOString(),
    };
  }

  // 2. Determine start cursor
  // Cannot start earlier than currentTime, nor earlier than the end of the last completed block
  const maxCompletedEnd = completedBlocks.reduce((max, b) => {
    return Math.max(max, timeToMinutes(b.endTime));
  }, 0);

  const cursor = Math.max(currentMinutes, maxCompletedEnd);

  // Compute how many minutes the schedule is pushed forward
  const firstUncompleted = uncompletedBlocks[0];
  const firstUncompletedStart = timeToMinutes(firstUncompleted.startTime);
  const minutesPushedForward = Math.max(0, cursor - firstUncompletedStart);

  // 3. Dynamic compression to protect Agni Curfew
  const availableMinutes = Math.max(15, curfewMinutes - cursor);
  const totalOriginalPendingDuration = uncompletedBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);

  // If total duration exceeds remaining time before curfew, compute compression ratio
  const compressionRatio = totalOriginalPendingDuration > availableMinutes
    ? availableMinutes / totalOriginalPendingDuration
    : 1.0;

  let currentBlockCursor = cursor;

  const rebalancedPendingBlocks: VayuTimeBlock[] = uncompletedBlocks.map((block) => {
    // Minimum 20 mins for deep work/learning, 5 mins for rest
    const minDuration = block.energyLevel === "recharge" || block.category === "Rest" ? 5 : 20;
    const scaledDuration = Math.max(minDuration, Math.round(block.durationMinutes * compressionRatio));
    
    // Ensure we do not overflow curfew
    const startMins = currentBlockCursor;
    const endMins = Math.min(curfewMinutes, startMins + scaledDuration);
    const duration = Math.max(5, endMins - startMins);
    currentBlockCursor = endMins;

    // Zero-Guilt Status: mark delayed if it was shifted from a past time, but do NOT mark failed
    const isShifted = startMins > timeToMinutes(block.startTime);
    const status: VayuBlockStatus = isShifted ? "delayed" : "pending";

    return {
      ...block,
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(endMins),
      durationMinutes: duration,
      status,
    };
  });

  // Combine back in chronological order
  const updatedBlocks = currentPlan.blocks.map((original) => {
    if (original.status === "completed" || original.completionPercentage === 100) {
      return original;
    }
    const found = rebalancedPendingBlocks.find((b) => b.id === original.id);
    return found || original;
  });

  // Calculate new total planned minutes
  const totalTargetMinutes = updatedBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  // Peaceful, non-punitive stoic explanation
  const explanation = minutesPushedForward > 0
    ? `Schedule gently shifted forward by ${minutesPushedForward} mins. All remaining sessions compressed cleanly to protect your ${formatDisplayTime(curfewTimeStr)} Agni Curfew with zero guilt.`
    : `Schedule aligned with current biological rhythm. Agni Curfew at ${formatDisplayTime(curfewTimeStr)} protected.`;

  return {
    ...currentPlan,
    blocks: updatedBlocks,
    totalTargetMinutes,
    needsRebalance: false,
    minutesPushedForward,
    rebalanceExplanation: sanitizeWithDOMPurify(explanation),
    lastRecalibratedAt: new Date().toISOString(),
  };
}

/**
 * Backward-compatible helper for rebalanceSchedule
 */
export function rebalanceVayuSchedule(plan: VayuDailyPlan, currentMinutesOfDay?: number): VayuDailyPlan {
  const now = new Date();
  const currentMinutes = currentMinutesOfDay !== undefined
    ? currentMinutesOfDay
    : now.getHours() * 60 + now.getMinutes();

  return rebalanceSchedule(plan, minutesToTime(currentMinutes), "22:00");
}

/**
 * Finds the item with the highest token overlap against user input.
 * Semantic token comparison replaces brittle static regexes.
 */
function findBestTokenMatch<T extends { id: string; name?: string; title?: string }>(
  input: string,
  items: T[]
): { item: T; score: number } | null {
  if (!items || items.length === 0) return null;

  const normalizeTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const inputTokens = new Set(normalizeTokens(input));
  if (inputTokens.size === 0) return null;

  let bestItem: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const itemName = item.name || item.title || "";
    const itemTokens = normalizeTokens(itemName);
    if (itemTokens.length === 0) continue;

    let overlap = 0;
    for (const token of itemTokens) {
      if (inputTokens.has(token)) {
        overlap++;
      }
    }

    const overlapScore = overlap / itemTokens.length;
    const itemLower = itemName.toLowerCase();
    const inputLower = input.toLowerCase();
    const substringBonus = (inputLower.includes(itemLower) || itemLower.includes(inputLower)) ? 0.6 : 0;
    const finalScore = overlapScore + substringBonus;

    if (finalScore > bestScore && finalScore >= 0.4) {
      bestScore = finalScore;
      bestItem = item;
    }
  }

  return bestItem ? { item: bestItem, score: bestScore } : null;
}

/**
 * Extracts percentage completion if mentioned (e.g. "50%", "halfway", "80%")
 */
function extractCompletionPercentage(input: string): number {
  const percentMatch = input.match(/(\d{1,3})\s*%/);
  if (percentMatch) {
    return Math.min(100, Math.max(10, parseInt(percentMatch[1], 10)));
  }
  if (/\bhalf(?:way)?\b/i.test(input)) {
    return 50;
  }
  return 100;
}

/**
 * Task 2.3: Ambient Natural Language Intent Intake Parser
 * 
 * Evaluates user input using:
 * 1. DOMPurify sanitization.
 * 2. 0ms client-side intent classification with token matching.
 * 3. Gemini Pro edge function fallback for ambiguous or low-confidence requests (< 0.35).
 */
export async function parseVayuNaturalInput(
  rawInput: string,
  plan: VayuDailyPlan | null,
  habits: Array<{ id: string; name: string; category?: string }> = []
): Promise<VayuNaturalInputResult> {
  // Step 1: DOMPurify Sanitization
  const sanitizedInput = sanitizeWithDOMPurify(rawInput);
  if (!sanitizedInput) {
    return {
      action: "clarification_needed",
      completionPercentage: 0,
      feedback: sanitizeWithDOMPurify("Please enter a valid command or reflection for Vayu."),
      xpAwarded: 0,
    };
  }

  const lower = sanitizedInput.toLowerCase();

  // Fast Client-Side Sprint Launch Intent
  if (lower.includes("sprint") || lower.includes("start focus") || lower.includes("deep work now") || lower.includes("start timer")) {
    const minsMatch = lower.match(/(\d{1,3})\s*(?:m|min|mins|minute|minutes)/);
    const suggestedMins = minsMatch ? parseInt(minsMatch[1], 10) : 45;
    return {
      action: "start_sprint",
      completionPercentage: 0,
      suggestedDurationMinutes: suggestedMins,
      feedback: sanitizeWithDOMPurify(`Launching ${suggestedMins}-minute focus sprint. All notifications silenced.`),
      xpAwarded: 0,
    };
  }

  // Fast Client-Side Rebalance / Schedule Intent
  if (
    lower.includes("rebalance") ||
    lower.includes("running late") ||
    lower.includes("behind schedule") ||
    lower.includes("push schedule") ||
    lower.includes("shift tasks") ||
    lower.includes("slide schedule")
  ) {
    return {
      action: "schedule_rebalanced",
      completionPercentage: 0,
      feedback: sanitizeWithDOMPurify("Vayu schedule fluidly recalibrated starting from your current time."),
      xpAwarded: 0,
    };
  }

  // Fast Client-Side Plan Generation Intent
  if (lower.includes("plan my day") || lower.includes("generate schedule") || lower.includes("new flow") || lower.includes("plan today")) {
    return {
      action: "plan_created",
      completionPercentage: 0,
      feedback: sanitizeWithDOMPurify("Vayu circadian flow generated. 45/15 rhythms aligned with your biological windows."),
      xpAwarded: 0,
    };
  }

  // Fast Client-Side Completion Intent
  if (
    lower.startsWith("finish") ||
    lower.startsWith("done") ||
    lower.startsWith("completed") ||
    lower.includes("finished") ||
    lower.includes("done with") ||
    lower.includes("completed ")
  ) {
    const minsMatch = lower.match(/(\d{1,3})\s*(?:m|min|mins|minute|minutes)/);
    const duration = minsMatch ? parseInt(minsMatch[1], 10) : 45;
    const completionPercentage = extractCompletionPercentage(sanitizedInput);
    const taskMatch = sanitizedInput
      .replace(/^(?:finished|done with|done|completed)\s*/i, "")
      .replace(/\s*\d{1,3}\s*(?:m|min|mins|minute|minutes)\s*/i, " ")
      .trim();

    // 1. Check matching block in active plan
    if (plan && plan.blocks.length > 0) {
      const matchedBlockMatch = findBestTokenMatch(taskMatch || sanitizedInput, plan.blocks);
      if (matchedBlockMatch) {
        return {
          matchedBlockId: matchedBlockMatch.item.id,
          matchedHabitId: matchedBlockMatch.item.habitId || matchedBlockMatch.item.linkedHabitId,
          action: "completed_block",
          completionPercentage,
          feedback: sanitizeWithDOMPurify(
            `Marked "${matchedBlockMatch.item.title}" as ${completionPercentage}% completed (+15 XP). Flow logged.`
          ),
          xpAwarded: completionPercentage >= 100 ? 15 : 10,
        };
      }
    }

    // 2. Check matching habit in habits list
    if (habits && habits.length > 0) {
      const matchedHabitMatch = findBestTokenMatch(taskMatch || sanitizedInput, habits);
      if (matchedHabitMatch) {
        return {
          matchedHabitId: matchedHabitMatch.item.id,
          action: "completed_habit",
          completionPercentage,
          feedback: sanitizeWithDOMPurify(
            `Marked "${matchedHabitMatch.item.name}" as completed (+10 XP). Streaks updated.`
          ),
          xpAwarded: 10,
        };
      }
    }

    // 3. General task completion logged
    return {
      action: "task_completed",
      completionPercentage,
      suggestedDurationMinutes: duration,
      targetHabitName: taskMatch || undefined,
      feedback: sanitizeWithDOMPurify(
        `Logged ${duration}m of ${taskMatch || "focused deep work"}. +15 XP awarded!`
      ),
      xpAwarded: 15,
    };
  }

  // Step 2: Phase 1 Local Intent Classifier
  const classification = classifyIntent(sanitizedInput);
  const { intent, confidence } = classification;

  // Step 3: Low-Confidence Fallback to Gemini Edge Function
  if (confidence < 0.35 || intent === "unknown") {
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach-chat", {
        body: {
          message: sanitizedInput,
          habits: habits.map((h) => ({ name: h.name, category: h.category })),
          chatHistory: [],
        },
      });

      if (!error && data?.text && !data?.fallback) {
        const geminiText = sanitizeWithDOMPurify(data.text);
        if (data.agentAction?.actionType === "START_FOCUS_TIMER") {
          return {
            action: "start_sprint",
            completionPercentage: 0,
            suggestedDurationMinutes: 45,
            feedback: geminiText,
            xpAwarded: 0,
          };
        }

        // Check if Gemini detected completion
        if (/complet|done|finish/i.test(geminiText)) {
          const combined = `${sanitizedInput} ${geminiText}`;
          if (plan?.blocks && plan.blocks.length > 0) {
            const matchedBlockMatch = findBestTokenMatch(combined, plan.blocks);
            if (matchedBlockMatch) {
              return {
                matchedBlockId: matchedBlockMatch.item.id,
                matchedHabitId: matchedBlockMatch.item.habitId || matchedBlockMatch.item.linkedHabitId,
                action: "completed_block",
                completionPercentage: 100,
                feedback: sanitizeWithDOMPurify(`Gemini AI confirmed: "${matchedBlockMatch.item.title}" completed (+15 XP).`),
                xpAwarded: 15,
              };
            }
          }

          const matchedHabitMatch = findBestTokenMatch(combined, habits);
          if (matchedHabitMatch) {
            return {
              matchedHabitId: matchedHabitMatch.item.id,
              action: "completed_habit",
              completionPercentage: 100,
              feedback: sanitizeWithDOMPurify(`Gemini AI confirmed: "${matchedHabitMatch.item.name}" completed (+10 XP).`),
              xpAwarded: 10,
            };
          }
        }

        return {
          action: "clarification_needed",
          completionPercentage: 0,
          feedback: geminiText,
          xpAwarded: 0,
        };
      }
    } catch {
      // Edge function offline or dormant: continue with local processing
    }
  }

  // Step 4: Handle Classified Intent (No hardcoded regex)
  const completionPercentage = extractCompletionPercentage(sanitizedInput);

  // A. Completion Intent ("celebrate", or input matches a habit/block name directly)
  if (intent === "celebrate" || intent === "exercise" || intent === "focus") {
    // 1. Check matching block in active plan
    if (plan && plan.blocks.length > 0) {
      const match = findBestTokenMatch(sanitizedInput, plan.blocks);
      if (match) {
        const matchedBlock = match.item;
        return {
          matchedBlockId: matchedBlock.id,
          matchedHabitId: matchedBlock.habitId || matchedBlock.linkedHabitId,
          action: "completed_block",
          completionPercentage,
          feedback: sanitizeWithDOMPurify(
            `Vayu verified: Marked "${matchedBlock.title}" as ${completionPercentage}% completed (+15 XP). Vital flow updated.`
          ),
          xpAwarded: completionPercentage >= 100 ? 15 : 10,
        };
      }
    }

    // 2. Check matching habit directly
    const habitMatch = findBestTokenMatch(sanitizedInput, habits);
    if (habitMatch) {
      return {
        matchedHabitId: habitMatch.item.id,
        action: "completed_habit",
        completionPercentage,
        feedback: sanitizeWithDOMPurify(
          `Vayu verified: Logged "${habitMatch.item.name}" as completed (+10 XP). Streaks updated.`
        ),
        xpAwarded: 10,
      };
    }
  }

  // B. Scheduling & Rebalancing Intent ("time_management")
  if (intent === "time_management") {
    return {
      action: "schedule_rebalanced",
      completionPercentage: 0,
      feedback: sanitizeWithDOMPurify("Vayu dynamic schedule fluidly recalibrated for the remaining hours."),
      xpAwarded: 0,
    };
  }

  // C. Audit / Status Intent
  if (intent === "audit") {
    const done = plan ? plan.completedMinutes : 0;
    const total = plan ? plan.totalTargetMinutes : 0;
    const rate = plan ? plan.overallCompletionRate : 0;
    return {
      action: "clarification_needed",
      completionPercentage: rate,
      feedback: sanitizeWithDOMPurify(
        `Vayu Flow Status: ${done} of ${total} planned minutes completed (${rate}% vital momentum).`
      ),
      xpAwarded: 0,
    };
  }

  // D. General Fallback
  return {
    action: "clarification_needed",
    completionPercentage: 0,
    feedback: sanitizeWithDOMPurify(
      `Vayu heard: "${sanitizedInput}". Try reporting a completed task like "Finished [Habit Name]" or "Plan my day".`
    ),
    xpAwarded: 0,
  };
}
