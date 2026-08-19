import React, { useState } from "react";
import { StudyGroup } from "@/hooks/use-groups";
import { Plus, Users, Zap, Hash, ArrowRight, Sparkles, BookOpen } from "lucide-react";

interface GroupListProps {
  groups: StudyGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroupClick: () => void;
  onJoinGroup: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  activeGroupId,
  onSelectGroup,
  onCreateGroupClick,
  onJoinGroup,
}) => {
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinLoading(true);
    setJoinError(null);
    const res = await onJoinGroup(joinCode);
    setJoinLoading(false);

    if (res.success) {
      setJoinCode("");
    } else {
      setJoinError(res.error || "Failed to join group");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Quick Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2 font-mono">
            <span className="text-xl">📚</span>
            <span>Study Groups</span>
          </h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Persistent rooms for co-studying & notes
          </p>
        </div>
        <button
          onClick={onCreateGroupClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Group</span>
        </button>
      </div>

      {/* Join with Invite Code Form */}
      <form onSubmit={handleJoin} className="relative">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase());
            setJoinError(null);
          }}
          placeholder="Enter 6-char Invite Code..."
          maxLength={8}
          className="w-full pl-3.5 pr-20 py-2 bg-surface/80 border border-border/80 rounded-xl text-xs font-mono font-bold tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary uppercase"
        />
        <button
          type="submit"
          disabled={joinLoading || !joinCode.trim()}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-extrabold rounded-lg transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
        >
          <span>{joinLoading ? "..." : "Join"}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </form>
      {joinError && (
        <p className="text-[11px] font-bold text-red-400 -mt-2 px-1">
          {joinError}
        </p>
      )}

      {/* Groups Scroll List */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {groups.map((g) => {
          const isActive = g.id === activeGroupId;
          return (
            <button
              key={g.id}
              onClick={() => onSelectGroup(g.id)}
              className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative overflow-hidden group ${
                isActive
                  ? "bg-primary/10 border-primary shadow-md"
                  : "bg-surface/60 border-border/70 hover:bg-surface hover:border-primary/40"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
              )}
              <div className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-xl flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                {g.avatarEmoji || "📚"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-foreground truncate">
                    {g.name}
                  </h4>
                  <span className="text-[10px] font-mono font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    {g.inviteCode}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                  {g.studyTopic || g.description}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span>{g.memberCount} members</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Focus Room Active</span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
