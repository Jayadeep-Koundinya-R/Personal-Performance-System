/*
  🏠 Premium Landing Page — Personal Performance System
  
  Sections:
  1. Navbar with glassmorphic styling
  2. Animated Hero with gradient text, stats, and app preview
  3. Social Proof bar
  4. Full 12-Feature Showcase
  5. How It Works (3-Step Flow)
  6. Live App Preview (mini-dashboard mockup)
  7. Competitor Comparison Table
  8. Testimonials
  9. FAQ Accordion
  10. Final CTA Banner
  11. Rich Multi-Column Footer
*/

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/* ── data ────────────────────────────────────────────── */

const FEATURES = [
  { icon: "⚡", title: "Command Dashboard", desc: "Real-time stat cards, priority task lists, and motivational quotes — your daily mission control." },
  { icon: "🎯", title: "Focus Studio", desc: "Built-in Pomodoro timer with session tracking. Link habits, log deep-work, and never lose focus." },
  { icon: "📅", title: "Performance Calendar", desc: "Month grid, weekly schedule, and agenda stream views — see perfect days highlighted with trophies." },
  { icon: "📊", title: "Deep Analytics", desc: "Completion rate, streak momentum, habit velocity, category distribution, and energy correlation." },
  { icon: "🔥", title: "Streak Engine", desc: "Unbroken chain counters, global rank tiers, emergency alerts, and streak shield protection." },
  { icon: "🏅", title: "Achievements", desc: "Unlock milestone badges, claim bonus XP, and build your trophy wall as you level up." },
  { icon: "👥", title: "Social Hub", desc: "Global leaderboard, accountability circles, co-op quests, and shareable win cards." },
  { icon: "📈", title: "Executive Reports", desc: "Generate PDF reports, download CSV data, and analyze week-over-week growth trends." },
  { icon: "📝", title: "Reflections Journal", desc: "Daily guided prompts, mood & energy tracking, custom tags, and historical timeline search." },
  { icon: "⚙️", title: "Habit Architect", desc: "Create, edit, archive habits with categories, priorities, time windows, colors, and alarm links." },
  { icon: "🔔", title: "Alarm Studio", desc: "Circadian presets, habit-linked alarms, custom sounds, snooze controls, and push notifications." },
  { icon: "🤖", title: "AI Performance Coach", desc: "Smart offline coach that analyzes your data, offers roasts, audits, and 1-click habit completion in chat." },
];

const HOW_IT_WORKS = [
  { step: "01", icon: "🎯", title: "Create Your Habits", desc: "Add habits with categories, priorities, and schedules. Use starter packs or build from scratch." },
  { step: "02", icon: "🔥", title: "Track & Build Streaks", desc: "Check off habits daily. Earn 10 XP per completion. Build unbroken chains and protect with shields." },
  { step: "03", icon: "📊", title: "Level Up & Analyze", desc: "Watch your XP grow, unlock achievements, and use deep analytics to optimize your performance." },
];

const COMPETITORS = [
  { feature: "Habit CRUD & Scheduling", pps: true, habitica: true, streaks: true, notion: true },
  { feature: "XP & Leveling System", pps: true, habitica: true, streaks: false, notion: false },
  { feature: "Streak Shields & Freezes", pps: true, habitica: false, streaks: false, notion: false },
  { feature: "AI Performance Coach", pps: true, habitica: false, streaks: false, notion: false },
  { feature: "Built-in Pomodoro Timer", pps: true, habitica: false, streaks: false, notion: false },
  { feature: "Deep Analytics & Forecasts", pps: true, habitica: false, streaks: false, notion: false },
  { feature: "PDF & CSV Reports", pps: true, habitica: false, streaks: false, notion: false },
  { feature: "Daily Reflections Journal", pps: true, habitica: false, streaks: false, notion: true },
  { feature: "Global Leaderboard", pps: true, habitica: true, streaks: false, notion: false },
  { feature: "PWA / Installable", pps: true, habitica: false, streaks: false, notion: false },
  { feature: "100% Free Tier", pps: true, habitica: true, streaks: false, notion: true },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Product Designer", avatar: "🧑‍🎨", quote: "PPS replaced 3 apps for me — habit tracker, journal, and Pomodoro timer. The streak engine is genuinely addictive." },
  { name: "Marcus T.", role: "Software Engineer", avatar: "👨‍💻", quote: "The gamification loop hooked me instantly. Seeing my XP bar fill up after completing habits makes consistency feel rewarding." },
  { name: "Priya R.", role: "Graduate Student", avatar: "👩‍🎓", quote: "The AI Coach actually analyzes my habits and gives real advice. It roasted me for skipping meditation 3 days in a row!" },
];

