import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Habit,
  HabitPeriod,
  HabitPriority,
  createHabit,
  toggleHabitCompletion,
  applyDailyResetToAll,
  buildStorageKey,
  loadHabitsFromStorage,
  saveHabitsToStorage,
  getToday,
  getTodayStr
} from '../utils/habitUtils';

export const useHabits = () => {
  const { user, profile, updateProfile, addXp } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['habits', user?.id || 'guest'];

  // 1. Fetch Habits Query
  const { data: habits = [], isLoading } = useQuery<Habit[]>({
    queryKey,
    queryFn: async () => {
      // Guest Mode Fallback
      if (!user || user.isGuest) {
        const storageKey = buildStorageKey();
        const storedHabits = loadHabitsFromStorage(storageKey);
        
        // Apply daily reset to guest habits
        const resetResult = applyDailyResetToAll(storedHabits, getToday());
        if (resetResult.changed) {
          saveHabitsToStorage(storageKey, resetResult.habits);
          // Deduct freeze credits from guest profile if needed
          let freezeUsed = 0;
          storedHabits.forEach((oldH, idx) => {
            const newH = resetResult.habits[idx];
            if (oldH.freezeCredits > newH.freezeCredits) {
              freezeUsed += (oldH.freezeCredits - newH.freezeCredits);
            }
          });
          if (freezeUsed > 0 && profile) {
            updateProfile({
              freeze_credits: Math.max(0, profile.freeze_credits - freezeUsed),
              total_credits_used: profile.total_credits_used + freezeUsed
            });
          }
          return resetResult.habits;
        }
        return storedHabits;
      }

      // Supabase Mode
      if (!isSupabaseConfigured()) return [];

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Map Supabase fields to Habit interface
      const dbHabits: Habit[] = data.map((h: any) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        priority: h.priority as HabitPriority,
        period: h.period as HabitPeriod,
        dueDate: h.due_date,
        completedDates: h.completed_dates || [],
        streak: h.streak || 0,
        lastCompletedDate: h.last_completed_date,
        freezeCredits: h.freeze_credits ?? 2
      }));

      // Apply daily reset to database habits
      const resetResult = applyDailyResetToAll(dbHabits, getToday());
      if (resetResult.changed) {
        let freezeUsed = 0;
        // Batch update habits that changed in the reset
        for (let i = 0; i < dbHabits.length; i++) {
          const oldH = dbHabits[i];
          const newH = resetResult.habits[i];
          if (oldH.dueDate !== newH.dueDate || oldH.streak !== newH.streak || oldH.freezeCredits !== newH.freezeCredits) {
            if (oldH.freezeCredits > newH.freezeCredits) {
              freezeUsed += (oldH.freezeCredits - newH.freezeCredits);
            }

            await supabase
              .from('habits')
              .update({
                due_date: newH.dueDate,
                streak: newH.streak,
                freeze_credits: newH.freezeCredits
              })
              .eq('id', newH.id);
          }
        }
        
        // Update user profile freeze credits in database
        if (freezeUsed > 0 && profile) {
          updateProfile({
            freeze_credits: Math.max(0, profile.freeze_credits - freezeUsed),
            total_credits_used: profile.total_credits_used + freezeUsed
          });
        }
        return resetResult.habits;
      }

      return dbHabits;
    },
    enabled: !!user // run query only when user session check finishes
  });

  // 2. Add Habit Mutation
  const addHabitMutation = useMutation({
    mutationFn: async ({ name, category, period, priority, startDate }: {
      name: string;
      category: string;
      period: HabitPeriod;
      priority: HabitPriority;
      startDate?: string | null;
    }) => {
      const newHab = createHabit(name, category, period, priority, startDate);

      if (!user || user.isGuest) {
        const storageKey = buildStorageKey();
        const currentList = loadHabitsFromStorage(storageKey);
        saveHabitsToStorage(storageKey, [...currentList, newHab]);
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: newHab.name,
          category: newHab.category,
          priority: newHab.priority,
          period: newHab.period,
          due_date: newHab.dueDate,
          completed_dates: newHab.completedDates,
          streak: newHab.streak,
          last_completed_date: newHab.lastCompletedDate,
          freeze_credits: newHab.freezeCredits
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // 3. Edit Habit Mutation
  const editHabitMutation = useMutation({
    mutationFn: async (updatedHabit: Habit) => {
      if (!user || user.isGuest) {
        const storageKey = buildStorageKey();
        const currentList = loadHabitsFromStorage(storageKey);
        const nextList = currentList.map(h => h.id === updatedHabit.id ? updatedHabit : h);
        saveHabitsToStorage(storageKey, nextList);
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('habits')
        .update({
          name: updatedHabit.name,
          category: updatedHabit.category,
          priority: updatedHabit.priority,
          period: updatedHabit.period,
          due_date: updatedHabit.dueDate,
          completed_dates: updatedHabit.completedDates,
          streak: updatedHabit.streak,
          last_completed_date: updatedHabit.lastCompletedDate,
          freeze_credits: updatedHabit.freezeCredits
        })
        .eq('id', updatedHabit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // 4. Delete Habit Mutation
  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!user || user.isGuest) {
        const storageKey = buildStorageKey();
        const currentList = loadHabitsFromStorage(storageKey);
        const nextList = currentList.filter(h => h.id !== id);
        saveHabitsToStorage(storageKey, nextList);
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // 5. Complete / Uncomplete Habit Mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ habit, isCompleted }: { habit: Habit; isCompleted: boolean }) => {
      const todayStr = getTodayStr();
      const nextHabit = toggleHabitCompletion(habit, isCompleted);

      // Handle XP pops and leveling
      const xpPerCompletion = profile?.xp_per_completion || 10;
      if (isCompleted) {
        // Adding XP
        await addXp(xpPerCompletion);
        
        // If all habits done today, mark perfect day
        const allHabits = habits.map(h => h.id === habit.id ? nextHabit : h);
        const dueToday = allHabits.filter(h => {
          const due = new Date(h.dueDate);
          due.setHours(0,0,0,0);
          const today = getToday();
          return (due.getTime() - today.getTime()) / 864e5 <= 0;
        });
        const doneToday = dueToday.filter(h => h.completedDates.includes(todayStr));
        if (dueToday.length > 0 && dueToday.length === doneToday.length) {
          const currentPerfectDays = profile?.perfect_days || [];
          if (!currentPerfectDays.includes(todayStr)) {
            const nextPerfectDays = [...currentPerfectDays, todayStr];
            await updateProfile({
              perfect_days: nextPerfectDays,
              // Reward additional streak/XP if appropriate
            });
            // Dispatch perfect day event for overlay modal
            document.dispatchEvent(new CustomEvent('perfectDayUnlocked', { detail: { streak: profile?.streak || 1 } }));
          }
        }
      } else {
        // Deduct XP (remove completion)
        await addXp(-xpPerCompletion);
        
        // Remove from perfect days if it was perfect
        const currentPerfectDays = profile?.perfect_days || [];
        if (currentPerfectDays.includes(todayStr)) {
          await updateProfile({
            perfect_days: currentPerfectDays.filter(d => d !== todayStr)
          });
        }
      }

      // Save Habit changes
      if (!user || user.isGuest) {
        const storageKey = buildStorageKey();
        const currentList = loadHabitsFromStorage(storageKey);
        const nextList = currentList.map(h => h.id === habit.id ? nextHabit : h);
        saveHabitsToStorage(storageKey, nextList);
        return { nextHabit };
      }

      if (!isSupabaseConfigured()) return { nextHabit };

      const { error } = await supabase
        .from('habits')
        .update({
          completed_dates: nextHabit.completedDates,
          streak: nextHabit.streak,
          last_completed_date: nextHabit.lastCompletedDate,
          freeze_credits: nextHabit.freezeCredits
        })
        .eq('id', habit.id);

      if (error) throw error;
      return { nextHabit };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return {
    habits,
    isLoading,
    addHabit: addHabitMutation.mutate,
    editHabit: editHabitMutation.mutate,
    deleteHabit: deleteHabitMutation.mutate,
    toggleCompletion: toggleCompletionMutation.mutate,
    isAdding: addHabitMutation.isPending,
    isEditing: editHabitMutation.isPending,
    isDeleting: deleteHabitMutation.isPending,
    isToggling: toggleCompletionMutation.isPending
  };
};
