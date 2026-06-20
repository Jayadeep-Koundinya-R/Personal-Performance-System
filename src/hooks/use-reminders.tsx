import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Reminder {
  id: string;
  label: string;
  time: string;
  repeat: string;
  enabled: boolean;
  habitId?: string | null;
  channel?: string;
}

interface RemindersContextType {
  reminders: Reminder[];
  loading: boolean;
  addReminder: (label: string, time: string, repeat: string) => Promise<string | null>;
  toggleReminder: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | null>(null);
const GUEST_KEY = (email: string | null) => `reminders_${email || "guest"}`;

function mapReminder(r: Record<string, unknown>): Reminder {
  const time = r.reminder_time as string;
  return {
    id: r.id as string,
    label: r.label as string,
    time: time?.length === 5 ? time : String(time).slice(0, 5),
    repeat: r.repeat_pattern as string,
    enabled: r.enabled as boolean,
    habitId: r.habit_id as string | null,
    channel: (r.channel as string) || "in_app",
  };
}

export function RemindersProvider({
  children,
  userId,
  userEmail,
  isGuest,
  maxReminders = Infinity,
}: {
  children: ReactNode;
  userId?: string;
  userEmail: string | null;
  isGuest?: boolean;
  maxReminders?: number;
}) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isGuest || !userId) {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]");
        setReminders(
          raw.map((r: { id: number; label: string; time: string; repeat: string; enabled: boolean }) => ({
            id: String(r.id),
            label: r.label,
            time: r.time,
            repeat: r.repeat,
            enabled: r.enabled,
          }))
        );
      } catch {
        setReminders([]);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Reminders load error:", error);
      setReminders([]);
    } else {
      setReminders((data || []).map(mapReminder));
    }
    setLoading(false);
  }, [userId, userEmail, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addReminder = useCallback(async (label: string, time: string, repeat: string) => {
    if (!label.trim()) return "Enter a label.";
    if (!time) return "Pick a time.";
    if (reminders.length >= maxReminders) return `Free plan allows ${maxReminders} reminder. Upgrade to Pro for unlimited.`;

    if (isGuest || !userId) {
      const list = [...reminders, { id: String(Date.now()), label: label.trim(), time, repeat, enabled: true }];
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list.map((r) => ({ ...r, id: Number(r.id) || Date.now() }))));
      setReminders(list);
      return null;
    }

    const { error } = await supabase.from("reminders").insert({
      user_id: userId,
      label: label.trim(),
      reminder_time: time,
      repeat_pattern: repeat,
      enabled: true,
      channel: "in_app",
    });
    if (error) return error.message;
    await refresh();
    return null;
  }, [reminders, maxReminders, userId, userEmail, isGuest, refresh]);

  const toggleReminder = useCallback(async (id: string) => {
    const item = reminders.find((r) => r.id === id);
    if (!item) return;

    if (isGuest || !userId) {
      const list = reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list.map((r) => ({ ...r, id: Number(r.id) || Date.now() }))));
      setReminders(list);
      return;
    }

    await supabase.from("reminders").update({ enabled: !item.enabled }).eq("id", id);
    await refresh();
  }, [reminders, userId, userEmail, isGuest, refresh]);

  const removeReminder = useCallback(async (id: string) => {
    if (isGuest || !userId) {
      const list = reminders.filter((r) => r.id !== id);
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(list.map((r) => ({ ...r, id: Number(r.id) || Date.now() }))));
      setReminders(list);
      return;
    }
    await supabase.from("reminders").delete().eq("id", id);
    await refresh();
  }, [reminders, userId, userEmail, isGuest, refresh]);

  return (
    <RemindersContext.Provider value={{ reminders, loading, addReminder, toggleReminder, removeReminder, refresh }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used within RemindersProvider");
  return ctx;
}
