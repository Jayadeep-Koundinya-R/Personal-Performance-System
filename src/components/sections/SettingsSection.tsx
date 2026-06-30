import { useState, useEffect } from "react";
import { useAuth, User } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useReflections } from "@/hooks/use-reflections";
import { exportToCSV, exportToJSON, exportReflectionsToCSV, prepareFullExport } from "@/lib/dataExport";
import { toast } from "sonner";

const IDENTITY_CLASSES = ["Athlete", "Scholar", "Builder", "Mindful"];

const SettingsSection = ({ user }: { user: User }) => {
  const { logout, updatePassword } = useAuth();
  const { habits, resetAllData } = useHabits();
  const { profile, updateProfile } = useProfile();
  const { isPro, openBillingPortal } = useSubscription();
  const { entries: reflections } = useReflections();
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [identityClass, setIdentityClass] = useState(profile?.identityClass || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setUsername(profile.username);
      setIdentityClass(profile.identityClass || "");
    }
  }, [profile]);

  const showMsg = (text: string, type: "error" | "success" = "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const saveProfile = async () => {
    const err = await updateProfile({
      displayName: displayName.trim(),
      username: username.trim(),
      identityClass: identityClass || undefined,
    });
    if (err) showMsg(err);
    else showMsg("Profile saved!", "success");
  };

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) { showMsg("Fill in all password fields."); return; }
    if (newPassword.length < 6) { showMsg("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { showMsg("Passwords do not match."); return; }
    if (user.isGuest) { showMsg("Guest accounts cannot change password."); return; }

    const err = await updatePassword(newPassword);
    if (err) showMsg(err);
    else {
      setNewPassword("");
      setConfirmPassword("");
      showMsg("Password changed successfully!", "success");
    }
  };

  const exportData = async () => {
    try {
      if (exportFormat === "csv") {
        exportToCSV(habits);
        if (reflections.length > 0) {
          exportReflectionsToCSV(reflections);
        }
        toast.success("Data exported to CSV successfully!");
      } else {
        const fullData = prepareFullExport(habits, reflections);
        exportToJSON(fullData);
        toast.success("Data exported to JSON successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Delete your account and all data? This cannot be undone.")) return;
    if (user.isGuest) { showMsg("Guest mode has no account to delete."); return; }
    await supabase.from("habits").delete().eq("user_id", user.id!);
    showMsg("Data cleared. Contact support to fully delete auth account.", "success");
    logout();
  };

  const handleReset = () => {
    if (!confirm("Reset ALL data? This cannot be undone.")) return;
    resetAllData();
    showMsg("All data reset.", "success");
  };

  const handleBilling = async () => {
    const err = await openBillingPortal();
    if (err) showMsg(err);
  };

  const inputClass = "bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full";

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Settings</h1><div className="text-[13px] text-muted-foreground mt-0.5">Customize your experience</div></div>

      {msg && (
        <div className={`text-xs px-3 py-2 rounded-lg mb-3.5 border ${msg.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-pps-green/10 text-pps-green border-pps-green/20"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Account</h3>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div><div className="text-sm font-medium">Email</div><div className="text-xs text-muted-foreground mt-0.5">{user.email || "Guest"}</div></div>
          </div>
          <div className="py-3.5 border-b border-border space-y-2">
            <div className="text-sm font-medium">Display Name</div>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
          </div>
          <div className="py-3.5 border-b border-border space-y-2">
            <div className="text-sm font-medium">Username</div>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="for friend invites" className={inputClass} />
          </div>
          {isPro && (
            <div className="py-3.5 border-b border-border space-y-2">
              <div className="text-sm font-medium">Identity Class</div>
              <select value={identityClass} onChange={(e) => setIdentityClass(e.target.value)} className={inputClass}>
                <option value="">Choose your path</option>
                {IDENTITY_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <button onClick={saveProfile} className="mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2 px-4 rounded-lg text-[13px] font-semibold">Save Profile</button>
          <div className="flex items-center justify-between py-3.5 mt-2">
            <div className="text-sm font-medium">Sign Out</div>
            <button onClick={logout} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3.5 rounded-lg text-[12.5px] hover:bg-destructive/20">Log Out</button>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Subscription</h3>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div><div className="text-sm font-medium">Current Plan</div><div className="text-xs text-muted-foreground mt-0.5">{isPro ? "Pro" : "Free"}</div></div>
            {isPro ? (
              <button onClick={handleBilling} className="text-[12.5px] border border-border px-3 py-1.5 rounded-lg hover:border-primary">Manage Billing</button>
            ) : (
              <Link to="/pricing" className="text-[12.5px] bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Upgrade</Link>
            )}
          </div>
          {profile?.referralCode && (
            <div className="py-3.5 border-b border-border">
              <div className="text-sm font-medium">Referral Code</div>
              <div className="text-xs font-mono text-primary mt-1">{profile.referralCode}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Share with friends — both get 1 month Pro when they subscribe.</div>
            </div>
          )}
        </div>

        {!user.isGuest && (
          <div className="bg-card border border-border p-5 rounded-lg">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Change Password</h3>
            <div className="flex flex-col gap-1.5 mt-2"><label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className={inputClass} /></div>
            <div className="flex flex-col gap-1.5 mt-3"><label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={inputClass} /></div>
            <button onClick={changePassword} className="mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all">Update Password</button>
          </div>
        )}

        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Data & Privacy</h3>
          <div className="py-3.5 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-medium">Export Data</div><div className="text-xs text-muted-foreground mt-0.5">Habits & reflections</div></div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                className="bg-surface border border-border px-3 py-1.5 rounded-lg text-sm outline-none focus:border-primary"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button onClick={exportData} className="bg-primary text-primary-foreground py-1.5 px-3.5 rounded-lg text-[12.5px] hover:opacity-90">Export</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div><div className="text-sm font-medium">Reset All Data</div><div className="text-xs text-destructive mt-0.5">Cannot be undone</div></div>
            <button onClick={handleReset} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3.5 rounded-lg text-[12.5px] hover:bg-destructive/20">Reset</button>
          </div>
          {!user.isGuest && (
            <div className="flex items-center justify-between py-3.5">
              <div><div className="text-sm font-medium">Delete Account</div><div className="text-xs text-destructive mt-0.5">Removes all your data</div></div>
              <button onClick={deleteAccount} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3.5 rounded-lg text-[12.5px] hover:bg-destructive/20">Delete</button>
            </div>
          )}
        </div>
        <div className="bg-card border border-border p-5 rounded-lg lg:col-span-2">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Integrations (Coming Soon)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Google Calendar", "Apple Health", "Notion Export"].map((name) => (
              <div key={name} className="border border-dashed border-border rounded-xl p-4 text-center opacity-60">
                <div className="text-sm font-medium">{name}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{isPro ? "Pro early access" : "Pro feature"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
