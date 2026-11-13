import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { 
  Bell, 
  Flame, 
  Moon, 
  Zap, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Sparkles,
  Info
} from "lucide-react";

interface NotificationBarProps {
  onNavigate?: (section: string) => void;
}

function getAlertStyle(type?: string, priority?: string) {
  if (priority === "urgent" || type === "curfew" || type === "alarm") {
    return {
      bg: "bg-rose-950/40 border-rose-500/50 text-rose-200",
      accent: "text-rose-400 bg-rose-500/20 border-rose-500/30",
      badge: "🔥 URGENT CURFEW",
      icon: Moon,
    };
  }
  if (type === "circadian") {
    return {
      bg: "bg-amber-950/40 border-amber-500/50 text-amber-200",
      accent: "text-amber-400 bg-amber-500/20 border-amber-500/30",
      badge: "⚡ CIRCADIAN PEAK",
      icon: Zap,
    };
  }
  if (type === "streak_defense" || type === "streak") {
    return {
      bg: "bg-orange-950/40 border-orange-500/50 text-orange-200",
      accent: "text-orange-400 bg-orange-500/20 border-orange-500/30",
      badge: "🛡️ STREAK SHIELD",
      icon: Flame,
    };
  }
  if (type === "squad") {
    return {
      bg: "bg-cyan-950/40 border-cyan-500/50 text-cyan-200",
      accent: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
      badge: "👥 SQUAD SYNC",
      icon: Users,
    };
  }
  return {
    bg: "bg-primary/10 border-primary/30 text-foreground",
    accent: "text-primary bg-primary/15 border-primary/20",
    badge: "🔔 ACTION REQUIRED",
    icon: Bell,
  };
}

export const NotificationBar: React.FC<NotificationBarProps> = ({ onNavigate }) => {
  const { activeBannerAlert, markAsRead, dismissNotification } = useNotifications();
  const [showFactDetails, setShowFactDetails] = useState(false);

  if (!activeBannerAlert) {
    return null;
  }

  const style = getAlertStyle(activeBannerAlert.type, activeBannerAlert.priority);
  const AlertIcon = style.icon;

  const handleAction = () => {
    markAsRead(activeBannerAlert.id);
    if (activeBannerAlert.actionPayload?.section && onNavigate) {
      onNavigate(activeBannerAlert.actionPayload.section);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissNotification(activeBannerAlert.id);
  };

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="High Signal Notification"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="w-full mb-4 relative z-30"
      >
        <div
          className={`w-full rounded-2xl border backdrop-blur-xl p-3 sm:p-3.5 shadow-lg transition-all duration-300 ${style.bg}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Priority Badge & Title & Message */}
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center ${style.accent}`}
              >
                <AlertIcon className="w-4 h-4 animate-pulse" />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border bg-background/50 text-foreground">
                    {style.badge}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                    {activeBannerAlert.title}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                  {activeBannerAlert.message}
                </p>

                {/* Reason & Fact Tag */}
                {activeBannerAlert.reason && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground/90 bg-background/40 border border-border/40 px-2 py-0.5 rounded-md">
                      <span className="text-amber-400">💡</span>
                      <strong className="font-semibold">Reason:</strong> {activeBannerAlert.reason}
                    </span>

                    {activeBannerAlert.fact && (
                      <button
                        type="button"
                        onClick={() => setShowFactDetails((prev) => !prev)}
                        className="text-[10.5px] font-mono text-primary underline hover:text-primary/80 cursor-pointer flex items-center gap-0.5"
                      >
                        <Info className="w-3 h-3 inline" />
                        <span>{showFactDetails ? "Hide Fact" : "Why this matters"}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Expandable Scientific Fact */}
                {showFactDetails && activeBannerAlert.fact && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-2 mt-1.5 rounded-xl bg-surface/80 border border-primary/20 text-[11px] text-foreground font-mono space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-primary font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Scientific Productivity Fact:</span>
                    </div>
                    <p className="text-muted-foreground leading-normal">
                      {activeBannerAlert.fact}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              {activeBannerAlert.actionLabel && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>{activeBannerAlert.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-background/40 transition-colors cursor-pointer"
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
