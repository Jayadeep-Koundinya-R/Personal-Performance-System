import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Habit } from "@/hooks/use-habits";
import { toast } from "sonner";

export interface Notification {
  id: string;
  type: "streak" | "levelup" | "achievement" | "reminder" | "incomplete" | "quest" | "alarm";
  title: string;
  message: string;
  icon: string;
  time: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "time" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);
const GUEST_KEY = (email: string | null) => `pps_notifications_${email || "guest"}`;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Just now";
  }
}

// Deduplicate notifications helper
function deduplicateNotifs(items: Notification[]): Notification[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title.trim()}_${item.message.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function NotificationProvider({
  children,
  userId,
  userEmail,
  isGuest,
  habits = [],
}: {
  children: ReactNode;
  userId?: string;
  userEmail: string | null;
  isGuest?: boolean;
  habits?: Habit[];
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");

  const loadFromDb = useCallback(async () => {
    if (isGuestUser || !userId) {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]");
        setNotifications(deduplicateNotifs(raw));
      } catch {
        setNotifications([]);
      }
      return;
    }
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const mapped: Notification[] = (data || []).map((n) => ({
        id: n.id,
        type: n.type as Notification["type"],
        title: n.title,
        message: n.message,
        icon: n.icon || "🔔",
        time: formatTime(n.created_at),
        read: Boolean(n.read),
      }));

      setNotifications(deduplicateNotifs(mapped));
    } catch {
      try {
        const raw = JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]");
        setNotifications(deduplicateNotifs(raw));
      } catch {
        setNotifications([]);
      }
    }
  }, [userId, userEmail, isGuestUser]);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  useEffect(() => {
    if (isGuestUser || !userId) {
      try {
        localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(notifications));
      } catch {}
    }
  }, [notifications, userId, userEmail, isGuestUser]);

  // Check habits due today — with strict deduplication
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastCheckKey = `pps_notif_check_${userEmail || "guest"}`;
    const lastCheck = localStorage.getItem(lastCheckKey);
    if (lastCheck === todayStr || habits.length === 0) return;

    const dueToday = habits.filter((h) => {
      if (h.completedDates?.includes(todayStr)) return false;
      if (h.period === "Daily" || h.period === "Today") return true;
      if (h.dueDate) {
        return h.dueDate.split("T")[0] <= todayStr;
      }
      return false;
    });

    if (dueToday.length > 0) {
      const hasExistingReminder = notifications.some(
        (n) => n.title === "Habits waiting today!" && !n.read
      );

      if (!hasExistingReminder) {
        addNotification({
          type: "reminder",
          title: "Habits waiting today!",
          message: `You have ${dueToday.length} habit${dueToday.length > 1 ? "s" : ""} to complete today.`,
          icon: "📋",
        });
      }
      try {
        localStorage.setItem(lastCheckKey, todayStr);
      } catch {}
    }
  }, [habits, userEmail, notifications]);

  const addNotification = useCallback(
    async (n: Omit<Notification, "id" | "time" | "read">) => {
      // Check for exact duplicate in current state
      const isDuplicate = notifications.some(
        (existing) => existing.title === n.title && existing.message === n.message
      );
      if (isDuplicate) return;

      const newNotif: Notification = {
        ...n,
        id: String(Date.now()),
        time: "Just now",
        read: false,
      };

      setNotifications((prev) => deduplicateNotifs([newNotif, ...prev]));

      if (isGuestUser || !userId) {
        return;
      }

      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: n.type,
          title: n.title,
          message: n.message,
          icon: n.icon,
          read: false,
        });
      } catch {}
    },
    [userId, isGuestUser, notifications]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (!isGuestUser && userId) {
        try {
          await supabase.from("notifications").update({ read: true }).eq("id", id);
        } catch (err) {
          console.error("Failed to mark notification as read:", err);
        }
      }
    },
    [userId, isGuestUser]
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isGuestUser && userId) {
      try {
        await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
      } catch (err) {
        console.error("Failed to mark all read:", err);
      }
    }
  }, [userId, isGuestUser]);

  const dismissNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!isGuestUser && userId) {
        try {
          await supabase.from("notifications").delete().eq("id", id);
        } catch (err) {
          console.error("Failed to dismiss notification:", err);
        }
      }
    },
    [userId, isGuestUser]
  );

  const clearAll = useCallback(async () => {
    setNotifications([]);
    if (!isGuestUser && userId) {
      try {
        await supabase.from("notifications").delete().eq("user_id", userId);
      } catch (err) {
        console.error("Failed to clear notifications:", err);
      }
    }
  }, [userId, isGuestUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllRead,
        clearAll,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
