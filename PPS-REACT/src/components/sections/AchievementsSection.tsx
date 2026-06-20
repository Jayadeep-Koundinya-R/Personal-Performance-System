import { useMemo } from "react";
import { useHabits } from "@/hooks/use-habits";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  check: (stats: Stats) => boolean;
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
  { id: "first_step", name: "First Step", description: "Complete your first habit", icon: "🌱", requirement: "1 completion", check: (s) => s.totalCompletions >= 1 },
  { id: "streak_3", name: "On a Roll", description: "Achieve a 3-day streak", icon: "🔥", requirement: "3-day streak", check: (s) => s.maxStreak >= 3 },
  { id: "streak_7", name: "Week Warrior", description: "Achieve a 7-day streak", icon: "⚔️", requirement: "7-day streak", check: (s) => s.maxStreak >= 7 },
  { id: "streak_30", name: "Monthly Master", description: "Achieve a 30-day streak", icon: "🏆", requirement: "30-day streak", check: (s) => s.maxStreak >= 30 },
  { id: "completions_10", name: "Getting Started", description: "Reach 10 total completions", icon: "✅", requirement: "10 completions", check: (s) => s.totalCompletions >= 10 },
  { id: "completions_50", name: "Half Century", description: "Reach 50 total completions", icon: "🎯", requirement: "50 completions", check: (s) => s.totalCompletions >= 50 },
  { id: "completions_100", name: "Centurion", description: "Reach 100 total completions", icon: "💯", requirement: "100 completions", check: (s) => s.totalCompletions >= 100 },
  { id: "completions_500", name: "Legendary", description: "Reach 500 total completions", icon: "👑", requirement: "500 completions", check: (s) => s.totalCompletions >= 500 },
  { id: "perfect_day", name: "Perfect Day", description: "Complete all habits in a day", icon: "⭐", requirement: "100% daily completion", check: (s) => s.dueToday > 0 && s.doneToday === s.dueToday },
  { id: "habits_5", name: "Multi-Tasker", description: "Track 5 or more habits", icon: "📋", requirement: "5 habits tracked", check: (s) => s.totalHabits >= 5 },
  { id: "habits_10", name: "Habit Machine", description: "Track 10 or more habits", icon: "🤖", requirement: "10 habits tracked", check: (s) => s.totalHabits >= 10 },
  { id: "level_5", name: "Rising Star", description: "Reach Level 5", icon: "🌟", requirement: "Level 5", check: (s) => s.level >= 5 },
  { id: "level_10", name: "Elite", description: "Reach Level 10", icon: "💎", requirement: "Level 10", check: (s) => s.level >= 10 },
];

const AchievementsSection = () => {
  const { habits, isHabitDueToday, getTodayStr, getMaxStreak, calculateLevel } = useHabits();
  const todayStr = getTodayStr();

  const stats = useMemo<Stats>(() => {
    const dueToday = habits.filter((h) => isHabitDueToday(h));
    const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
    const allDates = new Set(habits.flatMap((h) => h.completedDates));
    return {
      totalCompletions: habits.reduce((s, h) => s + h.completedDates.length, 0),
      maxStreak: getMaxStreak(),
      totalHabits: habits.length,
      doneToday: doneToday.length,
      dueToday: dueToday.length,
      totalDays: allDates.size,
      level: calculateLevel(),
    };
  }, [habits, isHabitDueToday, todayStr, getMaxStreak, calculateLevel]);

  const unlocked = BADGES.filter((b) => b.check(stats));
  const locked = BADGES.filter((b) => !b.check(stats));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Achievements</h1>
        <div className="text-[13px] text-muted-foreground mt-0.5">
          {unlocked.length}/{BADGES.length} badges unlocked
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Badge Progress</span>
          <span className="text-xs font-mono text-primary">{Math.round((unlocked.length / BADGES.length) * 100)}%</span>
        </div>
        <div className="bg-surface rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${(unlocked.length / BADGES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat icon="✅" label="Completions" value={stats.totalCompletions} />
        <MiniStat icon="🔥" label="Best Streak" value={stats.maxStreak} />
        <MiniStat icon="📋" label="Habits" value={stats.totalHabits} />
        <MiniStat icon="⬆️" label="Level" value={stats.level} />
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">🏅 Unlocked</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlocked.map((b) => (
              <div key={b.id} className="bg-card border border-primary/20 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                <div className="text-3xl">{b.icon}</div>
                <div>
                  <div className="text-sm font-bold text-foreground">{b.name}</div>
                  <div className="text-[12px] text-muted-foreground">{b.description}</div>
                  <div className="text-[11px] text-primary font-mono mt-1">{b.requirement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">🔒 Locked</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 opacity-50">
                <div className="text-3xl grayscale">{b.icon}</div>
                <div>
                  <div className="text-sm font-bold text-foreground">{b.name}</div>
                  <div className="text-[12px] text-muted-foreground">{b.description}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1">{b.requirement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function MiniStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default AchievementsSection;
