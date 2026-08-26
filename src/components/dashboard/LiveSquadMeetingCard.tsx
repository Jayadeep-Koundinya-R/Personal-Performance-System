import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Radio, MessageSquare, Video, ArrowRight, Sparkles } from "lucide-react";
import { useGroups, GroupMember, StudyGroup } from "@/hooks/use-groups";
import { useAuth } from "@/hooks/use-auth";

interface LiveSquadMeetingCardProps {
  onNavigate?: (section: string) => void;
}

export const LiveSquadMeetingCard: React.FC<LiveSquadMeetingCardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { groups, membersMap, setActiveGroupId, loadSampleSquad } = useGroups();

  // Find all members across all groups currently studying / in a meeting
  const liveActiveSessions = useMemo(() => {
    const sessions: {
      group: StudyGroup;
      studyingMembers: GroupMember[];
    }[] = [];

    groups.forEach((g) => {
      const groupMembers = membersMap[g.id] || [];
      const studying = groupMembers.filter((m) => m.isStudying);
      if (studying.length > 0) {
        sessions.push({ group: g, studyingMembers: studying });
      }
    });

    return sessions;
  }, [groups, membersMap]);

  // Find the latest message across channels
  const latestMessageInfo = useMemo(() => {
    const userId = user?.id || "guest";
    // Check modern messages store first
    try {
      const modernStoreKey = `pps_focus_messages_store_${userId}`;
      const savedStore = localStorage.getItem(modernStoreKey);
      if (savedStore) {
        const parsedMap = JSON.parse(savedStore);
        if (parsedMap && typeof parsedMap === "object") {
          for (const g of groups) {
            // Check all channel keys for this group
            for (const [chId, msgList] of Object.entries(parsedMap)) {
              if (Array.isArray(msgList) && msgList.length > 0) {
                const lastMsg: any = msgList[msgList.length - 1];
                if (lastMsg?.groupId === g.id || chId.includes(g.id)) {
                  return {
                    group: g,
                    message: {
                      senderName: lastMsg.senderName || "Member",
                      text: lastMsg.content || lastMsg.text || "",
                    },
                  };
                }
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // Fallback check for legacy individual channel key
    for (const g of groups) {
      try {
        const genKey = `pps_channel_messages_${g.id}_ch_${g.id}_general`;
        const saved = localStorage.getItem(genKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const last = parsed[parsed.length - 1];
            return {
              group: g,
              message: {
                senderName: last.senderName || "Member",
                text: last.content || last.text || "",
              },
            };
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  }, [groups, user?.id]);

  // Case 1: Someone is currently live in a study session/meeting
  if (liveActiveSessions.length > 0) {
    const active = liveActiveSessions[0];
    return (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-destructive/15 via-card to-primary/10 border border-destructive/40 shadow-md relative overflow-hidden backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-destructive/20 border border-destructive/40 flex items-center justify-center text-destructive">
                <Video className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive border-2 border-card" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-black tracking-wider bg-destructive text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  LIVE STUDY ROOM
                </span>
                <span className="text-xs font-bold text-foreground truncate">{active.group.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <strong className="text-foreground">
                  {active.studyingMembers.map((m) => m.displayName || "Member").slice(0, 3).join(", ")}
                </strong>
                {active.studyingMembers.length > 3 && ` +${active.studyingMembers.length - 3} more`}
                {" "}are currently studying in Focus Room!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const meetUrl = `${window.location.origin}${window.location.pathname}#/meet/${active.group.id}?name=${encodeURIComponent(active.group.name)}`;
              window.open(meetUrl, `PPS_Meet_${active.group.id}`, "width=1320,height=840,menubar=no,toolbar=no,location=no,status=no,resizable=yes");
              setActiveGroupId(active.group.id);
              onNavigate?.("social");
            }}
            className="w-full sm:w-auto px-4 py-2 bg-destructive hover:bg-destructive/90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0 hover:scale-[1.02]"
          >
            <span>🚀 Join Live Room</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </div>
      </motion.div>
    );
  }

  // Case 2: Recent message or active group update
  if (latestMessageInfo) {
    const { group, message } = latestMessageInfo;
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3.5 px-4 rounded-2xl bg-surface/70 border border-primary/25 hover:border-primary/45 transition-all shadow-xs backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-primary">Squad Discussion</span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs font-bold text-foreground truncate">{group.name}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
                <span className="text-foreground font-semibold">{message.senderName || "Member"}:</span> {message.text}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGroupId(group.id);
              onNavigate?.("social");
            }}
            className="w-full sm:w-auto text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 flex-shrink-0"
          >
            <span>Open Squad Chat</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Case 3: If user has at least 1 group, show quick Squad Focus shortcut
  if (groups.length > 0) {
    const firstGroup = groups[0];
    const memberCount = (membersMap[firstGroup.id] || []).length;
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3.5 px-4 rounded-2xl bg-surface/60 border border-border/80 hover:border-primary/30 transition-all shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{firstGroup.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-surface border px-1.5 py-0.5 rounded-full">
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Start a co-study Focus Room with synced timer, chat, and whiteboard.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGroupId(firstGroup.id);
              onNavigate?.("social");
            }}
            className="w-full sm:w-auto text-xs font-bold bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 flex-shrink-0"
          >
            <span>Start Squad Room</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Case 4: 0 groups — Quick Invitation to Join / Explore Squads
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary/10 via-surface to-secondary/10 border border-border/80 hover:border-primary/30 transition-all shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">Study Squads & Co-Focus Rooms</span>
              <span className="text-[9px] font-mono uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">New</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Study alongside peers with synchronized timers, video rooms, and whiteboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              loadSampleSquad();
              onNavigate?.("social");
            }}
            className="flex-1 sm:flex-none text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Try Sample Squad</span>
          </button>
          <button
            onClick={() => onNavigate?.("social")}
            className="flex-1 sm:flex-none text-xs font-bold bg-surface border border-border hover:border-primary/40 text-foreground px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            Explore Squads →
          </button>
        </div>
      </div>
    </motion.div>
  );
};

