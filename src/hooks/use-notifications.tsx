import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Habit } from "@/hooks/use-habits";

export interface Notification {
  id: string;
  type: "streak" | "levelup" | "achievement" | "reminder" | "incomplete" | "quest";
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

  const loadFromDb = useCallback(async () => {
    if (!userId || isGuest) {
      try {
        setNotifications(JSON.parse(localStorage.getItem(GUEST_KEY(userEmail)) || "[]"));
      } catch {
        setNotifications([]);
      }
      return;
    }
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
  }, [userId, userEmail, isGuest]);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  useEffect(() => {
    if (isGuest || !userId) {
      localStorage.setItem(GUEST_KEY(userEmail), JSON.stringify(notifications));
    }
  }, [notifications, userId, userEmail, isGuest]);

  useEffect(() => {
    const lastCheck = localStorage.getItem(`pps_notif_check_${userEmail || "guest"}`);
    const todayStr = new Date().toISOString().split("T")[0];
    if (lastCheck === todayStr || habits.length === 0) return;

    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    const totalXP = habits.reduce((s, h) => s + h.completedDates.length * 10, 0);
    const level = Math.floor(totalXP / 100) + 1;

    const newNotifs: Omit<Notification, "id" | "time" | "read">[] = [];
    if (maxStreak === 7) newNotifs.push({ type: "streak", title: "7-Day Streak! 🔥", message: "You've been consistent for a whole week!", icon: "🔥" });
    if (maxStreak === 30) newNotifs.push({ type: "streak", title: "30-Day Streak! 🏆", message: "Incredible! A full month of consistency!", icon: "🏆" });
    if (level > 1) newNotifs.push({ type: "levelup", title: `Level ${level} Reached!`, message: `You've earned ${totalXP} XP total`, icon: "⬆️" });

    newNotifs.forEach((n) => addNotificationInternal(n));
    localStorage.setItem(`pps_notif_check_${userEmail || "guest"}`, todayStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]);

  const persistNotification = async (notif: Notification) => {
    if (!userId || isGuest) return;
    await supabase.from("notifications").insert({
      user_id: userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      icon: notif.icon,
      read: false,
    });
  };

  const addNotificationInternal = (n: Omit<Notification, "id" | "time" | "read">) => {
    const notif: Notification = {
      ...n,
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 20));
    persistNotification(notif);
  };

  const addNotification = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    addNotificationInternal(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId && !isGuest) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    }
  }, [userId, isGuest]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    if (userId && !isGuest) {
      await supabase.from("notifications").delete().eq("user_id", userId);
    }
  }, [userId, isGuest]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
