import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHabits } from '../../hooks/useHabits';
import {
  getDailyProgress,
  getBestStreak,
  calculatePeriodPoints,
  isHabitDueToday,
  getTodayStr,
} from '../../utils/habitUtils';
import type { Habit, FilterRange } from '../../utils/habitUtils';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${prefix}, ${name}`;
}

function formatDateHeader(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Sort habits into priority lanes for the Focus Board */
function sortIntoLanes(habits: Habit[]) {
  const todayStr = getTodayStr();
  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const upcoming = habits.filter((h) => !isHabitDueToday(h));

  const critical = dueToday.filter(
    (h) => h.priority === 'High' && !h.completedDates.includes(todayStr),
  );
  const high = dueToday.filter(
    (h) => h.priority === 'Medium' && !h.completedDates.includes(todayStr),
  );
  const medium = dueToday.filter(
    (h) =>
      (h.priority === 'Low' || h.priority === 'Optional') &&
      !h.completedDates.includes(todayStr),
  );
  const done = dueToday.filter((h) => h.completedDates.includes(todayStr));

  return { critical, high, medium, upcoming, done };
}

/** Build last-7-days completions for the mini weekly bar chart */
function buildWeeklyBars(habits: Habit[]): { label: string; count: number; max: number }[] {
  const bars: { label: string; count: number; max: number }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = habits.reduce((sum, h) => sum + (h.completedDates.includes(dateStr) ? 1 : 0), 0);
    bars.push({ label: dayNames[d.getDay()], count, max: habits.length || 1 });
  }
  return bars;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Single KPI stat card */
const KpiCard: React.FC<{
  index: string;
  badge: string;
  value: string | number;
  label: string;
  gradient: string;
  glowClass: string;
}> = ({ index, badge, value, label, gradient, glowClass }) => (
  <div
    className={`relative overflow-hidden rounded-radius p-5 border border-border transition-all duration-300 hover:border-border-bright hover:scale-[1.02] ${glowClass}`}
    style={{ background: gradient }}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-mono font-bold text-muted tracking-widest">{index}</span>
      <span className="text-[9px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-muted">
        {badge}
      </span>
    </div>
    <div className="text-3xl font-extrabold tracking-tight text-text font-sans mb-1">{value}</div>
    <div className="text-[11px] text-muted font-medium tracking-wide">{label}</div>
  </div>
);

/** Micro stat card for category / totals row */
const MicroCard: React.FC<{ icon: string; kicker: string; value: string }> = ({
  icon,
  kicker,
  value,
}) => (
  <div className="glass-panel rounded-radius-sm px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:border-border-bright">
    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent font-mono flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] text-muted font-medium uppercase tracking-wider">{kicker}</div>
      <div className="text-sm font-bold text-text truncate">{value}</div>
    </div>
  </div>
);

/** Focus lane in the execution board */
const FocusLane: React.FC<{
  title: string;
  subtitle: string;
  dotColor: string;
  items: Habit[];
  todayStr: string;
  onToggle: (habit: Habit, completed: boolean) => void;
}> = ({ title, subtitle, dotColor, items, todayStr, onToggle }) => (
  <div className="rounded-radius-sm border border-border bg-card/50 p-4">
    <div className="flex items-start gap-2.5 mb-3">
      <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: dotColor }} />
      <div>
        <h4 className="text-sm font-bold text-text">{title}</h4>
        <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
    {items.length === 0 ? (
      <div className="text-[11px] text-muted/60 italic py-2 pl-5">No items</div>
    ) : (
      <div className="space-y-1.5 pl-5">
        {items.map((h) => {
          const isDone = h.completedDates.includes(todayStr);
          return (
            <button
              key={h.id}
              onClick={() => onToggle(h, !isDone)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-radius-sm text-xs font-semibold transition-all duration-200 group ${
                isDone
                  ? 'bg-green/10 text-green line-through opacity-70'
                  : 'bg-white/[0.03] text-text-2 hover:bg-white/[0.06] hover:text-text'
              }`}
            >
              <span
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone
                    ? 'border-green bg-green/20 text-green'
                    : 'border-border-bright group-hover:border-accent'
                }`}
              >
                {isDone && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4.2 7.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="truncate">{h.name}</span>
              <span className="ml-auto text-[9px] text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                {h.category}
              </span>
            </button>
          );
        })}
      </div>
    )}
  </div>
);

/** Today's progress widget */
const ProgressWidget: React.FC<{ done: number; due: number; percent: number }> = ({
  done,
  due,
  percent,
}) => (
  <div className="glass-panel rounded-radius p-5">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-bold text-text">Today's Progress</h4>
      <span className="text-[9px] bg-green/15 text-green px-2 py-0.5 rounded-full font-bold uppercase">
        Live
      </span>
    </div>
    <div className="text-2xl font-extrabold text-text mb-1">
      {done}/{due}
    </div>
    <div className="text-[10px] text-muted mb-3">Habits completed today</div>
    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${percent}%`,
          background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
        }}
      />
    </div>
  </div>
);

