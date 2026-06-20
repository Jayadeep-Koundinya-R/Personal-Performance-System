import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const CONFIG = {
  XP_PER_COMPLETION: 10,
  LEVEL_XP_THRESHOLD: 100,
  MAX_FREEZE_CREDITS: 2,
};

export interface Habit {
  id: string;
  name: string;
  category: string;
  priority: "High" | "Medium" | "Low" | "Optional";
  period: "Daily" | "Weekly" | "Monthly" | "Today";
  dueDate: string;
  completedDates: string[];
  streak: number;
  lastCompletedDate: string | null;
  freezeCredits: number;
}

interface HabitsContextType {
  habits: Habit[];
  loading: boolean;
  addHabit: (name: string, category: string, period: string, priority: string, startDate?: string | null) => Promise<string | null>;
  deleteHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  toggleCompletion: (id: string) => void;
  useStreakFreeze: (habitId: string) => Promise<string | null>;
  isHabitDueToday: (habit: Habit) => boolean;
  getTodayStr: () => string;
  calculateTotalXP: () => number;
  calculateLevel: () => number;
  calculateWeeklyPoints: () => number;
  getMaxStreak: () => number;
  getTotalFreezeCredits: () => number;
  resetAllData: () => void;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateInitialDueDate(period: string): string {
  const today = new Date();
  if (period === "Weekly") today.setDate(today.getDate() + 7);
  else if (period === "Monthly") today.setMonth(today.getMonth() + 1);
  return today.toISOString();
}

function calculateStreakFromDates(dates: string[]): number {
  if (!dates || !dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) / 864e5);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

const HabitsContext = createContext<HabitsContextType | null>(null);

export function HabitsProvider({
  children,
  userEmail,
  userId,
  maxHabits = Infinity,
}: {
  children: ReactNode;
  userEmail: string | null;
  userId?: string;
  maxHabits?: number;
}) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const isGuest = !userId;

  const fetchHabits = useCallback(async () => {
    if (isGuest || !userId) return;
    setLoading(true);
    const { data: habitsData, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId);

    if (error) { console.error("Failed to load habits:", error); setLoading(false); return; }

    const habitIds = (habitsData || []).map(h => h.id);
    let completionsData: any[] = [];
    if (habitIds.length > 0) {
      const { data } = await supabase
        .from("habit_completions")
        .select("*")
        .in("habit_id", habitIds);
      completionsData = data || [];
    }

    const mapped: Habit[] = (habitsData || []).map(h => {
      const dates = completionsData
        .filter(c => c.habit_id === h.id)
        .map(c => c.completed_date);
      return {
        id: h.id,
        name: h.name,
        category: h.category,
        priority: h.priority as Habit["priority"],
        period: h.period as Habit["period"],
        dueDate: h.due_date,
        completedDates: dates,
        streak: h.streak,
        lastCompletedDate: h.last_completed_date,
        freezeCredits: h.freeze_credits,
      };
    });
    setHabits(mapped);
    setLoading(false);
  }, [userId, isGuest]);

