import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Laptop, Shield, Fingerprint, Clock, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppLock } from "@/hooks/use-app-lock";

interface SecurityTabProps {
  onUpdatePassword: (password: string) => Promise<string | null>;
}

const TIMEOUT_OPTIONS = [
  { label: "30s (Demo)", ms: 30 * 1000 },
  { label: "1 min", ms: 60 * 1000 },
  { label: "3 min (Default)", ms: 3 * 60 * 1000 },
  { label: "5 min", ms: 5 * 60 * 1000 },
  { label: "15 min", ms: 15 * 60 * 1000 },
];

export const SecurityTab: React.FC<SecurityTabProps> = ({ onUpdatePassword }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const {
    isLockEnabled,
    hasBiometrics,
    timeoutMs,
    setTimeoutDuration,
    enableLock,
    disableLock,
    lockApp,
  } = useAppLock();

  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [disablePinInput, setDisablePinInput] = useState("");
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [showDisablePin, setShowDisablePin] = useState(false);

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least 1 uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Password must contain at least 1 number.");
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

  const handleSavePin = async () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }
    if (pinInput !== confirmPinInput) {
      toast.error("PINs do not match.");
      return;
    }
    await enableLock(pinInput);
    toast.success("App Lock enabled with 4-digit PIN & Biometrics!");
    setShowSetupPin(false);
    setPinInput("");
    setConfirmPinInput("");
  };

  const handleDisableLock = async () => {
    const ok = await disableLock(disablePinInput);
    if (ok) {
      toast.success("App Lock disabled.");
      setShowDisablePin(false);
      setDisablePinInput("");
    } else {
      toast.error("Incorrect PIN. Cannot disable App Lock.");
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
      {/* ── Biometric & App Lock Shield Card ── */}
      <div className="bg-card border border-primary/30 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Biometric & App Lock Shield</span>
          </h3>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              isLockEnabled
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-surface text-muted-foreground border-border/60"
            }`}
          >
            {isLockEnabled ? "SHIELD ACTIVE" : "DISABLED"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Locks your dashboard and reflections when the app is idle or sent to the background.
        </p>

        {/* Enable / Disable State */}
        {!isLockEnabled && !showSetupPin && (
          <div className="p-4 rounded-2xl bg-surface/60 border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Protect Private App Data</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {hasBiometrics ? "FaceID / Fingerprint + 4-Digit PIN" : "4-Digit PIN Security"}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowSetupPin(true)}
              className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-2.5 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Set Up 4-Digit App Lock</span>
            </Button>
          </div>
        )}

        {/* PIN Setup Form */}
        {showSetupPin && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Create 4-Digit Security PIN</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] font-mono text-muted-foreground">Enter PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest bg-surface border border-border/80 text-sm font-black rounded-xl p-2 text-foreground focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-mono text-muted-foreground">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest bg-surface border border-border/80 text-sm font-black rounded-xl p-2 text-foreground focus:border-amber-400 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSavePin}
                className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-2 rounded-xl cursor-pointer"
              >
                Save & Enable
              </Button>
              <button
                onClick={() => setShowSetupPin(false)}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Enabled State: Controls & Timeout Adjuster */}
        {isLockEnabled && (
          <div className="space-y-4">
            {/* Auto-Lock Inactivity Timeout Selector */}
            <div className="p-4 rounded-2xl bg-surface/60 border border-border/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Auto-Lock Inactivity Timeout</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-primary">
                  {TIMEOUT_OPTIONS.find((o) => o.ms === timeoutMs)?.label || `${Math.round(timeoutMs / 60000)}m`}
                </span>
              </div>

              {/* Duration Pills */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
                {TIMEOUT_OPTIONS.map((opt) => {
                  const isSelected = timeoutMs === opt.ms;
                  return (
                    <button
                      key={opt.ms}
                      onClick={() => {
                        setTimeoutDuration(opt.ms);
                        toast.success(`⏱️ Inactivity lock set to ${opt.label}`);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10.5px] font-mono font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-surface hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                Locks the screen if the app remains in the background or unattended for this duration.
              </p>
            </div>

            {/* Test & Disable Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => lockApp()}
                className="flex-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Screen Now (Test)</span>
              </Button>

              <button
                onClick={() => setShowDisablePin(!showDisablePin)}
                className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-xl border border-destructive/30 font-semibold cursor-pointer"
              >
                Disable Lock
              </button>
            </div>

            {showDisablePin && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
                <label className="text-[11px] font-mono text-destructive font-bold">
                  Enter Current PIN to Disable:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={disablePinInput}
                    onChange={(e) => setDisablePinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="flex-1 text-center tracking-widest bg-surface border border-border/80 text-sm font-bold rounded-xl p-2 text-foreground focus:border-destructive outline-none"
                  />
                  <Button
                    onClick={handleDisableLock}
                    className="bg-destructive text-destructive-foreground text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

          <Button
            onClick={changePassword}
            className="w-full text-xs bg-primary text-primary-foreground font-extrabold py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm mt-2"
          >
            Update Account Password
          </Button>
        </div>
      </div>

      {/* Active Device Session Card */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-xl space-y-4 lg:col-span-2">
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
