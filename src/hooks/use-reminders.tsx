import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Reminder {
  id: string;
  label: string;
  time: string;
  repeat: string;
  enabled: boolean;
  habitId?: string | null;
  channel?: string;
  deliveryType?: string;
}

interface RemindersContextType {
  reminders: Reminder[];
  loading: boolean;
  addReminder: (
    label: string,
    time: string,
    repeat: string,
    habitId?: string | null,
    channel?: string,
    deliveryType?: string
  ) => Promise<string | null>;
  toggleReminder: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | null>(null);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str: string | null | undefined): boolean {
  return Boolean(str && UUID_REGEX.test(str));
}

const GUEST_KEY = (idOrEmail: string | null | undefined) => `reminders_${idOrEmail || "guest"}`;

function normalizeTime(t: string): string {
  if (!t) return "09:00";
  const trimmed = t.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(":");
    return `${hh.padStart(2, "0")}:${mm}`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return trimmed.slice(0, 5);
}

function mapReminder(r: Record<string, unknown>): Reminder {
  const time = r.reminder_time as string;
  return {
    id: String(r.id),
    label: (r.label as string) || "Habit Reminder",
    time: normalizeTime(time),
    repeat: (r.repeat_pattern as string) || "Daily",
    enabled: r.enabled !== false,
    habitId: (r.habit_id as string) || null,
    channel: (r.channel as string) || "in_app",
    deliveryType: (r.delivery_type as string) || "alarm",
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
  
  // Safe UUID check: only attempt cloud table if userId is a valid UUID and not a guest
  const isGuestUser = isGuest || !userId || !isValidUUID(userId);
  const storageScope = userId || userEmail || "guest";

  const refresh = useCallback(async () => {
    if (isGuestUser) {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(storageScope)) || "[]");
        setReminders(
          raw.map((r: any) => ({
            id: String(r.id),
            label: r.label || "Habit Reminder",
            time: normalizeTime(r.time),
            repeat: r.repeat || "Daily",
            enabled: r.enabled !== false,
            habitId: r.habitId || null,
            channel: r.channel || "in_app",
            deliveryType: r.deliveryType || "alarm",
          }))
        );
      } catch {
        setReminders([]);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error || !data) {
        // Fallback to local storage on table/network error
        const local = JSON.parse(localStorage.getItem(GUEST_KEY(storageScope)) || "[]");
        setReminders(local.map(mapReminder));
      } else {
        const cloudReminders = data.map(mapReminder);
        setReminders(cloudReminders);
        // Sync to localStorage as offline cache
        try {
          localStorage.setItem(GUEST_KEY(storageScope), JSON.stringify(cloudReminders));
        } catch {}
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(GUEST_KEY(storageScope)) || "[]");
      setReminders(local.map(mapReminder));
    }
    setLoading(false);
  }, [userId, storageScope, isGuestUser]);

  useEffect(() => {
    refresh();

    if (!isGuestUser && userId && isValidUUID(userId)) {
      const channel = supabase
        .channel(`reminders-changes-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${userId}` },
          () => {
            refresh();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [refresh, isGuestUser, userId]);

  const addReminder = useCallback(async (
    label: string,
    time: string,
    repeat: string,
    habitId: string | null = null,
    channel: string = "in_app",
    deliveryType: string = "alarm"
  ) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return "Enter a label for the reminder.";
    if (!time) return "Pick a time.";
    if (reminders.length >= maxReminders) {
      return `Free plan allows ${maxReminders} reminder. Upgrade to Pro for unlimited.`;
    }

    const cleanTime = normalizeTime(time);
    const cleanHabitId = habitId && isValidUUID(habitId) ? habitId : null;

    const newReminderItem: Reminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: trimmedLabel,
      time: cleanTime,
      repeat: repeat || "Daily",
      enabled: true,
      habitId: cleanHabitId,
      channel: channel || "in_app",
      deliveryType: deliveryType || "alarm",
    };

    // Always update local cache & state optimistically
    const updatedList = [newReminderItem, ...reminders];
    setReminders(updatedList);
    try {
      localStorage.setItem(GUEST_KEY(storageScope), JSON.stringify(updatedList));
    } catch {}

    if (isGuestUser) {
      return null;
    }

    try {
      const { data, error } = await supabase.from("reminders").insert({
        user_id: userId,
        label: trimmedLabel,
        reminder_time: cleanTime,
        repeat_pattern: repeat || "Daily",
        enabled: true,
        habit_id: cleanHabitId,
        channel: channel || "in_app",
        delivery_type: deliveryType || "alarm",
      }).select().maybeSingle();

      if (error) {
        console.warn("Supabase reminder insert notice (persisted locally):", error.message);
        // Kept in local state seamlessly
        return null;
      }

      if (data) {
        // Update with server ID
        const serverItem = mapReminder(data);
        setReminders((prev) => [serverItem, ...prev.filter((r) => r.id !== newReminderItem.id)]);
      }

      await refresh();
      return null;
    } catch (e: any) {
      console.warn("Supabase reminder insert exception (persisted locally):", e);
      return null;
    }
  }, [reminders, maxReminders, userId, storageScope, isGuestUser, refresh]);

  const toggleReminder = useCallback(async (id: string) => {
    const item = reminders.find((r) => r.id === id);
    if (!item) return;

    const nextEnabled = !item.enabled;
    const updatedList = reminders.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r));

    setReminders(updatedList);
    try {
      localStorage.setItem(GUEST_KEY(storageScope), JSON.stringify(updatedList));
    } catch {}

    if (isGuestUser || !isValidUUID(id)) {
      return;
    }

    try {
      const { error } = await supabase.from("reminders").update({ enabled: nextEnabled }).eq("id", id);
      if (error) {
        console.warn("Supabase reminder toggle notice:", error.message);
      }
    } catch (err) {
      console.error("Failed to toggle reminder on cloud:", err);
    }
  }, [reminders, userId, storageScope, isGuestUser]);

  const removeReminder = useCallback(async (id: string) => {
    const updatedList = reminders.filter((r) => r.id !== id);

    setReminders(updatedList);
    try {
      localStorage.setItem(GUEST_KEY(storageScope), JSON.stringify(updatedList));
    } catch {}

    if (isGuestUser || !isValidUUID(id)) {
      return;
    }

    try {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) {
        console.warn("Supabase reminder delete notice:", error.message);
      }
    } catch (err) {
      console.error("Failed to delete reminder on cloud:", err);
    }
  }, [reminders, userId, storageScope, isGuestUser]);

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
