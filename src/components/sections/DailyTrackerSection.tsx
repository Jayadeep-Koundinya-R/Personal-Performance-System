/*
  💡 Daily Tracker Section — with animated checkmarks, floating XP, pulsing streaks,
  and a friendly empty state that guides new users.
*/

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import EmptyState from "@/components/EmptyState";

/* Floating XP component */
const FloatingXP = ({ habitId }: { habitId: string }) => (
  <motion.span
    key={`xp-${habitId}-${Date.now()}`}
    initial={{ opacity: 1, y: 0 }}
    animate={{ opacity: 0, y: -30 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="absolute -top-2 right-0 text-[12px] font-bold text-pps-green pointer-events-none"
  >
    +10 XP ✨
  </motion.span>
);

interface DailyTrackerProps {
  onNavigate?: (section: string) => void;
}

const DailyTrackerSection = ({ onNavigate }: DailyTrackerProps) => {
  const { habits, toggleCompletion, isHabitDueToday, getTodayStr } = useHabits();
  const todayStr = getTodayStr();
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const todayHabits = habits.filter((h) => isHabitDueToday(h));
  const doneCount = todayHabits.filter((h) => h.completedDates.includes(todayStr)).length;
  const pct = todayHabits.length > 0 ? Math.round((doneCount / todayHabits.length) * 100) : 0;

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const grouped: Record<string, typeof todayHabits> = {};
  todayHabits.forEach((h) => {
    const cat = h.category || "Uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(h);
  });

  const priClass: Record<string, string> = {
    High: "bg-destructive/15 text-destructive",
    Medium: "bg-pps-yellow/15 text-pps-yellow",
    Low: "bg-pps-green/15 text-pps-green",
    Optional: "bg-primary/15 text-primary/70",
  };

  const handleToggle = (habitId: string, wasDone: boolean) => {
    toggleCompletion(habitId);
    if (!wasDone) {
      setJustCompleted((prev) => new Set(prev).add(habitId));
      setTimeout(() => {
        setJustCompleted((prev) => {
          const next = new Set(prev);
          next.delete(habitId);
          return next;
        });
      }, 900);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold">Daily Tracker</h1>
          <div className="text-[13px] text-muted-foreground mt-0.5">Check off as you go — XP updates automatically</div>
        </div>
        <div className="font-mono text-muted-foreground text-[13px]">{dateStr}</div>
      </div>

      {/* Progress bar card */}
      {todayHabits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border p-5 rounded-lg flex items-center gap-6 mb-5"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <div>
            <motion.div
              key={doneCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="text-[28px] font-bold font-mono text-primary"
            >
              {doneCount}/{todayHabits.length}
            </motion.div>
            <div className="text-muted-foreground text-xs">Done today</div>
          </div>
          <div className="flex-1">
            <div className="bg-surface rounded-full h-2.5">
              <motion.div
                className="h-2.5 rounded-full bg-gradient-to-r from-primary to-secondary"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="text-muted-foreground text-[13px]">{pct}% complete</div>
        </motion.div>
      )}

      {todayHabits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <EmptyState
            icon="📋"
            title="No habits due today"
            description="Add habits in the Habit Manager and they'll appear here automatically based on their schedule."
            actionLabel="+ Add Your First Habit"
            onAction={() => onNavigate?.("habits")}
          />
        </motion.div>
      ) : (
        Object.entries(grouped).map(([cat, catHabits]) => (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border p-5 rounded-lg mb-4"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">{cat}</h3>
            <AnimatePresence>
              {catHabits.map((habit, i) => {
                const done = habit.completedDates.includes(todayStr);
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative flex items-center justify-between px-3 py-2.5 bg-surface border border-border rounded-lg mb-1.5 text-[13.5px] hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleToggle(habit.id, done)}
                        className={`w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                          done ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
                        }`}
                      >
                        <AnimatePresence>
                          {done && (
                            <motion.svg
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              width="12" height="12" viewBox="0 0 12 12" fill="none"
                            >
                              <motion.path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.25, delay: 0.1 }}
                              />
                            </motion.svg>
                          )}
                        </AnimatePresence>
                      </button>
                      <span className={`transition-all duration-200 ${done ? "line-through opacity-45" : ""}`}>{habit.name}</span>
                    </div>
                    <div className="flex gap-2 items-center relative">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold font-mono ${priClass[habit.priority] || priClass.Optional}`}>
                        {habit.priority}
                      </span>
                      <motion.span
                        animate={done ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold font-mono ${
                          done ? "bg-pps-green/10 text-pps-green" : "bg-pps-orange/10 text-pps-orange"
                        }`}
                      >
                        {done ? "🔥" : ""} {done ? "+10 XP ✓" : "+10 XP"}
                      </motion.span>
                      <AnimatePresence>
                        {justCompleted.has(habit.id) && <FloatingXP habitId={habit.id} />}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default DailyTrackerSection;
