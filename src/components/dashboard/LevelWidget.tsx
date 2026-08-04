import { motion } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";

export function LevelWidget() {
  const { calculateLevel, calculateTotalXP, habits, isHabitDueToday, getTodayStr } = useHabits();
  const level = calculateLevel();
  const xp = calculateTotalXP();
  const xpInLevel = xp % 100;
  const levelTitle =
    level >= 10 ? "Legend" : level >= 7 ? "Master" : level >= 5 ? "Warrior" : level >= 3 ? "Apprentice" : "Beginner";

  const todayStr = getTodayStr();
  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
  const todayXP = doneToday.length * 10;
  const dailyGoalXP = Math.max(dueToday.length * 10, 30);
  const dailyPct = Math.min(Math.round((todayXP / dailyGoalXP) * 100), 100);

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <div>
          <motion.span
            key={level}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-xl font-bold font-mono text-primary inline-block"
          >
            Lv. {level}
          </motion.span>
          <span className="text-[11px] text-muted-foreground ml-2">{levelTitle}</span>
        </div>
        <span className="text-muted-foreground font-mono text-xs">{xpInLevel} / 100 XP</span>
      </div>
      <div className="bg-surface rounded-full h-1.5 mb-1">
        <motion.div
          className="h-1.5 rounded-full"
          initial={false}
          animate={{ width: `${xpInLevel}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "linear-gradient(90deg, hsl(var(--orange)), hsl(var(--yellow)))" }}
        />
      </div>
      <div className="text-muted-foreground text-[11px] mb-3">{100 - xpInLevel} XP to Level {level + 1}</div>

      {/* Daily XP Target Goal */}
      <div className="p-2.5 bg-surface/60 border border-border/60 rounded-lg">
        <div className="flex justify-between items-center text-[11px] mb-1">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <span>🎯</span> Daily XP Goal
          </span>
          <span className="font-mono text-primary font-bold">{todayXP} / {dailyGoalXP} XP</span>
        </div>
        <div className="bg-surface rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-1.5 rounded-full bg-gradient-to-r from-primary to-pps-green"
            initial={false}
            animate={{ width: `${dailyPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </>
  );
}
