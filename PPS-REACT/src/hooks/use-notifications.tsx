import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface Notification {
  id: number;
  type: "streak" | "levelup" | "achievement" | "reminder" | "incomplete";
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

export function NotificationProvider({ children, userEmail }: { children: ReactNode; userEmail: string | null }) {
  const storageKey = `pps_notifications_${userEmail || "guest"}`;

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [notifications, storageKey]);

  // Generate initial notifications on first load based on current state
  useEffect(() => {
    const lastCheck = localStorage.getItem(`pps_notif_check_${userEmail || "guest"}`);
    const todayStr = new Date().toISOString().split("T")[0];
    if (lastCheck === todayStr) return;

    try {
      const habits = JSON.parse(localStorage.getItem(`habits_${userEmail || "guest"}`) || "[]");
      const newNotifs: Omit<Notification, "id" | "time" | "read">[] = [];

      // Check streaks
      const maxStreak = habits.reduce((max: number, h: any) => Math.max(max, h.streak || 0), 0);
      if (maxStreak === 7) newNotifs.push({ type: "streak", title: "7-Day Streak! 🔥", message: "You've been consistent for a whole week!", icon: "🔥" });
      if (maxStreak === 30) newNotifs.push({ type: "streak", title: "30-Day Streak! 🏆", message: "Incredible! A full month of consistency!", icon: "🏆" });

      // Check level
      const totalXP = habits.reduce((s: number, h: any) => s + (h.completedDates?.length || 0) * 10, 0);
      const level = Math.floor(totalXP / 100) + 1;
      if (level > 1) newNotifs.push({ type: "levelup", title: `Level ${level} Reached!`, message: `You've earned ${totalXP} XP total`, icon: "⬆️" });

      // Check yesterday's incomplete
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const incompleteYesterday = habits.filter((h: any) =>
        (h.period === "Daily" || h.period === "Today") && !h.completedDates?.includes(yesterdayStr)
      );
      if (incompleteYesterday.length > 0) {
        newNotifs.push({ type: "incomplete", title: "Missed Habits Yesterday", message: `${incompleteYesterday.length} habit(s) weren't completed`, icon: "⚠️" });
      }

      newNotifs.forEach((n) => addNotificationInternal(n));
      localStorage.setItem(`pps_notif_check_${userEmail || "guest"}`, todayStr);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addNotificationInternal = (n: Omit<Notification, "id" | "time" | "read">) => {
    const notif: Notification = {
      ...n,
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 20));
  };

  const addNotification = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    addNotificationInternal(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => { setNotifications([]); }, []);

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
