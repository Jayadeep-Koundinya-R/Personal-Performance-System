import { useMemo } from "react";
import { motion } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { Flame, Trophy, Zap, CheckCircle2, TrendingUp } from "lucide-react";
import { getTodayStr } from "@/lib/dashboard/recommendations";

interface StreakBadgeProps {
  className?: string;
}

const STREAK_TIERS = [
  { min: 0, max: 2, label: "Just Starting", icon: Zap, color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20" },
  { min: 3, max: 6, label: "Building", icon: Flame, color: "text-pps-orange", bg: "bg-pps-orange/10", border: "border-pps-orange/20" },
  { min: 7, max: 13, label: "Week Warrior", icon: Flame, color: "text-pps-orange", bg: "bg-pps-orange/10", border: "border-pps-orange/20" },
  { min: 14, max: 29, label: "Unbreakable", icon: Trophy, color: "text-accent", bg: "bg-accent/10", border: "border-accent/20" },
  { min: 30, max: 999, label: "Legend", icon: Trophy, color: "text-pps-yellow", bg: "bg-pps-yellow/10", border: "border-pps-yellow/20" },
];

export function StreakBadge({ className }: StreakBadgeProps) {
  const { getMaxStreak, habits } = useHabits();
  const streak = getMaxStreak();
  const today = getTodayStr();
  const activeToday = habits.some((h) => !h.archived && (h.completedDates || []).includes(today));

  const tier = STREAK_TIERS.find((t) => streak >= t.min && streak <= t.max) || STREAK_TIERS[0];
  const Icon = tier.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-[10px] uppercase tracking-wider ${tier.bg} ${tier.color} ${tier.border} ${className ?? ""}`}
    >
      <Icon className="w-3 h-3 fill-current" />
      <span>{tier.label}</span>
      <span className="font-black">{streak}d</span>
      {!activeToday && streak > 0 && (
        <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-destructive/10 text-destructive border border-destructive/20">
          ⚠️ Today
        </span>
      )}
    </motion.div>
  );
}
