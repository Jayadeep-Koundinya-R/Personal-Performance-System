import { useMemo } from "react";
import { motion } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { CheckCircle2, TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayStr } from "@/lib/dashboard/recommendations";

interface EveningCloseoutCardProps {
  onClose: () => void;
}

export function EveningCloseoutCard({ onClose }: EveningCloseoutCardProps) {
  const { habits, getMaxStreak, calculateLevel, calculateTotalXP } = useHabits();
  const { user } = useAuth();
  const { profile } = useProfile();

  const today = getTodayStr();
  const dueToday = habits.filter((h) => !h.archived && h.period === "Daily");
  const doneToday = dueToday.filter((h) => (h.completedDates || []).includes(today));
  const pending = dueToday.length - doneToday.length;
  const streak = getMaxStreak();
  const level = calculateLevel();
  const totalXP = calculateTotalXP();
  const completionPct = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;

  const message = useMemo(() => {
    if (completionPct === 100) return "Perfect day — every habit checked off.";
    if (completionPct >= 75) return "Strong day. You're building real discipline.";
    if (completionPct >= 50) return "Halfway there. Tomorrow's a fresh start.";
    return "Today was tough. That's okay — restart tomorrow.";
  }, [completionPct]);

  const xpEarned = doneToday.length * 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border p-6 sm:p-8 shadow-xl"
      style={{
        background: `linear-gradient(135deg, hsl(var(--surface) / 0.9), hsl(var(--card) / 0.95))`,
      }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl" style={{ background: `hsl(var(--accent) / 0.15)` }} />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-pps-green" />
            <h2 className="font-extrabold text-foreground tracking-tight">Day Closed Out</h2>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-surface/60 border border-border/60 px-2.5 py-0.5 rounded-full">
            {today}
          </span>
        </div>

        <p className="text-muted-foreground text-sm font-medium">{message}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-foreground">{doneToday.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-pps-orange">{completionPct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-secondary">{streak}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-accent">+{xpEarned} XP</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Earned</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {pending > 0 && (
            <div className="flex items-center gap-2 py-2 bg-surface rounded-xl border border-border/60 text-xs font-bold">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground">{pending} habit(s) pending</span>
              <span className="ml-auto text-accent">Carries to tomorrow</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-t border-border/60 text-xs font-bold">
            <span className="text-muted-foreground">Level</span>
            <span className="text-primary">{level}</span>
          </div>
          <div className="flex items-center justify-between py-2 text-xs font-bold">
            <span className="text-muted-foreground">Total XP</span>
            <span className="text-accent">{totalXP.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 text-xs font-bold border-border/80 hover:bg-surface"
          >
            <ArrowRight className="w-3 h-3" />
            <span>Done for Today</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>View Insights</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
