import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Clock, X } from "lucide-react";
import { feedbackSounds } from "@/lib/audio/clickFeedback";

interface InteractiveDemoExperienceBannerProps {
  guestDaysRemaining?: number;
  onNavigate?: (section: string) => void;
  onStartSprint?: (durationMinutes: number) => void;
}

export const InteractiveDemoExperienceBanner: React.FC<InteractiveDemoExperienceBannerProps> = ({
  guestDaysRemaining = 5,
}) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("pps_demo_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    feedbackSounds.playClick();
    setDismissed(true);
    try {
      sessionStorage.setItem("pps_demo_banner_dismissed", "true");
    } catch {}
  };

  if (dismissed) return null;

  return (
    <aside
      aria-label="Interactive Demo Mode Notice"
      className="w-full bg-gradient-to-r from-primary/15 via-card/90 to-accent/10 border border-primary/25 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs mb-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
        </span>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>⚡ 5-Day Guest Demo ({guestDaysRemaining}d remaining)</span>
          </span>
          <span className="text-muted-foreground/60 hidden sm:inline">•</span>
          <span className="text-[11px] text-muted-foreground truncate hidden md:inline">
            Local browser storage. Habits & streaks stay on this device until you sync.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/login?tab=signup"
          onClick={() => feedbackSounds.playClick()}
          className="bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>Save Progress / Sync Account</span>
        </Link>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface/80 transition-colors cursor-pointer"
          title="Dismiss demo banner"
          aria-label="Dismiss demo banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
