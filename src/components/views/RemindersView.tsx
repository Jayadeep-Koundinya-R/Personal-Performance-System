import React, { useState, useEffect } from 'react';
import { useReminders } from '../../hooks/useReminders';

export const RemindersView: React.FC = () => {
  const { reminders, addReminder, toggleReminder, deleteReminder, isAdding, isLoading } = useReminders();

  // Create Reminder State
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [repeat, setRepeat] = useState('Every Day');
  const [formError, setFormError] = useState<string | null>(null);

  // Notification API Permission State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!label.trim()) {
      setFormError('Reminder label is required.');
      return;
    }

    if (!time) {
      setFormError('Please select a time.');
      return;
    }

    addReminder(
      {
        label: label.trim(),
        time,
        repeat,
      },
      {
        onSuccess: () => {
          setLabel('');
          setTime('08:00');
          setRepeat('Every Day');
        },
        onError: (err: any) => {
          setFormError(err.message || 'Failed to create reminder.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-muted">Reading reminders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Reminder Hub
        </h1>
        <p className="text-muted text-sm mt-1">
          Configure local browser reminders and alarms to enforce task checkins and routine execution.
        </p>
      </div>

      {/* Permissions Banner */}
      {'Notification' in window && (
        <div className="glass-panel p-5 rounded-radius border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🔔</span>
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-text-2">
                Browser Notification Permission
              </h3>
              <p className="text-xs text-muted">
                {notifPermission === 'granted'
                  ? 'Active: Reminders will trigger desktop alerts in this browser session.'
                  : notifPermission === 'denied'
                  ? 'Blocked: Alerts are blocked. Enable permissions in your browser URL bar to resume.'
                  : 'Action needed: Grant permission to spawn desktop alert pings when reminders trigger.'}
              </p>
            </div>
          </div>
          {notifPermission === 'default' && (
            <button
              onClick={requestPermission}
              className="bg-accent hover:bg-accent2 text-white font-bold px-4 py-2 rounded-radius text-xs transition-all shadow-glow-accent cursor-pointer flex-shrink-0"
            >
              Enable Notifications
            </button>
          )}
          {notifPermission === 'granted' && (
            <span className="text-xs font-mono font-bold text-green bg-green/10 border border-green/20 px-2.5 py-1 rounded-radius-sm flex-shrink-0">
              ✓ ENROLLED
            </span>
          )}
          {notifPermission === 'denied' && (
            <span className="text-xs font-mono font-bold text-red bg-red/10 border border-red/20 px-2.5 py-1 rounded-radius-sm flex-shrink-0">
              ⚠️ BLOCKED
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creation Panel */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Add Reminder</h2>
            <p className="text-xs text-muted">Schedule an audio alert or browser toast.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
                ⚠️ {formError}
              </div>
            )}

            {/* Label */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Reminder Label
              </label>
              <input
                type="text"
                placeholder="e.g. Perform Evening reflection"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                required
              />
            </div>

            {/* Time Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Time (24h)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2 outline-none transition-all text-xs w-full text-text cursor-pointer"
                required
              />
            </div>

            {/* Repeat dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Repeat Cycle
              </label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-3 py-2.5 outline-none text-xs text-text w-full cursor-pointer"
              >
                <option value="Every Day">Every Day</option>
                <option value="Weekdays">Weekdays (Mon–Fri)</option>
                <option value="Weekends">Weekends (Sat–Sun)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-gradient-to-r from-accent to-accent2 hover:opacity-90 text-white font-bold py-2.5 rounded-radius shadow-glow-accent hover:scale-[1.01] active:scale-[0.99] transition-all text-xs flex justify-center items-center cursor-pointer mt-4"
            >
              {isAdding ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Schedule Reminder'
              )}
            </button>
          </form>
        </div>

        {/* Reminders List Panel */}
        <div className="glass-panel p-6 rounded-radius border border-border lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Active Schedule</h2>
            <p className="text-xs text-muted">Currently enabled custom alarms ({reminders.length}).</p>
          </div>

          {reminders.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-4 rounded-radius-sm border flex items-center justify-between gap-4 transition-all ${
                    rem.enabled
                      ? 'border-border bg-white/[0.005] hover:bg-white/[0.01]'
                      : 'border-border/40 bg-surface-3 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-2xl select-none">⏰</span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-lg font-bold text-text-2">
                          {rem.time}
                        </span>
                        <span className="text-[10px] font-bold text-accent bg-accent/5 px-2 py-0.5 border border-accent/15 rounded-radius-sm">
                          {rem.repeat}
                        </span>
                      </div>
                      <h3 className="text-xs text-muted truncate mt-1">{rem.label}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Toggle Switch checkbox */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rem.enabled}
                        onChange={(e) => toggleReminder({ id: rem.id, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted-bright after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-white"></div>
                    </label>

                    {/* Delete reminder button */}
                    <button
                      onClick={() => deleteReminder(rem.id)}
                      className="p-1 text-muted hover:text-red transition-colors cursor-pointer"
                      title="Delete reminder"
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center border border-border border-dashed rounded-radius-sm flex flex-col items-center gap-3">
              <span className="text-3xl">⏰</span>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-text-2">No Reminders Configured</h3>
                <p className="text-xs text-muted max-w-xs leading-normal">
                  You do not have any registered reminders. Create one on the left panel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