  // Load habits from database
  useEffect(() => {
    if (isGuest) {
      try {
        setHabits(JSON.parse(localStorage.getItem(`habits_${userEmail || "guest"}`) || "[]"));
      } catch { setHabits([]); }
      setLoading(false);
      return;
    }

    fetchHabits();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('habits-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => {
        fetchHabits();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions', filter: `user_id=eq.${userId}` }, () => {
        fetchHabits();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, isGuest, userEmail, fetchHabits]);

  // Guest mode: save to localStorage
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem(`habits_${userEmail || "guest"}`, JSON.stringify(habits));
    }
  }, [habits, isGuest, userEmail]);

  const isHabitDueToday = useCallback((habit: Habit): boolean => {
    const today = getToday();
    const due = new Date(habit.dueDate);
    due.setHours(0, 0, 0, 0);
    return (due.getTime() - today.getTime()) / 864e5 <= 0;
  }, []);

  const addHabit = useCallback(async (name: string, category: string, period: string, priority: string, startDate?: string | null): Promise<string | null> => {
    if (habits.length >= maxHabits) {
      return `Free plan allows ${maxHabits} habits. Upgrade to Pro for unlimited habits.`;
    }

    const dueDate = startDate
      ? new Date(startDate + "T12:00:00").toISOString()
      : generateInitialDueDate(period);

    if (isGuest) {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name, category: category || "Uncategorized",
        priority: priority as Habit["priority"],
        period: period as Habit["period"],
        dueDate, completedDates: [], streak: 0,
        lastCompletedDate: null, freezeCredits: CONFIG.MAX_FREEZE_CREDITS,
      };
      setHabits(prev => [...prev, newHabit]);
      return null;
    }

    const { error } = await supabase.from("habits").insert({
      user_id: userId!,
      name,
      category: category || "Uncategorized",
      priority: priority || "Medium",
      period: period || "Daily",
      due_date: dueDate,
      streak: 0,
      freeze_credits: CONFIG.MAX_FREEZE_CREDITS,
    });
    if (error) {
      console.error("Failed to add habit:", error);
      return error.message;
    }
    await fetchHabits();
    return null;
  }, [habits.length, maxHabits, isGuest, userId, fetchHabits]);

  const useStreakFreeze = useCallback(async (habitId: string): Promise<string | null> => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return "Habit not found.";
    if ((habit.freezeCredits || 0) <= 0) return "No freeze credits remaining.";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (habit.completedDates.includes(yesterdayStr)) {
      return "Yesterday was already completed — no freeze needed.";
    }

    const newCredits = habit.freezeCredits - 1;
    const newStreak = Math.max(habit.streak, 1);

    if (isGuest) {
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? {
                ...h,
                freezeCredits: newCredits,
                streak: newStreak,
                completedDates: [...h.completedDates, yesterdayStr],
                lastCompletedDate: yesterdayStr,
              }
            : h
        )
      );
      return null;
    }

    await supabase.from("habit_completions").insert({
      habit_id: habitId,
      user_id: userId!,
      completed_date: yesterdayStr,
    });
    await supabase.from("habits").update({
      freeze_credits: newCredits,
      streak: newStreak,
      last_completed_date: yesterdayStr,
    }).eq("id", habitId);
    await fetchHabits();
    return null;
  }, [habits, isGuest, userId, fetchHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    if (isGuest) {
      setHabits(prev => prev.filter(h => h.id !== id));
      return;
    }
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) console.error("Failed to delete habit:", error);
    else await fetchHabits();
  }, [isGuest, fetchHabits]);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    if (isGuest) {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
      return;
    }
    if (updates.name !== undefined) await supabase.from("habits").update({ name: updates.name }).eq("id", id);
    if (updates.category !== undefined) await supabase.from("habits").update({ category: updates.category }).eq("id", id);
    if (updates.priority !== undefined) await supabase.from("habits").update({ priority: updates.priority }).eq("id", id);
    if (updates.period !== undefined) await supabase.from("habits").update({ period: updates.period }).eq("id", id);
    if (updates.dueDate !== undefined) await supabase.from("habits").update({ due_date: updates.dueDate }).eq("id", id);
    if (updates.streak !== undefined) await supabase.from("habits").update({ streak: updates.streak }).eq("id", id);
    if (updates.lastCompletedDate !== undefined) await supabase.from("habits").update({ last_completed_date: updates.lastCompletedDate }).eq("id", id);
    if (updates.freezeCredits !== undefined) await supabase.from("habits").update({ freeze_credits: updates.freezeCredits }).eq("id", id);
    await fetchHabits();
  }, [isGuest, fetchHabits]);

  const toggleCompletion = useCallback(async (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const todayStr = getTodayStr();
    const isCompleted = habit.completedDates.includes(todayStr);

    if (isGuest) {
      setHabits(prev => prev.map(h => {
        if (h.id !== id) return h;
        const updated = { ...h };
        if (!isCompleted) {
          updated.completedDates = [...updated.completedDates, todayStr];
          if (updated.lastCompletedDate) {
            const diff = Math.round((new Date(todayStr).getTime() - new Date(updated.lastCompletedDate).getTime()) / 864e5);
            if (diff === 1) updated.streak++;
            else if (diff !== 0) updated.streak = 1;
          } else { updated.streak = 1; }
          updated.lastCompletedDate = todayStr;
        } else {
          updated.completedDates = updated.completedDates.filter(d => d !== todayStr);
          if (updated.completedDates.length > 0) {
            const sorted = [...updated.completedDates].sort();
            updated.lastCompletedDate = sorted[sorted.length - 1];
            updated.streak = calculateStreakFromDates(updated.completedDates);
          } else { updated.lastCompletedDate = null; updated.streak = 0; }
        }
        return updated;
      }));
      return;
    }

    if (!isCompleted) {
      // Add completion
      await supabase.from("habit_completions").insert({
        habit_id: id,
        user_id: userId!,
        completed_date: todayStr,
      });
      // Update streak
      const newStreak = habit.lastCompletedDate
        ? (Math.round((new Date(todayStr).getTime() - new Date(habit.lastCompletedDate).getTime()) / 864e5) === 1
          ? habit.streak + 1 : 1)
        : 1;
      await supabase.from("habits").update({
        streak: newStreak,
        last_completed_date: todayStr,
      }).eq("id", id);
    } else {
      // Remove completion
      await supabase.from("habit_completions").delete()
        .eq("habit_id", id)
        .eq("completed_date", todayStr);
      // Recalculate streak
      const remainingDates = habit.completedDates.filter(d => d !== todayStr);
      const newStreak = calculateStreakFromDates(remainingDates);
      const lastDate = remainingDates.length > 0 ? [...remainingDates].sort().pop()! : null;
      await supabase.from("habits").update({
        streak: newStreak,
        last_completed_date: lastDate,
      }).eq("id", id);
    }
    await fetchHabits();
  }, [habits, isGuest, userId, fetchHabits]);

  const calculateTotalXP = useCallback((): number => {
    return habits.reduce((sum, h) => sum + h.completedDates.length * CONFIG.XP_PER_COMPLETION, 0);
  }, [habits]);

  const calculateLevel = useCallback((): number => {
    return Math.floor(calculateTotalXP() / CONFIG.LEVEL_XP_THRESHOLD) + 1;
  }, [calculateTotalXP]);

  const calculateWeeklyPoints = useCallback((): number => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return habits.reduce((sum, h) => {
      return sum + h.completedDates.filter(d => new Date(d) >= weekAgo).length * CONFIG.XP_PER_COMPLETION;
    }, 0);
  }, [habits]);

  const getMaxStreak = useCallback((): number => {
    return habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  }, [habits]);

  const getTotalFreezeCredits = useCallback((): number => {
    return habits.reduce((sum, h) => sum + (h.freezeCredits || 0), 0);
  }, [habits]);

  const resetAllData = useCallback(async () => {
    if (isGuest) { setHabits([]); return; }
    // Delete all habits (completions cascade)
    await supabase.from("habits").delete().eq("user_id", userId!);
    await fetchHabits();
  }, [isGuest, userId, fetchHabits]);

  return (
    <HabitsContext.Provider
      value={{
        habits, loading, addHabit, deleteHabit, updateHabit, toggleCompletion, useStreakFreeze,
        isHabitDueToday, getTodayStr, calculateTotalXP, calculateLevel,
        calculateWeeklyPoints, getMaxStreak, getTotalFreezeCredits, resetAllData,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) throw new Error("useHabits must be used within HabitsProvider");
  return context;
}
