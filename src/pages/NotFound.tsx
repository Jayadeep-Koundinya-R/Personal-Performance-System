import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, LayoutDashboard, Sun, Moon, Compass, Sparkles } from "lucide-react";
import { ThreeDBackground } from "@/components/ui/ThreeDBackground";
import { BrandLogo } from "@/components/BrandLogo";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Graceful diagnostic route warning without throwing unhandled error traps
    console.info("PPS Route Notice: Requested path was not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background text-foreground relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Ambient Background */}
      <ThreeDBackground />

      {/* Top Header with Theme Switcher */}
      <header className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between relative z-20">
        <Link to="/" className="group">
          <BrandLogo size="md" variant="square" badge="404" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 transition-colors cursor-pointer text-xs flex items-center justify-center"
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Light or Dark Mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
          </button>
          <Link
            to="/dashboard"
            className="text-xs bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-xs"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-lg mx-auto space-y-6 my-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 404 Display */}
        <div className="space-y-3">
          <div className="text-8xl sm:text-9xl font-mono font-black text-primary/20 leading-none select-none">
            404
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-pps-orange bg-pps-orange/10 border border-pps-orange/20 px-3.5 py-1 rounded-full">
            <Compass className="w-3.5 h-3.5" />
            <span>Route Off the Grid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
            This Route Doesn't Exist
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The page at <code className="text-xs bg-surface border border-border/80 px-1.5 py-0.5 rounded-lg font-mono text-primary break-all">{location.pathname}</code> wasn't found. It may have been moved, renamed, or you followed an outdated link.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-surface border border-border/80 text-foreground text-xs sm:text-sm font-bold hover:border-primary/40 hover:bg-card transition-all cursor-pointer shadow-xs h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Button>
          <Link
            to="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-surface border border-border/80 text-foreground text-xs sm:text-sm font-bold hover:border-primary/40 hover:bg-card transition-all shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Open Dashboard</span>
          </Link>
        </div>

        {/* Quick Route Shortcuts */}
        <div className="pt-4 border-t border-border/40">
          <div className="text-[11px] font-mono text-muted-foreground mb-2">QUICK DESTINATIONS:</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link to="/pricing" className="text-xs px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors">
              Pricing Plans
            </Link>
            <Link to="/roadmap" className="text-xs px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors">
              Roadmap 🚀
            </Link>
            <Link to="/marketplace" className="text-xs px-2.5 py-1 rounded-lg bg-surface hover:bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors">
              Mentor Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center relative z-20 text-[11px] text-muted-foreground font-mono">
        PPS v2.0 • Personal Performance System
      </footer>
    </div>
  );
};

export default NotFound;
