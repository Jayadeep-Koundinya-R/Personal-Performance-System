/*
  🔐 Premium Split-Screen Login Page
  
  Features:
  - Frictionless 1-Click Demo Login (if name exists in localStorage, jumps straight to dashboard!)
  - Left panel: Brand showcase with animated gradient, feature highlights
  - Right panel: Sign In / Sign Up / Forgot forms
  - Top Navigation Bar with explicit "← Back to Home" button
  - Password strength indicator on signup
  - Show/hide password toggle
  - Google OAuth + Guest Demo Mode with "Remember Me for 7 Days" option
  - Framer Motion transitions
*/

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, Zap } from "lucide-react";

/* ── password strength ──────────────────────────────── */

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score: 40, label: "Fair", color: "bg-orange-500" };
  if (score === 3) return { score: 60, label: "Good", color: "bg-yellow-500" };
  if (score === 4) return { score: 80, label: "Strong", color: "bg-pps-green" };
  return { score: 100, label: "Excellent", color: "bg-pps-green" };
}

/* ── feature highlights for left panel ──────────────── */

const BRAND_FEATURES = [
  { icon: "🔥", title: "Streak Engine", desc: "Build unbroken chains with shields and freeze credits" },
  { icon: "📊", title: "Deep Analytics", desc: "Completion rate, velocity, and AI-powered forecasts" },
  { icon: "🤖", title: "AI Coach", desc: "Smart assistant that roasts, audits, and advises" },
  { icon: "🏅", title: "Gamified XP", desc: "Earn XP, level up, unlock achievements and compete" },
];

