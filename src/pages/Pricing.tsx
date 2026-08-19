import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { REGIONAL_PRICING, CurrencyRegion } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription, SubscriptionProvider } from "@/hooks/use-subscription";
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
} from "lucide-react";
import { toast } from "sonner";

/* ── 18-Row Feature Comparison Data ─────────────────── */

const FEATURES = [
  { category: "Habits & Focus", name: "Active Habits", free: "Up to 15", pro: "Unlimited", teacher: "Unlimited", campus: "Unlimited" },
  { category: "Habits & Focus", name: "Focus Studio (Pomodoro)", free: "✓", pro: "✓", teacher: "✓", campus: "✓" },
  { category: "Habits & Focus", name: "Streak Shields & Freezes", free: "1/mo", pro: "3/mo + Auto", teacher: "5/mo", campus: "10/mo" },
  { category: "Study Squads", name: "Study Groups & Channels", free: "3 Squads (10 max)", pro: "Unlimited (50 max)", teacher: "Unlimited (100 max)", campus: "Unlimited (500 max)" },
  { category: "Study Squads", name: "Drop-In Focus Rooms", free: "60 min/day", pro: "24/7 Unlimited", teacher: "24/7 Unlimited", campus: "24/7 Unlimited" },
  { category: "Study Squads", name: "Screen Sharing & Notes", free: "Text & Links", pro: "✓ + Screen Share", teacher: "✓ + Lecture Video Hub", campus: "✓ + Campus Storage" },
  { category: "Analytics & AI", name: "Analytics History", free: "7-day", pro: "Full History", teacher: "Full History", campus: "Full + Department Logs" },
  { category: "Analytics & AI", name: "AI Performance Coach", free: "10 msgs", pro: "Unlimited", teacher: "Unlimited", campus: "Unlimited" },
  { category: "Analytics & AI", name: "Executive PDF Reports", free: "✓", pro: "✓ + Custom Theme", teacher: "✓ + Class Averages", campus: "✓ + Institutional Brand" },
  { category: "Teaching & Campus", name: "Host Paid Live Classes", free: "—", pro: "—", teacher: "✓ (10% Comm.)", campus: "✓ (Included Flat)" },
  { category: "Teaching & Campus", name: "Automated Attendance Logs", free: "—", pro: "—", teacher: "✓", campus: "✓ (Export to CSV)" },
  { category: "Teaching & Campus", name: "Assign Habits to Classroom", free: "—", pro: "—", teacher: "✓", campus: "✓" },
  { category: "Teaching & Campus", name: "Bulk Student Onboarding", free: "—", pro: "—", teacher: "—", campus: "✓ (1-Click CSV)" },
  { category: "Teaching & Campus", name: "Campus & Department Ranks", free: "—", pro: "—", teacher: "—", campus: "✓" },
  { category: "Support", name: "Priority Support & SLAs", free: "Community", pro: "Email (24h)", teacher: "Priority (12h)", campus: "Dedicated Account Mgr" },
];

const FAQS = [
  { q: "How does the Teacher / Mentor plan work?", a: "Teachers and music mentors can host live classes with zero upfront platform cost. You set your class price, students join, and PPS takes a 10% platform commission on fees collected (first 5 classes are 100% commission-free each month!)." },
  { q: "How does Institutional Campus licensing work?", a: "Colleges and schools get a flat semester license (₹2,000 per enrolled student). This includes unlimited classroom habits, faculty assignment portals, student attendance audit reports, and campus leaderboards." },
  { q: "Can a student start free and upgrade later?", a: "Yes! The free plan includes up to 15 habits, 3 study squads, daily Pomodoro, and streak tracking with no time limit." },
  { q: "What payment methods are supported?", a: "We support UPI, NetBanking, Paytm, Credit/Debit cards for India, and International Cards (Visa, Mastercard, Amex) & Stripe globally." },
  { q: "Is there a money-back guarantee?", a: "Yes — 30-day no-questions-asked refund guarantee on all Pro and Institutional semester subscriptions." },
];

