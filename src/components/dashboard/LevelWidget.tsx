import { motion } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";

export function LevelWidget() {
  const { calculateLevel, calculateTotalXP } = useHabits();
  const level = calculateLevel();
  const xp = calculateTotalXP();
  const xpInLevel = xp % 100;
  const levelTitle =
    level >= 10 ? "Legend" : level >= 7 ? "Master" : level >= 5 ? "Warrior" : level >= 3 ? "Apprentice" : "Beginner";

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
      <div className="bg-surface rounded-full h-1.5">
        <motion.div
          className="h-1.5 rounded-full"
          initial={false}
          animate={{ width: `${xpInLevel}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "linear-gradient(90deg, hsl(var(--orange)), hsl(var(--yellow)))" }}
        />
      </div>
      <div className="text-muted-foreground text-[11px] mt-1">{100 - xpInLevel} XP to Level {level + 1}</div>
      <motion.div
        key={xp}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className="text-[28px] mt-2 text-center"
      >
        {xp} <span className="text-sm text-muted-foreground font-mono">total XP</span>
      </motion.div>
    </>
  );
}
