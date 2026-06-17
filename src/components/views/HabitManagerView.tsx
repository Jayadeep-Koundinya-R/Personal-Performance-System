import React, { useState } from 'react';
import { useHabits } from '../../hooks/useHabits';
import { formatDateDMY, getTodayStr } from '../../utils/habitUtils';
import type { Habit, HabitPeriod, HabitPriority } from '../../utils/habitUtils';

export const HabitManagerView: React.FC = () => {
  const { habits, addHabit, editHabit, deleteHabit, isAdding, isEditing, isDeleting } = useHabits();

  // Create Habit Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState<HabitPeriod>('Daily');
  const [priority, setPriority] = useState<HabitPriority>('Medium');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Habit Modal State
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPeriod, setEditPeriod] = useState<HabitPeriod>('Daily');
  const [editPriority, setEditPriority] = useState<HabitPriority>('Medium');
  const [editFreezeCredits, setEditFreezeCredits] = useState(2);

  const categoriesSuggestions = ['Health', 'Work', 'Mind', 'Fitness', 'Routine', 'Social'];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Habit name is required.');
      return;
    }

    addHabit(
      {
        name: name.trim(),
        category: category.trim() || 'Uncategorized',
        period,
        priority,
        startDate: startDate || null,
      },
      {
        onSuccess: () => {
          setName('');
          setCategory('');
          setPeriod('Daily');
          setPriority('Medium');
          setStartDate(getTodayStr());
        },
        onError: (err: any) => {
          setFormError(err.message || 'Failed to create habit.');
        },
      }
    );
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditCategory(habit.category);
    setEditPeriod(habit.period);
    setEditPriority(habit.priority);
    setEditFreezeCredits(habit.freezeCredits);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;

    if (!editName.trim()) return;

    editHabit({
      ...editingHabit,
      name: editName.trim(),
      category: editCategory.trim() || 'Uncategorized',
      period: editPeriod,
      priority: editPriority,
      freezeCredits: editFreezeCredits,
    });

    setEditingHabit(null);
  };

  const getPriorityColor = (p: HabitPriority) => {
    switch (p) {
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

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8 relative">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Habit Manager
        </h1>
        <p className="text-muted text-sm mt-1">
          Create, schedule, edit, or configure habits. Allocate freeze credits to defend your streaks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creation Form Panel */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Register Habit</h2>
            <p className="text-xs text-muted">Provision a new performance metric track.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
                ⚠️ {formError}
              </div>
            )}

            {/* Habit Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Habit Title
              </label>
              <input
                type="text"
                placeholder="e.g. Read research journals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full"
                required
              />
            </div>

            {/* Category selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Health, Routine, Work"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full"
              />
              {/* Category Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {categoriesSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setCategory(sug)}
                    className="text-[9px] font-mono font-bold bg-surface-2 border border-border hover:border-border-bright text-muted hover:text-text px-2 py-0.5 rounded-radius-sm transition-all"
                  >
                    +{sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Refresh Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as HabitPeriod)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2.5 outline-none text-xs text-text w-full transition-all cursor-pointer"
              >
                <option value="Daily">Daily refresh cycle</option>
                <option value="Weekly">Weekly refresh cycle</option>
                <option value="Monthly">Monthly refresh cycle</option>
                <option value="Today">Today Only (Single run)</option>
              </select>
            </div>

            {/* Priority & Start Date Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  Priority Lane
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as HabitPriority)}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2.5 outline-none text-xs text-text w-full transition-all cursor-pointer"
                >
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                  <option value="Optional">⚪ Optional</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2 outline-none text-xs text-text w-full transition-all cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-gradient-to-r from-accent to-accent2 hover:opacity-90 text-white font-bold py-3 rounded-radius shadow-glow-accent hover:scale-[1.01] active:scale-[0.99] transition-all text-xs flex justify-center items-center cursor-pointer mt-4"
            >
              {isAdding ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Add Habit Metric'
              )}
            </button>
          </form>
        </div>

        {/* Habits List Panel */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Active Habits Cabinet</h2>
            <p className="text-xs text-muted">Currently active habit routines ({habits.length}).</p>
          </div>

          {habits.length > 0 ? (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-4 rounded-radius-sm border border-border bg-white/[0.005] hover:bg-white/[0.01] transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mock Drag Handle */}
                    <div className="text-muted/40 cursor-grab select-none font-mono text-base pr-1">
                      ⠿
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-text-2 truncate">{habit.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded-radius-sm border border-accent/15">
                          {habit.category}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-radius-sm border ${getPriorityColor(
                            habit.priority
                          )}`}
                        >
                          {habit.priority}
                        </span>
                        <span className="text-[9px] font-mono text-muted">
                          ↻ {habit.period}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] font-mono text-muted">Next Due Date:</div>
                      <div className="text-xs font-mono font-bold text-text">
                        {formatDateDMY(habit.dueDate)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit button */}
                      <button
                        onClick={() => handleOpenEdit(habit)}
                        className="p-1.5 border border-border hover:border-border-bright rounded-radius-sm text-muted hover:text-text hover:bg-white/5 transition-all cursor-pointer"
                        title="Edit habit details"
                      >
                        ✏️
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        disabled={isDeleting}
                        className="p-1.5 border border-border hover:border-red/20 rounded-radius-sm text-muted hover:text-red hover:bg-red/5 transition-all cursor-pointer"
                        title="Delete habit"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center border border-border border-dashed rounded-radius-sm flex flex-col items-center gap-3">
              <span className="text-4xl">🌱</span>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-text-2">Cabinet is Empty</h3>
                <p className="text-xs text-muted max-w-xs leading-normal">
                  You do not have any registered habits. Provision one on the left panel to begin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Habit Modal Dialog */}
      {editingHabit && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md glass-panel p-6 rounded-radius border border-accent/30 shadow-glow-accent/5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-syne font-extrabold text-text-2">Modify Habit Config</h2>
              <button
                onClick={() => setEditingHabit(null)}
                className="text-muted hover:text-text text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  Habit Title
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                    Refresh Period
                  </label>
                  <select
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(e.target.value as HabitPeriod)}
                    className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2.5 outline-none text-xs text-text w-full cursor-pointer"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Today">Today Only</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                    Priority Lane
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as HabitPriority)}
                    className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2.5 outline-none text-xs text-text w-full cursor-pointer"
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                    <option value="Optional">⚪ Optional</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  Active Shields / Freeze Credits (0–3)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={editFreezeCredits}
                  onChange={(e) => setEditFreezeCredits(Number(e.target.value))}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setEditingHabit(null)}
                  className="px-4 py-2 border border-border hover:border-border-bright rounded-radius text-xs font-semibold text-muted hover:text-text transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2 bg-gradient-to-r from-accent to-accent2 hover:opacity-90 text-white font-bold rounded-radius text-xs shadow-glow-accent transition-all cursor-pointer"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
