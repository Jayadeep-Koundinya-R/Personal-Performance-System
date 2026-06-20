/*
  💡 Settings Section — same as your settings in dashboard.html
*/

import { useState } from "react";
import { useAuth, User } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";

const SettingsSection = ({ user }: { user: User }) => {
  const { logout } = useAuth();
  const { habits, resetAllData } = useHabits();
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(`pps_name_${user.email || "guest"}`) || (user.email ? user.email.split("@")[0] : "Guest")
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const showMsg = (text: string, type: "error" | "success" = "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const saveName = () => {
    if (!displayName.trim()) { showMsg("Name cannot be empty."); return; }
    localStorage.setItem(`pps_name_${user.email || "guest"}`, displayName.trim());
    showMsg("Name saved!", "success");
  };

  const changePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) { showMsg("Fill in all password fields."); return; }
    if (newPassword.length < 6) { showMsg("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { showMsg("Passwords do not match."); return; }

    const users = JSON.parse(localStorage.getItem("pps_users") || "[]");
    const idx = users.findIndex((u: any) => u.email === user.email && u.password === currentPassword);
    if (idx === -1) { showMsg("Current password is incorrect."); return; }

    users[idx].password = newPassword;
    localStorage.setItem("pps_users", JSON.stringify(users));
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    showMsg("Password changed successfully!", "success");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(habits, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pps-habits.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleReset = () => {
    if (!confirm("Reset ALL data? This cannot be undone.")) return;
    resetAllData();
    showMsg("All data reset.", "success");
  };

  const storageUsed = new Blob([localStorage.getItem(`habits_${user.email || "guest"}`) || ""]).size;

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
        {/* Account */}
        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Account</h3>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div><div className="text-sm font-medium">Email</div><div className="text-xs text-muted-foreground mt-0.5">{user.email || "Guest"}</div></div>
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div className="text-sm font-medium">Display Name</div>
            <div className="flex gap-2 items-center">
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-surface border border-border px-3 py-2 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-[140px]" />
              <button onClick={saveName} className="bg-transparent text-muted-foreground border border-border py-1.5 px-3.5 rounded-lg text-[12.5px] hover:text-foreground hover:border-muted-foreground">Save</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <div className="text-sm font-medium">Sign Out</div>
            <button onClick={logout} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3.5 rounded-lg text-[12.5px] hover:bg-destructive/20">Log Out</button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Change Password</h3>
          <div className="flex flex-col gap-1.5 mt-2"><label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className={inputClass} /></div>
          <div className="flex flex-col gap-1.5 mt-3"><label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className={inputClass} /></div>
          <div className="flex flex-col gap-1.5 mt-3"><label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={inputClass} /></div>
          <button onClick={changePassword} className="mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all">Update Password</button>
        </div>

        {/* Data */}
        <div className="bg-card border border-border p-5 rounded-lg">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Data</h3>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div><div className="text-sm font-medium">Export Habits</div><div className="text-xs text-muted-foreground mt-0.5">Download as JSON</div></div>
            <button onClick={exportData} className="bg-transparent text-muted-foreground border border-border py-1.5 px-3.5 rounded-lg text-[12.5px] hover:text-foreground hover:border-muted-foreground">Export</button>
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <div><div className="text-sm font-medium">Reset All Data</div><div className="text-xs text-destructive mt-0.5">Cannot be undone</div></div>
            <button onClick={handleReset} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3.5 rounded-lg text-[12.5px] hover:bg-destructive/20">Reset</button>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <div className="text-sm font-medium">Storage Used</div>
            <span className="text-muted-foreground">~{(storageUsed / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
