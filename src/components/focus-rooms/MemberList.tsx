import React from "react";
import { GroupMember } from "@/hooks/use-groups";
import { Flame, BellRing, Shield, Award, Sparkles, GraduationCap, X } from "lucide-react";

interface MemberListProps {
  members: GroupMember[];
  onNudge: (memberName: string) => void;
  onClose?: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({ members, onNudge, onClose }) => {
  const teachers = members.filter((m) => m.role === "teacher" || m.role === "mentor");
  const admins = members.filter((m) => m.role === "admin");
  const regularMembers = members.filter((m) => m.role === "member");

  const renderMember = (m: GroupMember) => (
    <div
      key={m.id}
      className="flex items-center justify-between p-2 rounded-xl bg-surface/40 hover:bg-surface border border-border/50 transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative">
          <div className="flex items-center justify-center w-7 h-7 text-sm border rounded-xl bg-card border-border/60 shadow-xs">
            {m.avatar || "👤"}
          </div>
          {m.isStudying && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-card animate-pulse" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-foreground truncate">
              {m.displayName}
            </span>
            {m.role === "teacher" && (
              <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                <GraduationCap className="w-2 h-2" />
              </span>
            )}
            {m.role === "admin" && (
              <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-0.5">
                <Shield className="w-2 h-2" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium">
            <span className="flex items-center gap-0.5 text-amber-400 font-bold">
              <Flame className="w-2 h-2 fill-amber-400" />
              <span>{m.currentStreak}d</span>
            </span>
            <span>•</span>
            <span className={m.isStudying ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
              {m.isStudying ? "Studying" : "Online"}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onNudge(m.displayName)}
        title={`Send accountability nudge to ${m.displayName}`}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
      >
        <BellRing className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border/40 flex-shrink-0">
        <div>
          <h3 className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-muted-foreground">
            Members ({members.length})
          </h3>
          <span className="text-[10px] font-bold text-emerald-400">
            {members.filter((m) => m.isStudying).length} in Focus Room
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {teachers.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 px-1 flex items-center gap-1">
              <GraduationCap className="w-2.5 h-2.5" />
              <span>Mentors</span>
            </div>
            {teachers.map(renderMember)}
          </div>
        )}

        {admins.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-primary/80 px-1 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              <span>Hosts</span>
            </div>
            {admins.map(renderMember)}
          </div>
        )}

        <div className="space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Members ({regularMembers.length})
          </div>
          {regularMembers.map(renderMember)}
        </div>
      </div>
    </div>
  );
};
