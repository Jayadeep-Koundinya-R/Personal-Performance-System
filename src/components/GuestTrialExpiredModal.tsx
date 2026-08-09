import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function GuestTrialExpiredModal() {
  const { user, isGuestTrialExpired, logout } = useAuth();

  if (!user?.isGuest || !isGuestTrialExpired) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[99999] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card border-2 border-primary/50 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden"
        style={{ boxShadow: "0 25px 60px -15px rgba(99, 102, 241, 0.4)" }}
      >
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-3xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-3xl mx-auto shadow-inner">
          🔒
        </div>

        <div>
          <span className="text-[10.5px] font-mono font-extrabold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            7-Day Demo Period Ended
          </span>
          <h2 className="text-2xl font-extrabold text-foreground mt-3">
            Your Demo Trial Has Expired
          </h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            You've built great momentum over the last 7 days! To keep tracking your habits, save your streak, and earn XP, please create a free account or upgrade to Pro.
          </p>
        </div>

        <div className="bg-surface/80 border border-border/60 rounded-2xl p-4 space-y-2.5 text-left text-xs">
          <div className="font-extrabold text-foreground mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Unlock Your Progress Permanently:</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-pps-green flex-shrink-0" />
            <span>Save all habit logs, streak counts & XP</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-pps-green flex-shrink-0" />
            <span>Cross-device cloud synchronization</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-pps-green flex-shrink-0" />
            <span>Full access to AI Performance Coach</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <Link
            to="/login?tab=signup"
            className="w-full bg-gradient-to-br from-primary to-accent text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:scale-[1.02] transition-transform"
          >
            <span>Create Free Account →</span>
          </Link>

          <Link
            to="/pricing"
            className="w-full bg-surface border border-border text-foreground font-bold py-3 px-6 rounded-2xl text-xs block hover:border-primary/50 transition-colors"
          >
            Explore Pro Plans ✦
          </Link>

          <button
            onClick={logout}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none pt-2"
          >
            Sign out & return to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
