import { useMemo } from "react";
import { motion } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Sun, Clock, Flame, CheckCircle2, Zap, TrendingUp } from "lucide-react";
import { getTodayStr } from "@/lib/dashboard/recommendations";

interface MorningBriefCardProps {
  onBeginDay: () => void;
}

export function MorningBriefCard({ onBeginDay }: MorningBriefCardProps) {
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
  const name = profile?.displayName || user?.displayName || "Performance Master";

  const completionPct = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;

  const brief = useMemo(() => {
    if (pending === 0) return "All clear today — you're on fire!";
    if (pending === 1) return "One habit left to close out your day strong.";
    if (pending <= 3) return `${pending} habits waiting. Start your day right.`;
    return `Big day ahead — ${pending} habits to conquer. You've got this.`;
  }, [pending]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border p-6 sm:p-8 shadow-lg"
      style={{
        background: `linear-gradient(135deg, hsl(var(--surface) / 0.9), hsl(var(--card) / 0.95))`,
      }}
    >
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl" style={{ background: `hsl(var(--primary) / 0.15)` }} />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-pps-yellow" />
            <h2 className="font-extrabold text-foreground tracking-tight">{greeting()}, {name}</h2>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-surface/60 border border-border/60 px-2.5 py-0.5 rounded-full">
            {today}
          </span>
        </div>

        <p className="text-muted-foreground text-sm font-medium">
          {brief}
        </p>

        {/* Quick stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-foreground">{pending}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-pps-orange">{completionPct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Done</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-secondary">{streak}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black font-mono text-accent">Lvl {level}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Level</div>
          </div>
        </div>

        {/* Primary CTA */}
        <Button
          onClick={onBeginDay}
          className="w-full py-3.5 font-black text-lg shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          <span>Begin Your Day</span>
        </Button>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs font-bold border-border/80 hover:bg-surface"
          >
            <Clock className="w-3 h-3" />
            <span>Focus Timer</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs font-bold border-border/80 hover:bg-surface"
          >
            <Flame className="w-3 h-3" />
            <span>Streak Guard</span>
          </Button>
        </div>

        {/* XP bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold font-mono uppercase tracking-wider">
            <span className="text-foreground">XP Progress</span>
            <span className="text-primary">{totalXP.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-surface rounded-full border border-border/60 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (totalXP % 100))}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
