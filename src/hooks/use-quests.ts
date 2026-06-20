import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHabits } from "@/hooks/use-habits";

export interface Quest {
  id: string;
  questKey: string;
  title: string;
  description: string;
  target: number;
  questType: string;
  xpReward: number;
  progress: number;
  completed: boolean;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function useQuests(userId?: string, isGuest?: boolean) {
  const { habits, getTodayStr, isHabitDueToday, calculateWeeklyPoints, getMaxStreak } = useHabits();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const weekStart = getWeekStart();
  const todayStr = getTodayStr();

  const computeProgress = useCallback((questKey: string, target: number) => {
    const dueToday = habits.filter((h) => isHabitDueToday(h));
    const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));

    switch (questKey) {
      case "morning_momentum": {
        const noon = new Date();
        noon.setHours(12, 0, 0, 0);
        return Math.min(doneToday.length, target);
      }
      case "perfect_streak":
        return Math.min(getMaxStreak(), target);
      case "xp_hunter":
        return Math.min(calculateWeeklyPoints(), target);
      default:
        return Math.min(doneToday.length, target);
    }
  }, [habits, isHabitDueToday, todayStr, getMaxStreak, calculateWeeklyPoints]);

  const refresh = useCallback(async () => {
    const { data: questDefs } = await supabase.from("quests").select("*").eq("active", true);
    if (!questDefs?.length) {
      setQuests([]);
      setLoading(false);
      return;
    }

    if (!userId || isGuest) {
      setQuests(
        questDefs.map((q) => ({
          id: q.id,
          questKey: q.quest_key,
          title: q.title,
          description: q.description,
          target: q.target,
          questType: q.quest_type,
          xpReward: q.xp_reward,
          progress: computeProgress(q.quest_key, q.target),
          completed: computeProgress(q.quest_key, q.target) >= q.target,
        }))
      );
      setLoading(false);
      return;
    }

    const { data: userQuests } = await supabase
      .from("user_quests")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart);

    const mapped: Quest[] = questDefs.map((q) => {
      const existing = userQuests?.find((uq) => uq.quest_id === q.id);
      const progress = computeProgress(q.quest_key, q.target);
      return {
        id: q.id,
        questKey: q.quest_key,
        title: q.title,
        description: q.description,
        target: q.target,
        questType: q.quest_type,
        xpReward: q.xp_reward,
        progress: existing?.progress ?? progress,
        completed: !!existing?.completed_at || progress >= q.target,
      };
    });

    setQuests(mapped);
    setLoading(false);

    for (const q of mapped) {
      if (q.progress >= q.target && !q.completed) {
        await supabase.from("user_quests").upsert(
          {
            user_id: userId,
            quest_id: q.id,
            progress: q.progress,
            week_start: weekStart,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,quest_id,week_start" }
        );
      } else if (!q.completed) {
        await supabase.from("user_quests").upsert(
          {
            user_id: userId,
            quest_id: q.id,
            progress: q.progress,
            week_start: weekStart,
          },
          { onConflict: "user_id,quest_id,week_start" }
        );
      }
    }
  }, [userId, isGuest, weekStart, computeProgress]);

  useEffect(() => {
    refresh();
  }, [refresh, habits]);

  const activeQuest = useMemo(() => quests.find((q) => !q.completed) || quests[0], [quests]);

  return { quests, activeQuest, loading, refresh };
}
