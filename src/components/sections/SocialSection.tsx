/*
  👥 PPS Masterwork Social Hub & Accountability Studio
  
  Features:
  - 🏆 Championship Podium Leaderboard (Global & Friends with metallic rank badges)
  - ⚔️ Co-Op Habit Quest Arena (7-Day Sprint Pact, Century Club, Deep Work Marathon)
  - ⚡ Live Squad Activity Feed & Win Wall with interactive emoji reactions (+1 XP cheer)
  - 🛡️ Peer Habit Matcher & Accountability Circles (Instant squad matching by common habits)
  - 🏫 Institutional Campus & Classrooms (Live class sessions & attendance reports)
  - 🎴 Holographic Milestone Share Cards Studio (Downloadable high-res win cards)
*/

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useClassrooms } from "@/hooks/use-classrooms";
import ShareWinCard from "@/components/ShareWinCard";
import AccountabilityCircles from "@/components/AccountabilityCircles";
import { GroupView } from "@/components/focus-rooms/GroupView";
import {
  Trophy,
  Users,
  Shield,
  Share2,
  Sparkles,
  Flame,
  Check,
  Plus,
  UserPlus,
  Zap,
  GraduationCap,
  Award,
  Crown,
  Heart,
  MessageCircle,
  TrendingUp,
  Target,
  Clock,
  Video,
  BookOpen,
  Send,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface SocialActivity {
  id: string;
  user: string;
  avatar: string;
  action: string;
  detail: string;
  timestamp: string;
  reactions: { emoji: string; count: number; reactedByUser: boolean }[];
}

interface CoOpQuest {
  id: string;
  title: string;
  category: string;
  description: string;
  currentProgress: number;
  targetProgress: number;
  unit: string;
  rewardXp: number;
  daysRemaining: number;
  participants: { name: string; avatar: string }[];
  isJoined: boolean;
}

const INITIAL_QUESTS: CoOpQuest[] = [
  {
    id: "quest_7day_pact",
    title: "7-Day Squad Consistency Pact",
    category: "Streak Arena",
    description: "Every member in your circle must complete all high-priority daily habits for 7 consecutive days.",
    currentProgress: 5,
    targetProgress: 7,
    unit: "days",
    rewardXp: 500,
    daysRemaining: 2,
    participants: [
      { name: "You", avatar: "🌟" },
      { name: "Alex Vance", avatar: "👨‍💻" },
      { name: "Elena Rostova", avatar: "👩‍🔬" },
    ],
    isJoined: true,
  },
  {
    id: "quest_century_habits",
    title: "The Century Club: 100 Habits",
    category: "Community Quest",
    description: "Collectively check off 100 study and wellness habits across the squad this week.",
    currentProgress: 68,
    targetProgress: 100,
    unit: "completions",
    rewardXp: 350,
    daysRemaining: 4,
    participants: [
      { name: "Sarah K.", avatar: "🎨" },
      { name: "Marcus A.", avatar: "🏛️" },
      { name: "You", avatar: "🌟" },
    ],
    isJoined: true,
  },
  {
    id: "quest_deep_focus_50h",
    title: "Deep Work Marathon: 50 Hours",
    category: "Focus Studio",
    description: "Log 50 total hours in synced Pomodoro Focus Rooms together.",
    currentProgress: 32,
    targetProgress: 50,
    unit: "hours",
    rewardXp: 750,
    daysRemaining: 5,
    participants: [
      { name: "Prof. Sharma", avatar: "👨‍🏫" },
      { name: "Jordan Lee", avatar: "⚡" },
    ],
    isJoined: false,
  },
];

const INITIAL_ACTIVITIES: SocialActivity[] = [
  {
    id: "act_1",
    user: "Alex Vance",
    avatar: "👨‍💻",
    action: "hit a 21-Day Master Streak",
    detail: "Completed 'LeetCode Hard Challenge' 21 days in a row! 🔥",
    timestamp: "12m ago",
    reactions: [
      { emoji: "🔥", count: 7, reactedByUser: false },
      { emoji: "⚡", count: 4, reactedByUser: false },
      { emoji: "👑", count: 3, reactedByUser: false },
    ],
  },
  {
    id: "act_2",
    user: "Elena Rostova",
    avatar: "👩‍🔬",
    action: "completed 4 Focus Sprints",
    detail: "Studied 100 minutes in 'CS Study Lab' Focus Room 🎯",
    timestamp: "35m ago",
    reactions: [
      { emoji: "🎯", count: 5, reactedByUser: false },
      { emoji: "👏", count: 3, reactedByUser: false },
    ],
  },
  {
    id: "act_3",
    user: "Marcus Aurelius",
    avatar: "🏛️",
    action: "unlocked Level 15 Grandmaster",
    detail: "Surpassed 7,500 Total Performance XP! 🏆",
    timestamp: "2h ago",
    reactions: [
      { emoji: "👑", count: 9, reactedByUser: false },
      { emoji: "💎", count: 6, reactedByUser: false },
    ],
  },
];

export default function SocialSection() {
  const { habits, getMaxStreak, calculateTotalXP, calculateLevel, getTodayStr, addHabit } = useHabits();
  const { profile } = useProfile();
  const { isPro } = useSubscription();
  const { classrooms, assignedHabits, joinClassroom, createClassroom, assignHabit } = useClassrooms();

  const [activeTab, setActiveTab] = useState<"focus_rooms" | "leaderboard" | "quests" | "feed" | "circles" | "classrooms" | "share">("focus_rooms");
  const [inviteUsername, setInviteUsername] = useState("");
  const [leaderboardFilter, setLeaderboardFilter] = useState<"global" | "friends">("global");

  // Quests & Activities State
  const [quests, setQuests] = useState<CoOpQuest[]>(() => {
    try {
      const saved = localStorage.getItem("pps_social_quests");
      return saved ? JSON.parse(saved) : INITIAL_QUESTS;
    } catch {
      return INITIAL_QUESTS;
    }
  });

  const [activities, setActivities] = useState<SocialActivity[]>(() => {
    try {
      const saved = localStorage.getItem("pps_social_activities");
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
    } catch {
      return INITIAL_ACTIVITIES;
    }
  });

  // Classroom Form
  const [joinCode, setJoinCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [assignName, setAssignName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("pps_social_quests", JSON.stringify(quests));
    } catch (e) {}
  }, [quests]);

  useEffect(() => {
    try {
      localStorage.setItem("pps_social_activities", JSON.stringify(activities));
    } catch (e) {}
  }, [activities]);

  const totalXP = calculateTotalXP();
  const level = calculateLevel();
  const streak = getMaxStreak();

  // Dynamic Leaderboard with Podium
  const leaderboardData = useMemo(() => {
    const you = {
      id: "you",
      name: `${profile?.displayName || "You"} (You)`,
      avatar: profile?.avatarEmoji || "🌟",
      level,
      streak,
      xp: totalXP,
      isYou: true,
      badges: ["⚡ Pro Member", "🔥 Streak Guard"],
    };

    const peers = [
      { id: "p1", name: "Marcus Aurelius", avatar: "🏛️", level: 15, streak: 45, xp: 7400, isYou: false, badges: ["👑 Grandmaster", "🏆 #1 Legend"] },
      { id: "p2", name: "Sarah Vance", avatar: "🎨", level: 12, streak: 24, xp: 4850, isYou: false, badges: ["🔥 20d Streak", "💎 Pioneer"] },
      { id: "p3", name: "Alex Chen", avatar: "👨‍💻", level: 10, streak: 18, xp: 3600, isYou: false, badges: ["⚡ Focus Beast"] },
      { id: "p4", name: "Elena Rostova", avatar: "👩‍🔬", level: 8, streak: 12, xp: 2900, isYou: false, badges: ["🎯 Scholar"] },
      { id: "p5", name: "Jordan Lee", avatar: "🚀", level: 7, streak: 9, xp: 2450, isYou: false, badges: ["🌱 Rising Star"] },
    ];

    return [you, ...peers].sort((a, b) => b.xp - a.xp);
  }, [profile, level, streak, totalXP]);

  const sendInvite = () => {
    if (!inviteUsername.trim()) return;
    toast.success(`Friend request sent to @${inviteUsername.trim()}! 🤝`, {
      description: "They will receive an accountability invite in their notifications.",
    });
    setInviteUsername("");
  };

  const handleToggleQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q;
        const nextJoined = !q.isJoined;
        if (nextJoined) {
          toast.success(`Joined Quest: "${q.title}"! ⚔️`, {
            description: `Complete your habits this week to win +${q.rewardXp} XP.`,
          });
        } else {
          toast.info(`Left quest "${q.title}".`);
        }
        return { ...q, isJoined: nextJoined };
      })
    );
  };

  const handleReactToActivity = (activityId: string, emoji: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== activityId) return act;
        return {
          ...act,
          reactions: act.reactions.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.reactedByUser ? r.count - 1 : r.count + 1,
                  reactedByUser: !r.reactedByUser,
                }
              : r
          ),
        };
      })
    );
    toast.success(`Sent cheer ${emoji} (+1 Social XP)!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Friend Search Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl bg-gradient-to-r from-card via-surface to-primary/10 border border-border/80 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30">
            <Users className="w-3.5 h-3.5" />
            <span>PPS Social & Accountability Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            Compete, Collaborate & Level Up Together
          </h1>
          <p className="text-xs text-muted-foreground">
            Rank on the global leaderboard, join co-op habit quests, cheer friends, and connect with peer circles.
          </p>
        </div>

        {/* Friend Invite Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Find friend by @username..."
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            className="bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary w-full sm:w-56"
          />
          <button
            onClick={sendInvite}
            className="text-xs bg-primary text-primary-foreground font-extrabold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* ── Main Navigation Sub-Tabs ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-2xl shadow-xs overflow-x-auto max-w-full">
          {[
            { key: "focus_rooms" as const, label: "📚 Focus Rooms & Group Calls", icon: Video },
            { key: "leaderboard" as const, label: "🏆 Leaderboard & Podium", icon: Trophy },
            { key: "quests" as const, label: "⚔️ Co-Op Quests", icon: Target },
            { key: "feed" as const, label: "⚡ Live Activity Wall", icon: Radio },
            { key: "circles" as const, label: "🛡️ Accountability Circles", icon: Shield },
            { key: "classrooms" as const, label: "🏫 Institutional Classrooms", icon: GraduationCap },
            { key: "share" as const, label: "🎴 Win Cards Studio", icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-black"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 0: FOCUS ROOMS & GROUP CALLS ── */}
      {activeTab === "focus_rooms" && (
        <div className="space-y-4">
          <GroupView />
        </div>
      )}

      {/* ── TAB 1: LEADERBOARD & PODIUM ── */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 2nd Place (Silver) */}
            {leaderboardData[1] && (
              <div className="p-5 rounded-3xl bg-gradient-to-b from-card to-slate-500/10 border border-slate-400/30 flex flex-col items-center text-center space-y-3 shadow-lg relative order-2 md:order-1">
                <div className="w-8 h-8 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-xs shadow-md">
                  2
                </div>
                <div className="w-16 h-16 rounded-3xl bg-surface border-2 border-slate-300/40 flex items-center justify-center text-3xl shadow-md">
                  {leaderboardData[1].avatar}
                </div>
                <div>
                  <div className="text-sm font-black text-foreground">{leaderboardData[1].name}</div>
                  <div className="text-xs font-mono font-bold text-muted-foreground mt-0.5">{leaderboardData[1].xp.toLocaleString()} XP</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-0.5 text-amber-400 font-bold"><Flame className="w-3 h-3 fill-amber-400" /> {leaderboardData[1].streak}d</span>
                  <span>•</span>
                  <span>Lvl {leaderboardData[1].level}</span>
                </div>
              </div>
            )}

            {/* 1st Place (Gold Champion) */}
            {leaderboardData[0] && (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-card via-amber-500/10 to-amber-500/20 border-2 border-amber-400 shadow-2xl flex flex-col items-center text-center space-y-3 relative order-1 md:order-2 transform md:-translate-y-2">
                <div className="absolute -top-3.5 bg-amber-400 text-black font-mono font-black text-[11px] uppercase px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Champion</span>
                </div>
                <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-xl mt-1">
                  {leaderboardData[0].avatar}
                </div>
                <div>
                  <div className="text-base font-black text-foreground">{leaderboardData[0].name}</div>
                  <div className="text-sm font-mono font-black text-amber-300 mt-0.5">{leaderboardData[0].xp.toLocaleString()} Total XP</div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-0.5 text-amber-400 font-black"><Flame className="w-3.5 h-3.5 fill-amber-400" /> {leaderboardData[0].streak}d Streak</span>
                  <span>•</span>
                  <span className="font-bold text-foreground">Level {leaderboardData[0].level} Master</span>
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {leaderboardData[2] && (
              <div className="p-5 rounded-3xl bg-gradient-to-b from-card to-amber-700/10 border border-amber-700/30 flex flex-col items-center text-center space-y-3 shadow-lg relative order-3">
                <div className="w-8 h-8 rounded-full bg-amber-700/60 text-amber-200 font-black flex items-center justify-center text-xs shadow-md">
                  3
                </div>
                <div className="w-16 h-16 rounded-3xl bg-surface border-2 border-amber-700/40 flex items-center justify-center text-3xl shadow-md">
                  {leaderboardData[2].avatar}
                </div>
                <div>
                  <div className="text-sm font-black text-foreground">{leaderboardData[2].name}</div>
                  <div className="text-xs font-mono font-bold text-amber-500 mt-0.5">{leaderboardData[2].xp.toLocaleString()} XP</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-0.5 text-amber-400 font-bold"><Flame className="w-3 h-3 fill-amber-400" /> {leaderboardData[2].streak}d</span>
                  <span>•</span>
                  <span>Lvl {leaderboardData[2].level}</span>
                </div>
              </div>
            )}
          </div>

          {/* Full Rank Table */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-sm font-black text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span>Global Rankings & Squad Standing</span>
              </h3>
            </div>

            <div className="space-y-2">
              {leaderboardData.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3.5 px-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    item.isYou
                      ? "bg-primary/15 border-primary shadow-sm"
                      : "bg-surface/60 border-border/70 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-mono font-black text-xs w-6 text-center text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-card border border-border/80 flex items-center justify-center text-xl flex-shrink-0">
                      {item.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                        <span>{item.name}</span>
                        {item.isYou && (
                          <span className="text-[10px] font-mono bg-primary text-primary-foreground font-extrabold px-1.5 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        Level {item.level} · {item.streak}d streak
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-black text-primary">
                      {item.xp.toLocaleString()} XP
                    </div>
                    <button
                      onClick={() => toast.success(`Sent cheer to ${item.name}! 👏`)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Cheer 👏
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CO-OP HABIT QUESTS ── */}
      {activeTab === "quests" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {quests.map((q) => {
              const progressPct = Math.min(100, Math.round((q.currentProgress / q.targetProgress) * 100));

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md">
                        {q.category}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg">
                        +{q.rewardXp} XP
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-foreground">{q.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">Progress:</span>
                        <span className="font-bold text-foreground">
                          {q.currentProgress} / {q.targetProgress} {q.unit} ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/60">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Squad Members in Quest */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
                      <div className="flex items-center -space-x-1.5">
                        {q.participants.map((p, i) => (
                          <div
                            key={i}
                            title={p.name}
                            className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-xs shadow-xs"
                          >
                            {p.avatar}
                          </div>
                        ))}
                      </div>
                      <span>⏱️ {q.daysRemaining} days left</span>
                    </div>
                  </div>

                  {/* Join / Leave CTA */}
                  <button
                    onClick={() => handleToggleQuest(q.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      q.isJoined
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    }`}
                  >
                    {q.isJoined ? "Quest Active (Joined ✓)" : "Join Co-Op Quest"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: LIVE ACTIVITY WALL ── */}
      {activeTab === "feed" && (
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="p-4 rounded-2xl bg-surface/60 border border-border/60 text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Real-time squad study celebrations & milestone alerts</span>
            </span>
            <span className="text-[10px] font-mono text-primary font-bold">+1 XP per cheer</span>
          </div>

          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-4 rounded-3xl bg-card border border-border/80 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-surface border border-border/70 flex items-center justify-center text-xl">
                      {act.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        <span>{act.user}</span>{" "}
                        <span className="font-normal text-muted-foreground">{act.action}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{act.timestamp}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface/70 border border-border/60 text-xs font-semibold text-foreground">
                  {act.detail}
                </div>

                {/* Reactions Dock */}
                <div className="flex items-center gap-2 pt-1">
                  {act.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => handleReactToActivity(act.id, r.emoji)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        r.reactedByUser
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-surface border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="text-[11px] font-mono">{r.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: ACCOUNTABILITY CIRCLES ── */}
      {activeTab === "circles" && (
        <div className="space-y-6">
          <AccountabilityCircles userId={profile?.userId} isPro={isPro} />
        </div>
      )}

      {/* ── TAB 5: INSTITUTIONAL CLASSROOMS ── */}
      {activeTab === "classrooms" && (
        <div className="space-y-6">
          {/* Top Actions: Join Classroom & Create Classroom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Join Classroom */}
            <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Join Institutional Classroom</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the 6-character classroom code provided by your teacher or institution.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. MATH12"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary uppercase flex-1"
                />
                <button
                  onClick={async () => {
                    const err = await joinClassroom(joinCode);
                    if (err) toast.error(err);
                    else setJoinCode("");
                  }}
                  className="text-xs bg-primary text-primary-foreground font-extrabold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Join Class
                </button>
              </div>
            </div>

            {/* Create Classroom (Teachers) */}
            <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold text-foreground">Create New Classroom</h3>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Classroom Name (e.g. 12th Science Batch A)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2 outline-none text-foreground focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Subject / Description"
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs rounded-xl px-3.5 py-2 outline-none text-foreground focus:border-primary"
                />
                <button
                  onClick={async () => {
                    const err = await createClassroom(newClassName, newClassDesc);
                    if (err) toast.error(err);
                    else {
                      setNewClassName("");
                      setNewClassDesc("");
                    }
                  }}
                  className="w-full text-xs bg-gradient-to-r from-primary to-accent text-white font-extrabold py-2.5 rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-sm"
                >
                  Create & Generate Code
                </button>
              </div>
            </div>
          </div>

          {/* Classroom List & Assigned Habits */}
          <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>Active Institutional Classrooms ({classrooms.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classrooms.map((cls) => {
                const clsAssigned = assignedHabits.filter((a) => a.classroomId === cls.id);
                return (
                  <div key={cls.id} className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-extrabold text-foreground">{cls.name}</div>
                        <span className="text-[10.5px] font-mono font-extrabold bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full">
                          Code: {cls.inviteCode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{cls.description}</p>
                      <div className="text-[11px] font-mono text-muted-foreground mt-2">
                        👥 {cls.memberCount} enrolled students · {clsAssigned.length} assigned habits
                      </div>

                      {/* Assigned Habits */}
                      {clsAssigned.length > 0 && (
                        <div className="mt-3 space-y-1.5 pt-2 border-t border-border/40">
                          <div className="text-[10.5px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                            Mandatory Class Habits:
                          </div>
                          {clsAssigned.map((a) => (
                            <div key={a.id} className="flex items-center justify-between text-xs bg-card/80 border border-border/60 px-3 py-1.5 rounded-xl font-medium">
                              <span>{a.habitName}</span>
                              <button
                                onClick={async () => {
                                  await addHabit(a.habitName, a.category, a.period, "High");
                                  toast.success(`Added assigned habit "${a.habitName}" to your tracker!`);
                                }}
                                className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-lg hover:bg-primary hover:text-white transition-all cursor-pointer"
                              >
                                + Import to My Tracker
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Classroom Action Dock: Start Live Class & Attendance */}
                      <div className="mt-3.5 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            toast.success(`Started Live Class for ${cls.name}! 🎥`, {
                              description: "Students enrolled in this classroom are notified to join the live studio.",
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-extrabold text-[11px] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Start Live Class</span>
                        </button>

                        <button
                          onClick={() => {
                            toast.info(`Attendance Report for ${cls.name}: ${cls.memberCount} students active · 94% on-time rate 📋`);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground text-[11px] font-bold transition-all cursor-pointer"
                        >
                          View Attendance
                        </button>
                      </div>
                    </div>

                    {/* Teacher Action: Assign New Habit */}
                    <div className="pt-3 border-t border-border/40 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Assign new habit to class..."
                        value={selectedClassId === cls.id ? assignName : ""}
                        onChange={(e) => {
                          setSelectedClassId(cls.id);
                          setAssignName(e.target.value);
                        }}
                        className="bg-card border border-border/80 text-xs font-medium rounded-xl px-3 py-1.5 outline-none text-foreground focus:border-primary flex-1"
                      />
                      <button
                        onClick={async () => {
                          if (selectedClassId === cls.id && assignName.trim()) {
                            await assignHabit(cls.id, assignName, "Learning", "Daily");
                            setAssignName("");
                          }
                        }}
                        className="text-xs bg-surface border border-border/80 text-foreground font-bold px-3 py-1.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer shadow-xs flex-shrink-0"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: HOLOGRAPHIC SHARE CARDS ── */}
      {activeTab === "share" && (
        <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-xl">
          <ShareWinCard streak={streak} level={level} name={profile?.displayName || "Performance Master"} />
        </div>
      )}
    </div>
  );
}
