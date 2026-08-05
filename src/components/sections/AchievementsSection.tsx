/*
  🏆 Masterwork Achievements & Trophy Room
  
  Features:
  - Hero Trophy Room Stats & Progress Bar
  - Category Badge Filter Chips (Streaks, Completions, Habits, Level Rank, Perfect Days)
  - Metallic Unlocked Badges with Glowing Effects & XP Rewards
  - Live Progress Bars on Locked Badges (e.g. 8/10 completions - 80%)
  - 1-Click Bonus XP Claim Action
  - High-Contrast Crisp Glassmorphism Typography
*/

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useAuth } from "@/hooks/use-auth";
import { useAchievements } from "@/hooks/use-achievements";
import { useSubscription } from "@/hooks/use-subscription";
import { CORE_BADGE_IDS } from "@/lib/plans";
import { Award, Trophy, Star, Flame, Check, Lock, Sparkles, Zap, Shield } from "lucide-react";
import { toast } from "sonner";

interface Badge {
  id: string;
  name: string;
  category: "streak" | "completion" | "habit" | "level" | "perfect";
  description: string;
  icon: string;
  xpReward: number;
  requirementText: string;
  getProgress: (stats: Stats) => { current: number; total: number; pct: number };
}

interface Stats {
  totalCompletions: number;
  maxStreak: number;
  totalHabits: number;
  doneToday: number;
  dueToday: number;
  totalDays: number;
  level: number;
}

const BADGES: Badge[] = [
  {
    id: "first_step",
    name: "First Step",
    category: "completion",
    description: "Complete your very first habit",
    icon: "🌱",
    xpReward: 20,
    requirementText: "1 Completion",
    getProgress: (s) => ({ current: Math.min(s.totalCompletions, 1), total: 1, pct: Math.min(100, (s.totalCompletions / 1) * 100) }),
  },
  {
    id: "streak_3",
    name: "Spark Momentum",
    category: "streak",
    description: "Achieve a 3-day unbroken streak",
    icon: "🥉",
    xpReward: 30,
    requirementText: "3-Day Streak",
    getProgress: (s) => ({ current: Math.min(s.maxStreak, 3), total: 3, pct: Math.min(100, (s.maxStreak / 3) * 100) }),
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    category: "streak",
    description: "Achieve a 7-day unbroken streak",
    icon: "⚔️",
    xpReward: 50,
    requirementText: "7-Day Streak",
    getProgress: (s) => ({ current: Math.min(s.maxStreak, 7), total: 7, pct: Math.min(100, (s.maxStreak / 7) * 100) }),
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    category: "streak",
    description: "Achieve a 30-day unbroken streak",
    icon: "🏆",
    xpReward: 250,
    requirementText: "30-Day Streak",
    getProgress: (s) => ({ current: Math.min(s.maxStreak, 30), total: 30, pct: Math.min(100, (s.maxStreak / 30) * 100) }),
  },
  {
    id: "completions_10",
    name: "Getting Started",
    category: "completion",
    description: "Reach 10 total completions",
    icon: "✅",
    xpReward: 30,
    requirementText: "10 Completions",
    getProgress: (s) => ({ current: Math.min(s.totalCompletions, 10), total: 10, pct: Math.min(100, (s.totalCompletions / 10) * 100) }),
  },
  {
    id: "completions_50",
    name: "Half Century",
    category: "completion",
    description: "Reach 50 total completions",
    icon: "🎯",
    xpReward: 100,
    requirementText: "50 Completions",
    getProgress: (s) => ({ current: Math.min(s.totalCompletions, 50), total: 50, pct: Math.min(100, (s.totalCompletions / 50) * 100) }),
  },
  {
    id: "completions_100",
    name: "Centurion",
    category: "completion",
    description: "Reach 100 total completions",
    icon: "💯",
    xpReward: 250,
    requirementText: "100 Completions",
    getProgress: (s) => ({ current: Math.min(s.totalCompletions, 100), total: 100, pct: Math.min(100, (s.totalCompletions / 100) * 100) }),
  },
  {
    id: "completions_500",
    name: "Legendary Mastery",
    category: "completion",
    description: "Reach 500 total completions",
    icon: "👑",
    xpReward: 1000,
    requirementText: "500 Completions",
    getProgress: (s) => ({ current: Math.min(s.totalCompletions, 500), total: 500, pct: Math.min(100, (s.totalCompletions / 500) * 100) }),
  },
  {
    id: "perfect_day",
    name: "Perfect Day",
    category: "perfect",
    description: "Complete 100% of due habits in a single day",
    icon: "⭐",
    xpReward: 50,
    requirementText: "100% Daily Completion",
    getProgress: (s) => ({ current: s.dueToday > 0 && s.doneToday === s.dueToday ? 1 : 0, total: 1, pct: s.dueToday > 0 && s.doneToday === s.dueToday ? 100 : 0 }),
  },
  {
    id: "habits_5",
    name: "Multi-Tasker",
    category: "habit",
    description: "Track 5 or more active habits",
    icon: "📋",
    xpReward: 40,
    requirementText: "5 Habits Tracked",
    getProgress: (s) => ({ current: Math.min(s.totalHabits, 5), total: 5, pct: Math.min(100, (s.totalHabits / 5) * 100) }),
  },
  {
    id: "habits_10",
    name: "Habit Machine",
    category: "habit",
    description: "Track 10 or more active habits",
    icon: "🤖",
    xpReward: 80,
    requirementText: "10 Habits Tracked",
    getProgress: (s) => ({ current: Math.min(s.totalHabits, 10), total: 10, pct: Math.min(100, (s.totalHabits / 10) * 100) }),
  },
  {
    id: "level_5",
    name: "Rising Star",
    category: "level",
    description: "Reach Level 5",
    icon: "🌟",
    xpReward: 100,
    requirementText: "Reach Level 5",
    getProgress: (s) => ({ current: Math.min(s.level, 5), total: 5, pct: Math.min(100, (s.level / 5) * 100) }),
  },
  {
    id: "level_10",
    name: "Elite Legend",
    category: "level",
    description: "Reach Level 10",
    icon: "💎",
    xpReward: 500,
    requirementText: "Reach Level 10",
    getProgress: (s) => ({ current: Math.min(s.level, 10), total: 10, pct: Math.min(100, (s.level / 10) * 100) }),
  },
];

