import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, ArrowLeft, Sun, Moon, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "bg-destructive" };
  if (score === 2) return { score: 40, label: "Fair", color: "bg-pps-orange" };
  if (score === 3) return { score: 60, label: "Good", color: "bg-pps-yellow" };
  if (score === 4) return { score: 80, label: "Strong", color: "bg-pps-green" };
  return { score: 100, label: "Excellent", color: "bg-pps-green" };
}

const ResetPasswordPage = () => {
  const { updatePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const pwStrength = getPasswordStrength(password);

  const handleReset = async () => {
    if (!password || !confirm) {
      setMessage({ text: "Please fill in both fields.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters long.", type: "error" });
      return;
    }
    if (password !== confirm) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setSubmitting(true);
    const error = await updatePassword(password);
    setSubmitting(false);

    if (error) {
      setMessage({ text: error, type: "error" });
      toast.error(error);
    } else {
      setMessage({ text: "Password updated successfully! Redirecting…", type: "success" });
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/dashboard"), 1800);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleReset();
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-background text-foreground relative selection:bg-primary selection:text-white overflow-hidden transition-colors duration-500"
      onKeyDown={handleKeyDown}
    >
      {/* 🌌 Dynamic 3D Ambient Background Layer */}
      <ThreeDBackground />

      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-4 flex items-center justify-between relative z-20">
        <Link to="/" className="group">
          <BrandLogo size="md" variant="square" badge="Security" />
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs flex items-center justify-center h-8 w-8"
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Light or Dark Mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-pps-orange" /> : <Moon className="w-4 h-4 text-primary" />}
          </Button>
          <Link
            to="/login"
            className="text-xs bg-surface hover:bg-card border border-border/80 text-muted-foreground hover:text-foreground px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-xs"
          >
            ← Back to Login
          </Link>
        </div>
      </header>

      {/* Main Glassmorphic Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="bg-card/85 backdrop-blur-2xl border border-border/80 rounded-3xl p-6 sm:p-8 w-full max-w-[420px] shadow-2xl space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Password Recovery</span>
            </div>
            <h1 className="text-2xl font-black font-mono tracking-tight text-foreground">
              Set New Password
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create a strong, unique password to secure your personal performance system.
            </p>
          </div>

          {!isRecovery && (
            <div className="text-xs text-muted-foreground bg-surface/80 border border-border/60 p-3 rounded-xl">
              💡 This view is activated after clicking the secure password reset link sent to your email.
            </div>
          )}

          {message && (
            <div
              className={`text-xs px-3.5 py-2.5 rounded-xl border flex items-center gap-2 ${
                message.type === "error"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-pps-green/10 text-pps-green border-pps-green/20"
              }`}
            >
              {message.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                <span>New Password</span>
                {password && (
                  <span className={`text-[10px] font-bold ${pwStrength.score >= 80 ? 'text-pps-green' : pwStrength.score >= 60 ? 'text-pps-yellow' : 'text-destructive'}`}>
                    {pwStrength.label}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-surface/80 border border-border/80 pl-3.5 pr-10 py-2.5 rounded-xl text-foreground text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {/* Password Strength Meter Bar */}
              {password && (
                <div className="h-1 w-full bg-surface rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${pwStrength.color}`}
                    style={{ width: `${pwStrength.score}%` }}
                  />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="bg-surface/80 border border-border/80 pl-3.5 pr-10 py-2.5 rounded-xl text-foreground text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleReset}
              disabled={submitting}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 px-5 rounded-xl text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50 h-auto"
            >
              {submitting ? "Updating..." : "Update Password & Open Dashboard"}
            </Button>
          </div>

          <div className="text-center pt-2 border-t border-border/40">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← Return to Login
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center relative z-20 text-[11px] text-muted-foreground font-mono">
        PPS v2.0 • Personal Performance System
      </footer>
    </div>
  );
};

export default ResetPasswordPage;
