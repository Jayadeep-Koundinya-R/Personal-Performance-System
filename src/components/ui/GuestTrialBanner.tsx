import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Clock, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function getLocalStorageUsage(): { usedKB: number; percentage: number } {
  try {
    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || "";
        totalChars += key.length + val.length;
      }
    }
    const usedBytes = totalChars * 2;
    const maxBytes = 5 * 1024 * 1024;
    const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));
    return { usedKB: Math.round(usedBytes / 1024), percentage };
  } catch {
    return { usedKB: 0, percentage: 0 };
  }
}

export default function GuestTrialBanner() {
  const { user, guestDaysRemaining, isGuestTrialExpired } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("pps_dismiss_trial_banner") === "true";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("pps_dismiss_trial_banner", "true");
    } catch {}
  };

  if (!user?.isGuest || isGuestTrialExpired || dismissed) return null;

  const { usedKB, percentage } = getLocalStorageUsage();
  const isStorageHigh = percentage >= 80;

  return (
    <aside
      aria-label="Demo Trial Notification"
      className={`w-full border-b px-4 py-2.5 text-xs text-foreground flex items-center justify-between gap-3 shadow-xs backdrop-blur-xl transition-all z-20 shrink-0 ${
        isStorageHigh
          ? "bg-amber-500/15 border-amber-500/35 text-amber-200"
          : "bg-gradient-to-r from-primary/15 via-background/95 to-primary/10 border-primary/25"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-bold text-foreground text-[11.5px] flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{guestDaysRemaining} {guestDaysRemaining === 1 ? "day" : "days"} left in Demo Trial</span>
          </span>
          <span className="text-muted-foreground/60 hidden sm:inline">•</span>
          <span className="text-muted-foreground text-[11px] truncate hidden md:inline">
            Local Demo Mode. Create a free account or upgrade to Pro to save habits permanently.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/login?tab=signup"
          className="font-bold px-3 py-1.5 rounded-xl text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20 hover:scale-[1.02] cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>Save Progress / Sync Account</span>
        </Link>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface/80 transition-colors cursor-pointer"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