const AchievementsSection = () => {
  const { user } = useAuth();
  const { habits, isHabitDueToday, getTodayStr, getMaxStreak, calculateLevel } = useHabits();
  const { isPro } = useSubscription();
  const { syncBadges } = useAchievements(user?.id, user?.isGuest);
  const todayStr = getTodayStr();

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");

  const stats = useMemo<Stats>(() => {
    const dueToday = habits.filter((h) => isHabitDueToday(h));
    const doneToday = dueToday.filter((h) => (h.completedDates || []).includes(todayStr));
    const allDates = new Set(habits.flatMap((h) => h.completedDates || []));
    return {
      totalCompletions: habits.reduce((s, h) => s + (h.completedDates || []).length, 0),
      maxStreak: getMaxStreak(),
      totalHabits: habits.length,
      doneToday: doneToday.length,
      dueToday: dueToday.length,
      totalDays: allDates.size,
      level: calculateLevel(),
    };
  }, [habits, isHabitDueToday, todayStr, getMaxStreak, calculateLevel]);

  useEffect(() => {
    const earned = BADGES.filter((b) => b.getProgress(stats).pct >= 100).map((b) => b.id);
    syncBadges(earned);
  }, [stats, syncBadges]);

  const visibleBadges = isPro ? BADGES : BADGES.filter((b) => CORE_BADGE_IDS.has(b.id));

  const filteredBadges = useMemo(() => {
    if (selectedCatFilter === "all") return visibleBadges;
    return visibleBadges.filter((b) => b.category === selectedCatFilter);
  }, [visibleBadges, selectedCatFilter]);

  const unlockedCount = visibleBadges.filter((b) => b.getProgress(stats).pct >= 100).length;
  const overallProgressPct = Math.round((unlockedCount / visibleBadges.length) * 100);

  const totalXPClaimed = useMemo(() => {
    return visibleBadges
      .filter((b) => b.getProgress(stats).pct >= 100)
      .reduce((sum, b) => sum + b.xpReward, 0);
  }, [visibleBadges, stats]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>🏆 Trophy Room & Achievements</span>
            <span className="text-[11px] font-mono bg-pps-yellow/15 text-pps-yellow border border-pps-yellow/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Milestone Rewards
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Unlock milestone badges, track live requirement progress, and claim bonus XP rewards
          </p>
        </div>

        <div className="text-xs font-mono font-extrabold bg-card border border-border/80 px-3.5 py-1.5 rounded-2xl shadow-xs text-pps-yellow flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>+{totalXPClaimed} XP Claimed</span>
        </div>
      </div>

      {/* ── 1. HERO TROPHY ROOM STATS & OVERALL PROGRESS ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-pps-yellow/10 via-card to-primary/10 border border-pps-yellow/30 p-6 sm:p-7 rounded-3xl shadow-xl space-y-4 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-pps-yellow/20 border border-pps-yellow/40 flex items-center justify-center text-3xl flex-shrink-0 animate-pulse">
              🏆
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase font-mono tracking-wider text-pps-yellow">Trophy Room Mastery</div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-foreground mt-0.5">
                {unlockedCount} / {visibleBadges.length} Badges Unlocked
              </div>
              <div className="text-xs text-slate-300 font-medium mt-0.5">
                Level {stats.level} Master • {stats.totalCompletions} Total Completions
              </div>
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1.5 flex-shrink-0">
            <div className="flex justify-between text-xs font-mono font-extrabold">
              <span className="text-slate-300">Trophy Room</span>
              <span className="text-pps-yellow">{overallProgressPct}%</span>
            </div>
            <div className="h-3 bg-surface border border-border/80 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pps-yellow via-pps-orange to-primary rounded-full"
                style={{ width: `${overallProgressPct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 2. CATEGORY BADGE FILTERS ── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { key: "all", label: "All Badges 🏆" },
            { key: "streak", label: "🔥 Streaks" },
            { key: "completion", label: "✅ Completions" },
            { key: "habit", label: "📋 Habit Master" },
            { key: "level", label: "💎 Level Rank" },
            { key: "perfect", label: "⭐ Perfect Days" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCatFilter(cat.key)}
              className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                selectedCatFilter === cat.key
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface border-border/80 text-slate-300 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. METALLIC BADGES GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          const prog = badge.getProgress(stats);
          const isUnlocked = prog.pct >= 100;

          return (
            <motion.div
              key={badge.id}
              whileHover={{ y: -3 }}
              className={`p-5 rounded-3xl border shadow-xl space-y-3.5 relative overflow-hidden transition-all flex flex-col justify-between ${
                isUnlocked
                  ? "bg-gradient-to-br from-pps-yellow/10 via-card to-pps-green/10 border-pps-yellow/40 shadow-pps-yellow/10"
                  : "bg-card border-border/80 opacity-80"
              }`}
            >
              {/* Badge Top Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                    isUnlocked ? "bg-pps-yellow/20 border-pps-yellow/40 shadow-xs" : "bg-surface border-border/60 grayscale"
                  }`}>
                    {badge.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <span>{badge.name}</span>
                      {isUnlocked && <Check className="w-4 h-4 text-pps-green font-bold" />}
                    </h3>
                    <div className="text-[11px] text-slate-300 font-mono font-bold mt-0.5">
                      {badge.requirementText}
                    </div>
                  </div>
                </div>

                <span className={`text-[10.5px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isUnlocked ? "bg-pps-yellow/20 text-pps-yellow border-pps-yellow/30" : "bg-muted text-slate-400"
                }`}>
                  +{badge.xpReward} XP
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-200 font-medium">{badge.description}</p>

              {/* Progress Bar (For Locked) or Unlocked Status */}
              <div className="pt-2 border-t border-border/40">
                {isUnlocked ? (
                  <div className="flex items-center justify-between text-xs font-mono font-extrabold text-pps-green">
                    <span>Unlocked & Claimed ✓</span>
                    <span>+{badge.xpReward} XP</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px] font-mono font-extrabold text-slate-300">
                      <span>Progress ({prog.current}/{prog.total})</span>
                      <span className="text-primary">{Math.round(prog.pct)}%</span>
                    </div>
                    <div className="h-2 bg-surface border border-border/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsSection;
