import React, { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, User } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { TrackPreferenceSelector } from '@/components/settings/TrackPreferenceSelector';
import { BrandLogo } from '@/components/BrandLogo';
import { ThreeDBackground } from '@/components/ui/ThreeDBackground';
import { Loader2, ArrowLeft, LayoutDashboard, Sun, Moon } from 'lucide-react';

const SettingsSection = lazy(() => import('@/components/sections/SettingsSection'));

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const currentUser: User = user || { email: null, isGuest: true };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary selection:text-white transition-colors duration-500 overflow-x-hidden flex flex-col justify-between">
      {/* 🌌 Dynamic 3D Ambient Background Layer */}
      <ThreeDBackground />

      {/* Top Global Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-card/80 border-b border-border/40 transition-colors duration-500">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center group">
            <BrandLogo size="md" variant="square" badge="Settings" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/80 px-3.5 py-1.5 rounded-2xl transition-all shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface/80 hover:bg-surface border border-border/80 px-3 py-1.5 rounded-2xl transition-all shadow-xs hidden sm:inline-flex"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

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

      {/* Main Settings Studio Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        {/* Active Track & Discipline Section */}
        <section className="space-y-4" id="active-track-discipline-section">
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Active Track & Discipline</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Configure your primary focus discipline, circadian challenge layer, and cohort track.
            </p>
          </div>
          <TrackPreferenceSelector />
        </section>

        {/* Core Settings Studio */}
        <Suspense
          fallback={
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs font-mono font-bold text-muted-foreground">Loading settings studio...</span>
            </div>
          }
        >
          <SettingsSection user={currentUser} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center relative z-20 text-[11px] text-muted-foreground font-mono border-t border-border/40 mt-8">
        PPS v2.0 • Personal Performance System Settings Studio
      </footer>
    </div>
  );
}
