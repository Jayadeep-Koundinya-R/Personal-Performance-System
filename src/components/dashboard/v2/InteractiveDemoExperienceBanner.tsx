import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Shield,
  Users,
  Clock,
  ArrowRight,
  X,
  Play,
  ChevronRight,
  Flame,
  CheckCircle2,
  Info,
} from "lucide-react";
import { feedbackSounds } from "@/lib/audio/clickFeedback";

interface InteractiveDemoExperienceBannerProps {
  guestDaysRemaining?: number;
  onNavigate?: (section: string) => void;
  onStartSprint?: (durationMinutes: number) => void;
}

export const InteractiveDemoExperienceBanner: React.FC<InteractiveDemoExperienceBannerProps> = ({
  guestDaysRemaining = 7,
  onNavigate,
  onStartSprint,
}) => {
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return sessionStorage.getItem("pps_demo_banner_minimized") === "true";
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<"quickstart" | "tour">("quickstart");

  const toggleMinimize = () => {
    feedbackSounds.playClick();
    const next = !isMinimized;
    setIsMinimized(next);
    try {
      sessionStorage.setItem("pps_demo_banner_minimized", String(next));
    } catch {}
  };

  const handleSprintClick = () => {
    feedbackSounds.playClick();
    if (onStartSprint) {
      onStartSprint(25);
    } else {
      window.dispatchEvent(
        new CustomEvent("pps_start_focus_timer", {
          detail: { durationMins: 25, taskName: "Demo Deep Work Sprint" },
        })
      );
    }
  };

  const handleNavigate = (section: string) => {
    feedbackSounds.playClick();
    if (onNavigate) {
      onNavigate(section);
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-r from-primary/15 via-card to-accent/10 border border-primary/30 rounded-xl px-4 py-2 flex items-center justify-between gap-3 shadow-xs mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pps-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pps-green"></span>
          </span>
          <span className="text-xs font-bold text-foreground">
            ⚡ Welcome to PPS Demo
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • {guestDaysRemaining} days remaining in your guest trial
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMinimize}
            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
          >
            Show Quick Tour
          </button>
          <Link
            to="/login?tab=signup"
            className="bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-lg hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1"
          >
            <span>Save Progress</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full bg-card/95 border border-primary/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden backdrop-blur-md mb-4"
    >
      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 bg-primary/15 rounded-xl border border-primary/30 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                Welcome to PPS Demo
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                {guestDaysRemaining} Days Left
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Experience the anti-burnout personal performance operating system with zero setup friction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={toggleMinimize}
            className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            title="Minimize guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Action Hub (No dry theory — real interactive tools!) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5">
        {/* Card 1: Focus Studio */}
        <div className="bg-surface/60 border border-border/60 hover:border-primary/40 rounded-xl p-3 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="p-1 rounded-md bg-amber-500/15 text-amber-500">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                Focus Studio
              </div>
              <span className="text-[10px] text-muted-foreground">432Hz Sound</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              Launch distraction-free 25m Pomodoros with ambient binaural alpha soundscapes.
            </p>
          </div>
          <button
            onClick={handleSprintClick}
            className="mt-2.5 w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 font-bold text-[11px] py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Play className="w-3 h-3 fill-amber-500" />
            <span>Test 25m Sprint</span>
          </button>
        </div>

        {/* Card 2: Streak Shield Vault */}
        <div className="bg-surface/60 border border-border/60 hover:border-primary/40 rounded-xl p-3 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="p-1 rounded-md bg-pps-green/15 text-pps-green">
                  <Shield className="w-3.5 h-3.5" />
                </span>
                Streak Shield Vault
              </div>
              <span className="text-[10px] text-pps-green font-semibold">Zero Guilt</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              Never lose your streak when life happens. Earn shields that auto-freeze rest days.
            </p>
          </div>
          <button
            onClick={() => handleNavigate("streak")}
            className="mt-2.5 w-full bg-pps-green/15 hover:bg-pps-green/25 text-pps-green border border-pps-green/30 font-bold text-[11px] py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Shield className="w-3 h-3" />
            <span>Explore Streak Engine</span>
          </button>
        </div>

        {/* Card 3: Study Squads */}
        <div className="bg-surface/60 border border-border/60 hover:border-primary/40 rounded-xl p-3 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="p-1 rounded-md bg-sky-500/15 text-sky-500">
                  <Users className="w-3.5 h-3.5" />
                </span>
                Study Squads
              </div>
              <span className="text-[10px] text-sky-400 font-semibold">Live WebRTC</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              Drop into live peer co-working rooms with shared whiteboard & synchronized timers.
            </p>
          </div>
          <button
            onClick={() => handleNavigate("social")}
            className="mt-2.5 w-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 font-bold text-[11px] py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Users className="w-3 h-3" />
            <span>Join Study Squads</span>
          </button>
        </div>
      </div>

      {/* Footer Call to Action */}
      <div className="mt-3.5 pt-3 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-pps-green flex-shrink-0" />
          <span>All habits and XP earned during demo will automatically save to your free cloud account.</span>
        </div>

        <Link
          to="/login?tab=signup"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 ml-auto sm:ml-0"
        >
          <span>Create Account Anytime</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
};
