import { useMemo } from "react";
import { useHabits } from "@/hooks/use-habits";
import { useReflections } from "@/hooks/use-reflections";

export function useSmartInsights(isPro: boolean) {
  const { habits, isHabitDueToday, getTodayStr } = useHabits();
  const { entries } = useReflections();
  const todayStr = getTodayStr();

  return useMemo(() => {
    if (!isPro) {
      return [
        "Upgrade to Pro to unlock personalized insights about your habit patterns.",
      ];
    }

    const insights: string[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay: Record<number, { done: number; total: number }> = {};

    habits.forEach((h) => {
      h.completedDates.forEach((d) => {
        const day = new Date(d + "T12:00:00").getDay();
        byDay[day] = byDay[day] || { done: 0, total: 0 };
        byDay[day].done++;
      });
    });

    habits.forEach((h) => {
      const dueCount = 7;
      for (let i = 0; i < 7; i++) {
        const day = (new Date().getDay() - i + 7) % 7;
        byDay[day] = byDay[day] || { done: 0, total: 0 };
        byDay[day].total += dueCount / 7;
      }
    });

    let bestDay = 0;
    let bestRate = 0;
    Object.entries(byDay).forEach(([day, stats]) => {
      const rate = stats.total > 0 ? stats.done / stats.total : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = Number(day);
      }
    });

    if (bestRate > 0) {
      insights.push(`You're most consistent on ${dayNames[bestDay]}s — ${Math.round(bestRate * 100)}% completion rate.`);
    }

    const dueToday = habits.filter((h) => isHabitDueToday(h));
    const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
    if (dueToday.length > 0) {
      insights.push(`Today: ${doneToday.length}/${dueToday.length} habits completed (${Math.round((doneToday.length / dueToday.length) * 100)}%).`);
    }

    const moodEntries = entries.filter((e) => e.mood === "great" || e.mood === "okay");
    if (entries.length >= 3 && moodEntries.length / entries.length > 0.6) {
      insights.push("Your mood trends positive on reflection days — journaling helps your consistency.");
    }

    const weekendMisses = habits.filter((h) => {
      const lastWeek = h.completedDates.filter((d) => {
        const day = new Date(d + "T12:00:00").getDay();
        return day === 0 || day === 6;
      });
      return lastWeek.length === 0 && h.period === "Daily";
    });
    if (weekendMisses.length > 0) {
      insights.push(`${weekendMisses.length} daily habit(s) struggle on weekends — try scheduling lighter weekend targets.`);
    }

    if (insights.length === 0) {
      insights.push("Keep tracking for a week to unlock deeper pattern insights.");
    }

    return insights;
  }, [habits, entries, isHabitDueToday, todayStr, isPro]);
}

export function useAiCoachSummary(isPro: boolean) {
  const insights = useSmartInsights(isPro);
  const { habits, getMaxStreak, calculateLevel, calculateWeeklyPoints } = useHabits();

  return useMemo(() => {
    if (!isPro) {
      return {
        summary: "Upgrade to Pro for your weekly AI coach summary.",
        suggestions: ["Track habits for 7 days", "Write daily reflections", "Build a 3-day streak"],
      };
    }

    const level = calculateLevel();
    const streak = getMaxStreak();
    const weeklyXP = calculateWeeklyPoints();
    const activeHabits = habits.length;

    const summary = `Week in review: Level ${level}, ${activeHabits} active habits, ${weeklyXP} XP earned, best streak ${streak} days.`;

    const suggestions: string[] = [];
    if (streak < 3) suggestions.push("Focus on one keystone habit to build a 3-day streak.");
    if (activeHabits > 7) suggestions.push("Consider consolidating habits — 5 focused habits beat 10 scattered ones.");
    if (weeklyXP < 50) suggestions.push("Try completing habits before noon to boost weekly XP.");
    suggestions.push(...insights.slice(0, 2));

    return { summary, suggestions: suggestions.slice(0, 3) };
  }, [isPro, insights, habits, calculateLevel, getMaxStreak, calculateWeeklyPoints]);
}
