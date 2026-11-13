import { Link } from "react-router-dom";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { BrandLogo } from "@/components/BrandLogo";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, LayoutDashboard, Sun, Moon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, user } = useAuth();
  const hasActiveAccount = isLoggedIn && !user?.isGuest;

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary selection:text-white transition-colors duration-500 overflow-x-hidden flex flex-col justify-between">
      {/* 🌌 Dynamic 3D Ambient Background Layer */}
      <ThreeDBackground />

      {/* 📊 Top Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Top Global Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-card/80 border-b border-border/40 transition-colors duration-500">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center group">
            <BrandLogo size="md" variant="square" badge="Privacy Policy" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/terms"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-surface hidden sm:inline-flex"
            >
              Terms of Service
            </Link>

            <Link
              to="/pricing"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-surface hidden sm:inline-flex"
            >
              Pricing
            </Link>

            {hasActiveAccount ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/80 px-3.5 py-1.5 rounded-2xl transition-all shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
                <span>Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/80 px-3 py-1.5 rounded-2xl transition-all shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
            )}

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs flex items-center justify-center h-8 w-8"
              title="Toggle Light / Dark Mode"
              aria-label="Toggle Light or Dark Mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-pps-orange" /> : <Moon className="w-4 h-4 text-primary" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Legal Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 relative z-10">
        <article className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="border-b border-border/60 pb-5">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Data Protection & Privacy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">Privacy Policy</h1>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Effective Date: August 12, 2026 | UpaLakshya Labs • PPS
            </p>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            At UpaLakshya Labs ("Company", "we", "us"), respecting your privacy and safeguarding your personal information is fundamental to building the Personal Performance System ("PPS"). This Privacy Policy explains how we collect, use, store, disclose, and safeguard your information when you use our web application and services.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Information We Collect</h2>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p><strong>A. Account & Contact Data:</strong> When registering, we collect your email address, display name, username, and authentication metadata.</p>
              <p><strong>B. Application & Performance Data:</strong> Your habit names, completion timestamps, streaks, category tags, daily reflections, energy levels, reminder schedules, and gamification points (XP/Level).</p>
              <p><strong>C. Billing & Payment Data:</strong> All payments are processed directly via Stripe. We do not store full credit card numbers, CVVs, or bank details on our servers. We receive payment confirmation tokens and subscription status from Stripe.</p>
              <p><strong>D. Guest Mode Data:</strong> Operating in Guest mode stores all habits and entries purely within your local web browser's storage (localStorage/sessionStorage). No local Guest data is transmitted to our cloud backend until you voluntarily register or sign in.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1 leading-relaxed">
              <li>To provide, maintain, and personalize habit tracking, focus tools, and performance analytics.</li>
              <li>To sync your habits and reflections across your devices via Supabase cloud database.</li>
              <li>To facilitate social features (leaderboards, co-op quests, accountability circles) when enabled.</li>
              <li>To process paid subscriptions, issue receipts, and manage account privileges.</li>
              <li>To send critical system alerts, product updates, or transactional emails.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Storage & Row Level Security (RLS)</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Your data is stored in PostgreSQL database infrastructure managed by Supabase, protected by strict Row Level Security (RLS) policies. This ensures that your private habits, reflections, and reminders can only be accessed by your authenticated user ID.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Data Export, Portability & Deletion Rights</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              You maintain full ownership of your data. You may download a complete backup of your habits and reflections in JSON or CSV format at any time directly from the Settings page. You may also request complete deletion of your account and cloud data by contacting <span className="font-mono text-primary font-bold">privacy@upalakshya.com</span>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Third-Party Service Providers</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We share minimal necessary data with trusted service providers strictly to operate PPS:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1 leading-relaxed">
              <li><strong>Supabase:</strong> Authentication & Cloud Database Hosting</li>
              <li><strong>Stripe:</strong> Secure Payment Processing & Subscription Billing</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Contact Information</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact our Data Protection Officer at:
              <br />
              <span className="font-mono text-primary font-bold">privacy@upalakshya.com</span>
            </p>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center relative z-20 text-[11px] text-muted-foreground font-mono border-t border-border/40 mt-10">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <span>•</span>
          <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        </div>
        <div>PPS v2.0 • Personal Performance System • UpaLakshya Labs</div>
      </footer>

      {/* 🚀 Floating Scroll to Top */}
      <ScrollToTop />
    </div>
  );
}
