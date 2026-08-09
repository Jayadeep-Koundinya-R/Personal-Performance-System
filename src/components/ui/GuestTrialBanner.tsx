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
  const [dismissed, setDismissed] = useState(false);

  if (!user?.isGuest || isGuestTrialExpired || dismissed) return null;

  const { usedKB, percentage } = getLocalStorageUsage();
  const isStorageHigh = percentage >= 80;

  return (
    <div className={`border-b px-4 py-2.5 text-xs text-foreground flex items-center justify-between gap-3 shadow-sm backdrop-blur-md transition-colors ${
      isStorageHigh
        ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
        : "bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 border-primary/30"
    }`}>
      <div className="flex items-center gap-2 flex-wrap">
        {isStorageHigh ? (
          <span className="flex items-center gap-1 bg-amber-500/30 text-amber-300 border border-amber-500/50 font-mono font-bold px-2 py-0.5 rounded-md text-[11px]">
            ⚠️ Local Storage {percentage}% Full ({usedKB} KB)
          </span>
        ) : (
          <span className="flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 font-mono font-bold px-2 py-0.5 rounded-md text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            {guestDaysRemaining} {guestDaysRemaining === 1 ? "day" : "days"} left in Demo Trial
          </span>
        )}

        <span className="font-medium text-muted-foreground hidden sm:inline">
          {isStorageHigh
            ? "Your browser storage is nearly full! Create a free account now to prevent local data loss."
            : "Create a free account or upgrade to Pro to save your XP, streaks, and habits permanently!"}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/login?tab=signup"
          className={`font-bold px-3 py-1 rounded-lg text-[11.5px] hover:opacity-90 transition-all flex items-center gap-1 shadow-xs ${
            isStorageHigh ? "bg-amber-500 text-black font-extrabold" : "bg-primary text-primary-foreground"
          }`}
        >
          <span>{isStorageHigh ? "Prevent Data Loss →" : "Save Progress"}</span>
          {!isStorageHigh && <ArrowRight className="w-3 h-3" />}
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface/50 transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