function PricingContent() {
  const { isLoggedIn } = useAuth();
  const { isPro, startCheckout, loading } = useSubscription();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [region, setRegionState] = useState<CurrencyRegion>(() => {
    const saved = localStorage.getItem("pps_billing_region");
    return saved === "IN" || saved === "GLOBAL" ? saved : "IN";
  });
  
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Teacher Earnings Calculator State
  const [teacherStudents, setTeacherStudents] = useState(15);
  const [teacherFee, setTeacherFee] = useState(region === "IN" ? 250 : 15);
  const [teacherClassesPerMonth, setTeacherClassesPerMonth] = useState(8);

  // Institutional ROI Calculator State
  const [campusStudents, setCampusStudents] = useState(120);

  const selectRegion = (r: CurrencyRegion) => {
    setRegionState(r);
    localStorage.setItem("pps_billing_region", r);
    setTeacherFee(r === "IN" ? 250 : 15);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-16">
      {/* ── Top Header & Region Switcher ── */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 p-1 px-3 rounded-full bg-surface border border-border text-xs font-mono">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Billing Region:</span>
          <button
            onClick={() => selectRegion(region === "IN" ? "GLOBAL" : "IN")}
            className="font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{pricingConfig.flag} {pricingConfig.regionName}</span>
            <span className="text-[10px] text-muted-foreground">(Switch)</span>
          </button>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
          Simple, Transparent Plans for <br />
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Students, Mentors & Campuses
          </span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Whether you're studying solo, building a study squad with friends, running online music classes, or managing a college batch — we have a plan built for you.
        </p>

        {/* Billing Interval Switcher */}
        <div className="inline-flex items-center p-1.5 rounded-2xl bg-surface border border-border/80 shadow-xs">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              interval === "yearly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-black">
              {pricingConfig.savingsBadge}
            </span>
          </button>
        </div>
      </div>

      {/* ── 4 Main Plan Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Plan 1: Student Free */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 flex flex-col justify-between space-y-6 shadow-md hover:border-border transition-all">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-xl">
              🌱
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground font-mono">Personal Free</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Essential habit tracking & peer squads</p>
            </div>
            <div className="font-mono text-3xl font-black text-foreground">
              {symbol}0 <span className="text-xs font-normal text-muted-foreground">/ forever</span>
            </div>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium pt-2 border-t border-border/40">
              <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Up to 15 Active Habits</li>
              <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 3 Study Squads (10 peers each)</li>
              <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 60 min/day Focus Rooms</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Focus Studio & Pomodoro</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 1 Streak Shield / month</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 7-Day Analytics & Reports</li>
            </ul>
          </div>
          <Link
            to="/dashboard"
            className="w-full py-2.5 rounded-xl bg-surface border border-border hover:bg-card text-foreground font-bold text-xs text-center transition-all block"
          >
            Start Free
          </Link>
        </div>

        {/* Plan 2: Student Pro (Featured) */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-card via-card to-primary/10 border-2 border-primary shadow-2xl flex flex-col justify-between space-y-6 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-mono font-black uppercase px-3 py-1 rounded-full shadow-md">
            Most Popular
          </div>
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-xl text-primary">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground font-mono">Student Pro</h3>
              <p className="text-xs text-muted-foreground mt-0.5">For dedicated high performers</p>
            </div>
            <div className="font-mono text-3xl font-black text-foreground">
              {symbol}{interval === "monthly" ? pricingConfig.proMonthly : Math.round(pricingConfig.proYearly / 12)}
              <span className="text-xs font-normal text-muted-foreground"> / month</span>
            </div>
            <ul className="space-y-2.5 text-xs text-foreground font-medium pt-2 border-t border-border/40">
              <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Unlimited Habits & Reminders</li>
              <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Unlimited Study Squads (50 peers)</li>
              <li className="flex items-center gap-2 font-bold"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 24/7 Drop-In Focus Rooms</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Screen Sharing & File Uploads</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Unlimited AI Coach Messages</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> 3 Streak Freezes + Auto-Shield</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Full Historical Analytics</li>
            </ul>
          </div>
          <button
            onClick={() => startCheckout(interval)}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
          >
            {isPro ? "Current Active Plan" : "Upgrade to Pro"}
          </button>
        </div>

        {/* Plan 3: Teacher / Mentor Studio */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 flex flex-col justify-between space-y-6 shadow-md hover:border-amber-500/50 transition-all">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl">
              🎓
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground font-mono">Teacher Studio</h3>
              <p className="text-xs text-muted-foreground mt-0.5">For tutors, music teachers & mentors</p>
            </div>
            <div className="font-mono text-2xl font-black text-amber-300">
              10% <span className="text-xs font-normal text-muted-foreground">Commission / class</span>
            </div>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium pt-2 border-t border-border/40">
              <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> 0 Upfront Platform Fees</li>
              <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Host Live Paid Video Classes</li>
              <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Automated Class Attendance Logs</li>
              <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Assign Habits to Class Rosters</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Share Recorded Lectures & Notes</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> First 5 Classes/Mo Commission-Free</li>
            </ul>
          </div>
          <a
            href="#teacher-calculator"
            className="w-full py-2.5 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 font-bold text-xs text-center transition-all block"
          >
            Calculate Earnings ↓
          </a>
        </div>

        {/* Plan 4: School & College Campus */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 flex flex-col justify-between space-y-6 shadow-md hover:border-secondary transition-all">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-secondary/20 text-secondary border border-secondary/30 flex items-center justify-center text-xl">
              🏫
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground font-mono">Campus License</h3>
              <p className="text-xs text-muted-foreground mt-0.5">For schools, colleges & institutions</p>
            </div>
            <div className="font-mono text-2xl font-black text-foreground">
              {symbol}{region === "IN" ? "2,000" : "49"}
              <span className="text-xs font-normal text-muted-foreground"> / student / sem</span>
            </div>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium pt-2 border-t border-border/40">
              <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Bulk 1-Click CSV Student Rosters</li>
              <li className="flex items-center gap-2 text-foreground font-bold"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Multi-Faculty Teaching Portals</li>
              <li className="flex items-center gap-2 text-foreground"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Department Attendance Audit Logs</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Campus Leaderboards & Quests</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary flex-shrink-0" /> Custom Institutional Branding</li>
            </ul>
          </div>
          <a
            href="#campus-calculator"
            className="w-full py-2.5 rounded-xl bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30 font-bold text-xs text-center transition-all block"
          >
            Campus Quote & Calc ↓
          </a>
        </div>
      </div>

      {/* ── Section: Interactive Teacher Earnings Calculator ── */}
      <div id="teacher-calculator" className="p-8 sm:p-10 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-card via-surface/60 to-amber-500/10 shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
              <Calculator className="w-3.5 h-3.5" />
              <span>Teacher & Mentor Calculator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              Estimate Your Teaching Income on PPS
            </h2>
            <p className="text-xs text-muted-foreground">
              See what you take home hosting online batches, music classes, or coding bootcamps.
            </p>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 p-4 rounded-2xl bg-surface/80 border border-border/80">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Students Per Batch:</span>
              <span className="text-amber-400 font-mono">{teacherStudents} Students</span>
            </div>
            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={teacherStudents}
              onChange={(e) => setTeacherStudents(parseInt(e.target.value))}
              className="w-full h-1.5 bg-card rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-surface/80 border border-border/80">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Fee Per Student / Class:</span>
              <span className="text-amber-400 font-mono">{symbol}{teacherFee}</span>
            </div>
            <input
              type="range"
              min={region === "IN" ? 50 : 5}
              max={region === "IN" ? 1500 : 80}
              step={region === "IN" ? 25 : 2}
              value={teacherFee}
              onChange={(e) => setTeacherFee(parseInt(e.target.value))}
              className="w-full h-1.5 bg-card rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-surface/80 border border-border/80">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Classes Per Month:</span>
              <span className="text-amber-400 font-mono">{teacherClassesPerMonth} Sessions</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={teacherClassesPerMonth}
              onChange={(e) => setTeacherClassesPerMonth(parseInt(e.target.value))}
              className="w-full h-1.5 bg-card rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* Live Earnings Projection Banner */}
        <div className="p-6 rounded-2xl bg-card border border-amber-500/40 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Monthly Gross Revenue</div>
            <div className="text-xl font-mono font-bold text-foreground mt-1">
              {symbol}{teacherGross.toLocaleString()}
            </div>
          </div>

          <div className="border-y sm:border-y-0 sm:border-x border-border/50 py-2 sm:py-0">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">PPS Platform Commission (10%)</div>
            <div className="text-xl font-mono font-bold text-red-400 mt-1">
              - {symbol}{ppsCommission.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase font-black">Your Net Monthly Earnings</div>
            <div className="text-2xl font-mono font-black text-amber-300 mt-1">
              {symbol}{teacherNet.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: Institutional Campus License Calculator ── */}
      <div id="campus-calculator" className="p-8 sm:p-10 rounded-3xl border border-secondary/30 bg-gradient-to-br from-card via-surface/60 to-secondary/10 shadow-xl space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-secondary bg-secondary/15 px-3 py-1 rounded-full border border-secondary/30">
            <Building2 className="w-3.5 h-3.5" />
            <span>Campus ROI Calculator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            Institutional Campus Quote
          </h2>
          <p className="text-xs text-muted-foreground">
            Flat semester licensing for coaching institutes, university departments, and colleges.
          </p>
        </div>

        <div className="space-y-2 p-5 rounded-2xl bg-surface/80 border border-border/80 max-w-xl">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Enrolled Students:</span>
            <span className="text-secondary font-mono font-bold text-sm">{campusStudents} Students</span>
          </div>
          <input
            type="range"
            min="20"
            max="600"
            step="10"
            value={campusStudents}
            onChange={(e) => setCampusStudents(parseInt(e.target.value))}
            className="w-full h-1.5 bg-card rounded-lg appearance-none cursor-pointer accent-secondary"
          />
        </div>

        <div className="p-5 rounded-2xl bg-card border border-secondary/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-muted-foreground">Total Semester Institutional Licensing:</div>
            <div className="text-2xl font-mono font-black text-secondary mt-0.5">
              {symbol}{campusCost.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">/ semester</span>
            </div>
          </div>
          <button
            onClick={() => toast.success("Campus sales team inquiry registered! We will reach out within 24h.")}
            className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-extrabold text-xs hover:bg-secondary/90 transition-all cursor-pointer shadow-md"
          >
            Request Official Invoice & Purchase Order
          </button>
        </div>
      </div>

      {/* ── Expanded 18-Row Comparison Table ── */}
      <div className="space-y-6 pt-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-foreground font-mono">
            Detailed Feature Breakdown Across Tiers
          </h2>
          <p className="text-xs text-muted-foreground">
            Complete transparency across every feature in the Personal Performance System.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/80 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-bold text-foreground">Feature</th>
                <th className="p-4 text-center">Free Tier</th>
                <th className="p-4 text-center text-primary font-bold">Student Pro</th>
                <th className="p-4 text-center text-amber-300 font-bold">Teacher Studio</th>
                <th className="p-4 text-center text-secondary font-bold">Campus License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {FEATURES.map((f, i) => (
                <tr key={i} className="hover:bg-surface/50 transition-colors">
                  <td className="p-4 font-bold text-foreground">
                    <span className="text-[10px] text-muted-foreground block font-mono">{f.category}</span>
                    {f.name}
                  </td>
                  <td className="p-4 text-center text-muted-foreground font-medium">{f.free}</td>
                  <td className="p-4 text-center font-bold text-primary">{f.pro}</td>
                  <td className="p-4 text-center font-bold text-amber-300">{f.teacher}</td>
                  <td className="p-4 text-center font-bold text-secondary">{f.campus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ Accordion ── */}
      <div className="max-w-3xl mx-auto space-y-4 pt-6">
        <h2 className="text-2xl font-black text-foreground font-mono text-center mb-6">
          Frequently Asked Questions
        </h2>
        {FAQS.map((faq, i) => (
          <div key={i} className="border border-border/80 rounded-2xl bg-card overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full p-4.5 text-left text-xs font-bold text-foreground flex items-center justify-between cursor-pointer"
            >
              <span>{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
            </button>
            {openFaq === i && (
              <div className="p-4.5 pt-0 text-xs text-muted-foreground leading-relaxed border-t border-border/40 bg-surface/30">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const PricingPage = () => {
  return (
    <SubscriptionProvider>
      <PricingContent />
    </SubscriptionProvider>
  );
};

export default PricingPage;
