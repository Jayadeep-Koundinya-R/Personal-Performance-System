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
}

const NotificationContext = createContext<NotificationContextType | null>(null);
const GUEST_KEY = (email: string | null) => `pps_notifications_${email || "guest"}`;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        setNotifications(JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]"));
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

      setNotifications(
        (data || []).map((n) => ({
          id: n.id,
          type: n.type as Notification["type"],
          title: n.title,
          message: n.message,
          icon: n.icon,
          time: formatTime(n.created_at),
          read: n.read,
        }))
      );
    } catch {
      try {
        setNotifications(JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]"));
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
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(notifications));
    }
  }, [notifications, userId, userEmail, isGuestUser]);

  useEffect(() => {
    const lastCheck = localStorage.getItem(`pps_notif_check_${userEmail || "guest"}`);
    const todayStr = new Date().toISOString().split("T")[0];
    if (lastCheck === todayStr || habits.length === 0) return;

    const dueToday = habits.filter((h) => {
      if (h.completedDates.includes(todayStr)) return false;
      if (h.period === "Daily" || h.period === "Today") return true;
      if (h.dueDate) {
        return h.dueDate.split("T")[0] <= todayStr;
      }
      return false;
    });

    if (dueToday.length > 0) {
      addNotification({
        type: "reminder",
        title: "Habits waiting today!",
        message: `You have ${dueToday.length} habit${dueToday.length > 1 ? "s" : ""} to complete today.`,
        icon: "📋",
      });
      localStorage.setItem(`pps_notif_check_${userEmail || "guest"}`, todayStr);
    }
  }, [habits, userEmail]);

  const addNotification = useCallback(
    async (n: Omit<Notification, "id" | "time" | "read">) => {
      const newNotif: Notification = {
        ...n,
        id: String(Date.now()),
        time: "Just now",
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);

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
      } catch { }
    },
    [userId, isGuestUser]
  );

  const markAsRead = useCallback(async (id: string) => {
    const previous = [...notifications];
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!isGuestUser && userId) {
      try {
        const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        setNotifications(previous);
        toast.error("Failed to update notification. Reverting.");
      }
    }
  }, [userId, isGuestUser, notifications]);

  const markAllRead = useCallback(async () => {
    const previous = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isGuestUser && userId) {
      try {
        const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to mark all read:", err);
        setNotifications(previous);
        toast.error("Failed to update notifications. Reverting.");
      }
    }
  }, [userId, isGuestUser, notifications]);

  const clearAll = useCallback(async () => {
    const previous = [...notifications];
    setNotifications([]);
    if (!isGuestUser && userId) {
      try {
        const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to clear notifications:", err);
        setNotifications(previous);
        toast.error("Failed to clear notifications. Reverting.");
      }
    }
  }, [userId, isGuestUser, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
