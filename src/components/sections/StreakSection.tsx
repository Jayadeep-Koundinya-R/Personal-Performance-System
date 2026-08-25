/*
  🔥 Masterwork Streak Engine & Retention System
  
  Features:
  - Hero Streak Banner with Global Flame Rank & Freeze Inventory
  - 🚨 At-Risk Emergency Rescue Alert Banner (Alerts uncompleted streak habits today)
  - 🔥 Flame Tier Progression System (Spark, Ignited, Inferno, Legendary Blaze, Immortal Phoenix)
  - 🛡️ Streak Shield Inventory & Freeze Vault (1-click freeze protection)
  - 🏆 Milestone Trophy Wall (Unlockable badges + XP rewards)
  - ⚡ Interactive Habit Cards with 1-click Check Off & Shield Rescue
  - High-Contrast Crisp Glassmorphism Design
*/

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { Flame, Shield, Award, AlertTriangle, Check, Sparkles, Zap, Lock } from "lucide-react";
import { toast } from "sonner";

// Flame Tier Helper
function getFlameTier(streak: number) {
  if (streak >= 30) return { name: "Immortal Phoenix", icon: "🏆", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", nextGoal: 100, rank: "Tier 5" };
  if (streak >= 14) return { name: "Legendary Blaze", icon: "💎", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", nextGoal: 30, rank: "Tier 4" };
  if (streak >= 7) return { name: "Inferno Fire", icon: "🥇", color: "text-pps-orange", bg: "bg-pps-orange/15 border-pps-orange/30", nextGoal: 14, rank: "Tier 3" };
  if (streak >= 4) return { name: "Ignited Flame", icon: "🥈", color: "text-primary", bg: "bg-primary/15 border-primary/30", nextGoal: 7, rank: "Tier 2" };
  if (streak >= 1) return { name: "Spark Momentum", icon: "🥉", color: "text-pps-yellow", bg: "bg-pps-yellow/15 border-pps-yellow/30", nextGoal: 4, rank: "Tier 1" };
  return { name: "Dormant", icon: "💀", color: "text-slate-400", bg: "bg-surface/50 border-border/40", nextGoal: 1, rank: "Unranked" };
}

// Milestones Definition
const MILESTONES = [
  { days: 3, title: "3-Day Spark", icon: "🥉", xp: 20, desc: "Ignite your momentum" },
  { days: 7, title: "7-Day Week Warrior", icon: "🥈", xp: 50, desc: "A full week of pure discipline" },
  { days: 14, title: "14-Day Fortitude", icon: "🥇", xp: 100, desc: "Two solid weeks unbroken" },
  { days: 30, title: "30-Day Titan", icon: "💎", xp: 250, desc: "Monthly habit perfection" },
  { days: 100, title: "100-Day Centurion", icon: "🏆", xp: 1000, desc: "Master of lifestyle transformation" },
];

const StreakSection = () => {
  const { habits, getMaxStreak, getTotalFreezeCredits, applyStreakFreeze, toggleCompletion, getTodayStr, isHabitDueToday } = useHabits();
  const { limits } = useSubscription();
  const todayStr = getTodayStr();

  const [msg, setMsg] = useState<string | null>(null);

  const maxStreak = getMaxStreak();
  const freezeCredits = getTotalFreezeCredits();
  const totalCompletions = habits.reduce((s, h) => s + (h.completedDates || []).length, 0);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  // At-Risk Habits (Has streak > 0, due today, but NOT yet completed today)
  const atRiskHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      const streak = h.streak || 0;
      const isDoneToday = (h.completedDates || []).includes(todayStr);
      return streak > 0 && isHabitDueToday(h) && !isDoneToday;
    });
  }, [activeHabits, todayStr, isHabitDueToday]);

  // Handle Shield activation
  const handleFreeze = async (habitId: string) => {
    const err = await applyStreakFreeze(habitId);
    if (err) {
      toast.error(err);
    } else {
      toast.success("🛡️ Streak Shield activated! Your streak is protected.");
    }
  };

  // Handle 1-click completion
  const handleToggle = (habitId: string, done: boolean) => {
    toggleCompletion(habitId);
    if (!done) {
      toast.success("🔥 Habit completed! Streak extended.");
    }
  };

  const globalTier = getFlameTier(maxStreak);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>🔥 Streak Engine</span>
            <span className="text-[11px] font-mono bg-pps-orange/15 text-pps-orange border border-pps-orange/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Don't Break The Chain
            </span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Flame progression, streak shield protection, at-risk alerts, and milestone rewards
          </p>
        </div>

        {/* Inventory Badge */}
        <div className="flex items-center gap-2 bg-card border border-border/80 px-3.5 py-1.5 rounded-2xl shadow-xs">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-extrabold text-foreground">
            {freezeCredits} Shield{freezeCredits !== 1 ? "s" : ""} Available
          </span>
        </div>
      </div>

      {/* ── 1. HERO STREAK BANNER & GLOBAL MOMENTUM ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-pps-orange/10 via-card to-primary/10 border border-pps-orange/30 p-6 sm:p-8 rounded-3xl text-center shadow-xl relative overflow-hidden space-y-5"
      >
        <div className="inline-block relative">
          <div className="text-6xl animate-bounce mb-1">🔥</div>
          <div className="text-6xl sm:text-7xl font-extrabold font-mono text-pps-orange tracking-tight drop-shadow-md">
            {maxStreak}
          </div>
          <div className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-200 mt-1">
            Day Unbroken Chain
          </div>
        </div>

        {/* Global Flame Rank Badge */}
        <div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-extrabold px-3.5 py-1 rounded-full border ${globalTier.bg} ${globalTier.color}`}>
            <span>{globalTier.icon}</span>
            <span>Global Rank: {globalTier.name} ({globalTier.rank})</span>
          </span>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-5 max-w-lg mx-auto">
          <div>
            <div className="text-xl font-extrabold font-mono text-foreground">{freezeCredits}</div>
            <div className="text-[10.5px] font-mono text-muted-foreground font-extrabold uppercase mt-0.5">Shield Inventory</div>
          </div>
          <div>
            <div className="text-xl font-extrabold font-mono text-pps-orange">{maxStreak}</div>
            <div className="text-[10.5px] font-mono text-muted-foreground font-extrabold uppercase mt-0.5">Best Streak</div>
          </div>
          <div>
            <div className="text-xl font-extrabold font-mono text-primary">{totalCompletions}</div>
            <div className="text-[10.5px] font-mono text-muted-foreground font-extrabold uppercase mt-0.5">Total Done</div>
          </div>
        </div>

        {/* Pure Discipline Bonus Badge */}
        {maxStreak >= 7 && (
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold bg-pps-green/15 text-pps-green border border-pps-green/30 px-3.5 py-1 rounded-full shadow-xs">
            <span>✨ Pure Discipline Bonus:</span>
            <span>+25 XP for maintaining 7d+ unshielded streak!</span>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground font-mono font-medium">
          Free Tier: {limits?.streakFreezesPerMonth ?? 3} freeze/month • Pro Tier: 3 freezes/month
        </p>
      </motion.div>

      {/* ── 2. 🚨 AT-RISK EMERGENCY RESCUE ALERT BANNER ── */}
      <AnimatePresence>
        {atRiskHabits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-destructive/20 via-card to-pps-orange/15 border border-destructive/40 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-destructive/20 border border-destructive/40 flex items-center justify-center text-xl flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-destructive flex items-center gap-1.5">
                  <span>Emergency Alert: {atRiskHabits.length} Habit{atRiskHabits.length !== 1 ? "s" : ""} At Risk Today</span>
                </h3>
                <p className="text-xs text-foreground font-semibold mt-0.5">
                  Complete them now or apply a 🛡️ Streak Shield before midnight to prevent chain reset!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {atRiskHabits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleToggle(h.id, false)}
                  className="bg-destructive text-destructive-foreground text-xs font-extrabold px-3 py-1.5 rounded-xl hover:bg-destructive/90 transition-all cursor-pointer shadow-xs flex items-center gap-1 font-mono"
                >
                  <span>✓ Complete {h.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. 🏆 MILESTONE TROPHY WALL ── */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>🏆 Milestone Trophy Wall</span>
            </h3>
            <p className="text-[11.5px] text-muted-foreground font-medium mt-0.5">
              Unlock milestone badges by holding unbroken streaks
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono font-bold bg-surface border border-border/80 px-2.5 py-1 rounded-xl">
            XP Rewards
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {MILESTONES.map((m) => {
            const isUnlocked = maxStreak >= m.days;
            return (
              <div
                key={m.days}
                className={`p-3.5 rounded-2xl border text-center space-y-2 transition-all ${
                  isUnlocked
                    ? "bg-pps-green/10 border-pps-green/40 shadow-xs shadow-pps-green/10"
                    : "bg-surface/50 border-border/60 opacity-60"
                }`}
              >
                <div className="text-3xl">{m.icon}</div>
                <div>
                  <div className={`text-xs font-extrabold font-mono ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{m.desc}</div>
                </div>
                <div className={`text-[10.5px] font-mono font-extrabold px-2 py-0.5 rounded-full inline-block ${
                  isUnlocked ? "bg-pps-green/20 text-pps-green border border-pps-green/30" : "bg-muted text-muted-foreground"
                }`}>
                  {isUnlocked ? `+${m.xp} XP Unlocked ✓` : `${m.days}d Needed`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. ⚡ HABIT STREAK CARDS GRID ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            🔥 Individual Habit Streak Health
          </h2>
          <span className="text-xs text-muted-foreground font-mono font-bold">
            {activeHabits.length} Habits Tracked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeHabits.length === 0 ? (
            <div className="col-span-3 text-center py-10 bg-card border border-border rounded-3xl text-muted-foreground text-xs font-medium">
              No habits created yet. Go to Habit Manager to add your first habit!
            </div>
          ) : (
            activeHabits.map((h) => {
              const streak = h.streak || 0;
              const isDoneToday = (h.completedDates || []).includes(todayStr);
              const tier = getFlameTier(streak);
              const pctToNextTier = Math.min(100, Math.round((streak / tier.nextGoal) * 100));

              return (
                <motion.div
                  key={h.id}
                  whileHover={{ y: -3 }}
                  className={`bg-card border p-5 rounded-3xl shadow-xl space-y-3.5 relative overflow-hidden transition-all ${
                    isDoneToday
                      ? "border-pps-green/40 shadow-pps-green/5"
                      : streak > 0
                      ? "border-pps-orange/40 shadow-pps-orange/5"
                      : "border-border/80"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{h.name}</h3>
                      <div className="text-[11px] text-muted-foreground font-mono font-bold mt-0.5">
                        {h.category || "General"} • {h.period}
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>
                      {tier.name}
                    </span>
                  </div>

                  {/* Streak Count Number */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold font-mono text-pps-orange">{tier.icon} {streak}</span>
                    <span className="text-xs text-muted-foreground font-mono font-bold">Days Unbroken</span>
                  </div>

                  {/* Tier Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold text-muted-foreground">
                      <span>Progress to {tier.nextGoal}d</span>
                      <span className="text-primary">{pctToNextTier}%</span>
                    </div>
                    <div className="h-2 bg-surface border border-border/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-pps-orange rounded-full transition-all duration-500"
                        style={{ width: `${pctToNextTier}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(h.id, isDoneToday)}
                      className={`flex-1 text-xs font-extrabold py-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 font-mono ${
                        isDoneToday
                          ? "bg-pps-green/15 text-pps-green border-pps-green/30"
                          : "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-xs"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isDoneToday ? "Completed Today ✓" : "Complete Today"}</span>
                    </button>

                    {(h.freezeCredits || 0) > 0 && streak > 0 && (
                      <button
                        onClick={() => handleFreeze(h.id)}
                        className="p-2 bg-surface border border-border/80 text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                        title="Use Streak Shield"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakSection;
