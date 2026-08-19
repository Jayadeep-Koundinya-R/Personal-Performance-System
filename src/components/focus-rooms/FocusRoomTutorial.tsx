import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Video,
  BookOpen,
  Zap,
  Plus,
  ArrowRight,
  Sparkles,
  Shield,
  Flame,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface FocusRoomTutorialProps {
  onCreateGroup: () => void;
  onJoinWithCode: (code: string) => void;
  onLoadSample: () => void;
}

export const FocusRoomTutorial: React.FC<FocusRoomTutorialProps> = ({
  onCreateGroup,
  onJoinWithCode,
  onLoadSample,
}) => {
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    onJoinWithCode(inviteCodeInput.trim().toUpperCase());
  };

  const steps = [
    {
      icon: "👥",
      title: "1. Create or Join a Squad",
      desc: "Permanent study groups with 6-character invite codes. No temporary disappearing links.",
      highlight: "Persistent Communities",
    },
    {
      icon: "🎙️",
      title: "2. Drop-In Focus Rooms",
      desc: "Always-on audio & video co-working rooms. Experience the body-doubling effect to destroy procrastination.",
      highlight: "Body Doubling Co-Study",
    },
    {
      icon: "📚",
      title: "3. Notes & Video Library",
      desc: "Dedicated #resources channels. Pin lecture recordings, formula cheat-sheets, and ArXiv PDFs forever.",
      highlight: "Organized Resources",
    },
    {
      icon: "⚡",
      title: "4. In-Group Habit Tracking",
      desc: "Assign and check off daily study habits directly inside your squad. Earn XP and protect squad streaks.",
      highlight: "Habit Integration",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 md:p-10 rounded-3xl border border-primary/40 bg-gradient-to-br from-card via-surface/80 to-primary/10 backdrop-blur-2xl shadow-2xl overflow-hidden"
      >
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Co-Working Studio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Study With Friends. Track Habits. <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Crush Your Goals Together.
            </span>
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            PPS Focus Rooms combines Discord-style persistent channels with Focusmate-style accountability. No more scrambling for Zoom links or losing study notes in chat.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={onCreateGroup}
              className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 cursor-pointer flex items-center gap-2 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span>Create Your First Study Group</span>
            </button>

            <button
              onClick={onLoadSample}
              className="px-5 py-3 rounded-2xl bg-surface border border-border hover:border-primary/50 text-foreground font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 hover:bg-card"
            >
              <span>✨ Load Starter Demo Squad</span>
            </button>
          </div>

          {/* Direct Code Join Bar */}
          <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-md pt-2">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="Have an invite code? (e.g. SPRINT)"
              maxLength={8}
              className="flex-1 px-4 py-2.5 bg-surface/90 border border-border/80 rounded-xl text-xs font-mono font-bold uppercase text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!inviteCodeInput.trim()}
              className="px-4 py-2.5 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-extrabold text-xs rounded-xl transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>

      {/* 4 Feature Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-5 rounded-3xl bg-card/60 border border-border/70 hover:border-primary/40 backdrop-blur-xl shadow-lg space-y-2.5 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {step.icon}
            </div>
            <div className="text-[10px] font-mono font-extrabold uppercase text-primary tracking-wider">
              {step.highlight}
            </div>
            <h3 className="text-sm font-bold text-foreground font-mono">
              {step.title}
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
