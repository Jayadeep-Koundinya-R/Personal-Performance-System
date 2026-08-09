import { useEffect, useRef } from "react";
import { useReminders } from "@/hooks/use-reminders";
import { useHabits } from "@/hooks/use-habits";
import { useNotifications } from "@/hooks/use-notifications";
import { scheduleNativeLocalNotification, initNativeNotificationListeners } from "@/lib/native-notifications";
import { toast } from "sonner";

/**
 * In-app reminder scheduler.
 *
 * Runs every 60 seconds and checks:
 * 1. User-created reminders (from the Reminders page) — fires toast or alarm
 * 2. Habit-level start/end time alerts — fires notification when time matches
 *
 * Skips habits that are already completed today.
 * Tracks fired alerts per day to prevent duplicate notifications.
 *
 * Known v1 limitations:
 * - Weekly/Monthly reminders currently fire daily (no day-of-week tracking yet)
 * - Snooze state from AlarmOverlay is not re-checked by the scheduler
 * - Reminders only fire while the app is open in the browser
 */
export function useReminderScheduler() {
  const { reminders } = useReminders();
  const { habits, getTodayStr, isHabitDueToday } = useHabits();
  const { addNotification } = useNotifications();

  // Store latest values in refs so the single interval callback
  // always reads fresh data without needing to be re-created
  const remindersRef = useRef(reminders);
  const habitsRef = useRef(habits);
  const getTodayStrRef = useRef(getTodayStr);
  const isHabitDueTodayRef = useRef(isHabitDueToday);
  const addNotificationRef = useRef(addNotification);

  remindersRef.current = reminders;
  habitsRef.current = habits;
  getTodayStrRef.current = getTodayStr;
  isHabitDueTodayRef.current = isHabitDueToday;
  addNotificationRef.current = addNotification;

  // Track which alerts have already fired today (prevents duplicates)
  const firedTodayRef = useRef<Set<string>>(new Set());
  const lastDateRef = useRef<string>("");

  useEffect(() => {
    const check = () => {
      try {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const currentTime = `${hh}:${mm}`;
        const todayStr = getTodayStrRef.current();

        // Reset tracking on a new day
        if (lastDateRef.current !== todayStr) {
          firedTodayRef.current.clear();
          lastDateRef.current = todayStr;
        }

        // ── 1. User-created reminders ──────────────────────────────
        for (const r of remindersRef.current) {
          if (!r.enabled) continue;
          if (r.channel === "email") continue; // email handled server-side

          const rTime = (r.time || "").slice(0, 5);
          if (rTime !== currentTime) continue;

          const fireKey = `reminder_${r.id}`;
          const alreadyFired = firedTodayRef.current.has(fireKey);
          if (alreadyFired) continue;

          // One-time reminders: persist "fired" flag across sessions
          if (r.repeat === "One-time") {
            try {
              const isOneTimeFired = localStorage.getItem(`pps_onetime_fired_${r.id}`) === "true";
              if (isOneTimeFired) continue;
              localStorage.setItem(`pps_onetime_fired_${r.id}`, "true");
            } catch { /* localStorage unavailable — continue */ }
          }

          // Skip if linked habit is already completed today
          if (r.habitId) {
            const linked = habitsRef.current.find((h) => h.id === r.habitId);
            const isCompleted = linked?.completedDates.includes(todayStr);
            if (isCompleted) continue;
          }

          firedTodayRef.current.add(fireKey);

          if (r.deliveryType === "alarm") {
            const habitName = r.habitId
              ? habitsRef.current.find((h) => h.id === r.habitId)?.name
              : null;
            addNotificationRef.current({
              type: "alarm",
              title: "⏰ Habit Alarm!",
              message: habitName
                ? `Time to complete "${habitName}"`
                : r.label,
              icon: "🚨",
            });
            scheduleNativeLocalNotification({
              id: Math.abs(parseInt(r.id.replace(/\D/g, "").slice(0, 8))) || Math.floor(Math.random() * 100000),
              title: "⏰ Habit Alarm!",
              body: habitName ? `Time to complete "${habitName}"` : r.label,
              extra: { reminderId: r.id, type: "alarm" },
            });
          } else {
            addNotificationRef.current({
              type: "reminder",
              title: "🔔 Reminder",
              message: r.label,
              icon: "🔔",
            });
            toast.info(r.label, {
              description: "Scheduled reminder",
              duration: 8000,
            });
            scheduleNativeLocalNotification({
              id: Math.abs(parseInt(r.id.replace(/\D/g, "").slice(0, 8))) || Math.floor(Math.random() * 100000),
              title: "🔔 Reminder",
              body: r.label,
              extra: { reminderId: r.id, type: "reminder" },
            });
          }
        }

        // ── 2. Habit-level start/end time alerts ───────────────────
        for (const habit of habitsRef.current) {
          if (habit.archived) continue;
          if (!isHabitDueTodayRef.current(habit)) continue;
          if (habit.completedDates.includes(todayStr)) continue;

          // Start time alert → gentle notification
          if (habit.startAlarm && habit.startTime) {
            const st = (habit.startTime || "").slice(0, 5);
            if (st === currentTime) {
              const fk = `start_${habit.id}`;
              const alreadyFired = firedTodayRef.current.has(fk);
              if (!alreadyFired) {
                firedTodayRef.current.add(fk);
                addNotificationRef.current({
                  type: "reminder",
                  title: "🟢 Time to Start!",
                  message: `Time to start "${habit.name}"`,
                  icon: "🟢",
                });
                toast.info(`Time to start: ${habit.name}`, {
                  description: "Habit start time reached",
                  duration: 8000,
                });
                scheduleNativeLocalNotification({
                  id: Math.abs(parseInt(habit.id.replace(/\D/g, "").slice(0, 8))) || Math.floor(Math.random() * 100000),
                  title: "🟢 Time to Start!",
                  body: `Time to start "${habit.name}"`,
                  extra: { habitId: habit.id, type: "start" },
                });
              }
            }
          }

          // End time alert → urgent alarm (triggers AlarmOverlay)
          if (habit.endAlarm && habit.endTime) {
            const et = (habit.endTime || "").slice(0, 5);
            if (et === currentTime) {
              const fk = `end_${habit.id}`;
              const alreadyFired = firedTodayRef.current.has(fk);
              if (!alreadyFired) {
                firedTodayRef.current.add(fk);
                addNotificationRef.current({
                  type: "alarm",
                  title: "🔴 Time's Up!",
                  message: `Deadline reached for "${habit.name}" — complete it now!`,
                  icon: "🔴",
                });
                toast.warning(`Time's up: ${habit.name}`, {
                  description: "Habit end time reached — complete it now!",
                  duration: 10000,
                });
                scheduleNativeLocalNotification({
                  id: Math.abs(parseInt(habit.id.replace(/\D/g, "").slice(0, 8))) || Math.floor(Math.random() * 100000),
                  title: "🔴 Time's Up!",
                  body: `Deadline reached for "${habit.name}" — complete it now!`,
                  extra: { habitId: habit.id, type: "end" },
                });
              }
            }
          }
        }
      } catch (err) {
        // Log quietly or handle error gracefully in production
      }
    };

    // Initialize native notification tap listener on native mobile devices
    initNativeNotificationListeners((extra) => {
      if (extra?.type === "alarm") {
        toast.info("Opened from native alarm notification");
      }
    });

    // Run check immediately on mount, then every 10 seconds
    check();
    const interval = setInterval(check, 10_000);
    return () => {
      clearInterval(interval);
    };
  }, []); // Empty deps — interval set up once, reads latest data via refs
}
