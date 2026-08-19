import React from "react";
import { GroupMember } from "@/hooks/use-groups";
import { Flame, BellRing, Shield, Award, Sparkles, GraduationCap } from "lucide-react";

interface MemberListProps {
  members: GroupMember[];
  onNudge: (memberName: string) => void;
}

export const MemberList: React.FC<MemberListProps> = ({ members, onNudge }) => {
  const teachers = members.filter((m) => m.role === "teacher" || m.role === "mentor");
  const admins = members.filter((m) => m.role === "admin");
  const regularMembers = members.filter((m) => m.role === "member");

  const renderMember = (m: GroupMember) => (
    <div
      key={m.id}
      className="flex items-center justify-between p-2.5 rounded-xl bg-surface/40 hover:bg-surface border border-border/50 transition-colors group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative">
          <div className="flex items-center justify-center w-8 h-8 text-base border rounded-xl bg-card border-border/60 shadow-xs">
            {m.avatar || "👤"}
          </div>
          {m.isStudying && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-card animate-pulse" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground truncate">
              {m.displayName}
            </span>
            {m.role === "teacher" && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                <GraduationCap className="w-2.5 h-2.5" />
                <span>Mentor</span>
              </span>
            )}
            {m.role === "admin" && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" />
                <span>Host</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-0.5 text-amber-400 font-bold">
              <Flame className="w-2.5 h-2.5 fill-amber-400" />
              <span>{m.currentStreak}d streak</span>
            </span>
            <span>•</span>
            <span className={m.isStudying ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
              {m.isStudying ? "Studying Now" : "Online"}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onNudge(m.displayName)}
        title={`Send accountability nudge to ${m.displayName}`}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer text-[10px] font-bold flex items-center gap-1"
      >
        <BellRing className="w-3 h-3" />
        <span className="hidden sm:inline">Nudge</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-muted-foreground">
          Study Squad ({members.length})
        </h3>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
          {members.filter((m) => m.isStudying).length} in Focus Room
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {teachers.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 px-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              <span>Mentors & Faculty</span>
            </div>
            {teachers.map(renderMember)}
          </div>
        )}

        {admins.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary/80 px-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Group Hosts</span>
            </div>
            {admins.map(renderMember)}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Members ({regularMembers.length})
          </div>
          {regularMembers.map(renderMember)}
        </div>
      </div>
    </div>
  );
};
