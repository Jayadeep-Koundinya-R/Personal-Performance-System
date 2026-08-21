import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/use-user-settings";

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
  startTime?: string | null;
  endTime?: string | null;
  color?: string;
  archived?: boolean;
  startAlarm?: boolean;
  endAlarm?: boolean;
}

interface HabitsContextType {
  habits: Habit[];
  loading: boolean;
  addHabit: (name: string, category: string, period: string, priority: string, startDate?: string | null, startTime?: string | null, endTime?: string | null, color?: string, startAlarm?: boolean, endAlarm?: boolean) => Promise<string | null>;
  deleteHabit: (id: string) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  toggleCompletion: (id: string, targetDateStr?: string) => Promise<void>;
  markAllDone: () => Promise<void>;
  useStreakFreeze: (habitId: string) => Promise<string | null>;
  isHabitDueToday: (habit: Habit) => boolean;
  getTodayStr: () => string;
  calculateTotalXP: () => number;
  calculateLevel: () => number;
  calculateWeeklyPoints: () => number;
  getMaxStreak: () => number;
  getTotalFreezeCredits: () => number;
  resetAllData: () => Promise<void>;
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

function parseUTCDate(dateStr: string): number {
  if (!dateStr) return 0;
  const cleanStr = dateStr.split("T")[0];
  const parts = cleanStr.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr).getTime();
}

