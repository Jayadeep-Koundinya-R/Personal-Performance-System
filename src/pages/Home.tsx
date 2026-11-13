import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { ambientSynthesizer, AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { BrandLogo } from "@/components/BrandLogo";
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
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  TrendingUp,
  Award,
  CreditCard,
  Play,
  Pause,
  RotateCcw,
  Menu,
  X,
  Sunrise,
  Sun,
  Moon,
  Headphones,
  Coffee,
  CloudRain,
  Brain,
  Activity,
  Check,
  Minus,
  Sliders,
  FileText,
  Target,
  Monitor,
  Mic,
  Maximize2,
  Lock,
} from "lucide-react";

/* ── 16 Features Architecture Definition ──────────────── */
interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  category: "Focus & Sync" | "Intelligence" | "Discipline" | "Analytics";
  title: string;
  desc: string;
  status: "Live & Ready" | "WebRTC Beta" | "Verified";
  isHero?: boolean;
}

const ALL_FEATURES: FeatureItem[] = [
  {
    icon: Video,
    category: "Focus & Sync",
    title: "Mesh Video Focus Rooms",
    desc: "Drop-in study rooms with camera/mic controls, low-latency signaling, and multi-user grid.",
    status: "Live & Ready",
    isHero: true,
  },
  {
    icon: Headphones,
    category: "Focus & Sync",
    title: "0KB Procedural 432Hz Soundscapes",
    desc: "Synthesized Web Audio generator with Lo-Fi 432Hz, Soft Rain, Coffee Shop, and Library acoustics.",
    status: "Live & Ready",
    isHero: true,
  },
  {
    icon: Bot,
    category: "Intelligence",
    title: "Dual-Engine AI Performance Coach",
    desc: "Intelligent coaching powered by cloud reasoning or 100% private local Ollama LLMs.",
    status: "Live & Ready",
    isHero: true,
  },
  {
    icon: Flame,
    category: "Discipline",
    title: "Kaizen Streak Engine & Auto-Shields",
    desc: "Unbroken consistency chains with automated freeze credit protection and milestone rewards.",
    status: "Live & Ready",
    isHero: true,
  },
  {
    icon: Trophy,
    category: "Discipline",
    title: "Championship Live Leaderboard",
    desc: "Real-time synchronization with dynamic XP ranking, weekly podiums, and milestone badges.",
    status: "Live & Ready",
    isHero: true,
  },
  {
    icon: BarChart3,
    category: "Analytics",
    title: "Deep Performance Analytics",
    desc: "Completion rates, habit velocity, category heatmaps, energy correlations, and PDF exports.",
    status: "Live & Ready",
    isHero: true,
  },
  {
    icon: PenTool,
    category: "Focus & Sync",
    title: "Collaborative Realtime Whiteboard",
    desc: "Multi-user canvas with real-time coordinate streaming, stroke styles, and instant PNG export.",
    status: "Live & Ready",
  },
  {
    icon: Maximize2,
    category: "Focus & Sync",
    title: "Pop-Out Window & PiP Mode",
    desc: "Open focus meetings in dedicated floating browser windows without losing your active habit queue.",
    status: "Live & Ready",
  },
  {
    icon: FileText,
    category: "Intelligence",
    title: "NLP Lecture to Habit Stack",
    desc: "Client-side syllabus and lecture extractor with 1-click automatic daily routine installation.",
    status: "Live & Ready",
  },
  {
    icon: Clock,
    category: "Intelligence",
    title: "Circadian Rhythm Habit Alarms",
    desc: "Biological peak energy alarms with custom 432Hz soundscapes, snooze limits, and Web Push.",
    status: "Live & Ready",
  },
  {
    icon: Sliders,
    category: "Intelligence",
    title: "Habit Architect & Starter Packs",
    desc: "Categorized priority scheduling, time windows, and instant starter template stacks.",
    status: "Live & Ready",
  },
  {
    icon: Users,
    category: "Discipline",
    title: "Co-Op Squad Habit Quests",
    desc: "Collaborative guild quest milestones with real-time broadcast of squad completion progress.",
    status: "Live & Ready",
  },
  {
    icon: Target,
    category: "Discipline",
    title: "Focus Studio & Synced Pomodoro",
    desc: "Synchronized 25/5 Pomodoro timers with XP multipliers, audio chimes, and session history.",
    status: "Live & Ready",
  },
  {
    icon: Calendar,
    category: "Analytics",
    title: "Performance Calendar Matrix",
    desc: "Month grid, week schedule, and agenda view with perfect day trophies and time-window cues.",
    status: "Live & Ready",
  },
  {
    icon: BookOpen,
    category: "Analytics",
    title: "Daily Guided Reflections Journal",
    desc: "Structured evening prompts, mood tracking, historical timeline search, and cognitive audit logs.",
    status: "Live & Ready",
  },
  {
    icon: GraduationCap,
    category: "Analytics",
    title: "Mentor & Classroom Marketplace",
    desc: "Browse and create cohort classrooms with syllabus habits, live Q&A, and verified mentor badges.",
    status: "WebRTC Beta",
  },
];

