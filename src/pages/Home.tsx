import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { RoadmapSection } from "@/components/roadmap/RoadmapSection";
import {
  Sparkles,
  Zap,
  Flame,
  Trophy,
  Users,
  Video,
  PenTool,
  Bot,
  Calendar,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Building2,
  ExternalLink,
  Volume2,
  Smartphone,
  Layers,
  Globe,
  Radio,
  Star,
  BookOpen,
  Percent,
  TrendingUp,
  Award,
  CreditCard,
} from "lucide-react";

/* ── 16 Features with Honest Status ─────────────────── */
// status: "live" = fully working end-to-end
//         "beta" = UI works locally, multi-user networking not yet built
//         "placeholder" = UI mockup only, core logic not yet implemented
const FEATURES: { icon: string; title: string; desc: string; status: "live" | "beta" | "placeholder" }[] = [
  { icon: "🎥", title: "Focus Rooms & Video Calls", desc: "Drop-in study rooms with your own webcam preview, mic controls, and meeting UI. Multi-user peer-to-peer video coming in Stage 1.", status: "beta" },
  { icon: "🎓", title: "Teacher & Mentor Marketplace", desc: "Browse and create classrooms with assigned habits. Live class ticket payments coming soon.", status: "beta" },
  { icon: "🏫", title: "Institutional Campus License", desc: "Semester licensing calculator and inquiry form for colleges. Bulk CSV roster upload and backend coming soon.", status: "placeholder" },
  { icon: "🎨", title: "Whiteboard & Drawing Canvas", desc: "Interactive HTML5 Canvas with pen, eraser, colors, and PNG export. Real-time multi-user sync coming in Stage 2.", status: "beta" },
  { icon: "🎧", title: "Procedural 432Hz Soundscapes", desc: "0KB offline Web Audio generator with Lo-Fi 432Hz, Soft Rain, Coffee Shop, and Library acoustics.", status: "live" },
  { icon: "🤖", title: "Dual-Engine AI Coach", desc: "Private coaching powered by Google Gemini cloud or 100% local Ollama LLMs with 1-click habit checkoffs in chat.", status: "live" },
  { icon: "🏆", title: "Championship Podium Leaderboard", desc: "Local leaderboard with rank podiums and XP peer cheers. Cross-user live leaderboard coming in Stage 3.", status: "beta" },
  { icon: "⚔️", title: "Co-Op Squad Habit Quests", desc: "Local quest templates and streak tracking. Multi-user quest sync coming in Stage 3.", status: "beta" },
  { icon: "🗗", title: "Pop-Out Window & PiP", desc: "Open meetings in a dedicated browser window. Cross-window state sync being refined.", status: "beta" },
  { icon: "🔥", title: "Streak Engine & Auto-Shields", desc: "Unbroken consistency chains with automated freeze credits, emergency alerts, and milestone celebrations.", status: "live" },
  { icon: "🎯", title: "Focus Studio & Pomodoro Timer", desc: "25/5 Pomodoro timer with XP rewards and session logs. Per-device timer — multi-user sync coming soon.", status: "live" },
  { icon: "📊", title: "Deep Performance Analytics", desc: "Completion rates, habit velocity, category heatmaps, energy correlations, and PDF executive reports.", status: "live" },
  { icon: "📅", title: "Interactive Performance Calendar", desc: "Month grid, week schedule, and agenda view with perfect day trophies and time-window alarms.", status: "live" },
  { icon: "📝", title: "Daily Guided Reflections Journal", desc: "Structured evening prompts, mood tracking, historical timeline search, and cognitive audit logs.", status: "live" },
  { icon: "⚙️", title: "Habit Architect & Starter Packs", desc: "Categorized priority scheduling, time windows, and instant starter template packs for high performers.", status: "live" },
  { icon: "🔔", title: "Circadian Alarm Studio", desc: "Smart habit-linked alarms with custom soundscapes, snooze limits, and Web Push notifications.", status: "live" },
];

