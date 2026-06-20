import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigate, Link, useSearchParams } from "react-router-dom";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") === "signup" ? "signup" : "signin") as "signin" | "signup" | "forgot";
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "signup") setTab("signup");
    else if (t === "signin") setTab("signin");
  }, [searchParams]);

  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const { login, signup, loginAsGuest, resetPassword, isLoggedIn, loading, loginWithGoogle } = useAuth();

  if (!loading && isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async () => {
    setSubmitting(true);
    const error = await login(signinEmail.trim().toLowerCase(), signinPassword);
    if (error) setMessage({ text: error, type: "error" });
    setSubmitting(false);
  };

  const handleSignUp = async () => {
    setSubmitting(true);
    const error = await signup(signupEmail.trim().toLowerCase(), signupPassword, signupConfirm);
    if (error) {
      setMessage({ text: error, type: "error" });
    } else {
      setMessage({ text: "Account created! Signing you in…", type: "success" });
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    setSubmitting(true);
    const error = await resetPassword(forgotEmail.trim().toLowerCase());
    if (error) {
      setMessage({ text: error, type: "error" });
    } else {
      setMessage({ text: "If an account exists with that email, you'll receive a reset link shortly.", type: "success" });
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (tab === "signin") handleSignIn();
      else if (tab === "signup") handleSignUp();
      else handleForgotPassword();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" onKeyDown={handleKeyDown}>
      <div className="bg-card border border-border rounded-2xl p-8 w-[380px] max-w-[95vw]">
        <Link to="/" className="block">
          <div className="font-mono text-[30px] font-bold text-primary tracking-[3px] mb-1">
            PPS<span className="text-secondary">.</span>
          </div>
        </Link>
        <div className="text-[13px] text-muted-foreground mb-8">Personal Performance System</div>

        {tab !== "forgot" && (
          <div className="flex bg-surface rounded-lg p-1 mb-6">
            <button
              className={`flex-1 text-center py-2 rounded-md text-[13px] font-semibold cursor-pointer transition-all ${
                tab === "signin" ? "bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)]" : "text-muted-foreground"
              }`}
              onClick={() => { setTab("signin"); setMessage(null); }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 text-center py-2 rounded-md text-[13px] font-semibold cursor-pointer transition-all ${
                tab === "signup" ? "bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)]" : "text-muted-foreground"
              }`}
              onClick={() => { setTab("signup"); setMessage(null); }}
            >
              Sign Up
            </button>
          </div>
        )}

        {tab === "forgot" && (
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-1">Reset Password</h2>
            <p className="text-[13px] text-muted-foreground">Enter your email to receive a reset link.</p>
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

        {tab === "signin" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <input type="email" placeholder="you@email.com" value={signinEmail}
                onChange={(e) => setSigninEmail(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
              <input type="password" placeholder="••••••••" value={signinPassword}
                onChange={(e) => setSigninPassword(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
            </div>
            <div className="text-right">
              <button
                onClick={() => { setTab("forgot"); setMessage(null); }}
                className="text-[12px] text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Forgot password?
              </button>
            </div>
            <button onClick={handleSignIn} disabled={submitting}
              className="w-full mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all disabled:opacity-50">
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </div>
        )}

        {tab === "signup" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <input type="email" placeholder="you@email.com" value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
              <input type="password" placeholder="Min 6 characters" value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
              <input type="password" placeholder="Repeat password" value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
            </div>
            <button onClick={handleSignUp} disabled={submitting}
              className="w-full mt-5 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all disabled:opacity-50">
              {submitting ? "Creating…" : "Create Account"}
            </button>
          </div>
        )}

        {tab === "forgot" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <input type="email" placeholder="you@email.com" value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary transition-colors w-full" />
            </div>
            <button onClick={handleForgotPassword} disabled={submitting}
              className="w-full mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all disabled:opacity-50">
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>
            <button
              onClick={() => { setTab("signin"); setMessage(null); }}
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none py-2"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {tab !== "forgot" && (
          <>
            <div className="relative text-center text-muted-foreground text-xs my-[18px]">
              <div className="absolute top-1/2 left-0 w-[40%] h-px bg-border" />
              <div className="absolute top-1/2 right-0 w-[40%] h-px bg-border" />
              or
            </div>
            <button
              onClick={async () => {
                const err = await loginWithGoogle();
                if (err) setMessage({ text: err, type: "error" });
              }}
              className="w-full py-2.5 rounded-lg border border-border bg-surface text-foreground font-display text-[13px] cursor-pointer hover:border-primary transition-all mb-2"
            >
              Continue with Google
            </button>
            <button onClick={() => loginAsGuest()}
              className="w-full py-2.5 rounded-lg border border-dashed border-border bg-transparent text-muted-foreground font-display text-[13px] cursor-pointer hover:text-foreground hover:border-muted-foreground transition-all">
              Try Demo (Guest) — local only
            </button>
          </>
        )}

        <div className="text-center text-[11px] text-muted-foreground mt-5">
          <Link to="/pricing" className="text-primary hover:underline">View plans</Link>
          {" · "}
          <Link to="/privacy" className="hover:underline">Privacy</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
