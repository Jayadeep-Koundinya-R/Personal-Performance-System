import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { formatDateDMY, getTodayStr } from '../../utils/habitUtils';

export const TasksView: React.FC = () => {
  const {
    tasks,
    connection,
    addTask,
    toggleTask,
    deleteTask,
    connectCalendar,
    isAdding,
    isConnecting,
    isLoading,
  } = useTasks();

  // Create Task State
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(getTodayStr());
  const [note, setNote] = useState('');
  const [emailReminder, setEmailReminder] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    addTask(
      {
        title: title.trim(),
        dueDate,
        note: note.trim(),
        emailReminder,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDueDate(getTodayStr());
          setNote('');
          setEmailReminder(false);
        },
        onError: (err: any) => {
          setFormError(err.message || 'Failed to create task.');
        },
      }
    );
  };

  const activeTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Reading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Task Hub
        </h1>
        <p className="text-muted text-sm mt-1">
          Plan standalone tasks, bind deadlines, and synchronize with external productivity calendars.
        </p>
      </div>

      {/* Calendar Connection Panel */}
      <div className="glass-panel p-5 rounded-radius border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-text-2">Calendar Integrations</h2>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Sync tasks with Google Calendar or Microsoft Outlook. The system will auto-reflect calendar milestones onto your performance feed.
            </p>
          </div>

          <div className="flex-shrink-0 self-stretch sm:self-auto flex items-center">
            {connection ? (
              <div className="flex flex-col sm:items-end gap-1.5 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted">PROVIDER: {connection.provider}</span>
                  <span className="text-[10px] font-mono font-bold text-yellow bg-yellow/10 border border-yellow/20 px-2.5 py-0.5 rounded-full uppercase">
                    ⏳ pending connection
                  </span>
                </div>
                <div className="text-xs font-mono text-text truncate max-w-[200px]">
                  {connection.email}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={() => connectCalendar('Google')}
                  disabled={isConnecting}
                  className="bg-card hover:bg-surface border border-border hover:border-border-bright text-text-2 hover:text-text font-bold px-4 py-2 rounded-radius-sm text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📅</span> Connect Google
                </button>
                <button
                  onClick={() => connectCalendar('Outlook')}
                  disabled={isConnecting}
                  className="bg-card hover:bg-surface border border-border hover:border-border-bright text-text-2 hover:text-text font-bold px-4 py-2 rounded-radius-sm text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📅</span> Connect Outlook
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creator Form */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Create Task</h2>
            <p className="text-xs text-muted">Register a one-off performance objective.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
                ⚠️ {formError}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Task Title
              </label>
              <input
                type="text"
                placeholder="e.g. Prepare deck for Q3 sprint review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                required
              />
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Target Deadline
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2 outline-none text-xs text-text w-full cursor-pointer"
                required
              />
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Notes
              </label>
              <textarea
                placeholder="Break down subtasks, context details, or links..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full resize-none leading-relaxed text-text"
              />
            </div>

            {/* Email Alert Toggle */}
            <label className="flex items-center gap-2.5 text-xs text-muted cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={emailReminder}
                onChange={(e) => setEmailReminder(e.target.checked)}
                className="rounded-radius-sm border-border-bright text-accent focus:ring-accent w-4 h-4 bg-surface"
              />
              <span>Trigger email reminders before deadline</span>
            </label>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-gradient-to-r from-accent to-accent2 hover:opacity-90 text-white font-bold py-3 rounded-radius shadow-glow-accent hover:scale-[1.01] active:scale-[0.99] transition-all text-xs flex justify-center items-center cursor-pointer mt-4"
            >
              {isAdding ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Add Performer Task'
              )}
            </button>
          </form>
        </div>

        {/* Board Display */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Planner Board</h2>
            <p className="text-xs text-muted">Currently active performance planner objectives.</p>
          </div>

          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
            {/* Active section */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
                Active tasks ({activeTasks.length})
              </h3>
              {activeTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-radius-sm border border-border bg-white/[0.005] hover:bg-white/[0.01] transition-all flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTask({ id: task.id, done: true })}
                          className="w-5 h-5 rounded border border-border-bright hover:border-accent hover:bg-accent/5 flex items-center justify-center mt-0.5 cursor-pointer flex-shrink-0"
                          aria-label={`Mark task ${task.title} complete`}
                        >
                          <div className="w-2.5 h-2.5 bg-transparent rounded-sm" />
                        </button>

                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-text-2 leading-tight">
                            {task.title}
                          </h4>
                          {task.note && (
                            <p className="text-xs text-muted leading-relaxed mt-1.5 whitespace-pre-wrap pr-6">
                              {task.note}
                            </p>
                          )}
                          <div className="flex items-center gap-2.5 mt-2 text-[10px] text-muted">
                            <span className="font-mono">📅 Due: {formatDateDMY(task.dueDate)}</span>
                            {task.emailReminder && <span title="Email Reminders Active">📧 alert</span>}
                          </div>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-border border-dashed rounded-radius-sm text-xs text-muted">
                  No active planner tasks. Register a task to track standing targets.
                </div>
              )}
            </div>

            {/* Completed section */}
            <div className="space-y-2.5 pt-4 border-t border-border/40">
              <h3 className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
                Completed tasks ({completedTasks.length})
              </h3>
              {completedTasks.length > 0 ? (
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-radius-sm border border-border/40 bg-surface-3 opacity-65 flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Checkbox Checked */}
                        <button
                          onClick={() => toggleTask({ id: task.id, done: false })}
                          className="w-5 h-5 rounded bg-accent border border-accent flex items-center justify-center cursor-pointer flex-shrink-0 text-white"
                          aria-label={`Unmark task ${task.title}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3.5}
                            stroke="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        </button>

                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-muted line-through truncate max-w-[200px] sm:max-w-md">
                            {task.title}
                          </h4>
                          <span className="text-[9px] font-mono text-muted/60 mt-1 block">
                            Completed task
                          </span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted">
                  No completed tasks yet. Mark active tasks complete to populate logs.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