/* ── Competitor Comparison Matrix ─────────────────────── */
const COMPETITOR_ROWS = [
  {
    feature: "Low-Latency Mesh Video Focus Rooms",
    pps: "Included (Unlimited)",
    focusmate: "Limited to 3/wk free",
    habitica: "Not Available",
    notion: "Not Available",
  },
  {
    feature: "Multi-User Real-Time Whiteboard",
    pps: "Built-In Broadcast",
    focusmate: "Not Available",
    habitica: "Not Available",
    notion: "Not Available",
  },
  {
    feature: "0KB Procedural 432Hz Soundscapes",
    pps: "Zero Download (Offline)",
    focusmate: "Not Available",
    habitica: "Not Available",
    notion: "Not Available",
  },
  {
    feature: "Dual AI Coach (Cloud + Local Ollama)",
    pps: "100% Private Option",
    focusmate: "Not Available",
    habitica: "Not Available",
    notion: "$10/mo Add-on",
  },
  {
    feature: "Co-Op Squad Quests & Live Podium",
    pps: "Live Realtime Sync",
    focusmate: "Not Available",
    habitica: "Basic Text Guilds",
    notion: "Not Available",
  },
  {
    feature: "Circadian Rhythm Habit Scheduling",
    pps: "Peak Energy Aligned",
    focusmate: "Not Available",
    habitica: "Not Available",
    notion: "Not Available",
  },
  {
    feature: "Streak Auto-Shields & Freeze Credits",
    pps: "Zero-Penalty Protection",
    focusmate: "Not Available",
    habitica: "Manual Inn Pause",
    notion: "Not Available",
  },
  {
    feature: "Deep Analytics & PDF Executive Reports",
    pps: "1-Click Full Export",
    focusmate: "Not Available",
    habitica: "Basic Stats",
    notion: "Manual Formulas",
  },
  {
    feature: "100% Free Lifetime Tier Included",
    pps: "Up to 15 Habits + Rooms",
    focusmate: "3 sessions/wk cap",
    habitica: "Limited Free",
    notion: "Limited Free Blocks",
  },
];