/** Weekly snapshot mini bar chart widget */
const WeeklyChartWidget: React.FC<{ bars: { label: string; count: number; max: number }[] }> = ({
  bars,
}) => {
  const maxCount = Math.max(1, ...bars.map((b) => b.count));
  return (
    <div className="glass-panel rounded-radius p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-text">Weekly Snapshot</h4>
        <span className="text-[9px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold uppercase">
          7 days
        </span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {bars.map((bar, i) => {
          const heightPct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: '60px' }}>
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max(heightPct, 4)}%`,
                    background:
                      i === bars.length - 1
                        ? 'linear-gradient(180deg, var(--accent), var(--accent2))'
                        : 'var(--border-bright)',
                  }}
                />
              </div>
              <span className="text-[9px] text-muted font-mono">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Level / XP progress widget */
const LevelWidget: React.FC<{
  level: number;
  totalXp: number;
  xpPerCompletion: number;
}> = ({ level, totalXp, xpPerCompletion }) => {
  const xpForLevel = level * 100;
  const xpIntoLevel = totalXp % 100;
  const xpPercent = Math.min((xpIntoLevel / 100) * 100, 100);
  const xpToNext = 100 - xpIntoLevel;

  return (
    <div className="glass-panel rounded-radius p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-text">Level Progress</h4>
        <span className="text-[9px] bg-amber/15 text-amber px-2 py-0.5 rounded-full font-bold uppercase">
          XP
        </span>
      </div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-2xl font-extrabold text-text">Lv. {level}</span>
        <span className="text-xs font-mono text-muted">
          {totalXp} / {xpForLevel} XP
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-border overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${xpPercent}%`,
            background: 'linear-gradient(90deg, var(--amber), var(--orange))',
          }}
        />
      </div>
      <div className="text-[10px] text-muted">
        {xpToNext} XP to next level · +{xpPerCompletion} XP per completion
      </div>
    </div>
  );
};

