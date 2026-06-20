import { useState, useEffect, useCallback } from "react";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import ShareWinCard from "@/components/ShareWinCard";
import AccountabilityCircles from "@/components/AccountabilityCircles";
import { useQuests } from "@/hooks/use-quests";

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
  const { habits, getMaxStreak, calculateTotalXP, calculateLevel, getTodayStr, isHabitDueToday } = useHabits();
  const { profile } = useProfile();
  const { isPro, limits } = useSubscription();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "challenges" | "friends" | "circles">("leaderboard");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<{ name: string; level: number; streak: number; xp: number; isYou: boolean }[]>([]);

  const todayStr = getTodayStr();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
  }, []);

  const loadFriends = useCallback(async () => {
    if (!currentUserId) return;

    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

    if (!friendships) return;

    const friendUserIds = friendships.map((f) =>
      f.requester_id === currentUserId ? f.addressee_id : f.requester_id
    );

    if (friendUserIds.length === 0) {
      setFriends([]);
      return;
    }

    const [{ data: profiles }, { data: stats }] = await Promise.all([
      supabase.from("profiles").select("*").in("user_id", friendUserIds),
      supabase.from("user_stats").select("*").in("user_id", friendUserIds),
    ]);

    const mapped: FriendProfile[] = friendships.map((f) => {
      const friendUserId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
      const p = profiles?.find((pr) => pr.user_id === friendUserId);
      const s = stats?.find((st) => st.user_id === friendUserId);
      return {
        id: p?.id || f.id,
        friendshipId: f.id,
        userId: friendUserId,
        displayName: p?.display_name || "Unknown",
        username: p?.username || "",
        status: f.status as "pending" | "accepted",
        isRequester: f.requester_id === currentUserId,
        level: s?.level || p?.level || 1,
        streak: s?.longest_streak || p?.longest_streak || 0,
        xp: s?.total_xp || p?.total_xp || 0,
      };
    });
    setFriends(mapped);
  }, [currentUserId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    const myStats = {
      name: profile?.displayName || "You",
      level: calculateLevel(),
      streak: getMaxStreak(),
      xp: calculateTotalXP(),
      isYou: true,
    };

    const friendEntries = friends
      .filter((f) => f.status === "accepted")
      .map((f) => ({
        name: f.displayName,
        level: f.level,
        streak: f.streak,
        xp: f.xp,
        isYou: false,
      }));

    setLeaderboardData([myStats, ...friendEntries].sort((a, b) => b.xp - a.xp));
  }, [friends, calculateLevel, getMaxStreak, calculateTotalXP, profile]);

  const sendInvite = async () => {
    if (!inviteUsername.trim()) {
      setInviteStatus("Enter a username");
      return;
    }
    if (!currentUserId) {
      setInviteStatus("Please log in to send invites");
      return;
    }
    if (!limits.socialFeatures && !isPro) {
      setInviteStatus("Friend invites require Pro. Upgrade on Pricing page.");
      return;
    }

    const { data: lookup, error: lookupErr } = await supabase.rpc("lookup_user_by_username", {
      p_username: inviteUsername.trim(),
    });

    if (lookupErr || !lookup?.length) {
      setInviteStatus("User not found. Check the username.");
      return;
    }

    const targetUserId = lookup[0].user_id;
    if (targetUserId === currentUserId) {
      setInviteStatus("You can't add yourself.");
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: "pending",
    });

    if (error) {
      setInviteStatus(error.code === "23505" ? "Request already sent." : error.message);
      return;
    }

    setInviteStatus("Friend request sent!");
    setInviteUsername("");
    setTimeout(() => setInviteStatus(null), 3000);
    loadFriends();
  };

  const acceptFriend = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    loadFriends();
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    loadFriends();
  };

  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
  const challengePercent = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;

  const pendingRequests = friends.filter((f) => f.status === "pending" && !f.isRequester);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Social & Challenges</h1>
        <div className="text-[13px] text-muted-foreground mt-0.5">Compete, challenge, and grow together</div>
      </div>

      <ShareWinCard streak={getMaxStreak()} level={calculateLevel()} name={profile?.displayName || "You"} />

      {pendingRequests.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5 mt-5">
          <h3 className="text-sm font-semibold mb-2">📬 Pending Friend Requests</h3>
          {pendingRequests.map((f) => (
            <div key={f.friendshipId} className="flex items-center justify-between py-2">
              <span className="text-sm">{f.displayName} (@{f.username}) wants to be friends</span>
              <div className="flex gap-2">
                <button onClick={() => acceptFriend(f.friendshipId)} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg">Accept</button>
                <button onClick={() => removeFriend(f.friendshipId)} className="text-xs text-destructive px-3 py-1 rounded-lg border border-border">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5 flex-wrap">
        {(["leaderboard", "challenges", "friends", "circles"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[12px] font-semibold transition-all capitalize ${
              activeTab === tab ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "leaderboard" ? "🏅 Rank" : tab === "challenges" ? "⚔️ Quests" : tab === "friends" ? "👥 Friends" : "⭕ Circles"}
          </button>
        ))}
      </div>

      {activeTab === "leaderboard" && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Rankings</h3>
          <div className="space-y-2">
            {leaderboardData.map((p, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                p.isYou ? "bg-primary/5 border-primary/20" : "bg-surface/60 border-border/60"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold font-mono w-8 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{p.name} {p.isYou && <span className="text-[11px] text-primary">(you)</span>}</div>
                    <div className="text-[11px] text-muted-foreground">Level {p.level} • 🔥 {p.streak} streak</div>
                  </div>
                </div>
                <div className="text-sm font-bold font-mono text-primary">{p.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "challenges" && (
        <QuestsPanel userId={currentUserId} />
      )}

      {activeTab === "friends" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invite by Username</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="@username"
                className="flex-1 bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] outline-none focus:border-primary"
              />
              <button onClick={sendInvite} className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold">
                Send Invite
              </button>
            </div>
            {inviteStatus && <div className="text-xs mt-2 text-primary">{inviteStatus}</div>}
            {!isPro && <p className="text-[11px] text-muted-foreground mt-2">Pro required for friend invites and full social features.</p>}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Friends</h3>
            {friends.filter((f) => f.status === "accepted").length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-[13px]">No friends yet — invite someone above!</div>
            ) : (
              friends.filter((f) => f.status === "accepted").map((f) => (
                <div key={f.friendshipId} className="flex items-center justify-between px-4 py-3 bg-surface/60 border border-border/60 rounded-xl mb-2">
                  <div>
                    <div className="text-sm font-semibold">{f.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">@{f.username} • Lv.{f.level}</div>
                  </div>
                  <button onClick={() => removeFriend(f.friendshipId)} className="text-destructive text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-destructive/10">Remove</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "circles" && currentUserId && (
        <AccountabilityCircles userId={currentUserId} isPro={isPro} />
      )}
    </div>
  );
};

function QuestsPanel({ userId }: { userId: string | null }) {
  const { quests, activeQuest } = useQuests(userId || undefined, !userId);

  return (
    <div className="space-y-4">
      {activeQuest && (
        <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/15 rounded-xl p-5">
          <div className="text-lg font-bold mb-1">{activeQuest.title}</div>
          <div className="text-[13px] text-muted-foreground mb-3">{activeQuest.description}</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-surface rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${Math.min(100, Math.round((activeQuest.progress / activeQuest.target) * 100))}%` }}
              />
            </div>
            <span className="text-[12px] font-mono font-bold text-primary">
              {activeQuest.progress}/{activeQuest.target}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Reward: +{activeQuest.xpReward} bonus XP</div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quests.map((q: { id: string; title: string; description: string; completed: boolean; xpReward: number }) => (
          <div key={q.id} className={`border rounded-xl p-3.5 ${q.completed ? "border-pps-green/30 bg-pps-green/5" : "border-border bg-surface/40"}`}>
            <div className="text-sm font-semibold">{q.title} {q.completed && "✅"}</div>
            <div className="text-[12px] text-muted-foreground">{q.description}</div>
            <div className="text-[11px] text-primary mt-1">+{q.xpReward} XP</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SocialSection;
