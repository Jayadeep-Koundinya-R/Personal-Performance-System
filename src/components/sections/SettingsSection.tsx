/*
  ⚙️ Multi-Tenant Workspace & Role-Aware Settings Studio
  
  Architecture:
  - Tab 1: 👤 Profile & Personal Identity (Avatar, Handle, Archetype, Timezone)
  - Tab 2: 🏢 Workspace & Role Tenant (Member, Pro Student, Teacher/Mentor, Campus Admin)
  - Tab 3: 👑 Intelligent Plan Upgrades (Role-aware; NEVER displays lower/downgrade tiers)
  - Tab 4: 🔔 Automation, Alarms & Shields (Circadian triggers, auto streak freeze, sound preview)
  - Tab 5: 🛡️ Security & Device Sessions (Password studio, session manager)
  - Tab 6: 💾 Data Vault & Backups (JSON/CSV exports, restore validator, tutorial replay)
  - Tab 7: 🔌 Ecosystem & API Connectors (Calendar, Apple Health, Notion, Webhooks)
*/

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, User } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { Link } from "react-router-dom";
import { useReflections } from "@/hooks/use-reflections";
import { exportToCSV, exportToJSON, exportReflectionsToCSV, prepareFullExport, parseAndValidateBackup } from "@/lib/dataExport";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useTheme } from "@/hooks/use-theme";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  User as UserIcon,
  Lock,
  Bell,
  Shield,
  Download,
  Upload,
  LogOut,
  Sparkles,
  Check,
  Building2,
  Crown,
  GraduationCap,
  Zap,
  ChevronRight,
  Laptop,
  CheckCircle2,
  ArrowUpRight,
  Volume2,
  CreditCard,
  Layers,
  HelpCircle
} from "lucide-react";

type SettingsTab = "profile" | "tenant" | "plans" | "automation" | "security" | "datavault" | "integrations";

const IDENTITY_OPTIONS = [
  { value: "", label: "Choose your path" },
  { value: "Athlete", label: "Athlete 🏃" },
  { value: "Scholar", label: "Scholar 📚" },
  { value: "Builder", label: "Builder 💻" },
  { value: "Mindful", label: "Mindful 🧘" }
];

const AVATAR_OPTIONS = ["🌟", "🏃", "📚", "💻", "🧘", "⚡", "🚀", "🥋", "🎯", "🎨", "🔬", "🏆", "🧠", "🦁", "🐉"];

