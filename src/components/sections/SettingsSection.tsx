/*
  ⚙️ Masterwork Settings, Account & Data Backup Studio
  
  Features:
  - Profile & Identity Architecture (Display Name, Username, Identity Class)
  - Subscription Tier Control & Billing Portal Link
  - Notification & Auto-Streak-Shield Toggle Switches
  - 1-Click Data Export (JSON / CSV) & Backup Control
  - Security & Password Studio
  - Ecosystem Integrations Hub (Google Calendar, Apple Health, Notion, Webhooks)
  - High-Contrast Crisp Glassmorphism Typography
*/

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, User } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useReflections } from "@/hooks/use-reflections";
import { exportToCSV, exportToJSON, exportReflectionsToCSV, prepareFullExport, parseAndValidateBackup } from "@/lib/dataExport";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/use-user-settings";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { User as UserIcon, Lock, Bell, Shield, Download, Upload, RefreshCw, LogOut, Sparkles, Check, Key, Calendar, Smartphone, FileText } from "lucide-react";

const IDENTITY_OPTIONS = [
  { value: "", label: "Choose your path" },
  { value: "Athlete", label: "Athlete 🏃" },
  { value: "Scholar", label: "Scholar 📚" },
  { value: "Builder", label: "Builder 💻" },
  { value: "Mindful", label: "Mindful 🧘" }
];

const REPEAT_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "One-time", label: "One-time" }
];

const CHANNEL_OPTIONS = [
  { value: "in_app", label: "🔔 In-App Alert" },
  { value: "email", label: "✉️ Email Message" }
];

const DELIVERY_OPTIONS = [
  { value: "notification", label: "📱 Passive Banner" },
  { value: "alarm", label: "🚨 Persistent Alarm" }
];

