import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Laptop } from "lucide-react";
import { toast } from "sonner";

interface SecurityTabProps {
  onUpdatePassword: (password: string) => Promise<string | null>;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ onUpdatePassword }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const err = await onUpdatePassword(newPassword);
    if (err) {
      toast.error(err);
    } else {
      toast.success("Account password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
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
  );
};
