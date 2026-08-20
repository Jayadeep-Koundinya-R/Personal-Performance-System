/*
  🔐 Masterwork Split-Screen Auth & Workspace Login Studio
  
  Features:
  - Dynamic 3D Ambient Background Layer (Theme-adaptive: Light Aurora & Dark Cosmic)
  - Top Navigation with Theme Switcher & Back-to-Home button
  - Left Panel: Live showcase of PPS powerhouse features (Focus Rooms, AI Coach, Alarms, Whiteboard)
  - Right Panel: Glassmorphic Auth Card with Sign In / Sign Up / Forgot Password / 7-Day Demo
  - Quick 1-Click Demo Profiles (Alex Pro, Sarah Mentor, Free Student) for instant testing
  - Google OAuth & Supabase authentication
  - Password strength analyzer & show/hide toggle
  - High-Contrast Theme Tokens (text-foreground, text-muted-foreground, bg-card, bg-surface)
*/

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Zap,
  Sparkles,
  Shield,
  Video,
  CheckCircle2,
  Lock,
  Crown,
  GraduationCap,
  Users,
  Compass,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

/* ── Password Strength Analyzer ──────────────────────── */
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

/* ── Powerhouse Modules Showcase ─────────────────────── */
const BRAND_FEATURES = [
  { icon: "🎥", title: "WebRTC Focus Rooms", desc: "Drop-in video/audio co-working with synced Pomodoros and shared whiteboard", badge: "Live" },
  { icon: "🤖", title: "Dual-Engine AI Coach", desc: "Gemini 2.0 Pro cloud & 100% private local Ollama LLM execution", badge: "AI" },
  { icon: "🔔", title: "Circadian Alarms", desc: "Align habits with biological peak energy windows & 432Hz soundscapes", badge: "Smart" },
  { icon: "🔥", title: "Auto-Streak Shields", desc: "Unbroken consistency chains with automated freeze credit protection", badge: "Shield" },
];

