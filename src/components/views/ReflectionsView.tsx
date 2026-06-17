import React, { useState } from 'react';
import { useHabits } from '../../hooks/useHabits';
import { useReflections } from '../../hooks/useReflections';
import { formatDateDMY } from '../../utils/habitUtils';

type MoodType = 'great' | 'okay' | 'low' | 'stress';

export const ReflectionsView: React.FC = () => {
  const { habits } = useHabits();
  const { reflections, saveReflection, deleteReflection, isSaving, isLoading } = useReflections();

  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodType>('okay');
  const [linkedHabitId, setLinkedHabitId] = useState<string>('none');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const moodOptions: { type: MoodType; emoji: string; label: string; color: string }[] = [
    { type: 'great', emoji: '😊', label: 'Great', color: 'text-green border-green/20 bg-green/5 hover:bg-green/10' },
    { type: 'okay', emoji: '😐', label: 'Okay', color: 'text-yellow border-yellow/20 bg-yellow/5 hover:bg-yellow/10' },
    { type: 'low', emoji: '😔', label: 'Low', color: 'text-blue border-blue/20 bg-blue/5 hover:bg-blue/10' },
    { type: 'stress', emoji: '😤', label: 'Stressed', color: 'text-red border-red/20 bg-red/5 hover:bg-red/10' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!text.trim()) {
      setSubmitError('Please write down a reflection note.');
      return;
    }

    let habitId: number | null = null;
    let habitName: string | null = null;

    if (linkedHabitId !== 'none') {
      const selected = habits.find((h) => h.id === Number(linkedHabitId));
      if (selected) {
        habitId = selected.id;
        habitName = selected.name;
      }
    }

    saveReflection(
      {
        text: text.trim(),
        mood,
        habitId,
        habitName,
      },
      {
        onSuccess: () => {
          setText('');
          setMood('okay');
          setLinkedHabitId('none');
        },
        onError: (err: any) => {
          setSubmitError(err.message || 'Failed to save reflection entry.');
        },
      }
    );
  };

  const getMoodEmoji = (moodType: MoodType) => {
    return moodOptions.find((m) => m.type === moodType)?.emoji || '😐';
  };

  const getMoodLabel = (moodType: MoodType) => {
    return moodOptions.find((m) => m.type === moodType)?.label || 'Okay';
  };

  const getMoodColor = (moodType: MoodType) => {
    switch (moodType) {
      case 'great':
        return 'text-green bg-green/10 border-green/20';
      case 'okay':
        return 'text-yellow bg-yellow/10 border-yellow/20';
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'stress':
        return 'text-red bg-red/10 border-red/20';
      default:
        return 'text-muted bg-surface-2 border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Reading reflections...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Daily Reflections
        </h1>
        <p className="text-muted text-sm mt-1">
          Review your cognitive and mental performance state, journal thoughts, and link diaries to habits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creation Panel */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">New Entry</h2>
            <p className="text-xs text-muted">How has your day been and what went well?</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
                ⚠️ {submitError}
              </div>
            )}

            {/* Mood selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Select Mood
              </label>
              <div className="grid grid-cols-2 gap-2">
                {moodOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setMood(opt.type)}
                    className={`flex items-center gap-2 p-2.5 rounded-radius-sm border text-xs font-semibold transition-all cursor-pointer ${
                      mood === opt.type
                        ? getMoodColor(opt.type) + ' border-2 shadow-glow-accent/5'
                        : 'bg-card border-border text-muted hover:text-text'
                    }`}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Habit Linker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Link to Habit
              </label>
              <select
                value={linkedHabitId}
                onChange={(e) => setLinkedHabitId(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2 outline-none text-xs text-text w-full transition-all cursor-pointer"
              >
                <option value="none">No specific habit link</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reflection Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Reflection Journal
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write down your thoughts, breakthroughs, and targets..."
                rows={5}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-3 outline-none transition-all text-xs w-full resize-none leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-accent to-accent2 hover:opacity-90 text-white font-bold py-2.5 rounded-radius shadow-glow-accent hover:scale-[1.01] active:scale-[0.99] transition-all text-xs flex justify-center items-center cursor-pointer"
            >
              {isSaving ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Save Entry ✓'
              )}
            </button>
          </form>
        </div>

        {/* History Panel */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">History logs</h2>
            <p className="text-xs text-muted">Review your cognitive mental journals over time.</p>
          </div>

          {reflections.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
              {reflections.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-radius-sm border border-border bg-white/[0.005] hover:bg-white/[0.01] transition-all relative group"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => entry.id !== undefined && deleteReflection(entry.id as any)}
                    className="absolute top-4 right-4 text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                    title="Delete log"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4.5 h-4.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-text-2">
                      📅 {formatDateDMY(entry.date)}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-radius-sm border ${getMoodColor(
                        entry.mood
                      )}`}
                    >
                      {getMoodEmoji(entry.mood)} {getMoodLabel(entry.mood)}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap pr-6">
                    {entry.text}
                  </p>

                  {entry.habitName && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-accent font-semibold">
                      <span>🔗 Linked habit:</span>
                      <span className="bg-accent/5 px-2 py-0.5 border border-accent/15 rounded-radius-sm">
                        {entry.habitName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border border-border border-dashed rounded-radius-sm flex flex-col items-center gap-3">
              <span className="text-3xl">📓</span>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-text-2">No Entries Logged</h3>
                <p className="text-xs text-muted max-w-xs leading-normal">
                  Write down your daily targets, obstacles, and wins on the left panel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