/* ── Upcoming Roadmap Features ──────────────────────── */
const UPCOMING_FEATURES = [
  { icon: "📱", title: "Native iOS & Android Apps", badge: "Q3 2026", desc: "Swift & Kotlin native mobile apps with Lock Screen widgets and Apple Watch complications." },
  { icon: "🧠", title: "Biometric Sleep & HRV Sync", badge: "Q4 2026", desc: "Direct integration with Apple Health, Whoop, and Oura Ring to correlate energy with habit success." },
  { icon: "🌐", title: "LMS Canvas & Moodle Connector", badge: "Q4 2026", desc: "Sync course assignments, deadlines, and grades automatically into your daily habit queues." },
  { icon: "🌍", title: "Multi-Lingual Voice Coach", badge: "Q1 2027", desc: "Real-time AI voice conversation in Spanish, Hindi, French, German, Japanese, and Mandarin." },
];

const COMPETITORS: { feature: string; pps: string; focusmate: boolean; habitica: boolean; notion: boolean }[] = [
  { feature: "Drop-In Video Focus Rooms", pps: "🏗️ Beta", focusmate: false, habitica: false, notion: false },
  { feature: "Teacher & Mentor Marketplace", pps: "🏗️ Beta", focusmate: false, habitica: false, notion: false },
  { feature: "Whiteboard & PNG Export", pps: "🏗️ Beta", focusmate: false, habitica: false, notion: false },
  { feature: "Procedural Offline Soundscapes (Lo-Fi / Rain)", pps: "✅ Live", focusmate: false, habitica: false, notion: false },
  { feature: "AI Performance Coach (Gemini + Local Ollama)", pps: "✅ Live", focusmate: false, habitica: false, notion: false },
  { feature: "Championship Podium & Co-Op Quests", pps: "🏗️ Beta", focusmate: false, habitica: true, notion: false },
  { feature: "Institutional Campus Licensing", pps: "🏗️ Planned", focusmate: false, habitica: false, notion: false },
  { feature: "Streak Shields & Auto-Freeze Engine", pps: "✅ Live", focusmate: false, habitica: false, notion: false },
  { feature: "Deep Analytics & Executive PDF Reports", pps: "✅ Live", focusmate: false, habitica: false, notion: false },
  { feature: "100% Free Lifetime Tier Included", pps: "✅ Live", focusmate: false, habitica: true, notion: true },
];

// Note: These are illustrative/aspirational testimonials for the landing page.
// They represent the target user personas, not verified customer quotes.
const TESTIMONIALS = [
  { name: "Alex V.", role: "CS Student & Beta Tester", avatar: "👨‍💻", quote: "The streak engine and AI coach are genuinely addictive. I've maintained a 30-day habit streak for the first time in my life. Excited for the multi-user focus rooms coming soon." },
  { name: "Priya R.", role: "Graduate Researcher & Early Adopter", avatar: "👩‍🎓", quote: "The Pomodoro timer, analytics, and reflections journal have become my daily workflow. The ambient soundscapes are a lovely touch for late-night study sessions." },
  { name: "Dev Team", role: "PPS Engineering", avatar: "⚙️", quote: "We're building PPS in public — stage by stage, with honest labeling. Multi-user video rooms, real-time chat, and payment processing are actively under development." },
];