const FAQS = [
  { q: "Is PPS really free?", a: "Yes! The free tier includes up to 15 active habits, 7-day analytics, streak tracking, XP leveling, achievements, and AI Coach access. No credit card required." },
  { q: "How does the XP & leveling system work?", a: "Every habit completion earns 10 XP. Every 100 XP levels you up. Your level, rank, and XP are displayed across the dashboard, leaderboard, and profile." },
  { q: "Can I use PPS on my phone?", a: "Absolutely! PPS is a Progressive Web App (PWA). Install it directly from your browser on any device — iOS, Android, or desktop. It works offline too." },
  { q: "What is the AI Performance Coach?", a: "It's a smart assistant that analyzes your habit data, pending tasks, and streaks to give personalized coaching — including performance roasts, daily audits, and 1-click habit completion inside the chat." },
  { q: "What are Streak Shields?", a: "Streak Shields (freeze credits) protect your streak if you miss a day. Free users get 1/month, Pro users get 3/month plus auto-shield automation." },
  { q: "What's included in Pro?", a: "Pro unlocks unlimited habits, full analytics history, all achievement badges, social features (circles, co-op quests, share cards), unlimited AI Coach messages, and priority support." },
  { q: "Can I export my data?", a: "Yes — Executive PDF reports, CSV spreadsheets, and full JSON data backups are all available from the Reports and Settings pages." },
  { q: "How is PPS different from Habitica or Streaks?", a: "PPS combines habit tracking with deep analytics, a built-in Pomodoro timer, AI coaching, PDF reports, daily reflections, and streak shields — features no single competitor offers together." },
];

/* ── animation variants ──────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ── component ───────────────────────────────────────── */

