import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, Check, Moon, AlertTriangle } from "lucide-react";
import { Reminder } from "@/hooks/use-reminders";
import { toast } from "sonner";

interface ImmediateRemindersStripProps {
  reminders: Reminder[];
  onSnooze?: (reminderId: string, minutes: number) => void;
  onDone?: (reminderId: string) => void;
}

function formatTime12(t: string): string {
  if (!t) return "";
  const parts = t.split(":").map(Number);
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
}

export const ImmediateRemindersStrip: React.FC<ImmediateRemindersStripProps> = ({
  reminders = [],
  onSnooze,
  onDone,
}) => {
  // Track snoozed and completed reminders locally for this session
  const [dismissedMap, setDismissedMap] = useState<Record<string, number>>({});

  const now = new Date();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();

  // Filter for reminders due in the next 2 hours (120m) or overdue within the last hour (-60m)
  const immediateReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (!r.enabled) return false;

      // If snoozed until a later minute, check if still snoozed
      const snoozedUntil = dismissedMap[r.id];
      if (snoozedUntil && Date.now() < snoozedUntil) return false;
      if (snoozedUntil === -1) return false; // marked done

      if (!r.time) return false;
      const [h, m] = r.time.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return false;

      const remTotalMins = h * 60 + m;
      const diffMins = remTotalMins - currentTotalMins;

      // Due within next 2 hours or overdue by up to 60 minutes
      return diffMins >= -60 && diffMins <= 120;
    });
  }, [reminders, currentTotalMins, dismissedMap]);

  if (immediateReminders.length === 0) {
    return null;
  }

  const handleSnooze = (r: Reminder) => {
    const snoozeUntil = Date.now() + 15 * 60 * 1000;
    setDismissedMap((prev) => ({ ...prev, [r.id]: snoozeUntil }));
    onSnooze?.(r.id, 15);
    toast.info(`Snoozed "${r.label}" for +15m! 💤`, {
      description: "You'll be alerted again shortly.",
    });
  };

  const handleDone = (r: Reminder) => {
    setDismissedMap((prev) => ({ ...prev, [r.id]: -1 }));
    onDone?.(r.id);
    toast.success(`Reminder "${r.label}" completed! ✨`, {
      description: "Great discipline staying ahead of your schedule.",
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0, y: -6 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="mb-3 space-y-2 overflow-hidden"
      >
        {immediateReminders.map((r) => {
          const [h, m] = r.time.split(":").map(Number);
          const diffMins = h * 60 + m - currentTotalMins;
          const isOverdue = diffMins < 0;

          return (
            <motion.div
              key={r.id}
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              className={`rounded-xl p-3 border shadow-xs flex items-center justify-between gap-3 transition-all ${
                isOverdue
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-2xs ${
                    isOverdue
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {isOverdue ? <AlertTriangle className="w-4 h-4 animate-bounce" /> : <Clock className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded-md border ${
                        isOverdue
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {isOverdue ? "Overdue" : "Due Soon"}
                    </span>
                    <span className="text-[11px] font-mono font-bold">
                      {formatTime12(r.time)}
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate mt-0.5 text-foreground">
                    {r.label}
                  </div>
                </div>
              </div>

              {/* Quick 1-click actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleSnooze(r)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-surface/80 border border-border/80 hover:border-primary/40 hover:bg-surface text-foreground transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Snooze for 15 minutes"
                >
                  <Moon className="w-3 h-3 text-muted-foreground" />
                  <span>+15m</span>
                </button>

                <button
                  onClick={() => handleDone(r)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  title="Mark reminder done"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Done</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};
