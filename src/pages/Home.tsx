/*
  💡 REACT LESSON: Landing Page
  
  This is the public-facing home page users see before logging in.
  It showcases PPS features and has a CTA to sign in / sign up.
  
  Key pattern: <Link> from react-router-dom replaces <a href="...">
*/

import { Link } from "react-router-dom";

const FEATURES = [
  { icon: "📋", title: "Daily Tracker", desc: "Track habits with smart scheduling — daily, weekly, or custom." },
  { icon: "🔥", title: "Streak Engine", desc: "Build momentum with streaks, freeze credits, and streak shields." },
  { icon: "📊", title: "Analytics", desc: "Visualize your progress with charts, heatmaps, and insights." },
  { icon: "🎮", title: "Gamification", desc: "Earn XP, level up, and unlock achievements as you build habits." },
  { icon: "📝", title: "Reflections", desc: "Journal your thoughts and track your mindset over time." },
  { icon: "🔔", title: "Reminders", desc: "Never miss a habit with smart, customizable reminders." },
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-6xl mx-auto">
        <div className="font-mono text-xl font-bold text-primary tracking-[2px]">
          PPS<span className="text-secondary">.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/pricing"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Pricing
          </Link>
          <Link
            to="/login?tab=signin"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Login
          </Link>
          <Link
            to="/login?tab=signup"
            className="text-[13px] bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block text-[11px] font-mono text-secondary bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full mb-6">
          ⚡ Your personal performance toolkit
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5">
          Build better habits.
          <br />
          <span className="text-primary">Level up your life.</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-10">
          PPS is a gamified habit tracker that helps you stay consistent, build streaks, earn XP, and see your growth through beautiful analytics.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login?tab=signup"
            className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-3 px-8 rounded-lg text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all"
          >
            Sign Up →
          </Link>
          <a
            href="#features"
            className="text-sm text-muted-foreground border border-border py-3 px-6 rounded-lg hover:text-foreground hover:border-muted-foreground transition-all"
          >
            See Features
          </a>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-10 mt-16 text-center">
          <div>
            <div className="text-2xl font-bold font-mono text-primary">Free</div>
            <div className="text-[11px] text-muted-foreground mt-1">Free to start</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="text-2xl font-bold font-mono text-pps-orange">🔥</div>
            <div className="text-[11px] text-muted-foreground mt-1">Streak Tracking</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="text-2xl font-bold font-mono text-pps-green">XP</div>
            <div className="text-[11px] text-muted-foreground mt-1">Gamified System</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Everything you need to stay on track</h2>
        <p className="text-muted-foreground text-sm text-center mb-10">Built with focus, designed for growth.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-muted-foreground text-[13px]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/15 rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to level up?</h2>
          <p className="text-muted-foreground text-sm mb-6">Start building habits that stick. Free tier included — upgrade to Pro when you need more.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/login?tab=signup"
              className="inline-block bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-3 px-8 rounded-lg text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all"
            >
              Get Started Free →
            </Link>
            <Link
              to="/pricing"
              className="inline-block text-sm border border-border py-3 px-6 rounded-lg hover:border-primary transition-all"
            >
              View Pro Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-[12px] text-muted-foreground">
        <span className="font-mono font-bold text-primary">PPS</span><span className="text-secondary">.</span> — Personal Performance System © {new Date().getFullYear()}
        <div className="mt-2">
          <Link to="/pricing" className="hover:text-foreground mr-3">Pricing</Link>
          <Link to="/privacy" className="hover:text-foreground mr-3">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
