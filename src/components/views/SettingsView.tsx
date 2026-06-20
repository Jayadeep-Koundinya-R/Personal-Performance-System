import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHabits } from '../../hooks/useHabits';
import { useReflections } from '../../hooks/useReflections';
import { useTasks } from '../../hooks/useTasks';
import { useReminders } from '../../hooks/useReminders';

export const SettingsView: React.FC = () => {
  const { user, profile, updateDisplayName, updatePassword, updateProfile, logout } = useAuth();
  const { habits } = useHabits();
  const { reflections } = useReflections();
  const { tasks } = useTasks();
  const { reminders } = useReminders();

  // Account State
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [displayNameMsg, setDisplayNameMsg] = useState<string | null>(null);

  // Security State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Preferences State
  const [xpPerHabit, setXpPerHabit] = useState(profile?.xp_per_completion || 10);
  const [maxFreeze, setMaxFreeze] = useState(profile?.max_freeze_credits || 2);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);

  // Theme state (check document.documentElement class for light theme)
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
  }, []);

  const toggleTheme = () => {
    const nextLight = !isLight;
    setIsLight(nextLight);
    if (nextLight) {
      document.documentElement.classList.add('light');
      localStorage.setItem('pps_theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('pps_theme', 'dark');
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisplayNameMsg(null);
    if (!displayName.trim()) return;

    try {
      await updateDisplayName(displayName.trim());
      setDisplayNameMsg('Display Name updated successfully.');
    } catch (err: any) {
      setDisplayNameMsg(err.message || 'Failed to update name.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);
    setSecurityError(null);

    if (!password || password.length < 6) {
      setSecurityError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setSecurityError('Passwords do not match.');
      return;
    }

    try {
      await updatePassword(password);
      setSecurityMsg('Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to update password.');
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefMsg(null);

    try {
      await updateProfile({
        xp_per_completion: Number(xpPerHabit),
        max_freeze_credits: Number(maxFreeze),
      });
      setPrefMsg('Preferences saved successfully.');
    } catch (err: any) {
      setPrefMsg('Failed to save preferences.');
    }
  };

  // Data Control: Export backups to file
  const handleExportBackup = () => {
    const backupData = {
      habits,
      reflections,
      tasks,
      reminders,
      profile,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pps_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Data Control: Import backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.habits || !parsed.profile) {
          alert('Invalid backup file format. Must contain habits and profile structures.');
          return;
        }

        if (confirm('Importing this backup will overwrite your current client localStorage data. Do you wish to proceed?')) {
          const emailSuffix = user?.email || 'guest';
          localStorage.setItem(`habits_${emailSuffix}`, JSON.stringify(parsed.habits));
          localStorage.setItem(`reflections_${emailSuffix}`, JSON.stringify(parsed.reflections || []));
          localStorage.setItem(`pps_tasks_${emailSuffix}`, JSON.stringify(parsed.tasks || []));
          localStorage.setItem(`reminders_${emailSuffix}`, JSON.stringify(parsed.reminders || []));
          localStorage.setItem(`pps_profile_${emailSuffix}`, JSON.stringify(parsed.profile));

          alert('Data imported successfully! The application will now reload to apply changes.');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Data Control: Reset everything
  const handleResetAllData = () => {
    if (confirm('💣 CRITICAL WARNING: This action will permanently erase all habits, streaks, completions, reflections, and planner tasks. This CANNOT be undone. Proceed?')) {
      const emailSuffix = user?.email || 'guest';
      localStorage.removeItem(`habits_${emailSuffix}`);
      localStorage.removeItem(`reflections_${emailSuffix}`);
      localStorage.removeItem(`pps_tasks_${emailSuffix}`);
      localStorage.removeItem(`reminders_${emailSuffix}`);
      localStorage.removeItem(`pps_profile_${emailSuffix}`);
      localStorage.removeItem(`pps_calendar_connection_${emailSuffix}`);

      alert('All performance data reset. Relinking sessions.');
      logout();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-text">
          Control Panel
        </h1>
        <p className="text-muted text-sm mt-1">
          Tune profile settings, toggle UI aesthetics, configure gamification parameters, and manage database backups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Account Settings */}
        <div className="glass-panel p-6 rounded-radius border border-border space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Account Management</h2>
            <p className="text-xs text-muted">Update your display name and review account status.</p>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            {displayNameMsg && (
              <div className="p-3 rounded-radius-sm bg-accent/10 border border-accent/20 text-accent text-xs font-mono">
                ✓ {displayNameMsg}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Email Address
              </label>
              <input
                type="text"
                value={user?.isGuest ? 'LOCAL GUEST SESSION' : user?.email || ''}
                className="bg-surface-3 border border-border rounded-radius-sm px-4 py-2 text-xs w-full text-muted select-none"
                disabled
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Performer Handle / Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Apex Performer"
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                required
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={logout}
                className="bg-red/10 border border-red/20 text-red hover:bg-red/20 text-xs font-bold px-4 py-2 rounded-radius transition-all cursor-pointer"
              >
                Log Out
              </button>

              <button
                type="submit"
                className="bg-accent hover:bg-accent2 text-white font-bold px-5 py-2 rounded-radius text-xs transition-all shadow-glow-accent cursor-pointer"
              >
                Update Name
              </button>
            </div>
          </form>
        </div>

        {/* Preferences Settings */}
        <div className="glass-panel p-6 rounded-radius border border-border space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">System Preferences</h2>
            <p className="text-xs text-muted">Customize gamified rewards and client UI styles.</p>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            {prefMsg && (
              <div className="p-3 rounded-radius-sm bg-accent/10 border border-accent/20 text-accent text-xs font-mono">
                ✓ {prefMsg}
              </div>
            )}

            {/* Theme Toggle Row */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-text-2">Aesthetic Mode</div>
                <div className="text-xs text-muted">Switch between dark obsidian and light gloss themes.</div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="bg-surface-2 border border-border hover:border-border-bright text-text-2 hover:text-text font-bold px-4 py-2 rounded-radius-sm text-xs transition-all cursor-pointer"
              >
                {isLight ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>

            {/* XP Per Habit */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                XP Per Completion Reward
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={xpPerHabit}
                onChange={(e) => setXpPerHabit(Number(e.target.value))}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                required
              />
            </div>

            {/* Max Freeze Credits */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                Maximum Freeze Capacity Limit (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={maxFreeze}
                onChange={(e) => setMaxFreeze(Number(e.target.value))}
                className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-accent hover:bg-accent2 text-white font-bold px-5 py-2 rounded-radius text-xs transition-all shadow-glow-accent cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Security Password Updates (Only if not Guest) */}
        {!user?.isGuest && (
          <div className="glass-panel p-6 rounded-radius border border-border space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text-2">Security & Credentials</h2>
              <p className="text-xs text-muted">Submit new security keys to protect cloud database feeds.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {securityMsg && (
                <div className="p-3 rounded-radius-sm bg-green/10 border border-green/20 text-green text-xs font-mono">
                  ✓ {securityMsg}
                </div>
              )}
              {securityError && (
                <div className="p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
                  ⚠️ {securityError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-surface border border-border-bright focus:border-accent rounded-radius-sm px-4 py-2.5 outline-none transition-all text-xs w-full text-text"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent2 text-white font-bold px-5 py-2 rounded-radius text-xs transition-all shadow-glow-accent cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Data backups & backups imports */}
        <div className="glass-panel p-6 rounded-radius border border-border space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-2">Backup & Data Controls</h2>
            <p className="text-xs text-muted">Export data feeds or completely purge customer profiles.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Export Button */}
              <button
                onClick={handleExportBackup}
                className="flex-1 bg-surface-2 hover:bg-surface border border-border hover:border-border-bright text-text-2 hover:text-text font-bold py-2.5 rounded-radius text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                📥 Export JSON Backup
              </button>

              {/* Import Button Trigger */}
              <label className="flex-1 bg-surface-2 hover:bg-surface border border-border hover:border-border-bright text-text-2 hover:text-text font-bold py-2.5 rounded-radius text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                📤 Import JSON Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-red">Reset All Account Logs</div>
                  <div className="text-[11px] text-muted">
                    This deletes all local client cache profiles. Active database profiles will retain cloud content.
                  </div>
                </div>

                <button
                  onClick={handleResetAllData}
                  className="bg-red border border-red/30 hover:bg-red-bright text-white font-bold px-4 py-2 rounded-radius text-xs transition-all flex-shrink-0 cursor-pointer"
                >
                  Reset Account Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