/* ── component ───────────────────────────────────────── */

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") === "signup" ? "signup" : "signin") as "signin" | "signup" | "forgot";
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "signup") setTab("signup");
    else if (t === "signin") setTab("signin");

    // Catch OAuth errors from URL search parameters or hash
    const errDesc = searchParams.get("error_description") || searchParams.get("error");
    if (errDesc) {
      const decoded = decodeURIComponent(errDesc.replace(/\+/g, " "));
      setMessage({
        text: decoded.includes("provider") || decoded.includes("not enabled")
          ? "Google Authentication is not enabled in your Supabase project. Please configure the Google Provider in Supabase Auth settings."
          : `Authentication Error: ${decoded}`,
        type: "error",
      });
      return;
    }

    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashErr = hashParams.get("error_description") || hashParams.get("error");
      if (hashErr) {
        const decoded = decodeURIComponent(hashErr.replace(/\+/g, " "));
        setMessage({
          text: decoded.includes("provider") || decoded.includes("not enabled")
            ? "Google Authentication is not enabled in your Supabase project. Please configure the Google Provider in Supabase Auth settings."
            : `Authentication Error: ${decoded}`,
          type: "error",
        });
      }
    }
  }, [searchParams]);

  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [guestExpanded, setGuestExpanded] = useState(false);
  const [guestName, setGuestName] = useState(() => localStorage.getItem("pps_guest_name") || "");
  const [guestRemember, setGuestRemember] = useState(true);

  const [showSigninPw, setShowSigninPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  const { login, signup, loginAsGuest, resetPassword, isLoggedIn, loading, loginWithGoogle } = useAuth();

  const pwStrength = useMemo(() => getPasswordStrength(signupPassword), [signupPassword]);

  // Check if 7-day guest trial has expired
  const isGuestTrialExpired = (() => {
    const createdAt = localStorage.getItem("pps_guest_created_at");
    if (!createdAt) return false;
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return elapsed >= 7 * 24 * 60 * 60 * 1000;
  })();

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
    const result = await signup(signupEmail.trim().toLowerCase(), signupPassword, signupConfirm);
    if (result === "SUCCESS_CONFIRMATION_REQUIRED") {
      setMessage({ text: "Account created! Please check your email inbox to confirm your account before logging in.", type: "success" });
    } else if (result) {
      setMessage({ text: result, type: "error" });
    } else {
      setMessage({ text: "Account created! Redirecting to dashboard…", type: "success" });
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

  const handleDemoClick = () => {
    const existingName = localStorage.getItem("pps_guest_name");
    if (existingName && existingName.trim().length > 0) {
      // Instant 1-click login if name is already saved!
      loginAsGuest(existingName, true);
    } else {
      // First time demo user: prompt for name once
      setGuestExpanded(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (tab === "signin") handleSignIn();
      else if (tab === "signup") handleSignUp();
      else handleForgotPassword();
    }
  };

  /* ── input class helper ── */
  const inputCls = "w-full bg-surface border border-border px-4 py-3 rounded-xl text-foreground text-[13.5px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all";
  const labelCls = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
  const btnPrimary = "w-full bg-gradient-to-br from-primary to-accent text-white py-3 rounded-xl text-[13.5px] font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 shadow-md cursor-pointer";

  return (
    <div className="min-h-screen flex flex-col bg-background" onKeyDown={handleKeyDown}>

      {/* ═══════════ TOP GLOBAL NAV BAR WITH BACK BUTTON ═══════════ */}
      <nav className="w-full border-b border-border/40 bg-background/90 backdrop-blur-md px-6 py-3 flex items-center justify-between z-30">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/60 px-3.5 py-1.5 rounded-xl transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <Link to="/" className="font-mono text-xl font-extrabold text-primary tracking-[3px]">
          PPS<span className="text-secondary">.</span>
        </Link>
      </nav>

      <div className="flex-1 flex bg-background">
        {/* ═══════════ LEFT PANEL (Brand Showcase) ═══════════ */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden border-r border-border/40">
          {/* Gradient mesh background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/15" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-accent/10 rounded-full blur-[80px]" />

          <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 w-full">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight mb-4">
                Build better habits.
                <br />
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Level up your life.
                </span>
              </h1>

              <p className="text-muted-foreground text-sm leading-relaxed mb-10 max-w-md">
                The gamified habit tracker with deep analytics, AI coaching, streak protection, and 12+ built-in tools — free for 7 days.
              </p>

              {/* Feature highlights */}
              <div className="space-y-4">
                {BRAND_FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    className="flex items-start gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-xl flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-foreground">{f.title}</div>
                      <div className="text-[12px] text-muted-foreground">{f.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-6 mt-10 text-center">
                {[
                  { v: "500+", l: "Users" },
                  { v: "4.9★", l: "Rating" },
                  { v: "12", l: "Tools" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-lg font-extrabold font-mono text-primary">{s.v}</div>
                    <div className="text-[10px] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL (Form) ═══════════ */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[400px]"
          >
            {/* Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-xl">
              {/* Title */}
              <div className="mb-6">
                <h2 className="text-xl font-extrabold text-foreground">
                  {tab === "forgot" ? "Reset Password" : tab === "signup" ? "Create Account" : "Welcome back"}
                </h2>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  {tab === "forgot" ? "Enter your email to receive a reset link." : tab === "signup" ? "Start your performance journey today." : "Sign in to your PPS account."}
                </p>
              </div>

              {/* Tab switcher */}
              {tab !== "forgot" && (
                <div className="flex bg-surface rounded-xl p-1 mb-6">
                  <button
                    className={`flex-1 text-center py-2.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all ${
                      tab === "signin" ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => { setTab("signin"); setMessage(null); }}
                  >
                    Sign In
                  </button>
                  <button
                    className={`flex-1 text-center py-2.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all ${
                      tab === "signup" ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => { setTab("signup"); setMessage(null); }}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Error / success message */}
              {message && (
                <div className={`text-xs px-3 py-2.5 rounded-xl mb-4 border font-medium ${
                  message.type === "error"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-green-500/10 text-green-600 border-green-500/20"
                }`}>
                  {message.text}
                </div>
              )}

              {/* ── SIGN IN ── */}
              <AnimatePresence mode="wait">
                {tab === "signin" && (
                  <motion.div key="signin" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                    className="space-y-3.5"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Email</label>
                      <input type="email" placeholder="you@email.com" value={signinEmail}
                        onChange={(e) => setSigninEmail(e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Password</label>
                      <div className="relative">
                        <input type={showSigninPw ? "text" : "password"} placeholder="••••••••" value={signinPassword}
                          onChange={(e) => setSigninPassword(e.target.value)} className={`${inputCls} pr-10`} />
                        <button type="button" onClick={() => setShowSigninPw(!showSigninPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                          {showSigninPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <button onClick={() => { setTab("forgot"); setMessage(null); }}
                        className="text-[12px] text-primary hover:underline cursor-pointer bg-transparent border-none p-0 font-semibold">
                        Forgot password?
                      </button>
                    </div>
                    <button onClick={handleSignIn} disabled={submitting} className={btnPrimary}>
                      {submitting ? "Signing in…" : "Sign In"}
                    </button>
                  </motion.div>
                )}

                {/* ── SIGN UP ── */}
                {tab === "signup" && (
                  <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                    className="space-y-3.5"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Email</label>
                      <input type="email" placeholder="you@email.com" value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Password</label>
                      <div className="relative">
                        <input type={showSignupPw ? "text" : "password"} placeholder="Min 6 characters" value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)} className={`${inputCls} pr-10`} />
                        <button type="button" onClick={() => setShowSignupPw(!showSignupPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                          {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signupPassword && (
                        <div className="mt-1">
                          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                              style={{ width: `${pwStrength.score}%` }} />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 font-medium">{pwStrength.label}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Confirm Password</label>
                      <div className="relative">
                        <input type={showSignupConfirm ? "text" : "password"} placeholder="Repeat password" value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)} className={`${inputCls} pr-10`} />
                        <button type="button" onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                          {showSignupConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button onClick={handleSignUp} disabled={submitting} className={btnPrimary}>
                      {submitting ? "Creating…" : "Create Account"}
                    </button>
                  </motion.div>
                )}

                {/* ── FORGOT PASSWORD ── */}
                {tab === "forgot" && (
                  <motion.div key="forgot" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                    className="space-y-3.5"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Email</label>
                      <input type="email" placeholder="you@email.com" value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)} className={inputCls} />
                    </div>
                    <button onClick={handleForgotPassword} disabled={submitting} className={btnPrimary}>
                      {submitting ? "Sending…" : "Send Reset Link"}
                    </button>
                    <button onClick={() => { setTab("signin"); setMessage(null); }}
                      className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none py-2 font-medium">
                      ← Back to Sign In
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── OAuth & Guest ── */}
              {tab !== "forgot" && (
                <>
                  <div className="relative text-center text-muted-foreground text-xs my-5">
                    <div className="absolute top-1/2 left-0 w-[38%] h-px bg-border" />
                    <div className="absolute top-1/2 right-0 w-[38%] h-px bg-border" />
                    or
                  </div>
                  <button
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      setMessage(null);
                      const err = await loginWithGoogle();
                      if (err) {
                        setMessage({ text: err, type: "error" });
                        setSubmitting(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl border border-border bg-surface text-foreground text-[13px] cursor-pointer hover:border-primary/50 hover:bg-surface transition-all mb-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span>{submitting ? "Redirecting to Google…" : "Continue with Google"}</span>
                  </button>
                  
                  {/* Frictionless 1-Click Demo Login — hidden when trial expired */}
                  {isGuestTrialExpired ? (
                    <div className="w-full py-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 text-destructive text-[12px] text-center font-medium px-4">
                      ⏰ Your 7-day free trial has ended. Please create an account or sign in to continue.
                    </div>
                  ) : (
                    <button onClick={handleDemoClick}
                      className="w-full py-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-[13px] cursor-pointer hover:bg-primary/10 hover:border-primary transition-all font-semibold flex items-center justify-center gap-2 shadow-xs">
                      <Zap className="w-4 h-4 text-primary animate-pulse" />
                      <span>{localStorage.getItem("pps_guest_name") ? `Enter Demo as ${localStorage.getItem("pps_guest_name")} →` : "🚀 Try 7-Day Free Demo (No Account Needed)"}</span>
                    </button>
                  )}
                </>
              )}

              <div className="text-center text-[11px] text-muted-foreground mt-5">
                <Link to="/pricing" className="text-primary hover:underline font-semibold">View plans</Link>
                {" · "}
                <Link to="/privacy" className="hover:underline">Privacy</Link>
                {" · "}
                <Link to="/terms" className="hover:underline">Terms</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══════════ GUEST MODE MODAL WITH REMEMBER ME OPTION ═══════════ */}
      <AnimatePresence>
        {guestExpanded && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[5000] flex items-center justify-center p-4" onClick={() => setGuestExpanded(false)}>
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-7 max-w-sm w-full text-center space-y-5 shadow-2xl relative overflow-hidden"
              style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="text-5xl">⚡</div>
              <div>
                <h2 className="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Initialize Your 7-Day Demo
                </h2>
                <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
                  Enter your display name to start your 7-day full access demo trial.
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Display Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your name (e.g. Alex)"
                    className={inputCls}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && guestName.trim()) {
                        e.stopPropagation();
                        loginAsGuest(guestName.trim(), guestRemember);
                      }
                    }}
                  />
                </div>

                {/* Remember Me Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer text-[12px] text-muted-foreground hover:text-foreground transition-colors pt-1">
                  <input
                    type="checkbox"
                    checked={guestRemember}
                    onChange={(e) => setGuestRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span>Remember me on this browser for 7 days</span>
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (!guestName.trim()) return;
                    loginAsGuest(guestName.trim(), guestRemember);
                  }}
                  disabled={!guestName.trim()}
                  className={btnPrimary}
                >
                  Start 7-Day Demo Trial →
                </button>
                <button
                  onClick={() => setGuestExpanded(false)}
                  className="w-full py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none font-medium"
                >
                  Cancel
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-1">
                🔒 Data stored locally • Expire after 7 days
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
