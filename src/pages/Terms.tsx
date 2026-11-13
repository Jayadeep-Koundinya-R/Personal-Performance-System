import { Link } from "react-router-dom";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { BrandLogo } from "@/components/BrandLogo";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, LayoutDashboard, Sun, Moon, FileText } from "lucide-react";

export default function TermsPage() {
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
            <BrandLogo size="md" variant="square" badge="Terms of Service" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/privacy"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-surface hidden sm:inline-flex"
            >
              Privacy Policy
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
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs flex items-center justify-center"
              title="Toggle Light / Dark Mode"
              aria-label="Toggle Light or Dark Mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-pps-orange" /> : <Moon className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Legal Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 relative z-10">
        <article className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="border-b border-border/60 pb-5">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>Platform Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">Terms of Service</h1>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Effective Date: August 12, 2026 | UpaLakshya Labs • PPS
            </p>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Welcome to the Personal Performance System ("PPS", "Service", "Platform"), operated by UpaLakshya Labs ("Company", "we", "us", or "our"). By accessing or using our website, application, or services, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Description of Service</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              PPS is a personal habit tracking, productivity analytics, focus studio, and gamified personal growth platform. We provide both free tier services and paid subscription tiers ("Pro", "Institution") with advanced analytics, unlimited habits, social features, and AI-assisted coaching.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Account Registration & Security</h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1 leading-relaxed">
              <li>You must provide accurate, complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</li>
              <li>Guest mode operates strictly via local browser storage (localStorage). Data created in Guest mode is un-synced until you register an account.</li>
              <li>You must notify us immediately at <span className="font-mono text-primary font-bold">security@upalakshya.com</span> upon discovering any unauthorized use of your account.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Subscriptions, Pricing & Billing</h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
              <li><strong>Billing Cycle:</strong> Pro subscriptions are billed in advance on a recurring monthly or annual basis depending on your selection.</li>
              <li><strong>Regional Pricing:</strong> We offer localized purchasing power parity (PPP) pricing (e.g. ₹199/month in India) and standard international pricing ($9.99/month). Billing is processed securely via Stripe.</li>
              <li><strong>Auto-Renewal:</strong> Your subscription automatically renews at the end of each billing period unless cancelled prior to renewal through your Settings page billing portal.</li>
              <li><strong>30-Day Money-Back Guarantee:</strong> If you are dissatisfied with PPS Pro within 30 days of initial purchase, contact support at <span className="font-mono text-primary font-bold">billing@upalakshya.com</span> for a full, no-questions-asked refund.</li>
              <li><strong>Price Changes:</strong> We reserve the right to adjust pricing upon 30 days' advance notice to active subscribers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. User Conduct & Acceptable Use</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              You agree not to modify, reverse-engineer, decompile, or attempt to extract source code from PPS. You must not use automated tools, bots, or scrapers to access the platform, bypass usage limits, or disrupt platform infrastructure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Intellectual Property Rights</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              All rights, title, and interest in and to PPS (excluding user-generated habit entries and reflections) — including software, interface design, logos, trademarks, and gamification architecture — are the exclusive property of UpaLakshya Labs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Limitation of Liability</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              To the maximum extent permitted by applicable law, UpaLakshya Labs shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of or in connection with your use of PPS.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Contact & Support</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              For questions regarding these Terms or billing inquiries, please contact us at:
              <br />
              <span className="font-mono text-primary font-bold">legal@upalakshya.com</span> | <span className="font-mono text-primary font-bold">support@upalakshya.com</span>
            </p>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center relative z-20 text-[11px] text-muted-foreground font-mono border-t border-border/40 mt-10">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
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
