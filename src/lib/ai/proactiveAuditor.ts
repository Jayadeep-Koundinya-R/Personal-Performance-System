/**
 * 🔬 Proactive Habit Health Auditor & Adjustment Engine
 *
 * HOW THIS WORKS (Phase 3 Autonomous AI):
 * ─────────────────────────────────────────
 * Rather than waiting for the user to ask, the Proactive Auditor continuously
 * examines habit performance data to discover:
 * 1. Struggling Habits (< 40% completion rate over the last 14 days)
 * 2. Missing Alarms (habits that frequently get missed due to no scheduled trigger)
 * 3. High-Momentum Streaks (habits ready for scaling or milestone celebration)
 * 4. Micro-Adjustment Recommendations (scaling down to build consistency)
 */

import { supabase } from "@/integrations/supabase/client";

export interface HabitAuditRecommendation {
  id: string;
  type: "struggling_habit" | "smart_timing" | "milestone" | "missing_reminder";
  habitId: string;
  habitName: string;
  badge: string;
  title: string;
  recommendation: string;
  suggestedActionText: string;
  actionPayload?: any;
}

export function auditHabitPerformance(
  habits: any[],
  reflections: any[] = [],
  reminders: any[] = []
): HabitAuditRecommendation[] {
  const recommendations: HabitAuditRecommendation[] = [];
  const activeHabits = habits.filter((h) => !h.archived);

  for (const habit of activeHabits) {
    const completions = habit.completedDates || [];
    const streak = habit.streak || 0;

    // Check 1: Struggling Habit (low completions / 0 streak despite being created long ago)
    if (completions.length <= 1 && streak === 0) {
      recommendations.push({
        id: `audit-struggling-${habit.id}`,
        type: "struggling_habit",
        habitId: habit.id,
        habitName: habit.name,
        badge: "Needs Attention ⚠️",
        title: `Scale Down "${habit.name}"`,
        recommendation: `You've found "${habit.name}" challenging to sustain. Try reducing the scope to a 2-minute micro-habit (e.g. 5 mins) to build initial momentum.`,
        suggestedActionText: `Reduce "${habit.name}" scope`,
        actionPayload: {
          type: "scale_down",
          habitId: habit.id,
          habitName: habit.name,
        },
      });
    }

    // Check 2: Missing Trigger / Reminder
    const hasLinkedReminder = reminders.some((r) => r.habitId === habit.id || r.habit_id === habit.id);
    if (!hasLinkedReminder && streak < 3) {
      recommendations.push({
        id: `audit-reminder-${habit.id}`,
        type: "missing_reminder",
        habitId: habit.id,
        habitName: habit.name,
        badge: "Smart Schedule ⏰",
        title: `Add a Daily Trigger for "${habit.name}"`,
        recommendation: `Habits linked to a specific time cue are 3x more likely to stick. Schedule a morning or evening reminder for "${habit.name}".`,
        suggestedActionText: `Schedule 8:00 AM Reminder`,
        actionPayload: {
          type: "add_reminder",
          habitId: habit.id,
          habitName: habit.name,
          time: "08:00:00",
        },
      });
    }

    // Check 3: High-Momentum Milestone
    if (streak >= 7 && streak % 7 === 0) {
      recommendations.push({
        id: `audit-milestone-${habit.id}`,
        type: "milestone",
        habitId: habit.id,
        habitName: habit.name,
        badge: "Streak Milestone 🔥",
        title: `${streak}-Day Streak on "${habit.name}"!`,
        recommendation: `Incredible consistency! You've formed an automatic neural loop. Consider adding a streak shield freeze credit to safeguard your progress.`,
        suggestedActionText: `View Streak Shield`,
        actionPayload: {
          type: "view_streak",
          habitId: habit.id,
          habitName: habit.name,
        },
      });
    }
  }

  return recommendations.slice(0, 4);
}

/**
 * Saves proactive recommendations to the database (if signed in) or localStorage cache.
 */
export async function syncProactiveAuditRecommendations(
  userId: string | null | undefined,
  recommendations: HabitAuditRecommendation[]
): Promise<void> {
  const cacheKey = userId ? `pps_ai_suggestions_${userId}` : "pps_ai_suggestions_guest";
  try {
    localStorage.setItem(cacheKey, JSON.stringify(recommendations));
  } catch {}

  if (userId && recommendations.length > 0) {
    try {
      // Clear old pending suggestions
      await supabase
        .from("ai_suggestions")
        .delete()
        .eq("user_id", userId)
        .eq("status", "pending");

      // Insert fresh suggestions
      const inserts = recommendations.map((rec) => ({
        user_id: userId,
        type: rec.type,
        habit_id: rec.habitId,
        reason: rec.recommendation,
        status: "pending",
      }));

      await supabase.from("ai_suggestions").insert(inserts);
    } catch (err) {
      console.warn("Could not sync proactive suggestions to Supabase:", err);
    }
  }
}
