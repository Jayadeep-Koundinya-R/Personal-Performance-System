import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHabits } from '../../hooks/useHabits';
import { isHabitDueToday, getTodayStr } from '../../utils/habitUtils';
import type { Habit } from '../../utils/habitUtils';

interface FloatingPop {
  id: number;
  x: number;
  y: number;
  text: string;
}

export const DailyTrackerView: React.FC = () => {
  const { profile } = useAuth();
  const { habits, toggleCompletion, isLoading } = useHabits();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [pops, setPops] = useState<FloatingPop[]>([]);

  const todayStr = getTodayStr();
  const xpAmount = profile?.xp_per_completion || 10;

  // Filter habits due today
  const dueTodayHabits = useMemo(() => {
    return habits.filter((h) => isHabitDueToday(h));
  }, [habits]);

  // Categories present in today's habits
  const categories = useMemo(() => {
    const list = new Set<string>();
    dueTodayHabits.forEach((h) => {
      if (h.category) list.add(h.category);
    });
    return ['All', ...Array.from(list)];
  }, [dueTodayHabits]);

  // Filtered list based on selected category & priority
  const filteredHabits = useMemo(() => {
    return dueTodayHabits.filter((h) => {
      const matchesCat = selectedCategory === 'All' || h.category === selectedCategory;
      const matchesPri = selectedPriority === 'All' || h.priority === selectedPriority;
      return matchesCat && matchesPri;
    });
  }, [dueTodayHabits, selectedCategory, selectedPriority]);

  // Completion calculation
  const completedTodayCount = useMemo(() => {
    return dueTodayHabits.filter((h) => h.completedDates.includes(todayStr)).length;
  }, [dueTodayHabits, todayStr]);

  const totalDueCount = dueTodayHabits.length;
  const completionPercentage = totalDueCount > 0 ? Math.round((completedTodayCount / totalDueCount) * 100) : 0;

  // Circle SVG calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  const handleToggle = (habit: Habit, event: React.MouseEvent<HTMLButtonElement>) => {
    const wasCompleted = habit.completedDates.includes(todayStr);
    const isNowCompleted = !wasCompleted;

    // Toggle completion state
    toggleCompletion({ habit, isCompleted: isNowCompleted });

    // Spawn floating +XP text if completed
    if (isNowCompleted) {
      const rect = event.currentTarget.getBoundingClientRect();
      const popX = rect.left + rect.width / 2;
      const popY = rect.top;

      const newPop: FloatingPop = {
        id: Date.now() + Math.random(),
        x: popX,
        y: popY,
        text: `+${xpAmount} XP`,
      };

      setPops((prev) => [...prev, newPop]);

      // Remove after animation completes (800ms)
      setTimeout(() => {
        setPops((prev) => prev.filter((p) => p.id !== newPop.id));
      }, 800);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-red bg-red/10 border-red/20';
      case 'Medium':
        return 'text-yellow bg-yellow/10 border-yellow/20';
      case 'Low':
        return 'text-green bg-green/10 border-green/20';
      default:
        return 'text-muted bg-surface border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    // Generate a consistent color based on string hash
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 65%)`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Syncing habits...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8 relative">
      {/* Floating XP Animations Layer */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {pops.map((pop) => (
          <div
            key={pop.id}
            style={{
              left: `${pop.x}px`,
              top: `${pop.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="absolute text-accent font-syne font-extrabold text-lg select-none shadow-glow-accent animate-xp-pop pointer-events-none"
          >
            {pop.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
            Daily Tracker
          </h1>
          <p className="text-muted text-sm mt-1">
            Perform daily ticks to earn XP and secure your streak before midnight resets.
          </p>
        </div>
        <div className="text-xs font-mono text-muted bg-card px-3 py-1.5 border border-border rounded-radius-sm self-start">
          📅 TODAY: {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Progress Banner card */}
      {totalDueCount > 0 && (
        <div className="glass-panel p-6 rounded-radius relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute w-[300px] h-[300px] rounded-full bg-accent/5 blur-[50px] -right-20 -top-20 pointer-events-none"></div>

          <div className="space-y-2 text-center md:text-left z-10">
            <h2 className="text-xl font-bold text-text-2">Daily Momentum</h2>
            <p className="text-muted text-sm max-w-md">
              {completionPercentage === 100
                ? 'Perfect day achieved! Outstanding focus. You have earned your bonus streak credits.'
                : completionPercentage >= 50
                ? 'Over halfway there! Keep checking off your habits to guarantee streak protection.'
                : 'Start strong today. Lock in your due habits to protect your progress.'}
            </p>
            <div className="text-xs text-accent font-mono pt-1">
              {completedTodayCount} of {totalDueCount} habits completed
            </div>
          </div>

          <div className="relative flex items-center justify-center z-10">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-surface-3"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress Circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-accent transition-all duration-500 ease-out"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-text font-syne font-extrabold text-lg">
              {completionPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Filters & Control Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono font-bold text-muted mr-1">CATEGORY:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-radius-sm border transition-all ${
                selectedCategory === cat
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-card border-border text-muted hover:text-text hover:border-border-bright'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-xs font-mono font-bold text-muted mr-1">PRIORITY:</span>
          {['All', 'High', 'Medium', 'Low', 'Optional'].map((pri) => (
            <button
              key={pri}
              onClick={() => setSelectedPriority(pri)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-radius-sm border transition-all ${
                selectedPriority === pri
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-card border-border text-muted hover:text-text hover:border-border-bright'
              }`}
            >
              {pri}
            </button>
          ))}
        </div>
      </div>

      {/* Habits Checklist Grid */}
      {filteredHabits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHabits.map((habit) => {
            const isCompleted = habit.completedDates.includes(todayStr);

            return (
              <div
                key={habit.id}
                className={`glass-panel border rounded-radius-sm p-4 flex items-center justify-between gap-4 transition-all duration-300 ${
                  isCompleted
                    ? 'border-accent/40 bg-accent/[0.02] opacity-85 shadow-none'
                    : 'border-border hover:border-border-bright hover:bg-white/[0.01]'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Custom Checkbox Button */}
                  <button
                    onClick={(e) => handleToggle(habit, e)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                      isCompleted
                        ? 'bg-accent border-accent text-white shadow-glow-accent scale-95'
                        : 'border-border-bright hover:border-accent hover:bg-accent/5'
                    }`}
                    aria-label={`Toggle habit ${habit.name}`}
                  >
                    {isCompleted && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </button>

                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-bold truncate transition-colors ${
                        isCompleted ? 'text-muted line-through' : 'text-text'
                      }`}
                    >
                      {habit.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Category Pill */}
                      <span
                        style={{ color: getCategoryColor(habit.category) }}
                        className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.03] px-2 py-0.5 rounded-radius-sm border border-white/5"
                      >
                        {habit.category}
                      </span>
                      {/* Priority Pill */}
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-radius-sm border ${getPriorityColor(
                          habit.priority
                        )}`}
                      >
                        {habit.priority}
                      </span>
                      {/* Period Pill */}
                      <span className="text-[9px] font-mono text-muted">
                        ↻ {habit.period}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Freeze Shield indicator */}
                  {habit.freezeCredits > 0 && (
                    <div
                      className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-radius-sm"
                      title={`${habit.freezeCredits} Freeze Credits remaining`}
                    >
                      <span>🛡️</span>
                      <span className="font-mono font-bold">{habit.freezeCredits}</span>
                    </div>
                  )}

                  {/* Streak Flame indicator */}
                  <div
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-radius-sm border ${
                      habit.streak > 0
                        ? 'text-orange bg-orange/10 border-orange/20 animate-flame'
                        : 'text-muted bg-surface-2 border-border'
                    }`}
                  >
                    <span>🔥</span>
                    <span className="font-mono font-bold">{habit.streak}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center rounded-radius flex flex-col items-center justify-center gap-4">
          <div className="text-4xl">🎉</div>
          <div className="space-y-1">
            <h3 className="font-bold text-text-2">No Habits Due Today</h3>
            <p className="text-muted text-sm max-w-sm">
              {totalDueCount > 0
                ? 'All habits matching your selected filters are completed or filtered out.'
                : 'There are no habits scheduled for today. Head to the Habit Manager to schedule one!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
