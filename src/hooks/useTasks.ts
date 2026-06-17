import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface TaskItem {
  id: number | string;
  title: string;
  dueDate: string;
  note: string;
  emailReminder: boolean;
  done: boolean;
  createdAt: string;
}

export interface CalendarConnection {
  provider: string;
  email: string;
  requestedAt: string;
  status: 'coming_soon' | 'connected';
}

const GUEST_TASKS_PREFIX = 'pps_tasks_';
const GUEST_CAL_PREFIX = 'pps_calendar_connection_';

export const useTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tasksQueryKey = ['tasks', user?.id || 'guest'];
  const connQueryKey = ['calendarConnection', user?.id || 'guest'];

  const getTasksStorageKey = () => {
    return `${GUEST_TASKS_PREFIX}${user?.email || 'guest'}`;
  };

  const getConnStorageKey = () => {
    return `${GUEST_CAL_PREFIX}${user?.email || 'guest'}`;
  };

  // 1. Fetch Tasks Query
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<TaskItem[]>({
    queryKey: tasksQueryKey,
    queryFn: async () => {
      if (!user || user.isGuest) {
        try {
          return JSON.parse(localStorage.getItem(getTasksStorageKey()) ?? '[]');
        } catch {
          return [];
        }
      }

      if (!isSupabaseConfigured()) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;

      return data.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        note: t.note || '',
        emailReminder: t.email_reminder,
        done: t.done,
        createdAt: t.created_at
      }));
    },
    enabled: !!user
  });

  // 2. Fetch Calendar Connection Request Query
  const { data: connection = null } = useQuery<CalendarConnection | null>({
    queryKey: connQueryKey,
    queryFn: async () => {
      if (!user || user.isGuest) {
        try {
          return JSON.parse(localStorage.getItem(getConnStorageKey()) ?? 'null');
        } catch {
          return null;
        }
      }

      if (!isSupabaseConfigured()) return null;

      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        provider: data.provider,
        email: data.email,
        requestedAt: data.requested_at,
        status: data.status
      };
    },
    enabled: !!user
  });

  // 3. Save Task Mutation
  const addTaskMutation = useMutation({
    mutationFn: async ({ title, dueDate, note, emailReminder }: {
      title: string;
      dueDate: string;
      note: string;
      emailReminder: boolean;
    }) => {
      const newTask: TaskItem = {
        id: Date.now(),
        title: title.trim(),
        dueDate,
        note: note.trim(),
        emailReminder,
        done: false,
        createdAt: new Date().toISOString()
      };

      if (!user || user.isGuest) {
        const key = getTasksStorageKey();
        let list: TaskItem[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}
        saveDataLocally(key, [...list, newTask]);
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTask.title,
          due_date: newTask.dueDate,
          note: newTask.note,
          email_reminder: newTask.emailReminder,
          done: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      document.dispatchEvent(new CustomEvent('tasksUpdated'));
    }
  });

  // 4. Toggle Task Completion Mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, done }: { id: number | string; done: boolean }) => {
      if (!user || user.isGuest) {
        const key = getTasksStorageKey();
        let list: TaskItem[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}
        const updatedList = list.map(t => {
          if (t.id === id) return { ...t, done };
          return t;
        });
        saveDataLocally(key, updatedList);
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('tasks')
        .update({ done })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      document.dispatchEvent(new CustomEvent('tasksUpdated'));
    }
  });

  // 5. Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number | string) => {
      if (!user || user.isGuest) {
        const key = getTasksStorageKey();
        let list: TaskItem[] = [];
        try {
          list = JSON.parse(localStorage.getItem(key) ?? '[]');
        } catch {}
        const nextList = list.filter(t => t.id !== id);
        saveDataLocally(key, nextList);
        return;
      }

      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      document.dispatchEvent(new CustomEvent('tasksUpdated'));
    }
  });

  // 6. Connect Calendar Mutation
  const connectCalendarMutation = useMutation({
    mutationFn: async (provider: string) => {
      if (!user) return;
      const conn: CalendarConnection = {
        provider,
        email: user.email || 'guest@pps.local',
        requestedAt: new Date().toISOString(),
        status: 'coming_soon'
      };

      if (user.isGuest) {
        localStorage.setItem(getConnStorageKey(), JSON.stringify(conn));
        return;
      }

      if (!isSupabaseConfigured()) return;

      // Delete old connection first if any
      await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: conn.provider,
          email: conn.email,
          status: conn.status
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connQueryKey });
    }
  });

  const saveDataLocally = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  return {
    tasks,
    connection,
    isLoading: isTasksLoading,
    addTask: addTaskMutation.mutate,
    toggleTask: toggleTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    connectCalendar: connectCalendarMutation.mutate,
    isAdding: addTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isConnecting: connectCalendarMutation.isPending
  };
};
