import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Play, Clock, Check, Sparkles, ArrowRight } from "lucide-react";
import { getTodayStr } from "@/lib/dashboard/recommendations";

interface DailyBeginButtonProps {
  onComplete: () => void;
}

export function DailyBeginButton({ onComplete }: DailyBeginButtonProps) {
  const { toggleCompletion, habits } = useHabits();
  const { user } = useAuth();
  const today = getTodayStr();

  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const dueToday = habits.filter((h) => !h.archived && h.period === "Daily");
  const doneToday = dueToday.filter((h) => (h.completedDates || []).includes(today));
  const allDone = doneToday.length === dueToday.length && dueToday.length > 0;

  const handleBegin = useCallback(async () => {
    setStarted(true);
    // Haptic feedback via Capacitor if available
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      // haptics triggered natively on mobile
    }
  }, []);

  const handleComplete = async (id: string) => {
    await toggleCompletion(id);
    const nowDone = dueToday.filter((h) => (h.completedDates || []).includes(today));
    if (nowDone.length === dueToday.length && dueToday.length > 0) {
      setCompleted(true);
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {!started && (
        <Button
          onClick={handleBegin}
          className="w-full py-4 font-black text-lg shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 border-2 border-primary/30"
        >
          <Play className="w-5 h-5" />
          <span>Begin Your Day</span>
        </Button>
      )}

      {started && !completed && (
        <div className="space-y-2">
          <p className="text-xs font-bold font-mono text-accent uppercase tracking-wider text-center">
            Day in progress — {doneToday.length} / {dueToday.length} done
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dueToday.map((habit) => {
              const isDone = (habit.completedDates || []).includes(today);
              return (
                <Button
                  key={habit.id}
                  onClick={() => handleComplete(habit.id)}
                  variant={isDone ? "default" : "outline"}
                  className={`flex items-center justify-between px-3 py-2 text-left text-xs font-bold border transition-all ${
                    isDone
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-foreground border-border/80 hover:border-primary/50"
                  }`}
                >
                  <span>{habit.name}</span>
                  {isDone && <Check className="w-3 h-3" />}
                </Button>
              );
            })}
          </div>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 py-2 bg-pps-green/10 border border-pps-green/20 rounded-xl text-pps-green text-xs font-bold"
            >
              <Sparkles className="w-3 h-3" />
              <span>Day complete! Great discipline.</span>
            </motion.div>
          )}
        </div>
      )}

      {completed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between py-3 bg-card border border-border rounded-xl px-4"
          >
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase">Daily Goal</div>
              <div className="text-lg font-black text-foreground">All habits done ✓</div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">
              Close Day <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
