import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getTodayStr } from '../utils/habitUtils';

export interface ReflectionEntry {
  id?: number | string;
  date: string;
  text: string;
  mood: 'great' | 'okay' | 'low' | 'stress';
  habitId: number | null;
  habitName: string | null;
  habitsLog?: Array<{ id: number; name: string; completed: boolean }>;
}

const GUEST_RFL_PREFIX = 'reflections_';

export const useReflections = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['reflections', user?.id || 'guest'];

  const getStorageKey = () => {
    return `${GUEST_RFL_PREFIX}${user?.email || 'guest'}`;
  };

  // 1. Fetch Reflections Query
  const { data: reflections = [], isLoading } = useQuery<ReflectionEntry[]>({
    queryKey,
    queryFn: async () => {
      if (!user || user.isGuest) {
        const key = getStorageKey();
        try {
          return JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {
          return [];
        }
      }

      if (!isSupabaseConfigured()) return [];

      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map((r: any) => ({
        id: r.id,
        date: r.date,
        text: r.text,
        mood: r.mood,
        habitId: r.habit_id,
        habitName: r.habit_name,
        habitsLog: r.habits_log || []
      }));
    },
    enabled: !!user
  });

  // 2. Save Reflection Mutation
  const saveReflectionMutation = useMutation({
    mutationFn: async ({ text, mood, habitId, habitName, habitsLog }: {
      text: string;
      mood: 'great' | 'okay' | 'low' | 'stress';
      habitId: number | null;
      habitName: string | null;
      habitsLog?: Array<{ id: number; name: string; completed: boolean }>;
    }) => {
      const today = getTodayStr();
      const entry: ReflectionEntry = {
        date: today,
        text: text.trim(),
        mood,
        habitId,
        habitName,
        habitsLog: habitsLog || []
      };

      if (!user || user.isGuest) {
        const key = getStorageKey();
        let list: ReflectionEntry[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}

        // Match combo date + habitId to avoid duplicate entries on the same day
        const existIdx = list.findIndex(r => r.date === today && r.habitId === habitId);
        const savedEntry = { ...entry, id: Date.now() };

        if (existIdx >= 0) {
          list[existIdx] = savedEntry;
        } else {
          list.unshift(savedEntry);
        }

        localStorage.setItem(key, JSON.stringify(list));
        return;
      }

      if (!isSupabaseConfigured()) return;

      // Check for existing reflection on the same date with same habitId link
      const { data: existing } = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('habit_id', habitId)
        .maybeSingle();

      const dbPayload = {
        user_id: user.id,
        date: today,
        text: entry.text,
        mood: entry.mood,
        habit_id: habitId,
        habit_name: habitName,
        habits_log: habitsLog || []
      };

      if (existing) {
        // Update
        const { error } = await supabase
          .from('reflections')
          .update(dbPayload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('reflections')
          .insert(dbPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // 3. Delete Reflection Mutation
  const deleteReflectionMutation = useMutation({
    mutationFn: async (id: number | string) => {
      if (!user || user.isGuest) {
        const key = getStorageKey();
        let list: ReflectionEntry[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}

        const nextList = list.filter(r => r.id !== id);
        localStorage.setItem(key, JSON.stringify(nextList));
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('reflections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return {
    reflections,
    isLoading,
    saveReflection: saveReflectionMutation.mutate,
    deleteReflection: deleteReflectionMutation.mutate,
    isSaving: saveReflectionMutation.isPending,
    isDeleting: deleteReflectionMutation.isPending
  };
};
