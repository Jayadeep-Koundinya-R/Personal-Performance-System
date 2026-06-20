import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface ReminderItem {
  id: number | string;
  label: string;
  time: string; // "HH:MM" format
  repeat: string; // "Every Day" | "Weekdays" | "Weekends" | "Custom"
  enabled: boolean;
}

const GUEST_REM_PREFIX = 'reminders_';

export const useReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['reminders', user?.id || 'guest'];

  const getStorageKey = () => {
    return `${GUEST_REM_PREFIX}${user?.email || 'guest'}`;
  };

  const sortReminders = (list: ReminderItem[]): ReminderItem[] => {
    return [...list].sort((a, b) => a.time.localeCompare(b.time));
  };

  // 1. Fetch Reminders Query
  const { data: reminders = [], isLoading } = useQuery<ReminderItem[]>({
    queryKey,
    queryFn: async () => {
      if (!user || user.isGuest) {
        try {
          const stored = localStorage.getItem(getStorageKey());
          return sortReminders(stored ? JSON.parse(stored) : []);
        } catch {
          return [];
        }
      }

      if (!isSupabaseConfigured()) return [];

      const { data, error } = await supabase
        .from('reminders')
        .select('*');

      if (error) throw error;

      return sortReminders(data.map((r: any) => ({
        id: r.id,
        label: r.label,
        time: r.time,
        repeat: r.repeat,
        enabled: r.enabled
      })));
    },
    enabled: !!user
  });

  // 2. Save Reminder Mutation
  const addReminderMutation = useMutation({
    mutationFn: async ({ label, time, repeat }: { label: string; time: string; repeat: string }) => {
      const newRem: ReminderItem = {
        id: Date.now(),
        label: label.trim(),
        time,
        repeat,
        enabled: true
      };

      if (!user || user.isGuest) {
        const key = getStorageKey();
        let list: ReminderItem[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}
        
        const nextList = sortReminders([...list, newRem]);
        localStorage.setItem(key, JSON.stringify(nextList));
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          label: newRem.label,
          time: newRem.time,
          repeat: newRem.repeat,
          enabled: true
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      document.dispatchEvent(new CustomEvent('remindersUpdated'));
    }
  });

  // 3. Toggle Reminder Mutation
  const toggleReminderMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number | string; enabled: boolean }) => {
      if (!user || user.isGuest) {
        const key = getStorageKey();
        let list: ReminderItem[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}

        const nextList = list.map(r => r.id === id ? { ...r, enabled } : r);
        localStorage.setItem(key, JSON.stringify(nextList));
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('reminders')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      document.dispatchEvent(new CustomEvent('remindersUpdated'));
    }
  });

  // 4. Delete Reminder Mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: number | string) => {
      if (!user || user.isGuest) {
        const key = getStorageKey();
        let list: ReminderItem[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}

        const nextList = list.filter(r => r.id !== id);
        localStorage.setItem(key, JSON.stringify(nextList));
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      document.dispatchEvent(new CustomEvent('remindersUpdated'));
    }
  });

  return {
    reminders,
    isLoading,
    addReminder: addReminderMutation.mutate,
    toggleReminder: toggleReminderMutation.mutate,
    deleteReminder: deleteReminderMutation.mutate,
    isAdding: addReminderMutation.isPending,
    isToggling: toggleReminderMutation.isPending,
    isDeleting: deleteReminderMutation.isPending
  };
};