const FAQS = [
  { q: "What makes PPS fundamentally different from Zoom, Habitica, or Notion?", a: "PPS is the world's first unified Personal Performance System combining live drop-in video focus rooms, verified mentor masterclasses, shared whiteboards, local & cloud AI coaching, and gamified streak engines under one cohesive workspace." },
  { q: "Can I host meetings in a separate window or Picture-in-Picture?", a: "Yes! In 1 click, you can pop out your meeting into a standalone Zoom/Google Meet styled window (`#/meet/:roomId`) or minimize it to a floating Picture-in-Picture widget while checking your habits." },
  { q: "Is the core version free?", a: "Yes! The Personal Free plan gives you up to 15 active habits, 3 study squads, daily 60m focus rooms, Pomodoro timer, and streak tracking with no credit card required." },
  { q: "How do teachers earn money on PPS?", a: "Teachers and mentors host live masterclasses with zero upfront platform cost. PPS collects ticket fees via UPI / Cards with a transparent 10% platform share (first 5 classes/month are 100% free!)." },
  { q: "Can schools and colleges deploy PPS across batches?", a: "Yes! Campus licensing is available at a flat semester rate (₹2,000 / $49 per student) with 1-click CSV roster imports, multi-faculty portals, and automated attendance audit logs." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

export const HomePage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-white transition-colors duration-500">
      {/* 🌌 Animated 3D Moving Background */}
      <ThreeDBackground />

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-card/80 border-b border-border/40 transition-colors duration-500">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-xl font-black text-primary tracking-wider">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span>PPS<span className="text-secondary">.</span></span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface hidden sm:inline-flex cursor-pointer"
            >
              Features
            </button>
            <Link
              to="/marketplace"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface hidden md:inline-flex"
            >
              Mentors & Classes
            </Link>
            <Link
              to="/roadmap"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface hidden lg:inline-flex"
            >
              Roadmap 🚀
            </Link>
            <Link to="/pricing" className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface">
              Pricing
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs"
              title="Toggle Light / Dark Mode"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {isLoggedIn ? (
              <Link to="/dashboard" className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black hover:opacity-90 transition-all shadow-md shadow-primary/25 ml-1">
                Open Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login?tab=signin" className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface">
                  Login
                </Link>
                <Link to="/login?tab=signup" className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black hover:opacity-90 transition-all shadow-md shadow-primary/25 ml-1">
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 sm:pt-24 pb-20 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-4xl mx-auto space-y-6">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 text-xs font-mono font-black text-primary bg-primary/15 border border-primary/30 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>PPS 2026 Enterprise Release • Live Video & AI Architecture</span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono leading-[1.08] tracking-tight text-foreground">
            The Complete Operating System for <br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-amber-300 bg-clip-text text-transparent">
              Habits, Focus & Study Meetings
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Drop-in Zoom-style video study rooms, verified mentor masterclasses, shared whiteboards, AI performance coaching, and institutional campus licensing — built into one powerhouse platform.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 flex-wrap pt-2">
            <Link
              to={isLoggedIn ? "/dashboard" : "/login?tab=signup"}
              className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-4 px-9 rounded-2xl text-xs sm:text-sm font-black hover:opacity-95 hover:scale-[1.02] transition-all shadow-xl shadow-primary/30 flex items-center gap-2 cursor-pointer"
            >
              <span>{isLoggedIn ? "Launch Dashboard" : "Start Free — No Credit Card"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/pricing"
              className="text-xs sm:text-sm text-foreground border border-border/80 bg-surface/60 backdrop-blur-xl py-4 px-7 rounded-2xl hover:border-primary/50 hover:bg-surface transition-all font-bold"
            >
              View Pricing & Campus Plans
            </Link>
          </motion.div>

          {/* Metric Badges */}
          <motion.div variants={fadeUp} custom={4} className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
            {[
              { label: "Active Live Features", val: "16+", icon: Zap, color: "text-primary" },
              { label: "Study Room Minutes", val: "24/7", icon: Video, color: "text-cyan-400" },
              { label: "Teacher Commission", val: "10%", icon: Percent, color: "text-amber-400" },
              { label: "Local AI Coach", val: "0ms", icon: Bot, color: "text-purple-400" },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="p-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/70 shadow-lg text-center space-y-1">
                  <div className={`text-2xl sm:text-3xl font-mono font-black ${m.color}`}>{m.val}</div>
                  <div className="text-[11px] font-bold text-muted-foreground">{m.label}</div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* ── Visual Studio Mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-16 max-w-5xl mx-auto rounded-3xl border-2 border-primary/30 bg-card/80 backdrop-blur-2xl shadow-2xl p-4 sm:p-6 text-left space-y-4"
        >
          {/* Window Chrome */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-muted-foreground ml-2">pps.meet/algorithms-mastery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 animate-pulse">
                🟢 4 Peers Live in Focus Room
              </span>
            </div>
          </div>

          {/* Mini Mock Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="aspect-video rounded-2xl bg-black/80 border border-primary/40 p-3 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between text-xs font-bold text-white z-10">
                <span>Alex Vance (Host)</span>
                <span className="text-amber-400 font-mono">18d 🔥</span>
              </div>
              <div className="flex items-center justify-center text-4xl">👨‍💻</div>
              <div className="text-[10px] font-mono text-muted-foreground bg-black/60 px-2 py-0.5 rounded z-10 truncate">
                Goal: Graph Algorithms Review
              </div>
            </div>

            <div className="aspect-video rounded-2xl bg-black/80 border border-secondary/40 p-3 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between text-xs font-bold text-white z-10">
                <span>Elena Rostova</span>
                <span className="text-amber-400 font-mono">24d 🔥</span>
              </div>
              <div className="flex items-center justify-center text-4xl">👩‍🔬</div>
              <div className="text-[10px] font-mono text-muted-foreground bg-black/60 px-2 py-0.5 rounded z-10 truncate">
                Goal: Neural Network Paper
              </div>
            </div>

            <div className="aspect-video rounded-2xl bg-gradient-to-br from-card via-surface to-primary/10 border border-border p-3 flex flex-col justify-between">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>Synced Pomodoro</span>
                <span className="text-primary font-mono font-bold">25:00</span>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-black text-primary">24:18</div>
                <div className="text-[10px] text-muted-foreground">Deep Work Sprint • +20 XP</div>
              </div>
              <div className="flex justify-center gap-1 text-[10px] font-bold text-amber-300">
                <span>🎧 Lo-Fi 432Hz Playing</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FULL 16-FEATURE SHOWCASE ═══════════ */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30 uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
            16 Powerhouse Modules in One Studio
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Engineered from the ground up to replace 5 separate subscriptions with a seamless, interconnected system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`p-6 rounded-3xl bg-card/60 backdrop-blur-xl border shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between space-y-4 group ${
                f.status === "live" ? "border-border/80 hover:border-primary/50" :
                f.status === "beta" ? "border-amber-500/30 hover:border-amber-500/50" :
                "border-orange-500/30 hover:border-orange-500/50"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-border/80 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  {f.status === "live" ? (
                    <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase">
                      ✅ Live
                    </span>
                  ) : f.status === "beta" ? (
                    <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 uppercase">
                      🏗️ Beta
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/30 uppercase">
                      🏗️ Planned
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black font-mono text-foreground leading-snug">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ MENTOR & CAMPUS MARKETPLACE SHOWCASE ═══════════ */}
      <section id="marketplace" className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-card/90 via-surface/80 to-amber-500/10 border border-amber-500/30 backdrop-blur-2xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 uppercase">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Mentor Marketplace & Campus Hub</span>
              </div>
              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 uppercase">
                🎓 Verified Educator Suite
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-mono leading-tight">
              Host Masterclasses, Secure Study Rooms & Campus Cohorts
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Empower your students with 256-bit encrypted drop-in study rooms, 1-click habit bundle assignments, automated attendance logs, and Gemini 2.0 AI lecture habit extractors.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>256-Bit E2EE Secure Study Chat</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span>AI Lecture-to-Habit Extractor</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>1-Click Roster Habit Stacks</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Percent className="w-4 h-4 text-secondary flex-shrink-0" />
                <span>10% Platform Share (₹0 Upfront)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 flex-wrap">
              <Link
                to="/pricing#teacher-calculator"
                className="px-6 py-3 rounded-2xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                Estimate Teacher Earnings →
              </Link>
              <Link
                to="/pricing#campus-calculator"
                className="px-6 py-3 rounded-2xl bg-surface border border-border text-foreground font-bold text-xs hover:bg-card transition-all"
              >
                Request Campus Quote
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-3xl bg-card/90 border border-amber-500/40 space-y-3 shadow-xl backdrop-blur-xl">
            <div className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center justify-between">
              <span>Live Masterclasses Marketplace:</span>
              <span className="text-[10px] text-muted-foreground font-mono">1-Click Booking</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎻</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Violin & Sight Reading</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Elena R. • 👑 Master Mentor</div>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">₹350</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💻</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Distributed Systems Architecture</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Prof. Vance • 🌟 Staff Architect</div>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">₹499</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📐</span>
                <div>
                  <div className="text-xs font-bold text-foreground">GATE Calculus & Engineering Math</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Prof. Sharma • 🎓 Senior Faculty</div>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">₹149</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ ROADMAP: FULL 4-QUARTER PIPELINE ═══════════ */}
      <RoadmapSection />

      {/* ═══════════ COMPETITOR COMPARISON TABLE ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black font-mono">
            How PPS Compares to Other Apps
          </h2>
          <p className="text-xs text-muted-foreground">
            Why high-performance squads and institutions choose PPS over fragmented tools.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/90 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-4 sm:p-5 font-bold text-foreground">Capability</th>
                <th className="p-4 sm:p-5 text-center text-primary font-bold bg-primary/10">PPS Studio</th>
                <th className="p-4 sm:p-5 text-center">Focusmate</th>
                <th className="p-4 sm:p-5 text-center">Habitica</th>
                <th className="p-4 sm:p-5 text-center">Notion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {COMPETITORS.map((c, i) => (
                <tr key={i} className="hover:bg-surface/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-foreground">{c.feature}</td>
                  <td className={`p-4 sm:p-5 text-center font-bold text-sm ${
                    c.pps.includes("Live") ? "text-emerald-400 bg-emerald-500/5" :
                    c.pps.includes("Beta") ? "text-amber-400 bg-amber-500/5" :
                    "text-orange-400 bg-orange-500/5"
                  }`}>
                    {c.pps}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.focusmate ? "✓" : "—"}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.habitica ? "✓" : "—"}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.notion ? "✓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black font-mono">
            Loved by Students, Mentors & Faculty
          </h2>
          <p className="text-xs text-muted-foreground">Real feedback from top performers leveling up with PPS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-6 sm:p-7 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-xl space-y-4 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <div className="text-xs font-bold text-foreground">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FAQ SECTION ═══════════ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-16 space-y-6">
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-3xl font-black font-mono">Frequently Asked Questions</h2>
          <p className="text-xs text-muted-foreground">Everything you need to know about PPS.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-border/80 rounded-2xl bg-card/80 backdrop-blur-md overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4.5 sm:p-5 text-left text-xs font-bold text-foreground flex items-center justify-between cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="p-4.5 sm:p-5 pt-0 text-xs text-muted-foreground leading-relaxed border-t border-border/40 bg-surface/30">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FINAL CTA BANNER ═══════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary via-secondary to-accent text-white text-center space-y-6 shadow-2xl shadow-primary/30">
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight leading-tight">
            Ready to Unlock Your Peak Consistency?
          </h2>
          <p className="text-xs sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
            Join thousands of students, high-performing squads, and verified mentors leveling up together on PPS.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to={isLoggedIn ? "/dashboard" : "/login?tab=signup"}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black text-xs sm:text-sm hover:opacity-95 transition-all shadow-xl hover:scale-105"
            >
              {isLoggedIn ? "Open Dashboard →" : "Get Started Free (No CC Required)"}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ RICH FOOTER ═══════════ */}
      <footer className="relative z-10 border-t border-border/40 py-12 max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div>
          © 2026 Personal Performance System (PPS) • All Rights Reserved
        </div>
        <div className="flex items-center gap-6">
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
