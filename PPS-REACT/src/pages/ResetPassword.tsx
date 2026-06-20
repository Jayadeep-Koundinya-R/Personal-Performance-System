import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "react-router-dom";

const ResetPasswordPage = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleReset = async () => {
    if (!password || !confirm) {
      setMessage({ text: "Please fill in both fields.", type: "error" });
      return;
    }
    if (password !== confirm) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    const error = await updatePassword(password);
    if (error) {
      setMessage({ text: error, type: "error" });
    } else {
      setMessage({ text: "Password updated successfully! Redirecting…", type: "success" });
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleReset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" onKeyDown={handleKeyDown}>
      <div className="bg-card border border-border rounded-2xl p-8 w-[380px] max-w-[95vw]">
        <Link to="/" className="block">
          <div className="font-mono text-[30px] font-bold text-primary tracking-[3px] mb-1">
            PPS<span className="text-secondary">.</span>
          </div>
        </Link>
        <div className="text-[13px] text-muted-foreground mb-6">Set your new password</div>

        {!isRecovery && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mb-4">
            This page is used after clicking a password reset link from your email.
          </div>
        )}

        {message && (
          <div className={`text-xs px-3 py-2 rounded-lg mb-3.5 border ${
            message.type === "error"
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-green-500/10 text-green-600 border-green-500/20"
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New Password</label>
            <input type="password" placeholder="Min 6 characters" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
            <input type="password" placeholder="Repeat password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
          </div>
          <button onClick={handleReset}
            className="w-full mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all">
            Update Password
          </button>
        </div>

        <div className="text-center mt-5">
          <Link to="/login" className="text-[12px] text-primary hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