/* ── FAQ Items ────────────────────────────────────────── */
const FAQS = [
  {
    q: "What makes PPS fundamentally different from Zoom, Habitica, or Notion?",
    a: "PPS is the first unified Personal Performance System combining real-time drop-in focus rooms, synced 25-minute Pomodoros, procedural 432Hz soundscapes, dual-engine AI coaching, and gamified streak auto-shields in one cohesive, offline-capable workspace.",
  },
  {
    q: "How does the procedural 432Hz Soundscape work without downloading audio files?",
    a: "PPS uses native Web Audio API oscillators and bandpass biquad filters to synthesize binaural alpha waves (432Hz harmonic tuning), soft rain, coffee shop murmurs, and library ambience directly on your device CPU. Zero lag, zero bandwidth, and works 100% offline.",
  },
  {
    q: "Can I host focus rooms in a separate window or Picture-in-Picture?",
    a: "Yes. In 1 click, you can pop out your focus room into a standalone Zoom/Google Meet styled window or minimize it to a floating Picture-in-Picture widget while navigating your habits.",
  },
  {
    q: "Is the core version free for individual students and creators?",
    a: "Yes. The Personal Free plan gives you up to 15 active habits, 3 study squads, daily 60m focus rooms, Pomodoro timer, and streak tracking with no credit card required.",
  },
  {
    q: "How does the dual-engine AI Coach protect my privacy?",
    a: "You can choose between Google Gemini cloud execution for complex reasoning or 100% private local Ollama LLM execution running on your own machine. Your habit notes and personal goals never leave your computer if you choose local mode.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

export const HomePage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const { user, isLoggedIn } = useAuth();
  const hasActiveAccount = isLoggedIn && !user?.isGuest;
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
    { id: 1, name: "Solve 1 Algorithm Challenge", done: false, xp: 10 },
    { id: 2, name: "Morning 2L Hydration & Sunlight", done: true, xp: 10 },
    { id: 3, name: "25-min Deep Focus Reading", done: false, xp: 10 },
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

  // ── Circadian Rhythm Calculator State ──
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

  // ── 1.01^365 Compounding Calculator State ──
  const [consistencyDays, setConsistencyDays] = useState(180);
  const compoundMultiplier = Math.pow(1.01, consistencyDays).toFixed(2);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-white transition-colors duration-500">
      {/* 🌌 Ambient 3D Dynamic Background */}
      <ThreeDBackground />

      {/* 📊 Top Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-card/85 border-b border-border/50 transition-colors duration-500 shadow-xs">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <Link to="/" className="group flex items-center">
            <BrandLogo size="md" variant="square" animated />
          </Link>

          {/* Desktop Nav Links (Clean, No Emojis) */}
          <div className="hidden lg:flex items-center gap-1 font-medium text-xs">
            <button
              onClick={() => document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              Showcase
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              Capabilities
            </button>
            <button
              onClick={() => document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              Live Demo
            </button>
            <button
              onClick={() => document.getElementById("personas")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              Personas
            </button>
            <button
              onClick={() => document.getElementById("science")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface cursor-pointer"
            >
              Science
            </button>
            <Link
              to="/marketplace"
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface"
            >
              Mentors & Classes
            </Link>
            <Link
              to="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-surface"
            >
              Pricing
            </Link>
          </div>

          {/* Action CTAs & SVG Theme Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              title="Toggle Light / Dark Mode"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
            </button>

            {hasActiveAccount ? (
              <Link
                to="/dashboard"
                className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/login?tab=signin"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-surface font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?tab=signup"
                  className="text-xs bg-primary text-primary-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20 whitespace-nowrap"
                >
                  Start Free
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              aria-label="Toggle mobile menu"
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
              className="lg:hidden px-6 py-4 bg-card/95 border-b border-border/60 backdrop-blur-2xl space-y-2 text-xs font-semibold"
            >
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                Product Showcase
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                16 Architecture Capabilities
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                Live Interactive Sandbox
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("personas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                For Your Discipline
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("science")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                Science & Circadian Engine
              </button>
              <Link
                to="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="block p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                Mentors & Classrooms
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block p-2.5 rounded-xl hover:bg-surface text-foreground"
              >
                Pricing & Plans
              </Link>
              <div className="pt-2 border-t border-border/50 flex gap-2">
                {hasActiveAccount ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl bg-primary text-primary-foreground font-bold"
                  >
                    Open Dashboard →
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login?tab=signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-xl bg-surface border border-border/80 text-foreground font-semibold"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/login?tab=signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-xl bg-primary text-primary-foreground font-bold"
                    >
                      Start Free
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 sm:pt-20 pb-12 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/25 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Multiplayer Discipline & Real-Time Focus Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono leading-[1.08] tracking-tight text-foreground">
            Stop Studying Alone. <br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-amber-400 bg-clip-text text-transparent">
              Build Relentless Focus With Your Squad.
            </span>
          </h1>

          <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            The all-in-one personal performance system combining live drop-in video focus rooms, synchronized Pomodoro sprints, procedural 432Hz soundscapes, and gamified Kaizen habit streaks.
          </p>

          <div className="flex items-center justify-center gap-3.5 flex-wrap pt-2">
            <Link
              to={hasActiveAccount ? "/dashboard" : "/login?tab=signup"}
              className="bg-primary text-primary-foreground py-3.5 px-8 rounded-2xl text-xs sm:text-sm font-bold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 flex items-center gap-2 cursor-pointer"
            >
              <span>{hasActiveAccount ? "Launch Dashboard" : "Start Free Study Sprint"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" })}
              className="text-xs sm:text-sm text-foreground border border-border/80 bg-surface/70 backdrop-blur-xl py-3.5 px-6 rounded-2xl hover:border-primary/50 hover:bg-surface transition-all font-semibold cursor-pointer flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              <span>Try Live Interactive Demo</span>
            </button>
          </div>

          {/* Clean Verified Trust Badges */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap text-xs text-muted-foreground pt-3 font-medium">
            <span className="flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>100% Free Forever Tier</span>
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>No Credit Card Required</span>
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Real-Time Multi-Device Sync</span>
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Zero Fake Bots</span>
            </span>
          </div>

          {/* Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-8 max-w-3xl mx-auto">
            {[
              { label: "Engineered Capabilities", val: "16+", icon: Layers, color: "text-primary" },
              { label: "Drop-In Focus Rooms", val: "24/7", icon: Video, color: "text-cyan-400" },
              { label: "Procedural Soundscapes", val: "0 KB", icon: Headphones, color: "text-amber-400" },
              { label: "Local AI Coach Privacy", val: "100%", icon: ShieldCheck, color: "text-purple-400" },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="p-3.5 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/70 shadow-xs text-center space-y-1">
                  <div className="flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <span className={`text-2xl sm:text-3xl font-mono font-black ${m.color}`}>{m.val}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">{m.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ═══════════ PRODUCT SHOWCASE BENTO GRID (THE VISUAL ANCHOR) ═══════════ */}
      <section id="showcase" className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Product Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
            Designed for Uncompromising Focus
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A cohesive dark-mode workspace engineered to eliminate distractions, enforce discipline, and track compounding personal growth.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Bento Tile 1: Live Mesh Focus Room Studio (Large 2-col) */}
          <div className="md:col-span-2 lg:col-span-2 rounded-3xl bg-card/85 backdrop-blur-xl border border-border/80 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/50 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/8 transition-all duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-foreground">Room: Stanford Alpha Sprint</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                24:45 Remaining
              </span>
            </div>

            {/* Video Mesh Mockup Tiles */}
            <div className="grid grid-cols-3 gap-2.5 my-auto">
              {[
                { name: "Jayadeep (Host)", initial: "JH", status: "Speaking", color: "border-primary" },
                { name: "Alex V.", initial: "AV", status: "Muted", color: "border-border" },
                { name: "Priya R.", initial: "PR", status: "Active", color: "border-cyan-500/40" },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl bg-surface/90 border ${p.color} flex flex-col items-center justify-center space-y-2 text-center relative overflow-hidden`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-mono font-black text-primary">
                    {p.initial}
                  </div>
                  <div className="text-[11px] font-bold text-foreground truncate w-full">{p.name}</div>
                  <span className="text-[9.5px] font-mono text-muted-foreground flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5 text-muted-foreground" />
                    {p.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-semibold">
                <Video className="w-4 h-4 text-cyan-400" />
                <span>WebRTC Mesh Video + Synced Pomodoro</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">Zero Lag</span>
            </div>
          </div>

          {/* Bento Tile 2: Kaizen Streak & Auto-Shields */}
          <div className="rounded-3xl bg-card/85 backdrop-blur-xl border border-border/80 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/50 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/8 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Discipline Engine</span>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-3xl font-mono font-black text-foreground">18 Days</div>
                  <div className="text-xs text-muted-foreground font-semibold">Unbroken Consistency Chain</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                  <span className="text-muted-foreground">Auto-Freeze Credits:</span>
                  <span className="text-primary">2 Shields Active</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-4/5" />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono">
              🛡️ Zero Penalty Freezes protect your hard-earned streak.
            </div>
          </div>

          {/* Bento Tile 3: Dual-Engine AI Performance Coach */}
          <div className="rounded-3xl bg-card/85 backdrop-blur-xl border border-border/80 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/50 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/8 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Private AI Coach</span>
              <Bot className="w-4 h-4 text-purple-400" />
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-purple-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Routine Synthesizer:</span>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                "Analyzed syllabus: Scheduled 2 LeetCode blocks during your 9:00 AM Cortisol Peak window."
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border/50 pt-2">
              <span>Cloud Gemini + Local Ollama</span>
              <span className="text-emerald-400 font-bold">100% Private</span>
            </div>
          </div>

          {/* Bento Tile 4: Deep Performance Analytics */}
          <div className="rounded-3xl bg-card/85 backdrop-blur-xl border border-border/80 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/50 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/8 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Deep Analytics</span>
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-emerald-400">94.2%</span>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  +18% Velocity
                </span>
              </div>

              {/* Mini Heatmap Visualization */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {[4, 2, 5, 5, 3, 5, 4, 3, 5, 5, 4, 5, 5, 5].map((lvl, idx) => (
                  <div
                    key={idx}
                    className={`h-4 rounded-sm ${
                      lvl === 5
                        ? "bg-primary"
                        : lvl === 4
                        ? "bg-primary/70"
                        : lvl === 3
                        ? "bg-primary/40"
                        : "bg-surface"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono">
              Export 1-click PDF executive reports for mentors.
            </div>
          </div>

          {/* Bento Tile 5: 0KB Procedural Audio Studio */}
          <div className="rounded-3xl bg-card/85 backdrop-blur-xl border border-border/80 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/50 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/8 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Acoustic Engine</span>
              <Headphones className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-2">
              <div className="text-base font-bold text-foreground">Procedural 432Hz Soundscapes</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero audio file downloads. Native browser oscillators synthesize binaural alpha waves in real time.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl font-bold">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Offline Ready • 0 KB Storage</span>
            </div>
          </div>

          {/* Bento Tile 6: Collaborative Whiteboard */}
          <div className="md:col-span-2 lg:col-span-2 rounded-3xl bg-card/85 backdrop-blur-xl border border-border/80 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/50 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/8 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono font-bold text-foreground">Real-Time Collaborative Whiteboard</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Multi-User Broadcast
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground">Interactive Engineering Canvas</div>
                <div className="text-[11px] text-muted-foreground">
                  Sketch system architectures, solve equations, and export high-res PNGs synchronously.
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1">
              <span>Coordinate Streaming via STUN Signaling</span>
              <span className="text-primary font-bold">Export PNG Supported</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CURATED 6 HERO ENGINES & ARCHITECTURE ═══════════ */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
            16 Specialized Productivity Engines Built-In
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Every feature in PPS is an engineered execution layer designed to eliminate context switching, protect flow state, and compound output.
          </p>
        </div>

        {/* 6 Hero Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ALL_FEATURES.filter((f) => f.isHero).map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group relative p-6 rounded-3xl bg-card border border-border/80 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border/80 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface border border-border/60 text-muted-foreground font-bold">
                      {feat.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-primary font-bold pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{feat.status}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Expandable Remaining 10 Features Accordion */}
        <div className="text-center pt-2">
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface border border-border/80 hover:border-primary/50 text-foreground font-bold text-xs transition-all cursor-pointer shadow-xs"
          >
            <span>{showAllFeatures ? "Hide Secondary Capabilities" : "Explore All 16 Architecture Modules"}</span>
            {showAllFeatures ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
          </button>
        </div>

        <AnimatePresence>
          {showAllFeatures && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4"
            >
              {ALL_FEATURES.filter((f) => !f.isHero).map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-5 rounded-2xl bg-card/75 border border-border/70 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="text-[9.5px] font-mono uppercase px-2 py-0.5 rounded-full bg-surface text-muted-foreground">
                          {feat.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{feat.title}</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold pt-2 border-t border-border/40">
                      {feat.status}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ═══════════ LIVE INTERACTIVE SANDBOX ═══════════ */}
      <section id="simulator" className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-6">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>Interactive Browser Sandbox</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-mono">
            Test the Core Engines Live Right Now
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            No signup or install required. Interact with the live Pomodoro timer, 432Hz synthesizer, and AI routine builder.
          </p>
        </div>

        <div className="max-w-5xl mx-auto rounded-3xl border-2 border-primary/40 bg-card/90 backdrop-blur-2xl shadow-2xl p-5 sm:p-7 text-left space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                Live Engine Simulator
              </span>
            </div>

            {/* Clean Tab Selector (Lucide Icons) */}
            <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveSimTab("pomodoro")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSimTab === "pomodoro"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pomodoro & XP</span>
              </button>
              <button
                onClick={() => setActiveSimTab("soundscape")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSimTab === "soundscape"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>432Hz Audio</span>
              </button>
              <button
                onClick={() => setActiveSimTab("ai")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSimTab === "ai"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Architect</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Pomodoro & Interactive Checkoff */}
          {activeSimTab === "pomodoro" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Timer Block */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Synced Study Sprint</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live Active
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
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {pomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{pomoRunning ? "Pause Sprint" : "Start Sprint"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPomoRunning(false);
                      setPomoSeconds(25 * 60);
                    }}
                    className="p-2.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
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
                  <span className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                    <span>XP: <strong className="text-foreground font-black">{demoXP} XP</strong></span>
                    <span>•</span>
                    <Flame className="w-3.5 h-3.5 text-orange-500 inline" />
                    <span>{demoStreak} Days</span>
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
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          h.done ? "text-emerald-400 bg-emerald-500/10" : "text-primary bg-primary/10"
                        }`}
                      >
                        {h.done ? "+10 XP Earned" : "+10 XP"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-muted-foreground text-center font-mono">
                  Click any habit to test live XP rewards and streak calculation.
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Procedural 432Hz Soundscape Player */}
          {activeSimTab === "soundscape" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">0KB Procedural Soundscapes (Native Web Audio)</h4>
                  <p className="text-xs text-muted-foreground">Synthesizes real-time binaural waves directly on your CPU without downloading audio files.</p>
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

              {/* Soundscape Preset Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { type: "lofi" as AmbienceType, label: "432Hz Alpha Waves", icon: Headphones, desc: "Binaural flow state" },
                  { type: "rain" as AmbienceType, label: "Gentle Rain", icon: CloudRain, desc: "Calming pink noise" },
                  { type: "coffee" as AmbienceType, label: "Cozy Coffee Shop", icon: Coffee, desc: "Soft ambient chatter" },
                  { type: "library" as AmbienceType, label: "Deep Library", icon: BookOpen, desc: "Quiet study murmur" },
                ].map((s) => {
                  const Icon = s.icon;
                  const isPlaying = activeSound === s.type;
                  return (
                    <button
                      key={s.type}
                      onClick={() => handleToggleSound(s.type)}
                      className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer shadow-xs ${
                        isPlaying
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                          : "bg-card border-border/80 hover:border-primary/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="w-5 h-5" />
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isPlaying ? "bg-white/20 text-white" : "bg-surface text-muted-foreground"
                          }`}
                        >
                          {isPlaying ? "Playing" : "Ready"}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold">{s.label}</div>
                        <div className={`text-[10px] ${isPlaying ? "text-white/80" : "text-muted-foreground"}`}>{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeSound !== "none" && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary font-mono">
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span>Real-time oscillator synthesis active. Zero bandwidth consumed.</span>
                  </span>
                  <button onClick={() => handleToggleSound("none")} className="underline font-bold cursor-pointer">
                    Stop Audio
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: AI Habit Architect */}
          {activeSimTab === "ai" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={aiGoalInput}
                  onChange={(e) => setAiGoalInput(e.target.value)}
                  placeholder="Enter any ambitious goal (e.g. Master React, Crack GATE)..."
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
                    onClick={() => {
                      setAiGoalInput(qp);
                      handleGenerateAiStack(qp);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer font-medium"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Generated Stack Display */}
              <div className="p-4 rounded-xl bg-card border border-primary/20 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Synthesized Daily Habit Stack:</span>
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

      {/* ═══════════ TARGET PERSONAS & WORKFLOWS ═══════════ */}
      <section id="personas" className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase">
            <Target className="w-3.5 h-3.5" />
            <span>Tailored For Your Discipline Path</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
            How Top Achievers Use PPS
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Select your discipline profile to preview how PPS organizes daily rituals, focus sprints, and accountability.
          </p>

          {/* Persona Tab Switcher */}
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {[
              { id: "aspirants" as const, label: "Exam Aspirants (JEE/UPSC/GATE)", icon: Target },
              { id: "coders" as const, label: "Software Engineers & Builders", icon: Monitor },
              { id: "students" as const, label: "University & Research Cohorts", icon: GraduationCap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePersona(tab.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                    activePersona === tab.id
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Persona Card */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-card border border-border/80 p-6 sm:p-8 shadow-2xl space-y-6">
          {activePersona === "aspirants" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase">
                  <span>8+ Hours Daily Consistency Without Burnout</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  Competitive Exam & Board Sprint Routine
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  "Studying 8+ hours a day alone in a room leads to motivation crashes by week three. With PPS, our 4-person study squad joins the <strong>8:00 AM Focus Room</strong> every morning. The synced 25m Pomodoros and streak shields keep our entire cohort relentlessly on track."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400">
                    RK
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Rohan K.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">AIR 342 Aspirant • Daily Squad Lead</div>
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
                  <span>Unbroken LeetCode & Architecture Sprints</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  Developer & Software Engineer Workflow
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  "Maintaining daily LeetCode and side-project momentum after a full-time job is tough. The <strong>0KB 432Hz procedural soundscapes</strong> and auto-freeze shields gave me the exact flow-state buffer needed to complete 90 days of deep coding."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center font-mono font-bold text-primary">
                    AV
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Alex V.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">Software Engineer • Beta Benchmark User</div>
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
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 uppercase">
                  <span>Collaborative Whiteboards & Study Circles</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  University Cohorts & Research Groups
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  "During final project weeks, our research group pops out the <strong>Meeting Studio window</strong>, sketches architecture diagrams on the real-time whiteboard, and uses the NLP lecture parser to convert syllabus topics directly into our shared daily habit queue."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-cyan-400">
                    PR
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Priya R.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">Graduate Researcher • Early Adopter</div>
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

      {/* ═══════════ THE SCIENCE BEHIND PPS (UNIFIED CIRCADIAN + COMPOUNDING) ═══════════ */}
      <section id="science" className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase">
            <Brain className="w-3.5 h-3.5" />
            <span>The Science of Peak Output</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-mono">
            Biological Alignment & 1% Compounding
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Habits fail when scheduled against your circadian rhythm. PPS aligns cognitive loads with hormone windows and compounds daily progress exponentially.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Circadian Flow Engine */}
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xl space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Circadian Rhythm Engine</span>
                <Sunrise className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold font-mono text-foreground">Align Routines to Cortisol & Dopamine</h3>
              <p className="text-xs text-muted-foreground">
                Drag the slider to your natural wake time to calculate your optimal deep work windows:
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Natural Wake Time:</div>
                  <div className="text-sm font-mono font-black text-primary">{formatHour12(wakeHour)}</div>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="10"
                step="1"
                value={wakeHour}
                onChange={(e) => setWakeHour(parseInt(e.target.value))}
                className="accent-primary w-40 cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-surface/70 border border-primary/30 flex items-start gap-3">
                <Brain className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-mono font-bold text-primary">
                    Cortisol Peak: {formatHour12(peakCognitiveStart)} – {formatHour12(peakCognitiveEnd)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Highest working memory. Best for algorithms, physics, and intense focus rooms.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/70 border border-amber-500/30 flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-mono font-bold text-amber-400">
                    Physical & Creative Peak: {formatHour12(physicalPeakStart)} – {formatHour12(physicalPeakEnd)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Body temperature peak. Ideal for workouts, presentations, and whiteboard collaboration.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/70 border border-cyan-500/30 flex items-start gap-3">
                <Moon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-mono font-bold text-cyan-400">
                    Memory Consolidation: {formatHour12(memoryWinddownStart)} Onwards
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Melatonin ramp. Best for evening reflection journals and 432Hz ambient sleep audio.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Compounding Consistency Engine */}
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-primary uppercase">1% Daily Compounding</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-mono text-foreground">
                Output Multiplies by <span className="text-primary">{compoundMultiplier}x</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Drag the timeline to see how unbroken streak chains and auto-freeze protection transform daily habits into exponential mastery.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
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

            <div className="p-4 rounded-2xl bg-surface/80 border border-primary/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-primary" />
                <div>
                  <div className="text-xs font-bold text-foreground">Projected Output Growth</div>
                  <div className="text-2xl font-mono font-black text-primary">
                    +{Math.round((parseFloat(compoundMultiplier) - 1) * 100)}%
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-primary text-primary-foreground">
                {consistencyDays >= 300 ? "Legend" : consistencyDays >= 150 ? "Master" : consistencyDays >= 60 ? "Warrior" : "Apprentice"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 text-xs text-muted-foreground font-mono space-y-1">
              <div>Auto-Freeze Shields Earned: <strong>{Math.floor(consistencyDays / 14)} Freezes</strong></div>
              <div>Unlocked Milestone Badges: <strong>{consistencyDays >= 100 ? "10/10" : consistencyDays >= 30 ? "6/10" : "3/10"} Badges</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ COMPETITOR COMPARISON MATRIX ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black font-mono">
            How PPS Compares to Traditional Tools
          </h2>
          <p className="text-xs text-muted-foreground">
            Why high-performance squads and institutions choose PPS over fragmented apps.
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
              {COMPETITOR_ROWS.map((c, i) => (
                <tr key={i} className="hover:bg-surface/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{c.feature}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-center font-bold text-xs text-emerald-400 bg-emerald-500/5">
                    {c.pps}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.focusmate === "Not Available" ? <Minus className="w-3.5 h-3.5 mx-auto opacity-40" /> : c.focusmate}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.habitica === "Not Available" ? <Minus className="w-3.5 h-3.5 mx-auto opacity-40" /> : c.habitica}
                  </td>
                  <td className="p-4 sm:p-5 text-center text-muted-foreground">
                    {c.notion === "Not Available" ? <Minus className="w-3.5 h-3.5 mx-auto opacity-40" /> : c.notion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════ MENTOR & EDUCATOR MARKETPLACE BANNER ═══════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-amber-500/10 via-card to-primary/10 border border-border/80 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
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
                className="px-5 py-2.5 rounded-2xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all shadow-md"
              >
                Browse Marketplace →
              </Link>
              <Link
                to="/pricing"
                className="px-4 py-2.5 rounded-2xl bg-surface border border-border/80 text-foreground hover:border-primary/40 font-semibold text-xs transition-all"
              >
                Host as Mentor
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-96 space-y-3">
            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-foreground">Interactive Masterclasses</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Screen Sharing & Real-Time Q&A</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Live</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs font-bold text-foreground">AI Lecture to Habit Stack</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Automatic Syllabus Extractor</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">NLP</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-amber-400" />
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

      {/* ═══════════ FINAL CONVERSION CTA BANNER ═══════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-center space-y-6 shadow-2xl shadow-primary/30">
          <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight leading-tight">
            Ready to Unlock Your Peak Consistency?
          </h2>
          <p className="text-xs sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
            Join students, high-performing squads, and verified mentors leveling up together on PPS.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to={hasActiveAccount ? "/dashboard" : "/login?tab=signup"}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black text-xs sm:text-sm hover:opacity-95 transition-all shadow-xl hover:scale-105"
            >
              {hasActiveAccount ? "Open Dashboard →" : "Get Started Free (No CC Required)"}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ RICH FOOTER ═══════════ */}
      <footer className="relative z-10 border-t border-border/40 py-12 max-w-7xl mx-auto px-6 space-y-8 text-xs text-muted-foreground font-mono">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-3 col-span-2 md:col-span-1">
            <BrandLogo size="sm" variant="square" animated={false} />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The unified personal discipline operating system for high achievers and study squads.
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">Product</div>
            <div className="space-y-1.5 flex flex-col">
              <button onClick={() => document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-foreground">Showcase</button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-foreground">Capabilities</button>
              <button onClick={() => document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-foreground">Live Demo</button>
              <Link to="/pricing" className="hover:text-foreground">Pricing & Plans</Link>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">Ecosystem</div>
            <div className="space-y-1.5 flex flex-col">
              <Link to="/marketplace" className="hover:text-foreground">Mentor Marketplace</Link>
              <Link to="/roadmap" className="hover:text-foreground">Roadmap</Link>
              <Link to="/login" className="hover:text-foreground">Sign In</Link>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">Legal & Security</div>
            <div className="space-y-1.5 flex flex-col">
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                All Systems Operational
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <span>© 2026 Personal Performance System (PPS). All Rights Reserved.</span>
          <div className="flex items-center gap-4">
            <span>Built for High Achievers</span>
          </div>
        </div>
      </footer>

      {/* 🚀 Floating Scroll to Top */}
      <ScrollToTop />
    </div>
  );
};

export default HomePage;
