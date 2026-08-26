import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { RoadmapSection } from "@/components/roadmap/RoadmapSection";
import { ambientSynthesizer, AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
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
  VolumeX,
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
  Play,
  Pause,
  RotateCcw,
  Menu,
  X,
  Compass,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";

/* ── 16 Features Architecture ──────────────────────── */
interface FeatureItem {
  icon: string;
  category: "Focus & Sync" | "Intelligence" | "Discipline" | "Analytics";
  title: string;
  desc: string;
  status: "🟢 Live & Ready" | "⚡ WebRTC Beta" | "📋 Verified Pipeline";
}

const FEATURES: FeatureItem[] = [
  { icon: "🎥", category: "Focus & Sync", title: "Focus Rooms & Mesh Video Calls", desc: "Drop-in study rooms with webcam preview, mic controls, real-time STUN signaling, and multi-user grid.", status: "🟢 Live & Ready" },
  { icon: "🎨", category: "Focus & Sync", title: "Collaborative Realtime Whiteboard", desc: "Multi-user HTML5 canvas with real-time coordinate streaming, stroke styles, and PNG export.", status: "🟢 Live & Ready" },
  { icon: "🎧", category: "Focus & Sync", title: "Procedural 432Hz Soundscapes", desc: "0KB offline Web Audio generator with Lo-Fi 432Hz, Soft Rain, Coffee Shop, and Library acoustics.", status: "🟢 Live & Ready" },
  { icon: "🗗", category: "Focus & Sync", title: "Pop-Out Window & PiP Mode", desc: "Open focus meetings in dedicated floating browser windows without losing your habit queue.", status: "🟢 Live & Ready" },
  { icon: "🤖", category: "Intelligence", title: "Dual-Engine AI Performance Coach", desc: "Private coaching powered by Google Gemini cloud or 100% private local Ollama LLMs.", status: "🟢 Live & Ready" },
  { icon: "📑", category: "Intelligence", title: "NLP Lecture to Habit Stack", desc: "Client-side syllabus and lecture extractor with 1-click automatic daily habit installation.", status: "🟢 Live & Ready" },
  { icon: "🔔", category: "Intelligence", title: "Circadian Alarm Studio", desc: "Biological peak energy alarms with custom 432Hz soundscapes, snooze limits, and Web Push.", status: "🟢 Live & Ready" },
  { icon: "⚙️", category: "Intelligence", title: "Habit Architect & Starter Packs", desc: "Categorized priority scheduling, time windows, and instant starter template stacks.", status: "🟢 Live & Ready" },
  { icon: "🔥", category: "Discipline", title: "Streak Engine & Auto-Shields", desc: "Unbroken consistency chains with automated freeze credit protection and milestone rewards.", status: "🟢 Live & Ready" },
  { icon: "🏆", category: "Discipline", title: "Championship Podium Leaderboard", desc: "Cross-user live Supabase synchronization with dynamic ranking and gold trophy celebrations.", status: "🟢 Live & Ready" },
  { icon: "⚔️", category: "Discipline", title: "Co-Op Squad Habit Quests", desc: "Collaborative guild quest milestones with real-time broadcast of squad completion progress.", status: "🟢 Live & Ready" },
  { icon: "🎯", category: "Discipline", title: "Focus Studio & Synced Pomodoro", desc: "25/5 Pomodoro timer with XP multipliers, audio chimes, and session history logging.", status: "🟢 Live & Ready" },
  { icon: "📊", category: "Analytics", title: "Deep Performance Analytics", desc: "Completion rates, habit velocity, category heatmaps, energy correlations, and PDF reports.", status: "🟢 Live & Ready" },
  { icon: "📅", category: "Analytics", title: "Performance Calendar Matrix", desc: "Month grid, week schedule, and agenda view with perfect day trophies and time-window cues.", status: "🟢 Live & Ready" },
  { icon: "📝", category: "Analytics", title: "Daily Guided Reflections Journal", desc: "Structured evening prompts, mood tracking, historical timeline search, and cognitive audit logs.", status: "🟢 Live & Ready" },
  { icon: "🎓", category: "Analytics", title: "Mentor & Classroom Marketplace", desc: "Browse and create cohort classrooms with syllabus habits, live Q&A, and verified mentor badges.", status: "⚡ WebRTC Beta" },
];

/* ── Competitor Comparison ──────────────────────────── */
const COMPETITORS = [
  { feature: "WebRTC Mesh Video Focus Rooms", pps: "✅ Live End-to-End", focusmate: "Limited 1-on-1", habitica: "❌ None", notion: "❌ None" },
  { feature: "Multi-User Real-Time Whiteboard", pps: "✅ Live Broadcast", focusmate: "❌ None", habitica: "❌ None", notion: "❌ None" },
  { feature: "0KB Procedural 432Hz Soundscapes", pps: "✅ Web Audio Built-in", focusmate: "❌ None", habitica: "❌ None", notion: "❌ None" },
  { feature: "Dual AI Coach (Gemini + Local Ollama)", pps: "✅ 100% Private", focusmate: "❌ None", habitica: "❌ None", notion: "Add-on $10/mo" },
  { feature: "Co-Op Squad Quests & Live Podium", pps: "✅ Realtime Sync", focusmate: "❌ None", habitica: "Basic Text", notion: "❌ None" },
  { feature: "Circadian Rhythm Habit Alarms", pps: "✅ Peak Energy Aligned", focusmate: "❌ None", habitica: "❌ None", notion: "❌ None" },
  { feature: "Streak Auto-Shields & Freeze Credits", pps: "✅ Zero Penalty Freeze", focusmate: "❌ None", habitica: "Manual Rest", notion: "❌ None" },
  { feature: "Deep Analytics & PDF Executive Reports", pps: "✅ Comprehensive", focusmate: "❌ None", habitica: "Basic Stats", notion: "Manual Tables" },
  { feature: "100% Free Lifetime Tier Included", pps: "✅ 15 Habits + Rooms", focusmate: "3 sessions/wk", habitica: "Limited", notion: "Limited Free" },
];

/* ── FAQ Items ──────────────────────────────────────── */
const FAQS = [
  { q: "What makes PPS fundamentally different from Zoom, Habitica, or Notion?", a: "PPS is the first unified Personal Performance System combining real-time drop-in focus rooms, synced 25-minute Pomodoros, procedural 432Hz soundscapes, dual-engine AI coaching, and gamified streak auto-shields in one cohesive, offline-capable workspace." },
  { q: "How does the procedural 432Hz Soundscape work without downloading audio files?", a: "PPS uses native Web Audio API oscillators and bandpass biquad filters to synthesize binaural alpha waves (432Hz harmonic tuning), soft rain, coffee shop murmurs, and library ambience directly on your device. Zero lag, zero bandwidth, and works 100% offline." },
  { q: "Can I host focus rooms in a separate window or Picture-in-Picture?", a: "Yes! In 1 click, you can pop out your focus room into a standalone Zoom/Google Meet styled window (`#/meet/:roomId`) or minimize it to a floating Picture-in-Picture widget while checking your habits." },
  { q: "Is the core version free for individual students and creators?", a: "Yes! The Personal Free plan gives you up to 15 active habits, 3 study squads, daily 60m focus rooms, Pomodoro timer, and streak tracking with no credit card required." },
  { q: "How does the dual-engine AI Coach protect my privacy?", a: "You can choose between Google Gemini 2.0 Pro cloud execution for complex reasoning or 100% private local Ollama LLM execution running on your own machine (port 11434). Your private habit notes never leave your computer if you choose local mode." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" } }),
};

export const HomePage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // ── Simulator Tab State ──
  const [activeSimTab, setActiveSimTab] = useState<"pomodoro" | "soundscape" | "ai">("pomodoro");
  const [activePersona, setActivePersona] = useState<"aspirants" | "coders" | "students">("aspirants");

  // ── Simulator 1: Live Interactive Pomodoro & Habit XP State ──
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [demoXP, setDemoXP] = useState(40);
  const [demoStreak, setDemoStreak] = useState(14);
  const [demoHabits, setDemoHabits] = useState([
    { id: 1, name: "Solve 1 LeetCode Hard Challenge 💻", done: false, xp: 10 },
    { id: 2, name: "Morning 2L Hydration & Sunlight 💧", done: true, xp: 10 },
    { id: 3, name: "25-min Deep Focus Reading 📚", done: false, xp: 10 },
  ]);

  useEffect(() => {
    let timer: any = null;
    if (pomoRunning) {
      timer = setInterval(() => {
        setPomoSeconds((prev) => (prev > 0 ? prev - 1 : 25 * 60));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pomoRunning]);

  const handleToggleDemoHabit = (id: number) => {
    setDemoHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const nextDone = !h.done;
          if (nextDone) {
            setDemoXP((x) => x + h.xp);
            setDemoStreak((s) => s + 1);
          } else {
            setDemoXP((x) => Math.max(0, x - h.xp));
            setDemoStreak((s) => Math.max(0, s - 1));
          }
          return { ...h, done: nextDone };
        }
        return h;
      })
    );
  };

  const formatPomoTime = (s: number) => {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm < 10 ? "0" : ""}${mm}:${ss < 10 ? "0" : ""}${ss}`;
  };

  // ── Simulator 2: Live Soundscape State ──
  const [activeSound, setActiveSound] = useState<AmbienceType>("none");
  const [soundVolume, setSoundVolume] = useState(0.4);

  const handleToggleSound = (type: AmbienceType) => {
    if (activeSound === type) {
      ambientSynthesizer.stop();
      setActiveSound("none");
    } else {
      ambientSynthesizer.setVolume(soundVolume);
      ambientSynthesizer.play(type);
      setActiveSound(type);
    }
  };

  useEffect(() => {
    return () => {
      ambientSynthesizer.stop();
    };
  }, []);

  // ── Simulator 3: AI Prompt Generator State ──
  const [aiGoalInput, setAiGoalInput] = useState("Crack FAANG SWE Interview in 6 Months");
  const [aiGeneratedStack, setAiGeneratedStack] = useState<any[]>([
    { name: "2x LeetCode Medium Algorithms (09:00 AM)", category: "Productivity", priority: "High" },
    { name: "System Design Chapter Review (02:00 PM)", category: "Learning", priority: "High" },
    { name: "Mock Peer Coding Session in PPS Studio (07:30 PM)", category: "Focus Sync", priority: "Medium" },
  ]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateAiStack = (customPrompt?: string) => {
    const prompt = customPrompt || aiGoalInput;
    setIsGeneratingAi(true);
    setTimeout(() => {
      if (prompt.toLowerCase().includes("fitness") || prompt.toLowerCase().includes("run")) {
        setAiGeneratedStack([
          { name: "5km Zone-2 Aerobic Run (06:30 AM)", category: "Fitness", priority: "High" },
          { name: "100g Protein & Hydration Intake (12:30 PM)", category: "Health", priority: "High" },
          { name: "15-Min Mobility & Foam Rolling (09:00 PM)", category: "Recovery", priority: "Medium" },
        ]);
      } else if (prompt.toLowerCase().includes("study") || prompt.toLowerCase().includes("exam") || prompt.toLowerCase().includes("research")) {
        setAiGeneratedStack([
          { name: "3x 25m Pomodoro Lecture Synthesis (08:30 AM)", category: "Learning", priority: "High" },
          { name: "Anki Flashcards Active Recall (01:30 PM)", category: "Retention", priority: "High" },
          { name: "Daily Research Synthesis Notes (08:00 PM)", category: "Reflection", priority: "Medium" },
        ]);
      } else {
        setAiGeneratedStack([
          { name: "2x LeetCode Medium Algorithms (09:00 AM)", category: "Productivity", priority: "High" },
          { name: "System Design Chapter Review (02:00 PM)", category: "Learning", priority: "High" },
          { name: "Mock Peer Coding Session in PPS Studio (07:30 PM)", category: "Focus Sync", priority: "Medium" },
        ]);
      }
      setIsGeneratingAi(false);
    }, 450);
  };

  // ── Innovation 2: Circadian Rhythm Calculator State ──
  const [wakeHour, setWakeHour] = useState(7); // 07:00 AM default
  const peakCognitiveStart = (wakeHour + 2) % 24;
  const peakCognitiveEnd = (wakeHour + 5) % 24;
  const physicalPeakStart = (wakeHour + 9) % 24;
  const physicalPeakEnd = (wakeHour + 11) % 24;
  const memoryWinddownStart = (wakeHour + 14) % 24;

  const formatHour12 = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:00 ${ampm}`;
  };

  // ── Innovation 3: 1.01^365 Compounding Calculator State ──
  const [consistencyDays, setConsistencyDays] = useState(180);
  const compoundMultiplier = Math.pow(1.01, consistencyDays).toFixed(2);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-white transition-colors duration-500">
      {/* 🌌 Animated 3D Moving Background */}
      <ThreeDBackground />

      {/* 📊 Top Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* ═══════════ NAVBAR ═══════════ */}

      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-card/85 border-b border-border/50 transition-colors duration-500 shadow-xs">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-xl font-black text-primary tracking-wider group">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse group-hover:scale-125 transition-transform" />
            <span>PPS<span className="text-secondary">.</span></span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1.5 font-medium text-xs">
            <button
              onClick={() => document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              ⚡ Live Simulator
            </button>
            <button
              onClick={() => document.getElementById("circadian")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              ☀️ Circadian Engine
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              Architecture
            </button>
            <Link
              to="/marketplace"
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface"
            >
              Mentors & Classes
            </Link>
            <Link
              to="/roadmap"
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface"
            >
              Roadmap 🚀
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface">
              Pricing
            </Link>
          </div>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs"
              title="Toggle Light / Dark Mode"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {isLoggedIn ? (
              <Link to="/dashboard" className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20">
                Dashboard →
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login?tab=signin" className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface font-semibold">
                  Sign In
                </Link>
                <Link to="/login?tab=signup" className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black hover:opacity-90 transition-all shadow-md shadow-primary/20">
                  Start Free
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden px-6 py-4 bg-card/95 border-b border-border/60 backdrop-blur-2xl space-y-2.5 text-xs font-semibold"
            >
              <button
                onClick={() => { setMobileMenuOpen(false); document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" }); }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                ⚡ Live Interactive Simulator
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); document.getElementById("circadian")?.scrollIntoView({ behavior: "smooth" }); }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                ☀️ Circadian Flow Engine
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                🛠️ 16 Architecture Capabilities
              </button>
              <Link to="/marketplace" onClick={() => setMobileMenuOpen(false)} className="block p-2.5 rounded-xl hover:bg-surface text-foreground">
                🎓 Mentors & Classes
              </Link>
              <Link to="/roadmap" onClick={() => setMobileMenuOpen(false)} className="block p-2.5 rounded-xl hover:bg-surface text-foreground">
                🚀 Full 4-Quarter Roadmap
              </Link>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="block p-2.5 rounded-xl hover:bg-surface text-foreground">
                💳 Pricing & Plans
              </Link>
              <div className="pt-2 border-t border-border/50 flex gap-2">
                <Link to="/login?tab=signup" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 rounded-xl bg-primary text-primary-foreground font-black">
                  Start Free (No CC)
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 sm:pt-20 pb-16 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-black text-primary bg-primary/15 border border-primary/30 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Multiplayer Discipline & Focus Architecture • 100% Real Live Sync</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono leading-[1.08] tracking-tight text-foreground">
            Stop Studying Alone. <br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-amber-300 bg-clip-text text-transparent">
              Build Relentless Focus With Your Squad.
            </span>
          </h1>

          <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            The all-in-one discipline operating system combining live drop-in video focus rooms, synced Pomodoro sprints, procedural 432Hz soundscapes, and gamified Kaizen habit streaks.
          </p>

          <div className="flex items-center justify-center gap-3.5 flex-wrap pt-2">
            <Link
              to={isLoggedIn ? "/dashboard" : "/login?tab=signup"}
              className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-3.5 px-8 rounded-2xl text-xs sm:text-sm font-black hover:opacity-95 hover:scale-[1.02] transition-all shadow-xl shadow-primary/25 flex items-center gap-2 cursor-pointer"
            >
              <span>{isLoggedIn ? "Launch Your Dashboard →" : "🚀 Start Free Study Sprint"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" })}
              className="text-xs sm:text-sm text-foreground border border-border/80 bg-surface/70 backdrop-blur-xl py-3.5 px-6 rounded-2xl hover:border-primary/50 hover:bg-surface transition-all font-bold cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡ Try Live Interactive Demo</span>
            </button>
          </div>

          {/* Trust Badges Bar */}
          <div className="flex items-center justify-center gap-3 flex-wrap text-[11px] font-mono text-muted-foreground pt-1">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">✓ 100% Free Forever Tier</span>
            <span className="text-border">•</span>
            <span>✓ No Credit Card Required</span>
            <span className="text-border">•</span>
            <span>✓ Zero Fake Bots</span>
            <span className="text-border">•</span>
            <span>✓ Works on Phone & Laptop</span>
          </div>


          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-8 max-w-3xl mx-auto">
            {[
              { label: "Active Live Features", val: "16+", icon: Zap, color: "text-primary" },
              { label: "Mesh Focus Rooms", val: "24/7", icon: Video, color: "text-cyan-400" },
              { label: "Procedural Audio", val: "0 KB", icon: Volume2, color: "text-amber-400" },
              { label: "Local AI Coach", val: "0 ms", icon: Bot, color: "text-purple-400" },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="p-3.5 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/70 shadow-md text-center space-y-0.5">
                  <div className={`text-2xl sm:text-3xl font-mono font-black ${m.color}`}>{m.val}</div>
                  <div className="text-[11px] font-bold text-muted-foreground">{m.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══════════ INNOVATION 1: LIVE INTERACTIVE SIMULATOR ═══════════ */}
        <div id="simulator" className="mt-16 max-w-5xl mx-auto rounded-3xl border-2 border-primary/40 bg-card/90 backdrop-blur-2xl shadow-2xl p-5 sm:p-7 text-left space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                ⚡ PPS Live Engine Sandbox — Test Right in Your Browser!
              </span>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveSimTab("pomodoro")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSimTab === "pomodoro" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ⏱️ Pomodoro & XP
              </button>
              <button
                onClick={() => setActiveSimTab("soundscape")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSimTab === "soundscape" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎧 432Hz Audio
              </button>
              <button
                onClick={() => setActiveSimTab("ai")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSimTab === "ai" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🤖 AI Architect
              </button>
            </div>
          </div>

          {/* SIMULATOR TAB 1: Pomodoro & Interactive Checkoff */}
          {activeSimTab === "pomodoro" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Timer Block */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Synced Study Sprint</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    🟢 Live Mesh Active
                  </span>
                </div>
                <div className="text-center my-auto py-3">
                  <div className="text-5xl sm:text-6xl font-mono font-black text-primary tracking-tight">
                    {formatPomoTime(pomoSeconds)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">25-minute deep focus cycle</div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPomoRunning(!pomoRunning)}
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {pomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{pomoRunning ? "Pause Sprint" : "Start Sprint"}</span>
                  </button>
                  <button
                    onClick={() => { setPomoRunning(false); setPomoSeconds(25 * 60); }}
                    className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Habit Checkoff Block */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Interactive Checkoff</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    XP: <strong className="text-foreground font-black">{demoXP} XP</strong> | 🔥 {demoStreak} Days
                  </span>
                </div>

                {/* Habit Checklist */}
                <div className="space-y-2">
                  {demoHabits.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleToggleDemoHabit(h.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs font-semibold ${
                        h.done
                          ? "bg-primary/10 border-primary/40 text-muted-foreground line-through"
                          : "bg-card border-border/80 hover:border-primary/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={h.done}
                          onChange={() => {}}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                        <span>{h.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${h.done ? "text-pps-green bg-pps-green/10" : "text-primary bg-primary/10"}`}>
                        {h.done ? "+10 XP Earned" : "+10 XP"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-muted-foreground text-center font-mono">
                  💡 Click any habit above to test live XP rewards and streak calculation!
                </div>
              </div>
            </motion.div>
          )}

          {/* SIMULATOR TAB 2: Procedural 432Hz Soundscape Player */}
          {activeSimTab === "soundscape" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">0KB Procedural Soundscapes (Native Web Audio)</h4>
                  <p className="text-xs text-muted-foreground">Click any acoustic preset below to hear real live synthesized audio in your headphones.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setSoundVolume(v);
                      ambientSynthesizer.setVolume(v);
                    }}
                    className="accent-primary w-24 cursor-pointer"
                  />
                </div>
              </div>

              {/* Soundscape Preset Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { type: "lofi" as AmbienceType, label: "432Hz Alpha Waves", icon: "🎧", desc: "Binaural flow state" },
                  { type: "rain" as AmbienceType, label: "Gentle Rain", icon: "🌧️", desc: "Calming pink noise" },
                  { type: "coffee" as AmbienceType, label: "Cozy Coffee Shop", icon: "☕", desc: "Soft ambient chatter" },
                  { type: "library" as AmbienceType, label: "Deep Library", icon: "📚", desc: "Quiet study murmur" },
                ].map((s) => (
                  <button
                    key={s.type}
                    onClick={() => handleToggleSound(s.type)}
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer shadow-xs ${
                      activeSound === s.type
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                        : "bg-card border-border/80 hover:border-primary/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{s.icon}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${activeSound === s.type ? "bg-white/20 text-white" : "bg-surface text-muted-foreground"}`}>
                        {activeSound === s.type ? "Playing 🔊" : "Ready"}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold">{s.label}</div>
                      <div className={`text-[10px] ${activeSound === s.type ? "text-white/80" : "text-muted-foreground"}`}>{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {activeSound !== "none" && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary font-mono">
                  <span>🎵 Procedural audio active: Synthesizing real-time Web Audio oscillators on your CPU.</span>
                  <button onClick={() => handleToggleSound("none")} className="underline font-bold cursor-pointer">Stop Audio</button>
                </div>
              )}
            </motion.div>
          )}

          {/* SIMULATOR TAB 3: AI Habit Architect Prompt Generator */}
          {activeSimTab === "ai" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={aiGoalInput}
                  onChange={(e) => setAiGoalInput(e.target.value)}
                  placeholder="Enter any ambitious goal (e.g. Master React, Run a Marathon)..."
                  className="flex-1 bg-card border border-border px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-primary font-medium"
                />
                <button
                  onClick={() => handleGenerateAiStack()}
                  disabled={isGeneratingAi}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingAi ? "Generating..." : "Generate Habit Stack"}</span>
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-muted-foreground font-mono">Quick Prompts:</span>
                {[
                  "Crack FAANG SWE Interview in 6 Months",
                  "Prepare for Graduate Research Defense",
                  "Run a Half-Marathon & Peak Energy",
                ].map((qp) => (
                  <button
                    key={qp}
                    onClick={() => { setAiGoalInput(qp); handleGenerateAiStack(qp); }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer font-medium"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Generated Stack Display */}
              <div className="p-4 rounded-xl bg-card border border-primary/20 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-primary tracking-wider">
                  ⚡ Client-Side NLP Synthesized Routine:
                </div>
                <div className="space-y-1.5">
                  {aiGeneratedStack.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-surface/70 border border-border/70 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{s.name}</span>
                      <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                        {s.category} • {s.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ═══════════ INNOVATION 2: CIRCADIAN RHYTHM FLOW ENGINE ═══════════ */}
      <section id="circadian" className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-card via-surface/60 to-primary/10 border border-border/80 shadow-2xl space-y-8">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-black uppercase">
              <Sunrise className="w-3.5 h-3.5" />
              <span>Chronobiology & Peak Focus Alignment</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-mono">
              PPS Circadian Flow Engine
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Habits fail when scheduled against your biology. PPS aligns your hardest tasks with your natural cortisol and dopamine peak windows.
            </p>
          </div>

          {/* Interactive Wake Time Dial Slider */}
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-surface/80 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⏰</span>
              <div>
                <div className="text-xs font-bold text-foreground">Select Your Natural Wake Time:</div>
                <div className="text-sm font-mono font-black text-primary">{formatHour12(wakeHour)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-60">
              <input
                type="range"
                min="5"
                max="10"
                step="1"
                value={wakeHour}
                onChange={(e) => setWakeHour(parseInt(e.target.value))}
                className="accent-primary w-full cursor-pointer"
              />
            </div>
          </div>

          {/* 3 Biological Windows Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-surface/80 border border-primary/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🧠</span>
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Cortisol Peak
                </span>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase font-bold">Deep Work Window</div>
                <div className="text-lg font-mono font-black text-primary mt-0.5">
                  {formatHour12(peakCognitiveStart)} – {formatHour12(peakCognitiveEnd)}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Maximum working memory capacity. Best for complex programming, mathematics, and Focus Room sprints.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface/80 border border-amber-500/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">⚡</span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Body Temp Peak
                </span>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase font-bold">Physical & Creative Peak</div>
                <div className="text-lg font-mono font-black text-amber-400 mt-0.5">
                  {formatHour12(physicalPeakStart)} – {formatHour12(physicalPeakEnd)}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Highest core temperature & reaction speed. Ideal for workouts, presentations, and creative whiteboard design.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface/80 border border-secondary/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🌙</span>
                <span className="text-[10px] font-mono font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                  Melatonin Ramping
                </span>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase font-bold">Memory Consolidation</div>
                <div className="text-lg font-mono font-black text-secondary mt-0.5">
                  {formatHour12(memoryWinddownStart)} onwards
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Evening reflections journal, next-day queue planning, and 432Hz wind-down soundscapes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ INNOVATION 3: COMPOUNDING CONSISTENCY MULTIPLIER ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="p-8 sm:p-10 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-lg">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>The Mathematics of 1% Daily Compounding</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black font-mono">
              Consistency Multiplies Output by <span className="text-primary">{compoundMultiplier}x</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Drag the timeline below to see how unbroken streak chains and auto-freeze protection transform daily micro-habits into exponential mastery over a full year.
            </p>
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-muted-foreground">Streak Length:</span>
                <strong className="text-primary font-bold">{consistencyDays} Days Unbroken</strong>
              </div>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={consistencyDays}
                onChange={(e) => setConsistencyDays(parseInt(e.target.value))}
                className="accent-primary w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Achievement Ranks Unlocked Showcase */}
          <div className="w-full lg:w-96 space-y-3">
            <div className="p-4 rounded-2xl bg-surface/80 border border-primary/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👑</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Projected Performance Output</div>
                  <div className="text-xl font-mono font-black text-primary">+{Math.round((parseFloat(compoundMultiplier) - 1) * 100)}% Growth</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-primary text-primary-foreground">
                {consistencyDays >= 300 ? "Legend" : consistencyDays >= 150 ? "Master" : consistencyDays >= 60 ? "Warrior" : "Apprentice"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 text-xs text-muted-foreground font-mono space-y-1">
              <div>🛡️ Auto-Freeze Shields Earned: <strong>{Math.floor(consistencyDays / 14)} Freezes</strong></div>
              <div>🏅 Unlocked Trophy Badges: <strong>{consistencyDays >= 100 ? "10/10" : consistencyDays >= 30 ? "6/10" : "3/10"} Badges</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FULL 16-FEATURE SHOWCASE ═══════════ */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30 uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
            16 Specialized Productivity Engines Built-In
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Every feature in PPS is an engineered execution layer designed to eliminate context switching, protect focus, and track compounding personal growth.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="group relative p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-surface border border-border/80 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="text-[9.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border/60 text-muted-foreground font-semibold">
                    {feat.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </div>
              <div className="text-[10px] font-mono text-primary font-bold pt-2 border-t border-border/40 flex items-center justify-between">
                <span>{feat.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ MENTOR & EDUCATOR MARKETPLACE BANNER ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-amber-500/10 via-card to-primary/10 border border-border/80 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mentor Marketplace & Educator Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-mono leading-tight">
              Learn Directly from Verified Mentors & Educators
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Book seats in live interactive workshops, join cohort focus rooms, and automatically transform lecture notes into actionable daily habit queues with our AI engine.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/marketplace"
                className="px-5 py-2.5 rounded-2xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all shadow-md"
              >
                Browse Marketplace →
              </Link>
              <Link
                to="/pricing"
                className="px-4 py-2.5 rounded-2xl bg-surface border border-border/80 text-foreground hover:border-primary/40 font-bold text-xs transition-all"
              >
                Host as Mentor
              </Link>
            </div>
          </div>

          {/* Clean Capability Showcase Cards */}
          <div className="w-full lg:w-96 space-y-3">
            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Interactive Masterclasses</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Live Screen Sharing & Q&A</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Live</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="text-xs font-bold text-foreground">AI Lecture to Habit Stack</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Automatic Syllabus Extractor</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">NLP</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-xs font-bold text-foreground">Attendance & Study Analytics</div>
                  <div className="text-[10px] text-muted-foreground font-mono">1-Click CSV Export for Teachers</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">CSV</span>
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
                  <td className="p-4 sm:p-5 text-center font-bold text-xs text-emerald-400 bg-emerald-500/5">
                    {c.pps}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.focusmate}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.habitica}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.notion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════ TARGET PERSONAS & WORKFLOWS (INTERACTIVE) ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-black uppercase">
            <span>🎯 Tailored For Your Exact Journey</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
            How Top Achievers Use PPS
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Select your discipline path below to see how PPS organizes daily study rituals, focus sprints, and accountability.
          </p>

          {/* Persona Tab Switcher */}
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {[
              { id: "aspirants" as const, label: "🎯 Exam Aspirants (JEE/UPSC/GATE)", icon: "🎓" },
              { id: "coders" as const, label: "💻 Software Engineers & Coders", icon: "👨‍💻" },
              { id: "students" as const, label: "📚 University & Research Cohorts", icon: "👩‍🎓" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePersona(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                  activePersona === tab.id
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Persona Preview Card */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-card border border-border/80 p-6 sm:p-8 shadow-2xl space-y-6">
          {activePersona === "aspirants" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase">
                  <span>⚡ 8+ Hours Daily Consistency Without Burnout</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  Competitive Exam & Board Sprint Routine
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  "Studying 8+ hours a day alone in a room used to lead to motivation crashes by week 3. With PPS, our 4-person study squad joins the <strong>8:00 AM Focus Room</strong> every morning. The synced 25m Pomodoros and streak shields keep our entire batch relentlessly on track."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
                    👨‍🎓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Rohan K.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">AIR 342 Aspirant · Daily Squad Lead</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/70 space-y-2.5">
                <div className="text-xs font-mono font-bold uppercase text-primary">Daily Habit Stack:</div>
                {[
                  { name: "3h High-Yield Revision", time: "08:00 AM", xp: "+10 XP" },
                  { name: "Daily Mock Test Synthesis", time: "02:00 PM", xp: "+10 XP" },
                  { name: "Formula Active Recall", time: "07:30 PM", xp: "+10 XP" },
                  { name: "Evening Reflection Journal", time: "09:45 PM", xp: "+10 XP" },
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs font-semibold">
                    <span className="truncate max-w-[150px]">{item.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activePersona === "coders" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase">
                  <span>💻 Unbroken LeetCode & Architecture Sprints</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  Developer & Software Engineer Workflow
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  "Maintaining daily LeetCode and side-project momentum while working a full-time schedule is hard. The <strong>0KB 432Hz procedural soundscapes</strong> and auto-freeze shields gave me the exact flow-state buffer I needed to complete 90 days of deep coding."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xl">
                    👨‍💻
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Alex V.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">Software Engineer · Beta Benchmark User</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/70 space-y-2.5">
                <div className="text-xs font-mono font-bold uppercase text-primary">Daily Developer Stack:</div>
                {[
                  { name: "2x LeetCode Medium/Hard", time: "07:30 AM", xp: "+10 XP" },
                  { name: "90m Deep Build Block", time: "06:00 PM", xp: "+10 XP" },
                  { name: "System Design Review", time: "08:30 PM", xp: "+10 XP" },
                  { name: "Commit & Sync Daily Vault", time: "10:00 PM", xp: "+10 XP" },
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs font-semibold">
                    <span className="truncate max-w-[150px]">{item.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activePersona === "students" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20 uppercase">
                  <span>📚 Collaborative Whiteboards & Study Circles</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  University Cohorts & Research Groups
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  "During final project weeks, our research group pops out the <strong>Meeting Studio window</strong>, sketches architecture diagrams on the real-time whiteboard, and uses the NLP lecture parser to convert syllabus topics directly into our shared daily habit queue."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center text-xl">
                    👩‍🎓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Priya R.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">Graduate Researcher · Early Adopter</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/70 space-y-2.5">
                <div className="text-xs font-mono font-bold uppercase text-primary">Daily Research Stack:</div>
                {[
                  { name: "Literature Review Synthesis", time: "09:00 AM", xp: "+10 XP" },
                  { name: "Squad Whiteboard Sync", time: "03:00 PM", xp: "+10 XP" },
                  { name: "Data Analysis Sprint", time: "05:30 PM", xp: "+10 XP" },
                  { name: "Daily Journal Audit", time: "09:00 PM", xp: "+10 XP" },
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs font-semibold">
                    <span className="truncate max-w-[150px]">{item.name}</span>
                    <span className="text-[10px] font-mono text-purple-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
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

      {/* 🚀 Floating Scroll to Top with Circular Progress Indicator */}
      <ScrollToTop />
    </div>
  );
};


export default HomePage;