function calculateStreakFromDates(dates: string[]): number {
  if (!dates || !dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.round((parseUTCDate(sorted[i]) - parseUTCDate(sorted[i + 1])) / 864e5);
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
  isGuest: isGuestProp = false,
}: {
  children: ReactNode;
  userEmail: string | null;
  userId?: string;
  maxHabits?: number;
  isGuest?: boolean;
}) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoChecked, setAutoChecked] = useState(false);
  const { settings, loading: settingsLoading } = useUserSettings();
  const isGuest = isGuestProp || !userId || userId === "guest_local" || userId.startsWith("guest");

  const fetchHabits = useCallback(async () => {
    if (isGuest || !userId || userId === "guest_local" || userId.startsWith("guest")) return;
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
        startTime: h.start_time,
        endTime: h.end_time,
        color: h.color || "indigo",
        archived: h.archived || false,
        startAlarm: h.start_alarm || false,
        endAlarm: h.end_alarm || false,
      };
    });
    setHabits(mapped);
    setLoading(false);
  }, [userId, isGuest]);

  // Load habits from database or localStorage
  useEffect(() => {
    if (isGuest) {
      try {
        const saved = localStorage.getItem(`habits_${userEmail || "guest"}`);
        if (saved === null) {
          const defaultHabits: Habit[] = [
            {
              id: "demo-1",
              name: "Hydrate & Drink Water 💧",
              category: "Health",
              priority: "High",
              period: "Daily",
              dueDate: new Date().toISOString(),
              completedDates: [],
              streak: 3,
              lastCompletedDate: null,
              freezeCredits: 2,
              color: "indigo"
            },
            {
              id: "demo-2",
              name: "20-Min Deep Work Sprint 💻",
              category: "Productivity",
              priority: "High",
              period: "Daily",
              dueDate: new Date().toISOString(),
              completedDates: [],
              streak: 5,
              lastCompletedDate: null,
              freezeCredits: 2,
              color: "sky"
            },
            {
              id: "demo-3",
              name: "Read 10 Pages of Growth 📚",
              category: "Mindset",
              priority: "Medium",
              period: "Daily",
              dueDate: new Date().toISOString(),
              completedDates: [],
              streak: 2,
              lastCompletedDate: null,
              freezeCredits: 2,
              color: "emerald"
            }
          ];
          localStorage.setItem(`habits_${userEmail || "guest"}`, JSON.stringify(defaultHabits));
          setHabits(defaultHabits);
        } else {
          setHabits(JSON.parse(saved));
        }
      } catch (err) {
        setHabits([]);
      }
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
    const todayStr = getTodayStr();
    if (habit.completedDates.includes(todayStr)) {
      return true;
    }
    const due = new Date(habit.dueDate);
    due.setHours(0, 0, 0, 0);
    return (due.getTime() - today.getTime()) / 864e5 <= 0;
  }, []);

  const addHabit = useCallback(async (
    name: string,
    category: string,
    period: string,
    priority: string,
    startDate?: string | null,
    startTime?: string | null,
    endTime?: string | null,
    color: string = "indigo",
    startAlarm?: boolean,
    endAlarm?: boolean
  ): Promise<string | null> => {
    if (habits.length >= maxHabits && maxHabits !== Infinity) {
      return "Habit limit reached. Please upgrade.";
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
        startTime, endTime, color, archived: false,
        startAlarm: startAlarm || false,
        endAlarm: endAlarm || false
      };
      setHabits(prev => [...prev, newHabit]);
      return null;
    }

    const payload: any = {
      user_id: userId!,
      name,
      category: category || "Uncategorized",
      priority: priority || "Medium",
      period: period || "Daily",
      due_date: dueDate,
      streak: 0,
      freeze_credits: CONFIG.MAX_FREEZE_CREDITS,
      start_time: startTime || null,
      end_time: endTime || null,
      color,
      archived: false,
      start_alarm: startAlarm || false,
      end_alarm: endAlarm || false
    };

    let { error } = await supabase.from("habits").insert(payload);

    // Defensive fallback: If PostgREST schema cache is missing optional columns, retry with baseline fields
    if (error && (error.message.includes("column") || error.message.includes("schema cache") || error.code === "PGRST204")) {
      console.warn("Retrying habit insertion with baseline schema fields...", error.message);
      const fallbackPayload: any = {
        user_id: userId!,
        name,
        category: category || "Uncategorized",
        priority: priority || "Medium",
        period: period || "Daily",
        due_date: dueDate,
        streak: 0,
      };
      const fallbackRes = await supabase.from("habits").insert(fallbackPayload);
      error = fallbackRes.error;
    }

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

  // Automatic streak freeze check on habits load
  useEffect(() => {
    if (loading || settingsLoading || autoChecked || !settings?.autoStreakFreeze) return;

    const checkAndAutoFreeze = async () => {
      setAutoChecked(true); // Set immediately to prevent concurrency issues
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let anyFrozen = false;

      for (const habit of habits) {
        const lastCompleted = habit.lastCompletedDate;
        if (
          habit.streak > 0 &&
          habit.freezeCredits > 0 &&
          lastCompleted &&
          lastCompleted < yesterdayStr &&
          !habit.completedDates.includes(yesterdayStr) &&
          !habit.archived
        ) {
          console.log(`Auto-applying streak freeze for habit: ${habit.name}`);
          const err = await useStreakFreeze(habit.id);
          if (!err) {
            anyFrozen = true;
          }
        }
      }

      if (anyFrozen) {
        toast.success("Streak Shield auto-applied to preserve your streak!");
      }
    };

    checkAndAutoFreeze();
  }, [habits, loading, settingsLoading, autoChecked, settings?.autoStreakFreeze, useStreakFreeze]);

  const deleteHabit = useCallback(async (id: string) => {
    const previousHabits = [...habits];

    // Optimistically update state
    setHabits(prev => prev.filter(h => h.id !== id));

    if (isGuest) return;

    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
      fetchHabits();
    } catch (dbError) {
      console.error("Failed to delete habit:", dbError);
      setHabits(previousHabits);
      toast.error("Failed to delete habit. Reverting.");
    }
  }, [habits, isGuest, fetchHabits]);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const previousHabits = [...habits];

    // Optimistically update state
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));

    if (isGuest) return;

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.period !== undefined) dbUpdates.period = updates.period;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
    if (updates.lastCompletedDate !== undefined) dbUpdates.last_completed_date = updates.lastCompletedDate;
    if (updates.freezeCredits !== undefined) dbUpdates.freeze_credits = updates.freezeCredits;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;
    if (updates.startAlarm !== undefined) dbUpdates.start_alarm = updates.startAlarm;
    if (updates.endAlarm !== undefined) dbUpdates.end_alarm = updates.endAlarm;

    try {
      const { error } = await supabase.from("habits").update(dbUpdates).eq("id", id);
      if (error) throw error;
      fetchHabits();
    } catch (dbError) {
      console.error("Failed to update habit:", dbError);
      setHabits(previousHabits);
      toast.error("Failed to update habit. Reverting.");
    }
  }, [habits, isGuest, fetchHabits]);

  const toggleCompletion = useCallback(async (id: string, targetDateStr?: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const dateToToggle = targetDateStr || getTodayStr();
    const isCompleted = habit.completedDates.includes(dateToToggle);
    const previousHabits = [...habits];

    // Deduplicate and compute updated values
    let updatedCompletedDates = [...habit.completedDates];
    let updatedLastCompletedDate = habit.lastCompletedDate;
    let updatedStreak = habit.streak;
    let updatedDueDate = habit.dueDate;

    if (!isCompleted) {
      // Prevent duplicate dates in array
      if (!updatedCompletedDates.includes(dateToToggle)) {
        updatedCompletedDates = [...updatedCompletedDates, dateToToggle];
      }
      if (habit.lastCompletedDate) {
        const diff = Math.round((parseUTCDate(dateToToggle) - parseUTCDate(habit.lastCompletedDate)) / 864e5);
        if (diff === 1) updatedStreak = habit.streak + 1;
        else if (diff !== 0) updatedStreak = 1;
      } else {
        updatedStreak = 1;
      }
      updatedLastCompletedDate = dateToToggle;

      const nextDue = new Date();
      if (habit.period === "Daily") nextDue.setDate(nextDue.getDate() + 1);
      else if (habit.period === "Weekly") nextDue.setDate(nextDue.getDate() + 7);
      else if (habit.period === "Monthly") nextDue.setMonth(nextDue.getMonth() + 1);
      updatedDueDate = nextDue.toISOString();
    } else {
      updatedCompletedDates = updatedCompletedDates.filter(d => d !== dateToToggle);
      if (updatedCompletedDates.length > 0) {
        const sorted = [...updatedCompletedDates].sort();
        updatedLastCompletedDate = sorted[sorted.length - 1];
        updatedStreak = calculateStreakFromDates(updatedCompletedDates);
      } else {
        updatedLastCompletedDate = null;
        updatedStreak = 0;
      }
      updatedDueDate = new Date().toISOString();
    }

    // Apply local state update immediately (optimistic UI)
    setHabits(prev => prev.map(h => h.id === id ? {
      ...h,
      completedDates: updatedCompletedDates,
      lastCompletedDate: updatedLastCompletedDate,
      streak: updatedStreak,
      dueDate: updatedDueDate
    } : h));

    if (isGuest) return;

    try {
      if (!isCompleted) {
        // Add completion - handle potential unique constraint error (code 23505) gracefully
        const { error: insertError } = await supabase.from("habit_completions").insert({
          habit_id: id,
          user_id: userId!,
          completed_date: dateToToggle,
        });
        if (insertError && insertError.code !== "23505") throw insertError;

        // Update streak and due date
        const { error: updateError } = await supabase.from("habits").update({
          streak: updatedStreak,
          last_completed_date: dateToToggle,
          due_date: updatedDueDate,
        }).eq("id", id);
        if (updateError) throw updateError;
      } else {
        // Remove completion
        const { error: deleteError } = await supabase.from("habit_completions").delete()
          .eq("habit_id", id)
          .eq("completed_date", dateToToggle);
        if (deleteError) throw deleteError;

        // Revert streak and due date
        const { error: updateError } = await supabase.from("habits").update({
          streak: updatedStreak,
          last_completed_date: updatedLastCompletedDate,
          due_date: updatedDueDate,
        }).eq("id", id);
        if (updateError) throw updateError;
      }
      fetchHabits();
    } catch (dbError: any) {
      console.error("Database update failed:", dbError);
      
      // Check for Session Expiry (401, JWT expired, etc.)
      const isAuthError = dbError?.status === 401 || 
        dbError?.message?.toLowerCase().includes("jwt") || 
        dbError?.message?.toLowerCase().includes("session") ||
        dbError?.code === "PGRST301";

      if (isAuthError) {
        toast.error("Session expired — please log in again.", {
          description: "Your change was saved locally, but could not sync to cloud.",
          duration: 7000,
        });
      } else {
        setHabits(previousHabits);
        toast.error("Failed to sync completion with database. Reverting.");
      }
    }
  }, [habits, isGuest, userId, fetchHabits, getTodayStr]);

  const markAllDone = useCallback(async (): Promise<void> => {
    const todayStr = getTodayStr();
    const habitsToComplete = habits.filter(h => !h.archived && isHabitDueToday(h) && !h.completedDates.includes(todayStr));
    if (habitsToComplete.length === 0) return;

    const previousHabits = [...habits];
    const updatedHabitsMap = new Map<string, Partial<Habit>>();
    
    habitsToComplete.forEach(habit => {
      let updatedStreak = habit.streak;
      if (habit.lastCompletedDate) {
        const diff = Math.round((new Date(todayStr).getTime() - new Date(habit.lastCompletedDate).getTime()) / 864e5);
        if (diff === 1) updatedStreak = habit.streak + 1;
        else if (diff !== 0) updatedStreak = 1;
      } else {
        updatedStreak = 1;
      }

      const nextDue = new Date();
      if (habit.period === "Daily") nextDue.setDate(nextDue.getDate() + 1);
      else if (habit.period === "Weekly") nextDue.setDate(nextDue.getDate() + 7);
      else if (habit.period === "Monthly") nextDue.setMonth(nextDue.getMonth() + 1);
      const updatedDueDate = nextDue.toISOString();

      updatedHabitsMap.set(habit.id, {
        completedDates: [...habit.completedDates, todayStr],
        lastCompletedDate: todayStr,
        streak: updatedStreak,
        dueDate: updatedDueDate
      });
    });

    // Optimistically update React state in a single call
    setHabits(prev => prev.map(h => {
      const updates = updatedHabitsMap.get(h.id);
      return updates ? { ...h, ...updates } : h;
    }));

    if (isGuest) {
      toast.success(`Completed all ${habitsToComplete.length} due habits!`);
      return;
    }

    try {
      const completions = habitsToComplete.map(h => ({
        habit_id: h.id,
        user_id: userId!,
        completed_date: todayStr
      }));
      const { error: insertError } = await supabase.from("habit_completions").insert(completions);
      if (insertError) throw insertError;

      const updatePromises = habitsToComplete.map(h => {
        const updates = updatedHabitsMap.get(h.id)!;
        return supabase.from("habits").update({
          streak: updates.streak,
          last_completed_date: todayStr,
          due_date: updates.dueDate,
        }).eq("id", h.id);
      });

      const results = await Promise.all(updatePromises);
      for (const res of results) {
        if (res.error) throw res.error;
      }
      
      toast.success(`Completed all ${habitsToComplete.length} due habits!`);
      fetchHabits();
    } catch (err) {
      console.error("Failed to bulk complete habits:", err);
      setHabits(previousHabits);
      toast.error("Failed to complete all habits. Reverting.");
    }
  }, [habits, isGuest, userId, fetchHabits, isHabitDueToday]);

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
        habits, loading, addHabit, deleteHabit, updateHabit, toggleCompletion, markAllDone, useStreakFreeze,
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
