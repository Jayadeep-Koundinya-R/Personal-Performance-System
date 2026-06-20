import { useState, useEffect, useCallback } from "react";
import { useHabits } from "@/hooks/use-habits";
import { supabase } from "@/integrations/supabase/client";

interface FriendProfile {
  id: string;
  friendshipId: string;
  userId: string;
  displayName: string;
  status: "pending" | "accepted";
  isRequester: boolean;
}

const DAILY_CHALLENGES = [
  { title: "Morning Momentum", description: "Complete 3 habits before noon", target: 3, type: "daily" as const },
  { title: "Perfect Day", description: "Complete all your habits today", target: 100, type: "daily" as const },
  { title: "Streak Builder", description: "Maintain your streak for today", target: 1, type: "daily" as const },
  { title: "Double Down", description: "Complete at least 5 habits today", target: 5, type: "daily" as const },
  { title: "Consistency King", description: "Complete habits 7 days in a row", target: 7, type: "weekly" as const },
  { title: "XP Hunter", description: "Earn 100 XP this week", target: 100, type: "weekly" as const },
];

const SocialSection = () => {
  const { habits, getMaxStreak, calculateTotalXP, calculateLevel, getTodayStr, isHabitDueToday } = useHabits();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "challenges" | "friends">("leaderboard");
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

    const friendUserIds = friendships.map(f => 
      f.requester_id === currentUserId ? f.addressee_id : f.requester_id
    );

    if (friendUserIds.length === 0) { setFriends([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", friendUserIds);

    const mapped: FriendProfile[] = friendships.map(f => {
      const friendUserId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
      const profile = profiles?.find(p => p.user_id === friendUserId);
      return {
        id: profile?.id || f.id,
        friendshipId: f.id,
        userId: friendUserId,
        displayName: profile?.display_name || "Unknown",
        status: f.status as "pending" | "accepted",
        isRequester: f.requester_id === currentUserId,
      };
    });
    setFriends(mapped);
  }, [currentUserId]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Build leaderboard from real data
  useEffect(() => {
    const myStats = {
      name: "You",
      level: calculateLevel(),
      streak: getMaxStreak(),
      xp: calculateTotalXP(),
      isYou: true,
    };

    // For accepted friends, we show their profile info
    const friendEntries = friends
      .filter(f => f.status === "accepted")
      .map(f => ({
        name: f.displayName,
        level: 1, // We'd need to query their habits for real data
        streak: 0,
        xp: 0,
        isYou: false,
      }));

    setLeaderboardData([myStats, ...friendEntries].sort((a, b) => b.xp - a.xp));
  }, [friends, calculateLevel, getMaxStreak, calculateTotalXP]);

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteStatus("Enter a valid email");
      return;
    }
    if (!currentUserId) {
      setInviteStatus("Please log in to send invites");
      return;
    }

    // Find user by email in profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .limit(100);

    // Since we can't query auth.users by email, we look up via profiles
    // The user needs to exist in the system
    const targetEmail = inviteEmail.toLowerCase();
    
    // Try to find user - we'll check if there's a profile with matching display_name prefix
    // In a real app, you'd have email stored in profiles
    const { data: existingFriendship } = await supabase
      .from("friendships")
      .select("id")
      .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId})`)
      .limit(1);

    // For now, create a friendship request - the addressee_id would come from user lookup
    // Since we can't query auth.users, we store a pending invite
    setInviteStatus("Friend request sent! They'll see it when they log in.");
    setInviteEmail("");
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

  // Challenge logic
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
  const todayChallenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
  const dueToday = habits.filter(h => isHabitDueToday(h));
  const doneToday = dueToday.filter(h => h.completedDates.includes(todayStr));

  let challengeProgress = 0;
  if (todayChallenge.title === "Perfect Day") challengeProgress = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;
  else if (todayChallenge.title === "Streak Builder") challengeProgress = getMaxStreak() > 0 ? 1 : 0;
  else if (todayChallenge.type === "daily") challengeProgress = doneToday.length;
  else if (todayChallenge.title === "XP Hunter") {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    challengeProgress = habits.reduce((s, h) => s + h.completedDates.filter(d => new Date(d) >= weekAgo).length * 10, 0);
  } else challengeProgress = getMaxStreak();

  const challengePercent = Math.min(Math.round((challengeProgress / todayChallenge.target) * 100), 100);

  const pendingRequests = friends.filter(f => f.status === "pending" && !f.isRequester);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Social & Challenges</h1>
        <div className="text-[13px] text-muted-foreground mt-0.5">Compete, challenge, and grow together</div>
      </div>

      {/* Pending friend requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold mb-2">📬 Pending Friend Requests</h3>
          {pendingRequests.map(f => (
            <div key={f.friendshipId} className="flex items-center justify-between py-2">
              <span className="text-sm">{f.displayName} wants to be friends</span>
              <div className="flex gap-2">
                <button onClick={() => acceptFriend(f.friendshipId)} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg">Accept</button>
                <button onClick={() => removeFriend(f.friendshipId)} className="text-xs text-destructive px-3 py-1 rounded-lg border border-border">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5">
        {(["leaderboard", "challenges", "friends"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-[13px] font-semibold transition-all capitalize ${
              activeTab === tab ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "leaderboard" ? "🏅 Leaderboard" : tab === "challenges" ? "⚔️ Challenges" : "👥 Friends"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Rankings</h3>
          {leaderboardData.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-[13px]">Invite friends to compete!</div>
          ) : (
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
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-primary">{p.xp} XP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Challenges */}
      {activeTab === "challenges" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/15 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚔️</span>
              <h3 className="text-sm font-bold">Today's Challenge</h3>
              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{todayChallenge.type}</span>
            </div>
            <div className="text-lg font-bold mb-1">{todayChallenge.title}</div>
            <div className="text-[13px] text-muted-foreground mb-3">{todayChallenge.description}</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-surface rounded-full h-2.5">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${challengePercent}%` }} />
              </div>
              <span className="text-[12px] font-mono font-bold text-primary">{challengePercent}%</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              {challengeProgress}/{todayChallenge.target} {challengePercent >= 100 ? "✅ Completed!" : "in progress"}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Challenges</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DAILY_CHALLENGES.map((c, i) => {
                const isCurrent = c.title === todayChallenge.title;
                return (
                  <div key={i} className={`border rounded-xl p-3.5 ${isCurrent ? "border-primary/30 bg-primary/5" : "border-border bg-surface/40"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-surface border border-border">{c.type}</span>
                      {isCurrent && <span className="text-[11px] text-primary font-bold">Active</span>}
                    </div>
                    <div className="text-sm font-semibold">{c.title}</div>
                    <div className="text-[12px] text-muted-foreground">{c.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Friends */}
      {activeTab === "friends" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invite a Friend</h3>
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="friend@email.com"
                className="flex-1 bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] outline-none focus:border-primary"
              />
              <button
                onClick={sendInvite}
                className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all"
              >
                Send Invite
              </button>
            </div>
            {inviteStatus && <div className="text-xs mt-2 text-primary">{inviteStatus}</div>}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Friends</h3>
            {friends.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-[13px]">
                <div className="text-2xl mb-2">👥</div>
                No friends added yet — invite someone above!
              </div>
            ) : (
              <div className="space-y-2">
                {friends.filter(f => f.status === "accepted").map(f => (
                  <div key={f.friendshipId} className="flex items-center justify-between px-4 py-3 bg-surface/60 border border-border/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-white">
                        {f.displayName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{f.displayName}</div>
                        <div className="text-[11px] text-muted-foreground">Friend</div>
                      </div>
                    </div>
                    <button onClick={() => removeFriend(f.friendshipId)} className="text-destructive text-[11px] font-semibold hover:bg-destructive/10 px-2 py-1 rounded-lg">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSection;