const HomePage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <Link to="/" className="font-mono text-xl font-extrabold text-primary tracking-[3px]">
            PPS<span className="text-secondary">.</span>
          </Link>
          <div className="flex items-center gap-1">
            <a href="#features" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface hidden sm:inline-flex">Features</a>
            <a href="#how-it-works" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface hidden sm:inline-flex">How It Works</a>
            <Link to="/pricing" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface">Pricing</Link>
            <Link to="/login?tab=signin" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface">Login</Link>
            <Link to="/login?tab=signup" className="text-[13px] bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all ml-1 shadow-md shadow-primary/20">
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 sm:pt-28 pb-20 text-center overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />

        <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10">
          <motion.div variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-7 uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Personal Performance System
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight"
          >
            Build better habits.
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Level up your life.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2}
            className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The gamified habit tracker with deep analytics, AI coaching, streak protection, and a built-in focus timer.
            Track everything. Stay accountable. Get results.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/login?tab=signup"
              className="bg-gradient-to-br from-primary to-accent text-white py-3.5 px-9 rounded-xl text-sm font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 shadow-lg shadow-primary/20"
            >
              Start Free — No Credit Card →
            </Link>
            <a href="#features"
              className="text-sm text-foreground border border-border/80 py-3.5 px-7 rounded-xl hover:border-primary/50 hover:bg-surface transition-all duration-200 font-semibold"
            >
              Explore Features ↓
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={fadeUp} custom={4}
            className="flex items-center justify-center gap-6 sm:gap-12 mt-16 flex-wrap"
          >
            {[
              { value: "12+", label: "Built-in Features", color: "text-primary" },
              { value: "100%", label: "Free to Start", color: "text-pps-green" },
              { value: "PWA", label: "Works Offline", color: "text-secondary" },
              { value: "🤖", label: "AI Coach Included", color: "text-pps-orange" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Mini dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-2xl">
            {/* Mock header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-sm font-extrabold text-foreground">Good Morning, Alex 👋</div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">4 habits due today</div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] bg-pps-green/10 text-pps-green border border-pps-green/20 px-2.5 py-1 rounded-full font-bold">Level 5</span>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">490 XP</span>
              </div>
            </div>
            {/* Mock stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Completion Rate", value: "87%", accent: "border-primary/30 bg-primary/5" },
                { label: "Current Streak", value: "12 🔥", accent: "border-pps-orange/30 bg-pps-orange/5" },
                { label: "Freeze Credits", value: "3", accent: "border-pps-blue/30 bg-pps-blue/5" },
                { label: "Points This Week", value: "140", accent: "border-pps-green/30 bg-pps-green/5" },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl border p-3 ${c.accent}`}>
                  <div className="text-lg font-extrabold font-mono text-foreground">{c.value}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
            {/* Mock habit list */}
            <div className="space-y-2">
              {["Morning Meditation", "Read 20 Pages", "Exercise 30 min"].map((h, i) => (
                <div key={h} className="flex items-center gap-3 bg-surface/80 rounded-xl px-4 py-2.5 border border-border/40">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-[10px] ${i === 0 ? "border-pps-green bg-pps-green/20 text-pps-green" : "border-border"}`}>
                    {i === 0 && "✓"}
                  </div>
                  <span className={`text-[13px] font-semibold ${i === 0 ? "line-through text-muted-foreground" : "text-foreground"}`}>{h}</span>
                  {i === 0 && <span className="ml-auto text-[10px] text-pps-green font-bold">+10 XP</span>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ SOCIAL PROOF BAR ═══════════ */}
      <section className="border-y border-border/60 bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-center gap-8 sm:gap-16 flex-wrap text-center">
          {[
            { value: "500+", label: "Habits Tracked" },
            { value: "10,000+", label: "Completions Logged" },
            { value: "4.9★", label: "User Rating" },
            { value: "12", label: "Built-in Tools" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-lg font-extrabold font-mono text-foreground">{s.value}</div>
              <div className="text-[11px] text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-14">
          <motion.div variants={fadeUp} custom={0} className="inline-block text-[11px] font-mono font-bold text-secondary bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            Full Feature Suite
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold mb-3">
            Everything you need to <span className="text-primary">stay on track</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-xl mx-auto">
            12 deeply integrated tools — from habit tracking to AI coaching — all in one place.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} variants={fadeUp} custom={i}
              className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
              <h3 className="font-extrabold text-sm mb-1.5 text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-[12.5px] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="bg-surface/30 border-y border-border/60">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="text-center mb-14">
            <motion.div variants={fadeUp} custom={0} className="inline-block text-[11px] font-mono font-bold text-pps-green bg-pps-green/10 border border-pps-green/20 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              Simple 3-Step Process
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold mb-3">
              How <span className="text-primary">PPS</span> works
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-lg mx-auto">
              Get started in under 2 minutes. No setup complexity.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div key={s.step} variants={fadeUp} custom={i}
                className="relative bg-card border border-border/60 rounded-2xl p-6 text-center hover:border-primary/30 transition-all"
              >
                <div className="text-[10px] font-mono font-extrabold text-primary bg-primary/10 border border-primary/20 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-extrabold text-sm mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-[12.5px] leading-relaxed">{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-muted-foreground/40 text-xl font-bold">→</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ COMPETITOR COMPARISON ═══════════ */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-10">
          <motion.div variants={fadeUp} custom={0} className="inline-block text-[11px] font-mono font-bold text-pps-orange bg-pps-orange/10 border border-pps-orange/20 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            Why Choose PPS
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold mb-3">
            PPS vs. the <span className="text-primary">competition</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-lg mx-auto">
            See how PPS stacks up against popular habit trackers.
          </motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-lg"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left p-4 font-bold text-muted-foreground">Feature</th>
                  <th className="p-4 font-extrabold text-primary">PPS</th>
                  <th className="p-4 font-semibold text-muted-foreground">Habitica</th>
                  <th className="p-4 font-semibold text-muted-foreground">Streaks</th>
                  <th className="p-4 font-semibold text-muted-foreground">Notion</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.feature} className="border-b border-border/30 hover:bg-surface/30 transition-colors">
                    <td className="p-4 font-medium">{c.feature}</td>
                    <td className="p-4 text-center">{c.pps ? <span className="text-pps-green font-bold">✓</span> : <span className="text-muted-foreground">✕</span>}</td>
                    <td className="p-4 text-center">{c.habitica ? <span className="text-pps-green/70">✓</span> : <span className="text-muted-foreground">✕</span>}</td>
                    <td className="p-4 text-center">{c.streaks ? <span className="text-pps-green/70">✓</span> : <span className="text-muted-foreground">✕</span>}</td>
                    <td className="p-4 text-center">{c.notion ? <span className="text-pps-green/70">✓</span> : <span className="text-muted-foreground">✕</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="bg-surface/30 border-y border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="text-center mb-12">
            <motion.div variants={fadeUp} custom={0} className="inline-block text-[11px] font-mono font-bold text-secondary bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              What Users Say
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold">
              Loved by <span className="text-primary">performers</span>
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}
                className="bg-card border border-border/60 rounded-2xl p-6 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">{t.avatar}</div>
                  <div>
                    <div className="font-extrabold text-sm">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                <div className="text-pps-orange text-[11px] mt-3 font-bold">★★★★★</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="text-center mb-12">
          <motion.div variants={fadeUp} custom={0} className="inline-block text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            FAQ
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold">
            Frequently asked <span className="text-primary">questions</span>
          </motion.h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border/60 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-surface/50 transition-colors"
              >
                <span className="font-bold text-sm text-foreground">{f.q}</span>
                <span className="text-muted-foreground text-lg ml-4 flex-shrink-0 transition-transform duration-200" style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {f.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-gradient-to-br from-primary/15 via-card to-secondary/10 border border-primary/20 rounded-3xl p-10 sm:p-14 text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Ready to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">level up</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm leading-relaxed">
              Join hundreds of users building better habits with PPS. Free tier included — no credit card required. Upgrade to Pro when you're ready.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/login?tab=signup"
                className="bg-gradient-to-br from-primary to-accent text-white py-3.5 px-9 rounded-xl text-sm font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 shadow-lg shadow-primary/20"
              >
                Get Started Free →
              </Link>
              <Link to="/pricing"
                className="text-sm text-foreground border border-border/80 py-3.5 px-7 rounded-xl hover:border-primary/50 hover:bg-surface transition-all duration-200 font-semibold"
              >
                View Pro Plans
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border/60 bg-surface/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="font-mono text-xl font-extrabold text-primary tracking-[3px] mb-2">
                PPS<span className="text-secondary">.</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Personal Performance System — the gamified habit tracker that helps you level up your life.
              </p>
            </div>
            {/* Product */}
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">Product</div>
              <div className="space-y-2">
                <a href="#features" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <Link to="/pricing" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
                <a href="#how-it-works" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              </div>
            </div>
            {/* Resources */}
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">Resources</div>
              <div className="space-y-2">
                <a href="#faq" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
                <Link to="/login" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                <Link to="/login?tab=signup" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link>
              </div>
            </div>
            {/* Legal */}
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">Legal</div>
              <div className="space-y-2">
                <Link to="/privacy" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border/40 pt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} PPS — Personal Performance System. All rights reserved.
            </div>
            <div className="text-[12px] text-muted-foreground">
              Built with ⚡ for performers
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
