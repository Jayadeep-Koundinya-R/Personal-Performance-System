import React, { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHabits } from '../../hooks/useHabits';
import { useReflections } from '../../hooks/useReflections';
import { useTasks } from '../../hooks/useTasks';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'habit' | 'streak' | 'xp' | 'mind' | 'task';
  targetText: string;
  isUnlocked: boolean;
  progressPercent: number; // 0 - 100
  currentVal: number;
  targetVal: number;
}

export const AchievementsView: React.FC = () => {
  const { profile } = useAuth();
  const { habits, isLoading: habitsLoading } = useHabits();
  const { reflections, isLoading: reflectionsLoading } = useReflections();
  const { tasks, isLoading: tasksLoading } = useTasks();

  const isLoading = habitsLoading || reflectionsLoading || tasksLoading;

  // Calculate actual completion stats
  const totalCompletions = useMemo(() => {
    return habits.reduce((sum, h) => sum + (h.completedDates?.length ?? 0), 0);
  }, [habits]);

  const maxHabitStreak = useMemo(() => {
    return habits.length > 0 ? Math.max(...habits.map((h) => h.streak ?? 0)) : 0;
  }, [habits]);

  const completedTasksCount = useMemo(() => {
    return tasks.filter((t) => t.done).length;
  }, [tasks]);

  const achievementsList = useMemo((): Achievement[] => {
    const level = profile?.level ?? 1;
    const totalXp = profile?.total_xp ?? 0;
    const overallStreak = profile?.streak ?? 0;
    const perfectDaysCount = profile?.perfect_days?.length ?? 0;
    const activeFreezeCredits = profile?.freeze_credits ?? 0;
    const habitsCount = habits.length;
    const reflectionsCount = reflections.length;

    const list: Omit<Achievement, 'isUnlocked' | 'progressPercent'>[] = [
      {
        id: 'first_step',
        title: 'First Step',
        description: 'Complete your first habit tick.',
        icon: '🎯',
        category: 'habit',
        targetText: '1 Completion',
        currentVal: totalCompletions,
        targetVal: 1,
      },
      {
        id: 'consistency_spark',
        title: 'Consistency Spark',
        description: 'Reach a streak of 3 days on any habit.',
        icon: '✨',
        category: 'streak',
        targetText: '3 Day Streak',
        currentVal: maxHabitStreak,
        targetVal: 3,
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Reach a streak of 7 days on any habit.',
        icon: '🛡️',
        category: 'streak',
        targetText: '7 Day Streak',
        currentVal: maxHabitStreak,
        targetVal: 7,
      },
      {
        id: 'centurion',
        title: 'Centurion',
        description: 'Log 100 total habit completions.',
        icon: '💯',
        category: 'habit',
        targetText: '100 Ticks',
        currentVal: totalCompletions,
        targetVal: 100,
      },
      {
        id: 'perfect_day',
        title: 'Perfect Day',
        description: 'Complete all due habits in a single day.',
        icon: '👑',
        category: 'habit',
        targetText: '1 Perfect Day',
        currentVal: perfectDaysCount,
        targetVal: 1,
      },
      {
        id: 'streak_master',
        title: 'Streak Master',
        description: 'Maintain a 5-day overall momentum streak.',
        icon: '🔥',
        category: 'streak',
        targetText: '5 Day Momentum',
        currentVal: overallStreak,
        targetVal: 5,
      },
      {
        id: 'xp_hunter',
        title: 'XP Hunter',
        description: 'Reach 500 total Experience Points.',
        icon: '💎',
        category: 'xp',
        targetText: '500 XP',
        currentVal: totalXp,
        targetVal: 500,
      },
      {
        id: 'level_up',
        title: 'Level Up',
        description: 'Level up your performer profile to Level 5.',
        icon: '⚡',
        category: 'xp',
        targetText: 'Level 5',
        currentVal: level,
        targetVal: 5,
      },
      {
        id: 'shield_bearer',
        title: 'Shield Bearer',
        description: 'Charge your protective shield to full capacity.',
        icon: '🔮',
        category: 'streak',
        targetText: '2 Freeze Credits',
        currentVal: activeFreezeCredits,
        targetVal: 2,
      },
      {
        id: 'reflective_mind',
        title: 'Reflective Mind',
        description: 'Submit your first daily reflection entry.',
        icon: '📝',
        category: 'mind',
        targetText: '1 Reflection',
        currentVal: reflectionsCount,
        targetVal: 1,
      },
      {
        id: 'organized_planner',
        title: 'Organized Planner',
        description: 'Register 5 or more habits in your manager cabinet.',
        icon: '📁',
        category: 'habit',
        targetText: '5 Habits',
        currentVal: habitsCount,
        targetVal: 5,
      },
      {
        id: 'task_finisher',
        title: 'Task Finisher',
        description: 'Complete 3 planner tasks.',
        icon: '✅',
        category: 'task',
        targetText: '3 Tasks Done',
        currentVal: completedTasksCount,
        targetVal: 3,
      },
      {
        id: 'apex_performer',
        title: 'Apex Performer',
        description: 'Reach Performer Level 10.',
        icon: '🌌',
        category: 'xp',
        targetText: 'Level 10',
        currentVal: level,
        targetVal: 10,
      },
    ];

    return list.map((item) => {
      const isUnlocked = item.currentVal >= item.targetVal;
      const progressPercent = Math.min(Math.round((item.currentVal / item.targetVal) * 100), 100);
      return {
        ...item,
        isUnlocked,
        progressPercent,
      };
    });
  }, [profile, habits, reflections, totalCompletions, maxHabitStreak, completedTasksCount]);

  const earnedAchievements = useMemo(() => {
    return achievementsList.filter((a) => a.isUnlocked);
  }, [achievementsList]);

  const lockedAchievements = useMemo(() => {
    return achievementsList.filter((a) => !a.isUnlocked);
  }, [achievementsList]);

  const categoryColorClass = (cat: Achievement['category']) => {
    switch (cat) {
      case 'habit':
        return 'text-green border-green/10 bg-green/5';
      case 'streak':
        return 'text-orange border-orange/10 bg-orange/5';
      case 'xp':
        return 'text-accent border-accent/10 bg-accent/5';
      case 'mind':
        return 'text-purple border-purple/10 bg-purple/5';
      case 'task':
        return 'text-blue-400 border-blue-500/10 bg-blue-500/5';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Reading achievement badges...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Badge Cabinet
        </h1>
        <p className="text-muted text-sm mt-1">
          Perform actions and milestones to unlock permanent high-fidelity achievements.
        </p>
      </div>

      {/* Summary Metrics Card */}
      <div className="glass-panel p-6 rounded-radius relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="absolute w-[300px] h-[300px] rounded-full bg-accent/5 blur-[50px] -left-20 -top-20 pointer-events-none"></div>

        <div className="space-y-1.5 text-center sm:text-left z-10">
          <h2 className="text-lg font-bold text-text-2">Cabinet Progress</h2>
          <p className="text-xs text-muted max-w-md">
            Unlocking achievements proves your focus and dedication to system optimization.
          </p>
          <div className="text-xs text-accent font-mono pt-1">
            Unlocked: {earnedAchievements.length} of {achievementsList.length} Badges
          </div>
        </div>

        {/* Level Stats Bar */}
        <div className="w-full sm:w-64 space-y-2 z-10">
          <div className="flex justify-between text-xs font-mono text-muted">
            <span>UNLOCKED</span>
            <span>{Math.round((earnedAchievements.length / achievementsList.length) * 100)}%</span>
          </div>
          <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-500"
              style={{ width: `${(earnedAchievements.length / achievementsList.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Unlocked Badges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <h2 className="text-xl font-bold text-text-2">Earned Badges</h2>
          <span className="text-xs font-mono bg-green/10 text-green px-2 py-0.5 rounded-full border border-green/20">
            {earnedAchievements.length}
          </span>
        </div>

        {earnedAchievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {earnedAchievements.map((badge) => (
              <div
                key={badge.id}
                className="glass-panel p-5 rounded-radius border border-accent/30 bg-accent/[0.01] hover:bg-accent/[0.03] transition-all flex flex-col items-center text-center gap-3 relative overflow-hidden group shadow-glow-accent/5"
              >
                {/* Decorative glow behind icon */}
                <div className="absolute w-12 h-12 rounded-full bg-accent/10 blur-md top-4 pointer-events-none group-hover:scale-150 transition-all duration-500"></div>

                <div className="text-4xl z-10 select-none transform group-hover:scale-110 transition-transform duration-300">
                  {badge.icon}
                </div>

                <div className="space-y-1 z-10">
                  <h3 className="font-syne font-bold text-sm text-text-2">{badge.title}</h3>
                  <p className="text-[11px] text-muted leading-relaxed px-1">{badge.description}</p>
                </div>

                <div
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-radius-sm border mt-auto z-10 ${categoryColorClass(
                    badge.category
                  )}`}
                >
                  {badge.category}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-8 text-center rounded-radius-sm text-xs text-muted">
            Lock in your first habits and task ticks to unlock your cabinet badges!
          </div>
        )}
      </div>

      {/* Grid: Locked Badges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <h2 className="text-xl font-bold text-text-2">Locked Badges</h2>
          <span className="text-xs font-mono bg-surface-3 text-muted px-2 py-0.5 rounded-full border border-border">
            {lockedAchievements.length}
          </span>
        </div>

        {lockedAchievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lockedAchievements.map((badge) => (
              <div
                key={badge.id}
                className="glass-panel p-5 rounded-radius border border-border bg-white/[0.002] hover:bg-white/[0.01] transition-all flex flex-col items-center text-center gap-3 opacity-60 hover:opacity-80"
              >
                {/* Greyscale icon */}
                <div className="text-4xl filter grayscale opacity-45 select-none">{badge.icon}</div>

                <div className="space-y-1">
                  <h3 className="font-syne font-bold text-sm text-text-2">{badge.title}</h3>
                  <p className="text-[11px] text-muted leading-relaxed px-1">{badge.description}</p>
                </div>

                {/* Badge progress meter */}
                <div className="w-full space-y-1.5 mt-auto pt-2">
                  <div className="flex justify-between text-[9px] font-mono text-muted">
                    <span className="truncate max-w-[80px]">
                      {badge.currentVal} / {badge.targetVal}
                    </span>
                    <span>{badge.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-surface-3 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-muted-bright rounded-full transition-all duration-300"
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-8 text-center rounded-radius-sm text-xs text-muted">
            ✨ Outstanding! You have unlocked every single achievement badge in the PPS database.
          </div>
        )}
      </div>
    </div>
  );
};