/** Streak protection status widget */
const StreakProtectionWidget: React.FC<{
  freezeCredits: number;
  maxFreezeCredits: number;
  totalCreditsUsed: number;
  bestStreak: number;
}> = ({ freezeCredits, maxFreezeCredits, totalCreditsUsed, bestStreak }) => (
  <div className="glass-panel rounded-radius p-5">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-sm font-bold text-text">Streak Protection</h4>
      <span className="text-[9px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase">
        Shield
      </span>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <div className="text-xl font-extrabold text-text">🧊 {freezeCredits}</div>
        <div className="text-[9px] text-muted mt-1">Available</div>
        <div className="w-full h-1 rounded-full bg-border mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{ width: maxFreezeCredits > 0 ? `${(freezeCredits / maxFreezeCredits) * 100}%` : '0%' }}
          />
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-extrabold text-text">🔥 {bestStreak}</div>
        <div className="text-[9px] text-muted mt-1">Best Streak</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-extrabold text-text">🛡️ {totalCreditsUsed}</div>
        <div className="text-[9px] text-muted mt-1">Credits Used</div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardView: React.FC = () => {
  const { profile } = useAuth();
  const { habits, toggleCompletion } = useHabits();
  const [globalFilter, setGlobalFilter] = useState<FilterRange>('today');

  const displayName = profile?.display_name || 'Apex Performer';
  const totalXp = profile?.total_xp ?? 0;
  const level = profile?.level ?? 1;
  const freezeCredits = profile?.freeze_credits ?? 2;
  const maxFreezeCredits = profile?.max_freeze_credits ?? 2;
  const totalCreditsUsed = profile?.total_credits_used ?? 0;
  const xpPerCompletion = profile?.xp_per_completion ?? 10;

  const todayStr = getTodayStr();
  const progress = useMemo(() => getDailyProgress(habits), [habits]);
  const bestStreak = useMemo(() => getBestStreak(habits), [habits]);
  const periodPoints = useMemo(
    () => calculatePeriodPoints(habits, globalFilter, xpPerCompletion),
    [habits, globalFilter, xpPerCompletion],
  );
  const lanes = useMemo(() => sortIntoLanes(habits), [habits]);
  const weeklyBars = useMemo(() => buildWeeklyBars(habits), [habits]);

  // Best category by completions
  const bestCategory = useMemo(() => {
    if (habits.length === 0) return '—';
    const counts: Record<string, number> = {};
    habits.forEach((h) => {
      counts[h.category] = (counts[h.category] || 0) + h.completedDates.length;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '—';
  }, [habits]);

  const totalCompletions = useMemo(
    () => habits.reduce((s, h) => s + h.completedDates.length, 0),
    [habits],
  );

  const handleToggle = (habit: Habit, isCompleted: boolean) => {
    toggleCompletion({ habit, isCompleted });
  };

  const filterLabel: Record<FilterRange, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 lg:space-y-8 bg-bg relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">{getGreeting(displayName)}</h1>
          <div className="text-xs text-muted font-mono mt-1">{formatDateHeader()}</div>
        </div>
        <div className="flex items-center gap-3">
          <select
            id="globalFilter"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value as FilterRange)}
            className="bg-surface border border-border text-text-2 text-xs font-semibold rounded-radius-sm px-3 py-2 focus:border-accent outline-none transition-colors cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index="01"
          badge="Today's habits"
          value={`${progress.percent}%`}
          label="Completion Rate"
          gradient="var(--kpi-purple-bg)"
          glowClass="hover:shadow-glow-accent"
        />
        <KpiCard
          index="02"
          badge="Momentum"
          value={bestStreak}
          label="Current Streak"
          gradient="var(--kpi-orange-bg)"
          glowClass="hover:shadow-glow-amber"
        />
        <KpiCard
          index="03"
          badge="Protection"
          value={freezeCredits}
          label="Freeze Credits"
          gradient="var(--kpi-cyan-bg)"
          glowClass="hover:shadow-glow-cyan"
        />
        <KpiCard
          index="04"
          badge="Growth"
          value={periodPoints}
          label={`Points ${filterLabel[globalFilter]}`}
          gradient="var(--kpi-green-bg)"
          glowClass="hover:shadow-glow-green"
        />
      </div>

      {/* Micro stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MicroCard icon="BC" kicker="Best Category" value={bestCategory} />
        <MicroCard icon="TH" kicker="Total Habits" value={`${habits.length} tracked`} />
        <MicroCard icon="AD" kicker="All-Time Done" value={`${totalCompletions} completions`} />
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* Left — Focus Board */}
        <div className="glass-panel rounded-radius p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">
                Execution board
              </div>
              <h3 className="text-base font-bold text-text">Focus Lanes</h3>
            </div>
            <span className="text-[9px] bg-accent/10 text-accent px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              Auto-sorted from habits
            </span>
          </div>

          <div className="space-y-3">
            <FocusLane
              title="Critical now"
              subtitle="Due today and best handled first."
              dotColor="var(--red)"
              items={lanes.critical}
              todayStr={todayStr}
              onToggle={handleToggle}
            />
            <FocusLane
              title="High priority"
              subtitle="Important follow-up coming soon."
              dotColor="var(--amber)"
              items={lanes.high}
              todayStr={todayStr}
              onToggle={handleToggle}
            />
            <FocusLane
              title="Medium focus"
              subtitle="Good momentum tasks for the day."
              dotColor="var(--accent)"
              items={lanes.medium}
              todayStr={todayStr}
              onToggle={handleToggle}
            />
            {lanes.done.length > 0 && (
              <FocusLane
                title="Completed"
                subtitle="Nice work — these are done for today."
                dotColor="var(--green)"
                items={lanes.done}
                todayStr={todayStr}
                onToggle={handleToggle}
              />
            )}
            <FocusLane
              title="Upcoming"
              subtitle="Everything queued after the essentials."
              dotColor="var(--muted)"
              items={lanes.upcoming}
              todayStr={todayStr}
              onToggle={handleToggle}
            />
          </div>
        </div>

        {/* Right — Widget column */}
        <div className="space-y-4">
          <ProgressWidget done={progress.done} due={progress.due} percent={progress.percent} />
          <WeeklyChartWidget bars={weeklyBars} />
          <LevelWidget level={level} totalXp={totalXp} xpPerCompletion={xpPerCompletion} />
          <StreakProtectionWidget
            freezeCredits={freezeCredits}
            maxFreezeCredits={maxFreezeCredits}
            totalCreditsUsed={totalCreditsUsed}
            bestStreak={bestStreak}
          />
        </div>
      </div>
    </div>
  );
};