const TEST_ACCOUNTS = [
  { label: "Alex (Pro Student)", email: "test.pro@pps.local", pw: "TestPassword123!", icon: "👑", badge: "Pro Active" },
  { label: "Sarah (Teacher / Mentor)", email: "test.teacher@pps.local", pw: "TestPassword123!", icon: "🎓", badge: "Educator" },
  { label: "Free Student Account", email: "test.free@pps.local", pw: "TestPassword123!", icon: "🌱", badge: "Free Tier" },
];

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") === "signup" ? "signup" : searchParams.get("tab") === "demo" ? "demo" : "signin") as "signin" | "signup" | "forgot" | "demo";
  const [tab, setTab] = useState<"signin" | "signup" | "forgot" | "demo">(initialTab);

  const { theme, toggleTheme } = useTheme();
  const { login, signup, loginAsGuest, resetPassword, isLoggedIn, loading, loginWithGoogle } = useAuth();

  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [guestName, setGuestName] = useState(() => localStorage.getItem("pps_guest_name") || "");
  const [guestRemember, setGuestRemember] = useState(true);

  const [showSigninPw, setShowSigninPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "signup") setTab("signup");
    else if (t === "signin") setTab("signin");
    else if (t === "demo") setTab("demo");

    const errDesc = searchParams.get("error_description") || searchParams.get("error");
    if (errDesc) {
      const decoded = decodeURIComponent(errDesc.replace(/\+/g, " "));
      setMessage({
        text: decoded.includes("provider") || decoded.includes("not enabled")
          ? "Google Authentication is not enabled in your Supabase project. Please use standard email login."
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
            ? "Google Authentication is not enabled in your Supabase project. Please use standard email login."
            : `Authentication Error: ${decoded}`,
          type: "error",
        });
      }
    }
  }, [searchParams]);

  const pwStrength = useMemo(() => getPasswordStrength(signupPassword), [signupPassword]);

  // Check 7-day guest trial expiry
  const isGuestTrialExpired = (() => {
    const createdAt = localStorage.getItem("pps_guest_created_at");
    if (!createdAt) return false;
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return elapsed >= 7 * 24 * 60 * 60 * 1000;
  })();

  if (!loading && isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (overrideEmail?: string, overridePw?: string) => {
    setSubmitting(true);
    setMessage(null);
    const emailToUse = overrideEmail || signinEmail;
    const pwToUse = overridePw || signinPassword;

    if (!emailToUse.trim() || !pwToUse) {
      setMessage({ text: "Please enter your email and password.", type: "error" });
      setSubmitting(false);
      return;
    }

    const error = await login(emailToUse.trim().toLowerCase(), pwToUse);
    if (error) setMessage({ text: error, type: "error" });
    setSubmitting(false);
  };

  const handleSignUp = async () => {
    setSubmitting(true);
    setMessage(null);
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
    setMessage(null);
    const error = await resetPassword(forgotEmail.trim().toLowerCase());
    if (error) {
      setMessage({ text: error, type: "error" });
    } else {
      setMessage({ text: "If an account exists with that email, you'll receive a password reset link shortly.", type: "success" });
    }
    setSubmitting(false);
  };

  const handleGuestSubmit = () => {
    if (!guestName.trim()) {
      setMessage({ text: "Please enter a display name to begin your demo session.", type: "error" });
      return;
    }
    loginAsGuest(guestName.trim(), guestRemember);
    toast.success(`Welcome to PPS, ${guestName.trim()}! 7-Day Demo Active.`);
  };

  const handleFillTestAccount = (acc: typeof TEST_ACCOUNTS[0]) => {
    setTab("signin");
    setSigninEmail(acc.email);
    setSigninPassword(acc.pw);
    handleSignIn(acc.email, acc.pw);
    toast.info(`Logging in with ${acc.label} credentials...`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (tab === "signin") handleSignIn();
      else if (tab === "signup") handleSignUp();
      else if (tab === "demo") handleGuestSubmit();
      else handleForgotPassword();
    }
  };

  const inputCls = "w-full bg-surface border border-border/80 px-4 py-3 rounded-2xl text-foreground text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs";
  const labelCls = "text-[11px] font-extrabold uppercase font-mono tracking-wider text-muted-foreground";

  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary selection:text-white transition-colors duration-500 overflow-x-hidden" onKeyDown={handleKeyDown}>
      {/* 🌌 Dynamic 3D Ambient Background Layer */}
      <ThreeDBackground />

      {/* ═══════════ TOP GLOBAL NAV BAR ═══════════ */}
      <nav className="w-full border-b border-border/50 bg-card/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-30 sticky top-0 shadow-xs">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-extrabold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/80 px-3.5 py-1.5 rounded-2xl transition-all group shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/" className="font-mono text-xl font-black text-foreground tracking-[3px] flex items-center gap-1.5">
            <span>PPS</span>
            <span className="text-primary font-black">.</span>
            <span className="text-[10px] font-mono bg-primary/15 text-primary border border-primary/30 px-2 py-0.2 rounded-full font-bold uppercase hidden sm:inline">
              v2.0 OS
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="bg-surface border border-border/80 rounded-2xl px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-1.5 text-foreground shadow-xs"
            title="Toggle theme"
          >
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
            <span className="text-[11px] hidden sm:inline">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <Link
            to="/pricing"
            className="text-xs bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 rounded-2xl font-extrabold hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
          >
            Plans
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        {/* ═══════════ LEFT PANEL (Dynamic Brand Showcase) ═══════════ */}
        <div className="hidden lg:flex lg:w-[50%] p-10 xl:p-14 flex-col justify-between border-r border-border/40 bg-card/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6 max-w-xl"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold text-primary bg-primary/15 border border-primary/30 px-3.5 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-pps-yellow" />
              <span>Next-Gen Habit & Performance Architecture</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black leading-tight text-foreground font-mono tracking-tight">
              Transform Daily Execution.
              <br />
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-secondary bg-clip-text text-transparent">
                Unlock Peak Performance.
              </span>
            </h1>

            <p className="text-muted-foreground text-xs font-medium leading-relaxed">
              The all-in-one gamified OS combining circadian alarms, live WebRTC focus study rooms, Gemini 2.0 AI performance coaching, and cohort classroom marketplaces.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {BRAND_FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  className="p-4 rounded-3xl bg-card border border-border/80 hover:border-primary/40 transition-all shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{f.icon}</span>
                    <span className="text-[9.5px] font-mono font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-0.2 rounded-full">
                      {f.badge}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-foreground">{f.title}</h4>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Social Proof & Metrics */}
            <div className="p-4 rounded-3xl bg-surface/60 border border-border/80 flex items-center justify-around text-center shadow-xs">
              <div>
                <div className="text-lg font-black font-mono text-primary">5,000+</div>
                <div className="text-[10.5px] font-extrabold text-muted-foreground">Active Routines</div>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <div className="text-lg font-black font-mono text-pps-green">99.9%</div>
                <div className="text-[10.5px] font-extrabold text-muted-foreground">WebRTC Uptime</div>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <div className="text-lg font-black font-mono text-pps-yellow">4.9★</div>
                <div className="text-[10.5px] font-extrabold text-muted-foreground">User Rating</div>
              </div>
            </div>
          </motion.div>

          <div className="text-[11px] text-muted-foreground font-mono font-medium pt-6 flex items-center justify-between">
            <span>© 2026 UpaLakshya Labs</span>
            <span>Enterprise Security • 256-Bit SSL</span>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL (Interactive Auth Studio Card) ═══════════ */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[460px]"
          >
            <div className="bg-card/90 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative overflow-hidden">
              {/* Header */}
              <div>
                <h2 className="text-xl font-black text-foreground font-mono tracking-tight flex items-center gap-2">
                  <span>
                    {tab === "forgot"
                      ? "Reset Password"
                      : tab === "signup"
                      ? "Create Your Account"
                      : tab === "demo"
                      ? "Instant 7-Day Demo Trial"
                      : "Welcome Back"}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {tab === "forgot"
                    ? "Enter your email to receive a recovery link"
                    : tab === "signup"
                    ? "Join thousands building high-performance atomic habits"
                    : tab === "demo"
                    ? "Zero registration & no credit card required"
                    : "Sign in to access your habits, focus rooms, and streaks"}
                </p>
              </div>

              {/* ── 3-WAY TAB SELECTOR PILLS ── */}
              {tab !== "forgot" && (
                <div className="flex bg-surface/80 border border-border/80 rounded-2xl p-1 shadow-xs">
                  <button
                    onClick={() => { setTab("signin"); setMessage(null); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                      tab === "signin" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setTab("signup"); setMessage(null); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                      tab === "signup" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => { setTab("demo"); setMessage(null); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      tab === "demo" ? "bg-pps-green text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Zap className="w-3 h-3 text-pps-yellow" />
                    <span>Demo ⚡</span>
                  </button>
                </div>
              )}

              {/* Feedback Error / Success Alert Box */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs p-3.5 rounded-2xl border font-bold flex items-start gap-2.5 shadow-xs ${
                    message.type === "error"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "bg-pps-green/15 text-pps-green border-pps-green/30"
                  }`}
                >
                  <span className="text-sm flex-shrink-0 mt-0.5">{message.type === "error" ? "⚠️" : "✅"}</span>
                  <span className="leading-relaxed">{message.text}</span>
                </motion.div>
              )}

              {/* ── FORM 1: SIGN IN ── */}
              <AnimatePresence mode="wait">
                {tab === "signin" && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <label className={labelCls}>Email Address</label>
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={signinEmail}
                        onChange={(e) => setSigninEmail(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={labelCls}>Password</label>
                        <button
                          type="button"
                          onClick={() => { setTab("forgot"); setMessage(null); }}
                          className="text-[11.5px] text-primary hover:underline cursor-pointer font-bold"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showSigninPw ? "text" : "password"}
                          placeholder="••••••••"
                          value={signinPassword}
                          onChange={(e) => setSigninPassword(e.target.value)}
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSigninPw(!showSigninPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showSigninPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSignIn()}
                      disabled={submitting}
                      className="w-full bg-primary text-primary-foreground font-black py-3 rounded-2xl hover:bg-primary/90 transition-all cursor-pointer shadow-md text-xs disabled:opacity-50"
                    >
                      {submitting ? "Signing in..." : "Sign In to Workspace 🚀"}
                    </button>
                  </motion.div>
                )}

                {/* ── FORM 2: SIGN UP ── */}
                {tab === "signup" && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3.5"
                  >
                    <div className="space-y-1">
                      <label className={labelCls}>Email Address</label>
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>Password</label>
                      <div className="relative">
                        <input
                          type={showSignupPw ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPw(!showSignupPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signupPassword && (
                        <div className="mt-1 space-y-1">
                          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                              style={{ width: `${pwStrength.score}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono font-bold">Strength: {pwStrength.label}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showSignupConfirm ? "text" : "password"}
                          placeholder="Repeat password"
                          value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)}
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showSignupConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSignUp}
                      disabled={submitting}
                      className="w-full bg-primary text-primary-foreground font-black py-3 rounded-2xl hover:bg-primary/90 transition-all cursor-pointer shadow-md text-xs disabled:opacity-50"
                    >
                      {submitting ? "Creating Workspace..." : "Create Account (Free 7 Days) ✨"}
                    </button>
                  </motion.div>
                )}

                {/* ── FORM 3: INSTANT GUEST DEMO ── */}
                {tab === "demo" && (
                  <motion.div
                    key="demo"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="p-3.5 bg-pps-green/10 border border-pps-green/30 rounded-2xl flex items-center gap-3">
                      <span className="text-2xl flex-shrink-0">⚡</span>
                      <div>
                        <div className="text-xs font-black text-pps-green">Zero-Friction 7-Day Access</div>
                        <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                          Instant access to habits, focus rooms, soundscapes, and dashboard tools.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>Your Display Name</label>
                      <input
                        type="text"
                        placeholder="Enter your name (e.g. Alex)"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className={inputCls}
                        autoFocus
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                      <input
                        type="checkbox"
                        checked={guestRemember}
                        onChange={(e) => setGuestRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
                      />
                      <span>Remember demo session on this browser</span>
                    </label>

                    <button
                      onClick={handleGuestSubmit}
                      disabled={!guestName.trim()}
                      className="w-full bg-pps-green text-white font-black py-3 rounded-2xl hover:opacity-90 transition-all cursor-pointer shadow-md text-xs disabled:opacity-50"
                    >
                      Enter 7-Day Demo Dashboard →
                    </button>
                  </motion.div>
                )}

                {/* ── FORM 4: FORGOT PASSWORD ── */}
                {tab === "forgot" && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <label className={labelCls}>Account Email Address</label>
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    <button
                      onClick={handleForgotPassword}
                      disabled={submitting}
                      className="w-full bg-primary text-primary-foreground font-black py-3 rounded-2xl hover:bg-primary/90 transition-all cursor-pointer shadow-md text-xs disabled:opacity-50"
                    >
                      {submitting ? "Sending Recovery Link..." : "Send Password Reset Link"}
                    </button>

                    <button
                      onClick={() => { setTab("signin"); setMessage(null); }}
                      className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer py-1"
                    >
                      ← Back to Sign In
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Google OAuth & Divider ── */}
              {tab !== "forgot" && (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div className="relative text-center text-muted-foreground text-[11px] font-mono uppercase font-bold">
                    <div className="absolute top-1/2 left-0 w-[40%] h-px bg-border/60" />
                    <div className="absolute top-1/2 right-0 w-[40%] h-px bg-border/60" />
                    <span>OR</span>
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
                    className="w-full py-2.5 rounded-2xl border border-border/80 bg-surface/80 text-foreground text-xs font-extrabold cursor-pointer hover:border-primary/50 hover:bg-surface transition-all flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span>{submitting ? "Redirecting..." : "Continue with Google"}</span>
                  </button>

                  {/* ── 1-Click Quick Demo Profiles Box (For Tester Convenience) ── */}
                  <div className="p-3.5 bg-surface/50 border border-border/60 rounded-2xl space-y-2">
                    <div className="text-[10px] font-mono uppercase font-black text-muted-foreground flex items-center justify-between">
                      <span>⚡ 1-Click Test Account Fill</span>
                      <span className="text-primary font-bold">Instant Login</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {TEST_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.email}
                          onClick={() => handleFillTestAccount(acc)}
                          className="p-2 bg-card border border-border/80 hover:border-primary/40 hover:bg-primary/10 rounded-xl text-left transition-all cursor-pointer shadow-2xs group"
                          title={`Log in as ${acc.label}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{acc.icon}</span>
                            <span className="text-[11px] font-extrabold text-foreground truncate group-hover:text-primary">
                              {acc.label.split(" ")[0]}
                            </span>
                          </div>
                          <div className="text-[9.5px] font-mono text-muted-foreground">{acc.badge}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Links */}
              <div className="text-center text-[11px] text-muted-foreground font-mono space-x-2 pt-2 border-t border-border/40">
                <Link to="/pricing" className="text-primary hover:underline font-bold">Plans & Pricing</Link>
                <span>•</span>
                <Link to="/privacy" className="hover:underline">Privacy</Link>
                <span>•</span>
                <Link to="/terms" className="hover:underline">Terms</Link>
                <span>•</span>
                <a href="mailto:enterprise@upalakshya.com" className="hover:underline text-secondary font-bold">Campus Sales</a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
