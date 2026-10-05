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
    try {
      const modernStoreKey = `pps_focus_messages_store_${userId}`;
      const savedStore = localStorage.getItem(modernStoreKey);
      if (savedStore) {
        const parsedMap = JSON.parse(savedStore);
        if (parsedMap && typeof parsedMap === "object") {
          for (const g of groups) {
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
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full p-4 rounded-2xl bg-gradient-to-br from-destructive/20 via-card to-primary/10 border border-destructive/40 shadow-sm flex flex-col justify-between backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-black tracking-wider bg-destructive text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              LIVE STUDY
            </span>
            <span className="text-xs font-bold text-foreground truncate max-w-[130px]">{active.group.name}</span>
          </div>
        </div>

        <p className="text-xs text-foreground/90 font-medium leading-relaxed my-1 line-clamp-2">
          <strong className="text-destructive font-bold">
            {active.studyingMembers.map((m) => m.displayName || "Member").slice(0, 2).join(", ")}
          </strong>
          {active.studyingMembers.length > 2 && ` +${active.studyingMembers.length - 2} more`}
          {" "}are live in video focus room!
        </p>

        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10.5px] font-mono text-muted-foreground font-bold">
            {active.studyingMembers.length} studying now
          </span>
          <button
            onClick={() => {
              const meetUrl = `${window.location.origin}${window.location.pathname}#/meet/${active.group.id}?name=${encodeURIComponent(active.group.name)}`;
              window.open(meetUrl, `PPS_Meet_${active.group.id}`, "width=1320,height=840,menubar=no,toolbar=no,location=no,status=no,resizable=yes");
              setActiveGroupId(active.group.id);
              onNavigate?.("social");
            }}
            className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
          >
            <span>Join Room</span>
            <ArrowRight className="w-3 h-3" />
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
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full p-4 rounded-2xl bg-surface/70 border border-primary/25 hover:border-primary/45 transition-all shadow-xs flex flex-col justify-between backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs flex-shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground truncate">{group.name}</span>
          </div>
          <span className="text-[9.5px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
            Chat
          </span>
        </div>

        <p className="text-xs text-foreground/85 font-medium leading-relaxed my-1 line-clamp-2 italic">
          "{message.text}"
        </p>

        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-muted-foreground truncate max-w-[110px]">
            — {message.senderName}
          </span>
          <button
            onClick={() => {
              setActiveGroupId(group.id);
              onNavigate?.("social");
            }}
            className="text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
          >
            <span>Open Chat</span>
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
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full p-4 rounded-2xl bg-surface/70 border border-border/80 hover:border-primary/30 transition-all shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary text-xs flex-shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground truncate">{firstGroup.name}</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface border px-1.5 py-0.5 rounded-full font-bold">
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-xs text-muted-foreground font-medium leading-relaxed my-1 line-clamp-2">
          Launch a co-study Focus Room with synced group timer and whiteboard.
        </p>

        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground font-bold">Study Circle</span>
          <button
            onClick={() => {
              setActiveGroupId(firstGroup.id);
              onNavigate?.("social");
            }}
            className="text-xs font-bold bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30 px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <span>Squad Room</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Case 4: 0 groups — Quick Invitation to Join / Explore Squads
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 border border-border/80 hover:border-primary/30 transition-all shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs flex-shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground">Study Squads</span>
        </div>
        <span className="text-[9px] font-mono uppercase bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-bold">
          Co-Study
        </span>
      </div>

      <p className="text-xs text-foreground/80 font-medium leading-relaxed my-1 line-clamp-2">
        Study alongside peers with synchronized timers, video rooms, and leaderboard.
      </p>

      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <button
          onClick={() => {
            loadSampleSquad();
            onNavigate?.("social");
          }}
          className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          <span>Try Sample Squad</span>
        </button>
        <button
          onClick={() => onNavigate?.("social")}
          className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
        >
          Explore →
        </button>
      </div>
    </motion.div>
  );
};
