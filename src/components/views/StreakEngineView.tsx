import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHabits } from '../../hooks/useHabits';
import { getStreakInfo } from '../../utils/habitUtils';

export const StreakEngineView: React.FC = () => {
  const { profile, updateProfile, addXp } = useAuth();
  const { habits, editHabit, isLoading } = useHabits();
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const streak = profile?.streak ?? 0;
  const freezeCredits = profile?.freeze_credits ?? 0;
  const maxFreeze = profile?.max_freeze_credits ?? 2;
  const totalXp = profile?.total_xp ?? 0;

  const FREEZE_CREDIT_COST_XP = 150;

  // Gamified action: Purchase global freeze credit
  const handleBuyGlobalFreeze = async () => {
    setPurchaseError(null);
    setPurchaseSuccess(null);

    if (freezeCredits >= maxFreeze) {
      setPurchaseError(`You are already at your maximum capacity of ${maxFreeze} freeze credits.`);
      return;
    }

    if (totalXp < FREEZE_CREDIT_COST_XP) {
      setPurchaseError(`Insufficient XP. You need ${FREEZE_CREDIT_COST_XP} XP to purchase a freeze credit (Current: ${totalXp} XP).`);
      return;
    }

    try {
      // Deduct XP and add freeze credit
      await addXp(-FREEZE_CREDIT_COST_XP);
      await updateProfile({
        freeze_credits: freezeCredits + 1,
      });
      setPurchaseSuccess('Global Shield Charged! 🛡️ +1 Freeze Credit added.');
    } catch (err: any) {
      setPurchaseError('Failed to complete purchase.');
    }
  };

  // Gamified action: Purchase freeze credit for a specific habit
  const handleBuyHabitFreeze = async (habitId: number) => {
    setPurchaseError(null);
    setPurchaseSuccess(null);

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (habit.freezeCredits >= 3) {
      setPurchaseError(`Habit "${habit.name}" is already at the maximum of 3 freeze credits.`);
      return;
    }

    const HABIT_FREEZE_COST_XP = 75;
    if (totalXp < HABIT_FREEZE_COST_XP) {
      setPurchaseError(`Insufficient XP. You need ${HABIT_FREEZE_COST_XP} XP to purchase a shield for this habit (Current: ${totalXp} XP).`);
      return;
    }

    try {
      await addXp(-HABIT_FREEZE_COST_XP);
      editHabit({
        ...habit,
        freezeCredits: habit.freezeCredits + 1,
      });
      setPurchaseSuccess(`Shield Charged! 🛡️ +1 Freeze Credit added to "${habit.name}".`);
    } catch (err: any) {
      setPurchaseError('Failed to complete purchase.');
    }
  };

  const getOverallStreakDescription = (strk: number) => {
    if (strk === 0) return 'Your flame is currently dormant. Complete all due habits today to spark your momentum!';
    if (strk < 3) return 'Flame ignited! Stay consistent to grow your heat and gain momentum levels.';
    if (strk < 7) return 'Rising heat! You are forming a solid habit chain. Keep going!';
    return 'Supernova! Your daily momentum is unstoppable. Keep feeding the fire!';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Loading streak status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Streak Engine
        </h1>
        <p className="text-muted text-sm mt-1">
          Monitor your momentum flame, recharge protective shields, and manage individual habit streaks.
        </p>
      </div>

      {/* Main visual panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Momentum Card */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute w-[250px] h-[250px] rounded-full bg-accent2/5 blur-[55px] -left-20 -bottom-20 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 z-10 py-4">
            {/* The Flame element */}
            <div className="relative flex items-center justify-center w-36 h-36 flex-shrink-0">
              {/* Flame Glow Ring */}
              <div
                className={`absolute inset-0 rounded-full blur-[20px] transition-all duration-1000 ${
                  streak === 0 ? 'bg-red/10' : streak < 7 ? 'bg-accent/20' : 'bg-orange/30 animate-pulse'
                }`}
              />
              <div className="font-syne text-7xl select-none flex flex-col items-center justify-center relative">
                <span className={streak > 0 ? 'animate-flame' : 'opacity-40'}>🔥</span>
                <span className="absolute bottom-2 text-xl font-extrabold font-mono text-text">
                  {streak}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-center md:text-left">
              <h2 className="text-xl font-bold text-text-2">Momentum Streak</h2>
              <p className="text-muted text-sm leading-relaxed max-w-md">
                {getOverallStreakDescription(streak)}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-mono text-muted pt-1">
                <div>🔥 OVERALL STREAK: <span className="text-text-2 font-bold">{streak} days</span></div>
                <div>⚡ ACTIVE HABITS: <span className="text-accent font-bold">{habits.length}</span></div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-10">
            <div className="space-y-1">
              <div className="text-xs font-mono text-muted">STREAK SYSTEM STATUS:</div>
              <div className="text-xs font-semibold text-text-2">
                Daily reset checks due habits at midnight. Missed habits consume 1 freeze credit.
              </div>
            </div>
          </div>
        </div>

        {/* Global Freeze Shield charging station */}
        <div className="glass-panel p-6 rounded-radius border border-border flex flex-col justify-between relative overflow-hidden">
          <div className="absolute w-[200px] h-[200px] rounded-full bg-blue-500/5 blur-[50px] -right-20 -top-20 pointer-events-none"></div>

          <div className="space-y-4 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-2">Shield Generator</h2>
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-radius-sm">
                Global Shield
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Global freeze credits protect your overall login/momentum streak from resetting when you miss days.
            </p>

            {/* Display shield cells */}
            <div className="flex items-center gap-2.5 py-2">
              {Array.from({ length: maxFreeze }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-radius border flex items-center justify-center text-xl transition-all ${
                    idx < freezeCredits
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-glow-accent'
                      : 'bg-surface-3 border-white/5 text-muted/40'
                  }`}
                  title={idx < freezeCredits ? 'Charged Shield' : 'Depleted Shield'}
                >
                  🛡️
                </div>
              ))}
              <div className="text-xs font-mono text-muted pl-1">
                {freezeCredits} / {maxFreeze} Charged
              </div>
            </div>

            {/* Notifications */}
            {purchaseError && (
              <div className="p-2.5 rounded-radius-sm bg-red/10 border border-red/20 text-red text-[11px] font-mono leading-normal">
                ⚠️ {purchaseError}
              </div>
            )}
            {purchaseSuccess && (
              <div className="p-2.5 rounded-radius-sm bg-green/10 border border-green/20 text-green text-[11px] font-mono leading-normal">
                ✓ {purchaseSuccess}
              </div>
            )}
          </div>

          <button
            onClick={handleBuyGlobalFreeze}
            className="w-full bg-surface-2 hover:bg-surface border border-border hover:border-border-bright text-text-2 hover:text-text font-bold py-2.5 rounded-radius text-xs transition-all mt-6 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            🔋 Charge Shield ({FREEZE_CREDIT_COST_XP} XP)
          </button>
        </div>
      </div>

      {/* Individual Habit Streaks Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-2">Individual Habit Momentum</h2>
        {habits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => {
              const info = getStreakInfo(habit);
              return (
                <div
                  key={habit.id}
                  className="glass-panel p-5 rounded-radius border border-border flex flex-col justify-between gap-4 group hover:border-border-bright transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-text truncate">{habit.name}</h3>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1 block">
                        {habit.category}
                      </span>
                    </div>
                    {/* Habit Streak Badge */}
                    <div
                      style={{ color: info.color }}
                      className="text-xs font-mono font-bold flex items-center gap-1 flex-shrink-0 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-radius-sm"
                    >
                      <span>{info.icon}</span>
                      <span>{info.streak} days</span>
                    </div>
                  </div>

                  {/* Milestone Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>Milestone (10 Days)</span>
                      <span>{habit.streak}/10</span>
                    </div>
                    <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-accent to-accent2"
                        style={{ width: `${info.barPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Streak Freeze Credit details */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                    <div className="flex items-center gap-1 text-muted">
                      <span>🛡️ Shield:</span>
                      <span className="font-mono text-text-2 font-bold">{habit.freezeCredits} credits</span>
                    </div>
                    {habit.freezeCredits < 3 && (
                      <button
                        onClick={() => handleBuyHabitFreeze(habit.id)}
                        className="text-[10px] font-mono text-accent hover:text-accent2 font-bold underline cursor-pointer"
                        title="Add 1 freeze credit to this habit for 75 XP"
                      >
                        Charge (75 XP)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel p-12 text-center rounded-radius flex flex-col items-center justify-center gap-4">
            <div className="text-4xl">🌱</div>
            <div className="space-y-1">
              <h3 className="font-bold text-text-2">No Active Habits</h3>
              <p className="text-muted text-sm max-w-sm">
                Create habits under the Habit Manager to start generating momentum streaks!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
