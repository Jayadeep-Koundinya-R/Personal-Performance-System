import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { REGIONAL_PRICING, CurrencyRegion } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSubscription, SubscriptionProvider } from "@/hooks/use-subscription";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { CampusDemoModal } from "@/components/pricing/CampusDemoModal";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

import {
  Globe,
  MapPin,
  Check,
  ChevronDown,
  Sparkles,
  GraduationCap,
  Building2,
  Calculator,
  Flame,
  Users,
  Video,
  Shield,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Zap,
  Star,
  Lock,
  Award,
  CheckCircle2,
  ExternalLink,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

/* ── 18-Row Feature Comparison Data ─────────────────── */
const FEATURES = [
  { category: "Habits & Focus", name: "Active Habits", free: "Up to 15", pro: "Unlimited", teacher: "Unlimited", campus: "Unlimited" },
  { category: "Habits & Focus", name: "Focus Studio (Pomodoro)", free: "✓", pro: "✓", teacher: "✓", campus: "✓" },
  { category: "Habits & Focus", name: "Streak Shields & Freezes", free: "1/mo", pro: "3/mo + Auto", teacher: "5/mo", campus: "10/mo" },
  { category: "Study Squads", name: "Study Groups & Channels", free: "3 Squads (10 max)", pro: "Unlimited (50 max)", teacher: "Unlimited (100 max)", campus: "Unlimited (500 max)" },
  { category: "Study Squads", name: "Drop-In Live Focus Rooms", free: "60 min/day", pro: "24/7 Unlimited", teacher: "24/7 Unlimited", campus: "24/7 Unlimited" },
  { category: "Study Squads", name: "Shared Whiteboard & Note Export", free: "View Only", pro: "✓ Full Interactive", teacher: "✓ + Lecture Notes Hub", campus: "✓ + Campus Storage" },
  { category: "Study Squads", name: "Procedural Lo-Fi Soundscapes", free: "2 Presets", pro: "All 4 Soundscapes", teacher: "All 4 Soundscapes", campus: "All 4 Soundscapes" },
  { category: "Analytics & AI", name: "Analytics History", free: "7-day", pro: "Full History", teacher: "Full History", campus: "Full + Department Logs" },
  { category: "Analytics & AI", name: "AI Performance Coach (Gemini/Ollama)", free: "10 msgs", pro: "Unlimited", teacher: "Unlimited", campus: "Unlimited" },
  { category: "Analytics & AI", name: "Executive PDF Reports", free: "✓", pro: "✓ + Custom Theme", teacher: "✓ + Class Averages", campus: "✓ + Institutional Brand" },
  { category: "Teaching & Mentorship", name: "Host Paid Live Masterclasses", free: "—", pro: "—", teacher: "✓ (10% Comm.)", campus: "✓ (Included Flat)" },
  { category: "Teaching & Mentorship", name: "Automated Attendance Logs", free: "—", pro: "—", teacher: "✓", campus: "✓ (Export to CSV)" },
  { category: "Teaching & Mentorship", name: "Assign Habits to Classroom", free: "—", pro: "—", teacher: "✓", campus: "✓" },
  { category: "Institutional Campus", name: "Bulk Student Onboarding", free: "—", pro: "—", teacher: "—", campus: "✓ (1-Click CSV)" },
  { category: "Institutional Campus", name: "Campus & Department Leaderboards", free: "—", pro: "—", teacher: "—", campus: "✓" },
  { category: "Institutional Campus", name: "Single Sign-On (SSO / SAML)", free: "—", pro: "—", teacher: "—", campus: "✓ Google/Edu SSO" },
  { category: "Support & Security", name: "Enterprise 99.9% SLA", free: "Community", pro: "Email (24h)", teacher: "Priority (12h)", campus: "Dedicated Account Mgr" },
  { category: "Support & Security", name: "Data Encryption & Privacy", free: "256-Bit SSL", pro: "256-Bit SSL", teacher: "256-Bit SSL", campus: "FERPA / GDPR Compliant" },
];

const FAQS = [
  { q: "How does the Teacher & Mentor Studio plan work?", a: "Teachers, tutors, and mentors can host live classes with zero upfront platform cost. You set your ticket price, students book with UPI/Card, and PPS takes a 10% platform commission on tickets sold (first 5 classes every month are 100% commission-free!)." },
  { q: "How does Institutional Campus licensing work?", a: "Colleges and coaching institutes receive a flat semester license (₹2,000 per enrolled student). This includes unlimited classroom habits, faculty assignment portals, student attendance audit reports, and campus leaderboards." },
  { q: "Can a student start free and upgrade later?", a: "Yes! The Personal Free plan includes up to 15 habits, 3 study squads, daily Pomodoro, and streak tracking with no time limit." },
  { q: "What payment methods are supported?", a: "In India, we support UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking, and all major Credit/Debit cards. Internationally, we support Stripe, Visa, Mastercard, American Express, and Apple Pay." },
  { q: "Is there a money-back guarantee?", a: "Yes — 30-day no-questions-asked refund guarantee on all Pro and Institutional semester subscriptions." },
  { q: "Can I use the AI Coach with local Ollama models?", a: "Yes! PPS Pro supports both cloud AI (Google Gemini / DeepSeek) and 100% private local Ollama LLM execution on your own machine." },
];

function PricingContent() {
  const { isLoggedIn } = useAuth();
  const { isPro, startCheckout, loading } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [region, setRegionState] = useState<CurrencyRegion>(() => {
    const saved = localStorage.getItem("pps_billing_region");
    return saved === "IN" || saved === "GLOBAL" ? saved : "IN";
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  // Teacher Earnings Calculator State
  const [teacherStudents, setTeacherStudents] = useState(20);
  const [teacherFee, setTeacherFee] = useState(region === "IN" ? 300 : 20);
  const [teacherClassesPerMonth, setTeacherClassesPerMonth] = useState(8);

  // Institutional ROI Calculator State
  const [campusStudents, setCampusStudents] = useState(150);

  const selectRegion = (r: CurrencyRegion) => {
    setRegionState(r);
    localStorage.setItem("pps_billing_region", r);
    setTeacherFee(r === "IN" ? 300 : 20);
  };

  const pricingConfig = REGIONAL_PRICING[region];
  const symbol = pricingConfig.currencySymbol;

  // Teacher Revenue Calculation
  const teacherGross = teacherStudents * teacherFee * teacherClassesPerMonth;
  const ppsCommission = Math.round(teacherGross * 0.10);
  const teacherNet = teacherGross - ppsCommission;

  // Campus Cost Calculation
  const campusCost = campusStudents * (region === "IN" ? 2000 : 49);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-white transition-colors duration-500">
      {/* 🌌 Animated 3D Floating Background */}
      <ThreeDBackground />

      {/* 📊 Top Scroll Progress Bar */}
      <ScrollProgressBar />


      {/* Enterprise Campus Demo Modal */}
      <CampusDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        defaultStudents={campusStudents}
      />

      {/* Pro Early Access Modal */}
      {isProModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border/80 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl mb-4 text-primary">
              ⭐
            </div>
            <h3 className="text-xl font-black font-mono text-foreground">
              Student Pro Early Access
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We are currently in public beta! Live payment gateways (UPI & Stripe) will be enabled for the commercial release.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-surface/80 border border-border/70 space-y-2 text-xs">
              <div className="font-bold text-foreground flex items-center gap-1.5 text-[11px] font-mono uppercase text-primary">
                <span>🎁 Beta Perks Included (₹0):</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground text-[11.5px]">
                <li className="flex items-center gap-2">✓ Unlimited habits & custom time windows</li>
                <li className="flex items-center gap-2">✓ 24/7 Drop-in Study Squad focus rooms</li>
                <li className="flex items-center gap-2">✓ Unlimited AI Coach conversations</li>
                <li className="flex items-center gap-2">✓ Full historical analytics & reports</li>
              </ul>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsProModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border/80 bg-surface hover:bg-surface/80 text-foreground font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
              <Link
                to="/dashboard"
                onClick={() => setIsProModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs text-center hover:opacity-90 transition-all shadow-md"
              >
                Open Dashboard →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Navigation Bar ── */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b border-border/40 backdrop-blur-md">
        <Link to="/dashboard" className="flex items-center gap-2.5 font-mono text-xl font-black text-primary tracking-wider">
          <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <span>PPS<span className="text-secondary">.</span></span>
          <span className="text-xs font-mono font-normal text-muted-foreground ml-1">/ Pricing</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Region Switcher */}
          <button
            onClick={() => selectRegion(region === "IN" ? "GLOBAL" : "IN")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/80 border border-border/80 text-xs font-bold hover:border-primary/40 transition-colors cursor-pointer"
          >
            <span>{pricingConfig.flag}</span>
            <span className="text-foreground">{pricingConfig.currencyCode}</span>
            <span className="text-[10px] text-muted-foreground">({region === "IN" ? "UPI/Cards" : "Stripe/USD"})</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 px-2.5 rounded-xl bg-surface/80 border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs"
            title="Toggle Light / Dark Mode"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <Link
            to="/dashboard"
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs hover:bg-primary/90 transition-all shadow-sm"
          >
            {isLoggedIn ? "Open Dashboard" : "Sign In"}
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-20">
        {/* ── Hero Header ── */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-black uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commercial-Grade Performance Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-[1.1] font-mono">
            Invest in Momentum. <br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-amber-300 bg-clip-text text-transparent">
              Built for Scale & Impact.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Whether you're an ambitious student crushing exams, a mentor running paid masterclasses, or a university dean managing 500+ student batches.
          </p>

          {/* Billing Interval Toggle */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-surface/80 border border-border/80 backdrop-blur-xl shadow-xl">
              <button
                onClick={() => setInterval("monthly")}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  interval === "monthly"
                    ? "bg-primary text-primary-foreground shadow-md font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Billing
              </button>

              <button
                onClick={() => setInterval("yearly")}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  interval === "yearly"
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-md font-black tracking-wide shadow-xs">
                  {pricingConfig.savingsBadge}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 4 Main Plan Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Personal Free */}
          <div className="p-6 sm:p-7 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/80 flex flex-col justify-between space-y-6 shadow-xl hover:border-primary/40 hover:scale-[1.01] transition-all duration-300 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-surface/90 border border-border flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                🌱
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground font-mono">Personal Free</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Foundational habit tracking & peer squads</p>
              </div>
              <div className="font-mono text-3xl font-black text-foreground">
                {symbol}0 <span className="text-xs font-normal text-muted-foreground">/ forever</span>
              </div>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-medium pt-3 border-t border-border/40">
                <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Up to 15 Active Habits</li>
                <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 3 Study Squads (10 peers each)</li>
                <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 60 min/day Focus Rooms</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Pomodoro Focus Studio</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 1 Streak Shield / month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 7-Day Analytics & Reports</li>
              </ul>
            </div>

            <Link
              to="/dashboard"
              className="w-full py-3 rounded-2xl bg-surface hover:bg-card border border-border text-foreground font-bold text-xs text-center transition-all block shadow-xs"
            >
              Start Free Today
            </Link>
          </div>

          {/* Card 2: Student Pro (Hero / Most Popular) */}
          <div className="p-6 sm:p-7 rounded-3xl dark:bg-gradient-to-b dark:from-[#131628] dark:via-[#101322] dark:to-primary/15 bg-gradient-to-b from-indigo-50/95 via-white to-primary/15 border-2 border-primary shadow-2xl shadow-primary/20 flex flex-col justify-between space-y-6 relative hover:scale-[1.02] transition-all duration-300">
            <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-white text-[10px] font-mono font-black uppercase px-4 py-1 rounded-full shadow-lg border border-white/20 tracking-wider">
              ⭐ Most Popular
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-2xl text-primary shadow-md">
                ⚡
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground font-mono">Student Pro</h3>
                <p className="text-xs text-muted-foreground mt-0.5">High-octane performance for achievers</p>
              </div>
              <div className="font-mono text-3xl font-black text-foreground">
                {symbol}{interval === "monthly" ? pricingConfig.proMonthly : Math.round(pricingConfig.proYearly / 12)}
                <span className="text-xs font-normal text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground font-medium pt-3 border-t border-border/40">
                <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Unlimited Habits & Alarms</li>
                <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Unlimited Study Squads (50 peers)</li>
                <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 24/7 Drop-In Live Focus Rooms</li>
                <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Shared Whiteboard Note Export</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Unlimited AI Performance Coach</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 3 Streak Freezes + Auto-Shield</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Full Historical Executive Analytics</li>
              </ul>
            </div>

            <button
              onClick={() => setIsProModalOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white font-black text-xs shadow-xl shadow-primary/30 hover:opacity-95 transition-all cursor-pointer"
            >
              {isPro ? "Current Plan Active (Beta)" : "Get Early Access (Free) →"}
            </button>
          </div>

          {/* Card 3: Teacher / Mentor Studio */}
          <div className="p-6 sm:p-7 rounded-3xl bg-card/60 backdrop-blur-xl border border-amber-500/30 flex flex-col justify-between space-y-6 shadow-xl hover:border-amber-500/60 hover:scale-[1.01] transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                  🎓
                </div>
                <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 uppercase">
                  🏗️ Beta
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground font-mono">Teacher Studio</h3>
                <p className="text-xs text-muted-foreground mt-0.5">For tutors, music teachers & creators (Local Preview)</p>
              </div>
              <div className="font-mono text-2xl font-black text-amber-300">
                10% <span className="text-xs font-normal text-muted-foreground">Commission / ticket</span>
              </div>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-medium pt-3 border-t border-border/40">
                <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> ₹0 / $0 Upfront Platform Cost</li>
                <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Host Live Paid Masterclasses</li>
                <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> 1-Click Ticket Booking (UPI/Cards)</li>
                <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Automated Class Attendance Logs</li>
                <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Assign Habits to Class Rosters</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> First 5 Classes/Mo 100% Free</li>
              </ul>
            </div>

            <a
              href="#teacher-calculator"
              className="w-full py-3 rounded-2xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 font-extrabold text-xs text-center transition-all block shadow-xs"
            >
              Calculate Earnings ↓
            </a>
          </div>

          {/* Card 4: Campus & Institutional */}
          <div className="p-6 sm:p-7 rounded-3xl bg-card/60 backdrop-blur-xl border border-secondary/30 flex flex-col justify-between space-y-6 shadow-xl hover:border-secondary/60 hover:scale-[1.01] transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary border border-secondary/30 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                  🏫
                </div>
                <span className="text-[10px] font-mono font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/30 uppercase">
                  🏗️ Planned
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground font-mono">Campus License</h3>
                <p className="text-xs text-muted-foreground mt-0.5">For colleges, academies & schools (Inquiry & Pilots)</p>
              </div>
              <div className="font-mono text-2xl font-black text-foreground">
                {symbol}{region === "IN" ? "2,000" : "49"}
                <span className="text-xs font-normal text-muted-foreground"> / student / sem</span>
              </div>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-medium pt-3 border-t border-border/40">
                <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Bulk 1-Click CSV Student Rosters</li>
                <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Multi-Faculty Teaching Portals</li>
                <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Department Attendance Audit Logs</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Campus-Wide Leaderboards</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Google & Edu SSO / SAML</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Dedicated Account Manager</li>
              </ul>
            </div>

            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30 font-extrabold text-xs text-center transition-all block shadow-xs cursor-pointer"
            >
              Request Institutional PO & Demo ↓
            </button>
          </div>
        </div>

        {/* ── Section: Interactive Teacher Earnings Calculator ── */}
        <div id="teacher-calculator" className="p-8 sm:p-10 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-card/90 via-surface/70 to-amber-500/10 backdrop-blur-2xl shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Mentor & Creator Revenue Engine</span>
                </div>
                <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 uppercase">
                  🏗️ Beta Preview
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
                Interactive Teacher Earnings Estimator
              </h2>
              <p className="text-xs text-muted-foreground">
                Move the sliders to project your net monthly take-home earnings on PPS.
              </p>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3 p-5 rounded-2xl bg-surface/80 border border-border/80">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Students Per Batch:</span>
                <span className="text-amber-400 font-mono text-sm">{teacherStudents} Students</span>
              </div>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={teacherStudents}
                onChange={(e) => setTeacherStudents(parseInt(e.target.value))}
                className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="space-y-3 p-5 rounded-2xl bg-surface/80 border border-border/80">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Ticket Fee / Student:</span>
                <span className="text-amber-400 font-mono text-sm">{symbol}{teacherFee}</span>
              </div>
              <input
                type="range"
                min={region === "IN" ? 50 : 5}
                max={region === "IN" ? 1500 : 80}
                step={region === "IN" ? 25 : 2}
                value={teacherFee}
                onChange={(e) => setTeacherFee(parseInt(e.target.value))}
                className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="space-y-3 p-5 rounded-2xl bg-surface/80 border border-border/80">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Classes Per Month:</span>
                <span className="text-amber-400 font-mono text-sm">{teacherClassesPerMonth} Sessions</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={teacherClassesPerMonth}
                onChange={(e) => setTeacherClassesPerMonth(parseInt(e.target.value))}
                className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* Live Earnings Projection Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-card border border-amber-500/40 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center shadow-lg">
            <div>
              <div className="text-[11px] font-mono text-muted-foreground uppercase">Monthly Gross Revenue</div>
              <div className="text-2xl font-mono font-bold text-foreground mt-1.5">
                {symbol}{teacherGross.toLocaleString()}
              </div>
            </div>

            <div className="border-y sm:border-y-0 sm:border-x border-border/50 py-3 sm:py-0">
              <div className="text-[11px] font-mono text-muted-foreground uppercase">PPS Platform Commission (10%)</div>
              <div className="text-2xl font-mono font-bold text-red-400 mt-1.5">
                - {symbol}{ppsCommission.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-amber-400 uppercase font-black">Your Net Take-Home Earnings</div>
              <div className="text-3xl font-mono font-black text-amber-300 mt-1.5">
                {symbol}{teacherNet.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Institutional Campus License Calculator ── */}
        <div id="campus-calculator" className="p-8 sm:p-10 rounded-3xl border border-secondary/30 bg-gradient-to-br from-card/90 via-surface/70 to-secondary/10 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-secondary bg-secondary/15 px-3 py-1 rounded-full border border-secondary/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus Licensing & Department PO</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              Institutional Semester Calculator
            </h2>
            <p className="text-xs text-muted-foreground">
              Flat semester licensing with zero per-minute fees, attendance audits, and custom batch leaderboards.
            </p>
          </div>

          <div className="space-y-3 p-5 rounded-2xl bg-surface/80 border border-border/80 max-w-xl">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Enrolled Students Batch Size:</span>
              <span className="text-secondary font-mono font-bold text-sm">{campusStudents} Students</span>
            </div>
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={campusStudents}
              onChange={(e) => setCampusStudents(parseInt(e.target.value))}
              className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-secondary"
            />
          </div>

          <div className="p-6 rounded-2xl bg-card border border-secondary/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
            <div>
              <div className="text-xs font-mono text-muted-foreground">Total Semester Institutional Licensing:</div>
              <div className="text-3xl font-mono font-black text-secondary mt-1">
                {symbol}{campusCost.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">/ semester</span>
              </div>
            </div>

            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-secondary to-cyan-400 text-black font-black text-xs hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-secondary/20 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Request Official Invoice & Pilot PO</span>
            </button>
          </div>
        </div>

        {/* ── Expanded 18-Row Comparison Table ── */}
        <div className="space-y-6 pt-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              Complete Feature Comparison Across Tiers
            </h2>
            <p className="text-xs text-muted-foreground">
              Transparent, uncompromising performance breakdown across all 4 plans.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/90 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 sm:p-5 font-bold text-foreground">Feature</th>
                  <th className="p-4 sm:p-5 text-center">Personal Free</th>
                  <th className="p-4 sm:p-5 text-center text-primary font-bold bg-primary/5">Student Pro</th>
                  <th className="p-4 sm:p-5 text-center text-amber-300 font-bold">Teacher Studio <span className="text-[9px] text-amber-400 font-mono">(Beta)</span></th>
                  <th className="p-4 sm:p-5 text-center text-secondary font-bold">Campus License <span className="text-[9px] text-orange-400 font-mono">(Planned)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {FEATURES.map((f, i) => (
                  <tr key={i} className="hover:bg-surface/50 transition-colors">
                    <td className="p-4 sm:p-5 font-bold text-foreground">
                      <span className="text-[10px] text-muted-foreground block font-mono">{f.category}</span>
                      {f.name}
                    </td>
                    <td className="p-4 sm:p-5 text-center text-muted-foreground font-medium">{f.free}</td>
                    <td className="p-4 sm:p-5 text-center font-bold text-primary bg-primary/5">{f.pro}</td>
                    <td className="p-4 sm:p-5 text-center font-bold text-amber-300">{f.teacher}</td>
                    <td className="p-4 sm:p-5 text-center font-bold text-secondary">{f.campus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Enterprise Trust & Security Badges ── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface/50 border border-border/80 backdrop-blur-xl grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-foreground">256-Bit SSL Security</div>
            <div className="text-[10px] text-muted-foreground">Bank-grade data encryption</div>
          </div>

          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-foreground">Instant UPI & Cards</div>
            <div className="text-[10px] text-muted-foreground">GPay, PhonePe, Cards & Stripe</div>
          </div>

          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-foreground">30-Day Refund Guarantee</div>
            <div className="text-[10px] text-muted-foreground">100% Risk-free evaluation</div>
          </div>

          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center text-secondary">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-foreground">99.9% Uptime SLA</div>
            <div className="text-[10px] text-muted-foreground">Global CDN & WebRTC edge</div>
          </div>
        </div>

        {/* ── FAQ Accordion ── */}
        <div className="max-w-3xl mx-auto space-y-4 pt-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Everything you need to know about plans, billing, and institutional licensing.
            </p>
          </div>

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
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-xs text-muted-foreground font-mono">
        © 2026 Personal Performance System • All Rights Reserved
      </footer>

      {/* 🚀 Floating Scroll to Top */}
      <ScrollToTop />
    </div>
  );
}


export const PricingPage = () => {
  return (
    <SubscriptionProvider>
      <PricingContent />
    </SubscriptionProvider>
  );
};

export default PricingPage;
