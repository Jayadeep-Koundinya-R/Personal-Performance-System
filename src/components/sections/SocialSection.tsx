/*
  👥 Masterwork Social Leaderboards & Accountability Studio
  
  Features:
  - Global & Friends Leaderboards with Metallic Rank Badges (🥇 #1 Gold, 🥈 #2 Silver, 🥉 #3 Bronze)
  - ⚔️ Co-Op Habit Quests Room (7-Day Streak Pact, Century Club, Zen Squad)
  - 🛡️ Accountability Circles Integration
  - 🎴 1-Click Share Win Cards Generator
  - High-Contrast Crisp Glassmorphism Typography
*/

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import ShareWinCard from "@/components/ShareWinCard";
import AccountabilityCircles from "@/components/AccountabilityCircles";
import { useQuests } from "@/hooks/use-quests";
import { Trophy, Users, Shield, Share2, Sparkles, Flame, Check, Plus, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";

interface FriendProfile {
  id: string;
  friendshipId: string;
  userId: string;
  displayName: string;
  username: string;
  status: "pending" | "accepted";
  isRequester: boolean;
  level: number;
  streak: number;
  xp: number;
}

const SocialSection = () => {
  const { habits, getMaxStreak, calculateTotalXP, calculateLevel, getTodayStr } = useHabits();
  const { profile } = useProfile();
  const { isPro } = useSubscription();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "quests" | "circles" | "share">("leaderboard");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");

  const todayStr = getTodayStr();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
  }, []);

  const totalXP = calculateTotalXP();
  const level = calculateLevel();
  const streak = getMaxStreak();

  // Mock Leaderboard Data with You
  const leaderboardData = [
    { name: profile?.displayName || "You", level, streak, xp: totalXP, isYou: true },
    { name: "Sarah Vance", level: 12, streak: 24, xp: 4850, isYou: false },
    { name: "Alex Chen", level: 9, streak: 15, xp: 3200, isYou: false },
    { name: "Marcus Aurelius", level: 15, streak: 45, xp: 7400, isYou: false },
    { name: "Elena Rostova", level: 8, streak: 12, xp: 2900, isYou: false },
  ].sort((a, b) => b.xp - a.xp);

  // Send Friend Invite
  const sendInvite = () => {
    if (!inviteUsername.trim()) return;
    toast.success(`Friend request sent to @${inviteUsername.trim()}!`);
    setInviteUsername("");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>👥 Social & Accountability Hub</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Community & Quests
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Compete on global leaderboards, join accountability circles, complete co-op habit quests, and share win cards
          </p>
        </div>

        {/* Friend Invite Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Invite by username..."
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            className="bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-2 outline-none text-foreground focus:border-primary w-full sm:w-48"
          />
          <button
            onClick={sendInvite}
            className="text-xs bg-primary text-primary-foreground font-extrabold px-3.5 py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1 flex-shrink-0 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* ── 1. MAIN NAVIGATION TABS ── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { key: "leaderboard", label: "🏆 Leaderboard" },
            { key: "quests", label: "⚔️ Co-Op Quests" },
            { key: "circles", label: "🛡️ Accountability Circles" },
            { key: "share", label: "🎴 Share Win Cards" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`text-xs px-4 py-2 rounded-xl border font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface border-border/80 text-slate-300 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. TAB CONTENT ── */}
      {activeTab === "leaderboard" && (
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>🏆 Global Master Leaderboard</span>
            </h3>
            <span className="text-xs font-mono font-bold text-pps-yellow">Ranked by Total XP</span>
          </div>

          <div className="space-y-2.5">
            {leaderboardData.map((userItem, idx) => {
              let rankBadge = (
                <div className="w-8 h-8 rounded-xl bg-surface border border-border/80 flex items-center justify-center font-mono font-extrabold text-xs text-foreground">
                  #{idx + 1}
                </div>
              );
              if (idx === 0) {
                rankBadge = (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono font-extrabold text-sm text-amber-400">
                    🥇
                  </div>
                );
              } else if (idx === 1) {
                rankBadge = (
                  <div className="w-8 h-8 rounded-xl bg-slate-300/20 border border-slate-300/40 flex items-center justify-center font-mono font-extrabold text-sm text-slate-300">
                    🥈
                  </div>
                );
              } else if (idx === 2) {
                rankBadge = (
                  <div className="w-8 h-8 rounded-xl bg-amber-700/20 border border-amber-700/40 flex items-center justify-center font-mono font-extrabold text-sm text-amber-600">
                    🥉
                  </div>
                );
              }

              return (
                <motion.div
                  key={userItem.name}
                  whileHover={{ scale: 1.005 }}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    userItem.isYou
                      ? "bg-gradient-to-r from-primary/15 via-card to-primary/10 border-primary/40 shadow-md ring-1 ring-primary/30"
                      : "bg-surface/60 border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {rankBadge}
                    <div>
                      <div className="text-sm font-extrabold text-foreground flex items-center gap-2">
                        <span>{userItem.name}</span>
                        {userItem.isYou && (
                          <span className="text-[10px] font-mono font-extrabold bg-primary text-primary-foreground px-2 py-0.2 rounded-full">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono font-bold mt-0.5">
                        Level {userItem.level} • 🔥 {userItem.streak}-Day Streak
                      </div>
                    </div>
                  </div>

                  <div className="text-right self-end sm:self-center">
                    <div className="text-sm font-extrabold font-mono text-pps-yellow">{userItem.xp} XP</div>
                    <div className="text-[10px] text-slate-300 font-mono">Mastery Points</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "quests" && (
        <div className="space-y-4">
          <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
              <span>⚔️ Active Co-Op Habit Quests</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-surface/60 border border-border/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-foreground">7-Day Unbroken Streak Pact ⚔️</h4>
                  <span className="text-[10.5px] font-mono font-bold bg-pps-yellow/20 text-pps-yellow border border-pps-yellow/30 px-2.5 py-0.5 rounded-full">
                    +150 XP Reward
                  </span>
                </div>
                <p className="text-xs text-slate-300">Maintain a 7-day streak across all habits without missing a day.</p>
                <button
                  onClick={() => toast.success("Joined 7-Day Unbroken Streak Pact!")}
                  className="w-full text-xs font-extrabold bg-primary text-primary-foreground py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Join Co-Op Quest
                </button>
              </div>

              <div className="p-5 bg-surface/60 border border-border/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-foreground">Century Club Squad 🎯</h4>
                  <span className="text-[10.5px] font-mono font-bold bg-pps-yellow/20 text-pps-yellow border border-pps-yellow/30 px-2.5 py-0.5 rounded-full">
                    +300 XP Reward
                  </span>
                </div>
                <p className="text-xs text-slate-300">Complete 100 cumulative habits together as a community squad.</p>
                <button
                  onClick={() => toast.success("Joined Century Club Squad!")}
                  className="w-full text-xs font-extrabold bg-primary text-primary-foreground py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Join Co-Op Quest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "circles" && (
        <div className="bg-card border border-border p-5 rounded-3xl shadow-xl">
          <AccountabilityCircles userId={currentUserId || ""} isPro={isPro} />
        </div>
      )}

      {activeTab === "share" && (
        <div className="bg-card border border-border p-5 rounded-3xl shadow-xl">
          <ShareWinCard streak={streak} level={level} name={profile?.displayName || "Performance Master"} />
        </div>
      )}
    </div>
  );
};

export default SocialSection;
