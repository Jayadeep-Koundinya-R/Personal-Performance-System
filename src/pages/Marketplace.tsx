import React from "react";
import { Link } from "react-router-dom";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { TeacherMarketplace } from "@/components/focus-rooms/TeacherMarketplace";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { DashboardProviders } from "@/providers/AppProviders";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

export const MarketplacePageInner: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary selection:text-white transition-colors duration-500 overflow-x-hidden flex flex-col justify-between">
      {/* 🌌 Dynamic 3D Ambient Background Layer */}
      <ThreeDBackground />

      {/* 📊 Top Scroll Progress Bar */}
      <ScrollProgressBar />


      {/* Top Global Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-card/80 border-b border-border/40 transition-colors duration-500">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-xl font-black text-primary tracking-wider">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span>PPS<span className="text-secondary">.</span></span>
            <span className="text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase hidden sm:inline">
              Mentor Hub
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/80 px-3.5 py-1.5 rounded-2xl transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <Link
              to="/roadmap"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-surface hidden md:inline-flex"
            >
              Roadmap 🚀
            </Link>

            <Link
              to="/pricing"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-surface"
            >
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
              <Link to="/dashboard" className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black hover:opacity-90 transition-all shadow-md shadow-primary/25">
                Dashboard →
              </Link>
            ) : (
              <Link to="/login" className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black hover:opacity-90 transition-all shadow-md shadow-primary/25">
                Start Free
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Mentor Hub Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 relative z-10">
        <TeacherMarketplace />
      </main>

      {/* Global Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-card/60 backdrop-blur-md py-8 text-center text-xs text-muted-foreground font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2026 UpaLakshya Labs • PPS Operating System</span>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/roadmap" className="hover:text-foreground">Roadmap</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>

      {/* 🚀 Floating Scroll to Top */}
      <ScrollToTop />
    </div>
  );
};


export const MarketplacePage: React.FC = () => {
  const { user, loading } = useAuth();

  const currentUser = user || {
    id: "guest_local",
    email: "guest@pps.local",
    isGuest: true,
  };

  return (
    <DashboardProviders user={currentUser}>
      <MarketplacePageInner />
    </DashboardProviders>
  );
};

export default MarketplacePage;