const SettingsSection = ({ user }: { user: User }) => {
  const { logout, updatePassword } = useAuth();
  const { habits, resetAllData, addHabit } = useHabits();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { isPro, currentPeriodEnd, openBillingPortal } = useSubscription();
  const { entries: reflections, saveEntry } = useReflections();
  const { settings, loading: settingsLoading, updateSettings, resetOnboarding } = useUserSettings();

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [identityClass, setIdentityClass] = useState(profile?.identityClass || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setUsername(profile.username || "");
      setIdentityClass(profile.identityClass || "");
    }
  }, [profile]);

  if (profileLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3.5"></div>
        <div className="text-slate-300 text-sm font-extrabold font-mono">Loading settings studio...</div>
      </div>
    );
  }

  // Save Profile Handler
  const saveProfile = async () => {
    const err = await updateProfile({
      displayName: displayName.trim(),
      username: username.trim(),
      identityClass: identityClass || undefined,
    });
    if (err) toast.error(err);
    else toast.success("Profile saved successfully!");
  };

  // Password Change Handler
  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (user.isGuest) {
      toast.error("Guest accounts cannot change password.");
      return;
    }

    const err = await updatePassword(newPassword);
    if (err) toast.error(err);
    else {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    }
  };

  // Data Export Handler
  const exportData = async () => {
    try {
      if (exportFormat === "csv") {
        exportToCSV(habits);
        if (reflections.length > 0) exportReflectionsToCSV(reflections);
        toast.success("Data exported to CSV!");
      } else {
        const fullData = prepareFullExport(habits, reflections);
        exportToJSON(fullData);
        toast.success("Data exported to JSON!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data.");
    }
  };

  // Restore / Import Data Backup Handler
  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const res = parseAndValidateBackup(content);
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to parse backup file.");
        return;
      }

      if (!confirm(`Restore backup containing ${res.data.habits.length} habits and ${res.data.reflections.length} reflections? This will import missing items to your account.`)) {
        return;
      }

      let restoredHabits = 0;
      for (const h of res.data.habits) {
        if (!habits.some((existing) => existing.name === h.name)) {
          await addHabit(h.name, h.category, h.period, h.priority, h.dueDate, h.startTime, h.endTime, h.color);
          restoredHabits++;
        }
      }

      let restoredReflections = 0;
      for (const r of res.data.reflections) {
        if (!reflections.some((existing) => existing.date === r.date)) {
          await saveEntry(r.text, r.mood);
          restoredReflections++;
        }
      }

      toast.success(`Backup restored! Imported ${restoredHabits} new habits & ${restoredReflections} reflections.`);
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  // Reset All Data
  const handleReset = () => {
    if (!confirm("Reset ALL habits and streak history? This cannot be undone.")) return;
    resetAllData();
    toast.success("All data reset.");
  };

  // Billing portal
  const handleBilling = async () => {
    const err = await openBillingPortal();
    if (err) toast.error(err);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>⚙️ Settings & Control Center</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              System Control
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Manage account architecture, notification preferences, data backups, and security studio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="text-xs bg-destructive/15 text-destructive border border-destructive/30 px-3.5 py-2 rounded-2xl font-extrabold hover:bg-destructive hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ── 1. ACCOUNT & PROFILE ARCHITECTURE ── */}
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <span>Account & Profile</span>
            </h3>
            <span className={`text-[10.5px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${
              isPro ? "bg-pps-yellow/20 text-pps-yellow border-pps-yellow/30" : "bg-surface text-slate-300 border-border/80"
            }`}>
              {isPro ? "Pro Tier 👑" : "Free Plan"}
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-extrabold text-foreground font-mono">Email Address</label>
              <div className="text-xs font-mono font-bold text-slate-300 bg-surface border border-border/80 rounded-xl px-3.5 py-2.5 mt-1">
                {user.email || "Guest Mode User"}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-foreground font-mono">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-foreground font-mono">Username (@handle)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="for social friend invites"
                className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary mt-1"
              />
            </div>

            {isPro && (
              <div>
                <label className="text-xs font-extrabold text-foreground font-mono">Identity Archetype</label>
                <div className="mt-1">
                  <CustomSelect value={identityClass} onChange={setIdentityClass} options={IDENTITY_OPTIONS} />
                </div>
              </div>
            )}

            <button
              onClick={saveProfile}
              className="w-full text-xs bg-primary text-primary-foreground font-extrabold py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 mt-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </div>

        {/* ── 2. SUBSCRIPTION & BILLING ── */}
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pps-yellow" />
              <span>Subscription & Billing</span>
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-foreground">Current Membership Tier</div>
                <div className="text-sm font-mono font-extrabold text-primary mt-0.5">{isPro ? "Pro Tier (Unlimited Access 👑)" : "Free Tier"}</div>
                {isPro && currentPeriodEnd && (
                  <div className="text-[11px] font-mono text-muted-foreground mt-1">
                    Renews: {new Date(currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>

              {isPro ? (
                <button
                  onClick={handleBilling}
                  className="text-xs bg-surface border border-border/80 text-foreground font-extrabold px-3.5 py-2 rounded-xl hover:bg-muted/40 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Manage Billing & Invoices</span>
                </button>
              ) : (
                <Link
                  to="/pricing"
                  className="text-xs bg-gradient-to-r from-primary to-accent text-white font-extrabold px-4 py-2 rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-sm text-center"
                >
                  Upgrade to Pro 👑
                </Link>
              )}
            </div>

            {profile?.referralCode && (
              <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-1.5">
                <div className="text-xs font-extrabold text-foreground">Your Referral Code</div>
                <div className="text-sm font-mono font-extrabold text-primary">{profile.referralCode}</div>
                <div className="text-[11px] text-slate-300 font-medium">
                  Share with friends — both get 1 month of Pro when they subscribe!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. NOTIFICATION & AUTO-STREAK-SHIELD PREFERENCES ── */}
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-300" />
              <span>Notifications & Automation</span>
            </h3>
          </div>

          <div className="space-y-3">
            {/* Email Toggles */}
            <div className="flex items-center justify-between p-3.5 bg-surface/60 border border-border/80 rounded-2xl">
              <div>
                <div className="text-xs font-extrabold text-foreground">Email Notifications</div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">Receive reminders via email</div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    notificationPrefs: {
                      email: !settings?.notificationPrefs?.email,
                      push: !!settings?.notificationPrefs?.push,
                    },
                  })
                }
                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                  settings?.notificationPrefs?.email ? "bg-primary" : "bg-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings?.notificationPrefs?.email ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* In-App Bell Toggles */}
            <div className="flex items-center justify-between p-3.5 bg-surface/60 border border-border/80 rounded-2xl">
              <div>
                <div className="text-xs font-extrabold text-foreground">In-App Alert Bell</div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">Receive reminders in notification bell</div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    notificationPrefs: {
                      email: !!settings?.notificationPrefs?.email,
                      push: !settings?.notificationPrefs?.push,
                    },
                  })
                }
                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                  settings?.notificationPrefs?.push ? "bg-primary" : "bg-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings?.notificationPrefs?.push ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Auto Streak Freeze */}
            <div className="flex items-center justify-between p-3.5 bg-surface/60 border border-border/80 rounded-2xl">
              <div>
                <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-pps-green" />
                  <span>Auto Streak Shield Protection</span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">Automatically use freeze credits when a day is missed</div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    autoStreakFreeze: !settings?.autoStreakFreeze,
                  })
                }
                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                  settings?.autoStreakFreeze ? "bg-primary" : "bg-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings?.autoStreakFreeze ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. DATA BACKUP & RESTORE ENGINE ── */}
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-pps-green" />
              <span>Data & Backup Control</span>
            </h3>
          </div>

          <div className="space-y-3">
            {/* Replay Tutorial */}
            <div className="flex items-center justify-between p-3.5 bg-surface/60 border border-border/80 rounded-2xl">
              <div>
                <div className="text-xs font-extrabold text-foreground">Replay Onboarding Tutorial</div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">Show the interactive guide again</div>
              </div>
              <button
                onClick={async () => {
                  await resetOnboarding();
                  toast.success("Tutorial replaying. Refreshing...");
                  setTimeout(() => window.location.reload(), 800);
                }}
                className="text-xs bg-primary/15 text-primary border border-primary/30 font-extrabold px-3 py-1.5 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
              >
                Replay Guide
              </button>
            </div>

            {/* Export Format */}
            <div className="p-3.5 bg-surface/60 border border-border/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-foreground">Export Data Backup</div>
                  <div className="text-[11px] text-slate-300 font-medium mt-0.5">Download full habits & reflections dataset</div>
                </div>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                  className="bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none text-foreground cursor-pointer"
                >
                  <option value="json">JSON Backup</option>
                  <option value="csv">CSV Spreadsheet</option>
                </select>
              </div>

              <button
                onClick={exportData}
                className="w-full text-xs bg-primary text-primary-foreground font-extrabold py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm mt-1"
              >
                Download Data Backup ({exportFormat.toUpperCase()})
              </button>
            </div>
            {/* Restore Backup */}
            <div className="p-3.5 bg-surface/60 border border-border/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-foreground">Restore Data Backup</div>
                  <div className="text-[11px] text-slate-300 font-medium mt-0.5">Import habits & reflections from a JSON backup</div>
                </div>
                <label className="text-xs bg-surface border border-border/80 text-foreground font-extrabold px-3 py-1.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>Choose JSON File</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Reset All Data */}
            <div className="flex items-center justify-between p-3.5 bg-surface/60 border border-destructive/30 rounded-2xl">
              <div>
                <div className="text-xs font-extrabold text-destructive">Reset All Data</div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">Clears habits and streak logs</div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs bg-destructive/15 text-destructive border border-destructive/30 font-extrabold px-3 py-1.5 rounded-xl hover:bg-destructive hover:text-white transition-all cursor-pointer"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. ECOSYSTEM INTEGRATIONS HUB (COMING SOON PREVIEW) ── */}
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>🔌 Ecosystem Integrations Hub</span>
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
              Planned for v2.0
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "Google Calendar Sync", icon: "📅", desc: "Sync habit schedule with Google Calendar" },
              { name: "Apple Health & Fitness", icon: "🍎", desc: "Auto-sync workout & water habit logs" },
              { name: "Notion & API Export", icon: "📝", desc: "Export daily reflections directly to Notion" },
              { name: "Zapier & Webhooks", icon: "⚡", desc: "Trigger automated workflows on habit completions" },
              { name: "Spotify Focus Audio", icon: "🎧", desc: "Sync ambient focus playlists with Focus Studio" },
              { name: "IFTTT Automation", icon: "🔄", desc: "Connect smart home lights & devices" },
            ].map((item) => (
              <div
                key={item.name}
                onClick={() => toast.info(`🔌 ${item.name}`, { description: "Integration planned for v2.0 release!" })}
                className="border border-dashed border-border/80 rounded-2xl p-4 space-y-2 bg-surface/30 opacity-75 cursor-not-allowed hover:border-primary/40 transition-all relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <div className="text-xs font-extrabold text-foreground">{item.name}</div>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.2 rounded-md">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