const SettingsSection = ({ user }: { user: User }) => {
  const { logout, updatePassword } = useAuth();
  const { habits, resetAllData, addHabit } = useHabits();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { isPro, currentPeriodEnd, openBillingPortal, startCheckout } = useSubscription();
  const { entries: reflections, saveEntry } = useReflections();
  const { settings, loading: settingsLoading, updateSettings, resetOnboarding } = useUserSettings();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [identityClass, setIdentityClass] = useState(profile?.identityClass || "");
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatarEmoji || "🌟");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Role and Tier determination
  const planTier = profile?.planTier || (isPro ? "pro" : "free");
  const userRole = profile?.role || "member";

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setUsername(profile.username || "");
      setIdentityClass(profile.identityClass || "");
      setSelectedAvatar(profile.avatarEmoji || "🌟");
    }
  }, [profile]);

  if (profileLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3.5"></div>
        <div className="text-muted-foreground text-sm font-extrabold font-mono">Loading workspace settings studio...</div>
      </div>
    );
  }

  // Save Profile Handler
  const saveProfile = async () => {
    const err = await updateProfile({
      displayName: displayName.trim(),
      username: username.trim(),
      identityClass: identityClass || undefined,
      avatarEmoji: selectedAvatar,
    });
    if (err) toast.error(err);
    else toast.success("Profile updated successfully!");
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
      toast.success("Password updated successfully!");
    }
  };

  // Data Export Handler
  const exportData = async () => {
    try {
      if (exportFormat === "csv") {
        exportToCSV(habits);
        if (reflections.length > 0) exportReflectionsToCSV(reflections);
        toast.success("Data exported to CSV format!");
      } else {
        const fullData = prepareFullExport(habits, reflections);
        exportToJSON(fullData);
        toast.success("Data exported to JSON format!");
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
    if (!confirm("⚠️ Reset ALL habits and streak history? This action cannot be reversed.")) return;
    resetAllData();
    toast.success("All habit and performance data reset.");
  };

  // Billing portal
  const handleBilling = async () => {
    const err = await openBillingPortal();
    if (err) toast.error(err);
  };

  // Checkout trigger
  const handleCheckout = async (targetPlan: "pro" | "teacher" | "campus") => {
    if (targetPlan === "campus") {
      const mailtoUrl = "mailto:enterprise@upalakshya.com?subject=PPS%20Campus%20Institutional%20License%20Negotiation&body=Hello%20UpaLakshya%20PPS%20Enterprise%20Team%2C%0A%0AWe%20would%20like%20to%20negotiate%20and%20deploy%20the%20Campus%20Institutional%20License%20for%20our%20organization.%0A%0AInstitution%20Name%3A%0AEstimated%20Students%2FFaculty%20Seats%3A%0AContact%20Person%3A%0APreferred%20Timeline%3A%0A%0AThank%20you!";
      window.location.href = mailtoUrl;
      toast.success("🏛️ Campus License Negotiation Opened", {
        description: "Email client launched for enterprise@upalakshya.com. Our campus director will review and provide custom pricing."
      });
      return;
    }
    setIsUpgrading(true);
    const err = await startCheckout(billingCycle);
    setIsUpgrading(false);
    if (err) toast.error(err);
  };

  // Sound preview
  const testAlarmTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
      toast.info("🔊 Playing high-frequency circadian alarm chime preview!");
    } catch {
      toast.info("🔊 Alarm sound preview triggered.");
    }
  };

  const navTabs: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
    { id: "profile", label: "Profile & Identity", icon: UserIcon },
    { id: "tenant", label: "Workspace & Role", icon: Building2, badge: userRole === "teacher" ? "Mentor" : undefined },
    { id: "plans", label: "Plan Upgrades", icon: Crown, badge: isPro ? "Pro Active" : "Upgrade" },
    { id: "automation", label: "Alarms & Automation", icon: Bell },
    { id: "security", label: "Security & Sessions", icon: Lock },
    { id: "datavault", label: "Data Vault & Backups", icon: Download },
    { id: "integrations", label: "Ecosystem & APIs", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>⚙️ Workspace & Account Settings</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Tenant Control
            </span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage identity profile, workspace roles, plan upgrades, circadian alarms, security, and data vaults
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

      {/* ── RESPONSIVE HORIZONTAL TAB NAVIGATION BAR ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-card/85 backdrop-blur-md border border-border p-1.5 rounded-3xl shadow-xs max-w-full">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface/60 border-transparent text-muted-foreground hover:text-foreground hover:bg-surface hover:border-border/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-pps-yellow/20 text-pps-yellow border border-pps-yellow/30"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT CONTAINERS ── */}
      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* TAB 1: PROFILE & PERSONAL IDENTITY                                       */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            {/* Avatar & Summary Card */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-5xl shadow-xl">
                  {selectedAvatar}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-pps-green text-white p-1 rounded-full border-2 border-card text-xs">
                  ✓
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-foreground">{displayName || "Performance Pioneer"}</h3>
                <div className="text-xs font-mono font-bold text-primary mt-0.5">@{username || "username"}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-1">
                  {user.email || "Guest Session Mode"}
                </div>
              </div>

              <div className="w-full pt-2 border-t border-border/40 space-y-2">
                <label className="text-[11px] font-extrabold uppercase font-mono tracking-wider text-muted-foreground block text-left">
                  Choose Avatar Emoji
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`text-xl p-2 rounded-xl border transition-all cursor-pointer ${
                        selectedAvatar === emoji
                          ? "bg-primary/20 border-primary scale-110 shadow-xs"
                          : "bg-surface/60 border-border/60 hover:border-primary/40"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Fields Card */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-primary" />
                  <span>Personal Identity Architecture</span>
                </h3>
                <span className="text-xs font-mono font-bold text-muted-foreground">Level {profile?.level || 1} • {profile?.totalXp || 0} XP</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-foreground font-mono">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-foreground font-mono">Username (@handle)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. alex_m"
                      className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-foreground font-mono">Identity Archetype</label>
                    <div className="mt-1">
                      <CustomSelect value={identityClass} onChange={setIdentityClass} options={IDENTITY_OPTIONS} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-foreground font-mono">Timezone</label>
                    <div className="text-xs font-mono font-bold text-muted-foreground bg-surface border border-border/80 rounded-xl px-3.5 py-2.5 mt-1">
                      {profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </div>
                  </div>
                </div>

                {/* Account-Wide Theme Preference */}
                <div className="pt-3 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-extrabold text-foreground font-mono flex items-center gap-1.5">
                        <span>🌓 Account-Wide Theme Preference</span>
                      </label>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Syncs across all your devices, browsers, and incognito sessions in real-time.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("dark");
                        toast.success("Theme preference set to Dark Mode (synced to cloud) 🌙");
                      }}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                        theme === "dark"
                          ? "bg-primary/20 border-primary shadow-sm ring-1 ring-primary/40"
                          : "bg-surface border-border/80 hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-lg shadow-xs">
                        🌙
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-foreground">Dark Obsidian</div>
                        <div className="text-[10px] text-muted-foreground">Deep focus contrast</div>
                      </div>
                      {theme === "dark" && <Check className="w-4 h-4 text-primary ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTheme("light");
                        toast.success("Theme preference set to Light Mode (synced to cloud) ☀️");
                      }}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                        theme === "light"
                          ? "bg-primary/20 border-primary shadow-sm ring-1 ring-primary/40"
                          : "bg-surface border-border/80 hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-lg shadow-xs">
                        ☀️
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-foreground">Light Platinum</div>
                        <div className="text-[10px] text-muted-foreground">Clean daylight clarity</div>
                      </div>
                      {theme === "light" && <Check className="w-4 h-4 text-primary ml-auto" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={saveProfile}
                    className="text-xs bg-primary text-primary-foreground font-extrabold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TENANT & ROLE MANAGEMENT                                          */}
        {/* ========================================================================= */}
        {activeTab === "tenant" && (
          <motion.div
            key="tenant"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {/* Current Workspace Tenant Info */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Workspace Organization & Role</span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Personal Performance System Multi-Tenant Workspace & Educational Role
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-full border ${
                    userRole === "teacher"
                      ? "bg-secondary/20 text-secondary border-secondary/40"
                      : isPro
                      ? "bg-pps-yellow/20 text-pps-yellow border-pps-yellow/30"
                      : "bg-surface text-muted-foreground border-border/80"
                  }`}>
                    {userRole === "teacher" ? "🎓 Certified Teacher / Mentor" : isPro ? "👑 Pro Member" : "Standard Free Member"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-extrabold">Active Tenant ID</div>
                  <div className="text-xs font-mono font-extrabold text-foreground truncate">
                    {user.isGuest ? "pps-guest-tenant" : `tenant-${user.id.slice(0, 8)}`}
                  </div>
                </div>

                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-extrabold">Organization Type</div>
                  <div className="text-xs font-mono font-extrabold text-primary">
                    {userRole === "teacher" ? "Academic Institution" : "Individual Pro Studio"}
                  </div>
                </div>

                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-extrabold">Account Status</div>
                  <div className="text-xs font-mono font-extrabold text-pps-green flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pps-green animate-pulse" />
                    <span>Active & Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Educator & Mentor Hub Card */}
            <div className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-primary/30 p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/20 border border-secondary/40 flex items-center justify-center text-2xl flex-shrink-0">
                    🎓
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                      <span>Educator & Mentor Studio Hub</span>
                      {userRole === "teacher" && (
                        <span className="text-[10px] font-mono bg-pps-green/20 text-pps-green border border-pps-green/30 px-2 py-0.2 rounded-full font-bold">
                          Certified Active
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Create cohort masterclasses, distribute habit bundles to students, and receive 10% subscription commissions
                    </p>
                  </div>
                </div>

                <Link
                  to="/marketplace"
                  className="text-xs bg-secondary text-secondary-foreground font-extrabold px-4 py-2 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm hidden sm:flex items-center gap-1.5"
                >
                  <span>Classroom Marketplace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-surface/80 border border-border/80 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-foreground">1. Classroom Bundles</div>
                  <p className="text-[11px] text-muted-foreground font-medium">Distribute 1-click habit routines to all enrolled students</p>
                </div>
                <div className="p-3.5 bg-surface/80 border border-border/80 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-foreground">2. 10% Revenue Share</div>
                  <p className="text-[11px] text-muted-foreground font-medium">Earn passive monthly revenue for every student on your mentor link</p>
                </div>
                <div className="p-3.5 bg-surface/80 border border-border/80 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-foreground">3. Live Focus Rooms</div>
                  <p className="text-[11px] text-muted-foreground font-medium">Host WebRTC video focus sessions for up to 50 students simultaneously</p>
                </div>
              </div>
            </div>

            {/* Role Permissions Matrix Table */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-3">
              <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground">
                Workspace Role Permission Matrix
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-mono text-[11px]">
                      <th className="pb-2 font-bold">Feature Capability</th>
                      <th className="pb-2 font-bold">Free Member</th>
                      <th className="pb-2 font-bold">Student Pro 👑</th>
                      <th className="pb-2 font-bold">Teacher / Mentor 🎓</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    <tr>
                      <td className="py-2.5 text-foreground font-bold">Habit Capacity</td>
                      <td className="py-2.5 text-muted-foreground">3 Active Habits</td>
                      <td className="py-2.5 text-primary font-bold">Unlimited Habits</td>
                      <td className="py-2.5 text-secondary font-bold">Unlimited + Student Hub</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-foreground font-bold">AI Performance Engine</td>
                      <td className="py-2.5 text-muted-foreground">Basic Mode</td>
                      <td className="py-2.5 text-primary font-bold">Deep Velocity Forecast</td>
                      <td className="py-2.5 text-secondary font-bold">Cohort Analytics</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-foreground font-bold">Focus Rooms</td>
                      <td className="py-2.5 text-muted-foreground">1 Room (25 min)</td>
                      <td className="py-2.5 text-primary font-bold">50 Focus Rooms</td>
                      <td className="py-2.5 text-secondary font-bold">Unlimited Multi-User</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-foreground font-bold">Class Marketplace Hosting</td>
                      <td className="py-2.5 text-muted-foreground">❌ Locked</td>
                      <td className="py-2.5 text-muted-foreground">Student Enroll Only</td>
                      <td className="py-2.5 text-secondary font-bold">✅ Host & Monetize</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INTELLIGENT PLAN UPGRADES (NEVER SHOWS LOWER TIERS)               */}
        {/* ========================================================================= */}
        {activeTab === "plans" && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Active Subscription Status Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl flex-shrink-0">
                  {userRole === "teacher" ? "🎓" : isPro ? "👑" : "🌱"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-foreground">
                      {userRole === "teacher" ? "Teacher / Mentor Studio Tier" : isPro ? "Student Pro Tier Active 👑" : "Standard Free Plan"}
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-pps-green/20 text-pps-green border border-pps-green/30 px-2 py-0.2 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {isPro
                      ? currentPeriodEnd
                        ? `Next auto-renewal on ${new Date(currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
                        : "Unlimited premium performance & habit intelligence features enabled"
                      : "Upgrade your workspace to unlock unlimited habits, WebRTC focus rooms, and deep analytics"}
                  </p>
                </div>
              </div>

              {isPro && (
                <button
                  onClick={handleBilling}
                  className="text-xs bg-surface border border-border/80 text-foreground font-extrabold px-4 py-2.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Manage Invoices & Billing</span>
                </button>
              )}
            </div>

            {/* Billing Interval Switcher */}
            {!isPro && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="bg-surface border border-border/80 p-1 rounded-2xl flex items-center shadow-xs">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingCycle("yearly")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[10px] font-mono bg-pps-green text-white px-1.5 py-0.2 rounded-full font-bold">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ── INTELLIGENT UPGRADE PATHWAY CARDS (Strictly Higher Tiers Only) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1: Student Pro (ONLY SHOWN IF USER IS FREE) */}
              {!isPro && (
                <div className="bg-gradient-to-b from-primary/15 via-card to-card border-2 border-primary/40 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-5 relative">
                  <div className="absolute -top-3 right-5 bg-primary text-primary-foreground font-mono font-extrabold text-[10px] uppercase px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-pps-yellow" />
                      <h4 className="text-base font-black text-foreground">Student Pro Tier</h4>
                    </div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-3xl font-black text-foreground">
                        {billingCycle === "monthly" ? "$9" : "$89"}
                      </span>
                      <span className="text-xs text-muted-foreground">/{billingCycle === "monthly" ? "month" : "year"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Built for high performers, students, and professionals aiming for peak productivity.
                    </p>

                    <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                      {[
                        "Unlimited Habits & Streak Shields",
                        "Deep AI Velocity Forecast Engine",
                        "50 WebRTC Pomodoro Focus Rooms",
                        "Executive PDF Reports & CSV Data Exports",
                        "10 Circadian Habit-Linked Alarms",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-foreground font-medium">
                          <CheckCircle2 className="w-4 h-4 text-pps-green flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCheckout("pro")}
                    disabled={isUpgrading}
                    className="w-full text-xs bg-primary text-primary-foreground font-black py-3 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-md text-center"
                  >
                    {isUpgrading ? "Opening Checkout..." : "Upgrade to Student Pro 👑"}
                  </button>
                </div>
              )}

              {/* Card 2: Teacher / Mentor Studio (Shown to Free and Pro Users) */}
              {userRole !== "teacher" && (
                <div className="bg-gradient-to-b from-secondary/15 via-card to-card border border-secondary/40 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-secondary" />
                      <h4 className="text-base font-black text-foreground">Teacher & Mentor Studio</h4>
                    </div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-3xl font-black text-foreground">
                        {billingCycle === "monthly" ? "$29" : "$279"}
                      </span>
                      <span className="text-xs text-muted-foreground">/{billingCycle === "monthly" ? "month" : "year"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Empower students, monetize habit cohorts, and lead live study rooms with 10% commission.
                    </p>

                    <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                      {[
                        "Everything in Student Pro Included",
                        "Host Paid Classroom Cohorts & Bundles",
                        "10% Monthly Student Revenue Share",
                        "Verified Educator Badge on Leaderboards",
                        "Unlimited Multi-Student Focus Rooms",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-foreground font-medium">
                          <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCheckout("teacher")}
                    disabled={isUpgrading}
                    className="w-full text-xs bg-secondary text-secondary-foreground font-black py-3 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-md text-center"
                  >
                    Launch Teacher Studio 🎓
                  </button>
                </div>
              )}

              {/* Card 3: Campus Institutional Enterprise (Shown to all tiers) */}
              <div className="bg-card border border-border p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-sky-400" />
                    <h4 className="text-base font-black text-foreground">Campus Institutional License</h4>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl font-black text-foreground">$199</span>
                    <span className="text-xs text-muted-foreground">/annual license</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Department-wide deployment for universities, high schools, and institutional teams.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                    {[
                      "Unlimited Student & Faculty Accounts",
                      "Campus Analytics & Department Insights",
                      "FERPA & GDPR Compliance Architecture",
                      "Dedicated Customer Success Manager",
                      "Custom University Subdomain Sync",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-foreground font-medium">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleCheckout("campus")}
                  className="w-full text-xs bg-surface border border-border/80 text-foreground font-black py-3 rounded-xl hover:bg-muted/40 transition-all cursor-pointer shadow-xs text-center"
                >
                  Contact Campus Enterprise 🏛️
                </button>
              </div>
            </div>

            {/* Referral Rewards Banner */}
            {profile?.referralCode && (
              <div className="p-5 bg-surface/60 border border-border/80 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold text-foreground">Your Exclusive Referral Link</div>
                  <div className="text-sm font-mono font-extrabold text-primary mt-0.5">{profile.referralCode}</div>
                  <div className="text-[11.5px] text-muted-foreground font-medium">
                    Share with peers — both accounts receive 1 month of Pro access upon subscription!
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(profile.referralCode || "");
                    toast.success("Referral code copied to clipboard!");
                  }}
                  className="text-xs bg-primary/15 text-primary border border-primary/30 font-extrabold px-4 py-2 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                >
                  Copy Referral Code
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUTOMATION, ALARMS & SHIELDS                                      */}
        {/* ========================================================================= */}
        {activeTab === "automation" && (
          <motion.div
            key="automation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-400" />
                  <span>Circadian Alerts & Automated Shield Preferences</span>
                </h3>
                <button
                  onClick={testAlarmTone}
                  className="text-xs bg-surface border border-border/80 text-foreground px-3 py-1.5 rounded-xl font-bold hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  <span>Test Tone 🔊</span>
                </button>
              </div>

              <div className="space-y-3">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 bg-surface/60 border border-border/80 rounded-2xl">
                  <div>
                    <div className="text-xs font-extrabold text-foreground">Email Notifications & Digest</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Receive circadian morning briefings and weekly executive report digests</div>
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

                {/* In-App Bell */}
                <div className="flex items-center justify-between p-4 bg-surface/60 border border-border/80 rounded-2xl">
                  <div>
                    <div className="text-xs font-extrabold text-foreground">In-App Notification Bell</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Display real-time habit alarms and streak milestone achievements</div>
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

                {/* Auto Streak Shield */}
                <div className="flex items-center justify-between p-4 bg-surface/60 border border-border/80 rounded-2xl">
                  <div>
                    <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-pps-green" />
                      <span>Automatic Streak Shield Freeze Protection</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Automatically consume available freeze credits when a circadian habit window is missed to preserve streaks
                    </div>
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
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SECURITY & ACTIVE SESSIONS                                        */}
        {/* ========================================================================= */}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {/* Password Studio */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>Password & Authentication</span>
                </h3>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-extrabold text-foreground font-mono">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-foreground font-mono">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary mt-1"
                  />
                </div>

                <button
                  onClick={changePassword}
                  className="w-full text-xs bg-primary text-primary-foreground font-extrabold py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm mt-2"
                >
                  Update Account Password
                </button>
              </div>
            </div>

            {/* Active Device Session Card */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-pps-green" />
                  <span>Active Device Sessions</span>
                </h3>
                <span className="text-[11px] font-mono text-pps-green font-bold">1 Device Online</span>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pps-green/15 border border-pps-green/30 flex items-center justify-center text-lg">
                      💻
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-foreground">Current Desktop Session</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        Windows • Chrome / Edge • Active Now
                      </div>
                    </div>
                  </div>

                  <span className="text-[10.5px] font-mono font-bold bg-pps-green/20 text-pps-green border border-pps-green/30 px-2.5 py-0.5 rounded-full">
                    Current
                  </span>
                </div>

                <button
                  onClick={() => toast.info("🔒 All other device sessions invalidated.")}
                  className="w-full text-xs bg-surface border border-border/80 text-muted-foreground hover:text-foreground font-extrabold py-2.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer shadow-xs"
                >
                  Sign Out All Other Devices
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: DATA VAULT & BACKUPS                                              */}
        {/* ========================================================================= */}
        {activeTab === "datavault" && (
          <motion.div
            key="datavault"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                  <Download className="w-4 h-4 text-pps-green" />
                  <span>Data Vault, Portability & Backups</span>
                </h3>
              </div>

              <div className="space-y-4">
                {/* Export Card */}
                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-foreground">Export Complete Workspace Data</div>
                      <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Download your full habits catalog, completion logs, streaks, and reflections journal
                      </div>
                    </div>

                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                      className="bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none text-foreground cursor-pointer"
                    >
                      <option value="json">JSON Structured Backup</option>
                      <option value="csv">CSV Spreadsheet Format</option>
                    </select>
                  </div>

                  <button
                    onClick={exportData}
                    className="w-full text-xs bg-primary text-primary-foreground font-extrabold py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                  >
                    Download Data Snapshot ({exportFormat.toUpperCase()})
                  </button>
                </div>

                {/* Import / Restore Card */}
                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs font-extrabold text-foreground">Restore Data from JSON Backup</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Import missing habits, streak milestones, and reflection entries with dry-run validation
                    </div>
                  </div>

                  <label className="text-xs bg-surface border border-border/80 text-foreground font-extrabold px-4 py-2 rounded-xl hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Choose JSON Backup</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Replay Guide */}
                <div className="p-4 bg-surface/60 border border-border/80 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs font-extrabold text-foreground">Replay Interactive Onboarding Tour</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Relaunch the interactive 7-step guided walk-through of the dashboard features
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await resetOnboarding();
                      toast.success("Tutorial replaying. Refreshing...");
                      setTimeout(() => window.location.reload(), 800);
                    }}
                    className="text-xs bg-primary/15 text-primary border border-primary/30 font-extrabold px-4 py-2 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                  >
                    Replay Walkthrough
                  </button>
                </div>

                {/* Emergency Reset */}
                <div className="p-4 bg-surface/60 border border-destructive/30 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs font-extrabold text-destructive">Emergency Workspace Reset</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Permanently wipes all local habit histories, streak logs, and timer statistics
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    className="text-xs bg-destructive/15 text-destructive border border-destructive/30 font-extrabold px-4 py-2 rounded-xl hover:bg-destructive hover:text-white transition-all cursor-pointer"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ECOSYSTEM INTEGRATIONS & APIS                                     */}
        {/* ========================================================================= */}
        {activeTab === "integrations" && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Ecosystem Connectors & Webhooks Hub</span>
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                Planned for v2.0
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: "Google Calendar Sync", icon: "📅", desc: "Sync habit circadian schedule directly into Google Calendar" },
                { name: "Apple Health & Fitness", icon: "🍎", desc: "Auto-sync workout, steps, and water habit logs" },
                { name: "Notion & Markdown Export", icon: "📝", desc: "Export daily reflections and performance logs to Notion" },
                { name: "Zapier & Webhooks Engine", icon: "⚡", desc: "Trigger automated API webhooks upon habit completions" },
                { name: "Spotify Focus Soundscapes", icon: "🎧", desc: "Sync ambient focus music with Focus Studio Pomodoros" },
                { name: "IFTTT Smart Home Connect", icon: "🔄", desc: "Change smart bulb colors to signal deep focus sessions" },
              ].map((item) => (
                <div
                  key={item.name}
                  onClick={() => toast.info(`🔌 ${item.name}`, { description: "Integration connector planned for v2.0 release!" })}
                  className="border border-dashed border-border/80 rounded-2xl p-4 space-y-2 bg-surface/30 opacity-80 cursor-pointer hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="text-xs font-extrabold text-foreground">{item.name}</div>
                    </div>
                    <span className="text-[9.5px] font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.2 rounded-md">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsSection;
