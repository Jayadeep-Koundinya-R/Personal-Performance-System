import React from "react";
import { StudyGroup, GroupMember } from "@/hooks/use-groups";
import { useHabits } from "@/hooks/use-habits";
import {
  Trophy,
  Flame,
  Users,
  BellRing,
  Plus,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface GroupDashboardProps {
  group: StudyGroup;
  members: GroupMember[];
  onNudgeAll: () => void;
  onOpenAddHabitModal: () => void;
  onJoinFocusRoom?: () => void;
  isStudyingInRoom?: boolean;
}

export const GroupDashboard: React.FC<GroupDashboardProps> = ({
  group,
  members,
  onNudgeAll,
  onOpenAddHabitModal,
  onJoinFocusRoom,
  isStudyingInRoom = false,
}) => {
  const { habits, toggleCompletion, isHabitDueToday, getTodayStr } = useHabits();
  const todayStr = getTodayStr();

  const activeStudyingCount = members.filter((m) => m.isStudying).length;
  const topStreakMember = [...members].sort((a, b) => b.currentStreak - a.currentStreak)[0];
  const totalCombinedStreak = members.reduce((sum, m) => sum + m.currentStreak, 0);

  // Relevant habits due today (Learning / Productivity or any active habit)
  const dueHabits = habits.filter((h) => isHabitDueToday(h) && !h.archived);
  const pendingDue = dueHabits.filter((h) => !(h.completedDates || []).includes(todayStr));

  const handleQuickCheckoff = async (habitId: string, habitName: string) => {
    try {
      await toggleCompletion(habitId);
      toast.success(`Completed "${habitName}" from ${group.name}! +10 XP 🎉`);
    } catch (err) {
      toast.error("Failed to check off habit. Please try again.");
    }
  };

  const handleOpenMeetWindow = () => {
    const meetUrl = `${window.location.origin}${window.location.pathname}#/meet/${group.id}?name=${encodeURIComponent(group.name)}`;
    window.open(meetUrl, `PPS_Meet_${group.id}`, "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
    toast.success(`Launched ${group.name} in a dedicated Meet Window! 🎥`);
  };

  return (
    <div className="p-5 border border-border/70 rounded-3xl bg-card/60 backdrop-blur-xl shadow-xl space-y-4">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-2xl shadow-sm">
            {group.avatarEmoji || "📚"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-foreground font-mono">
                {group.name}
              </h3>
              {activeStudyingCount > 0 && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{activeStudyingCount} In Audio/Video Call</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {group.studyTopic} • Invite Code:{" "}
              <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                {group.inviteCode}
              </span>
            </p>
          </div>
        </div>

        {/* Right Buttons: Call / Meet / Add Habit / Nudge */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Call Button */}
          {onJoinFocusRoom && (
            <button
              type="button"
              onClick={onJoinFocusRoom}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg ${
                isStudyingInRoom
                  ? "bg-emerald-500 text-black border border-emerald-400 shadow-emerald-500/20"
                  : "bg-gradient-to-r from-emerald-500 via-primary to-accent text-white hover:opacity-95 shadow-primary/25 animate-pulse"
              }`}
            >
              <span className="text-base">{isStudyingInRoom ? "🎙️" : "📞"}</span>
              <span>{isStudyingInRoom ? "In Studio (Connected)" : "Drop Into Call"}</span>
            </button>
          )}

          {/* Dedicated Zoom/Meet Window Launcher */}
          <button
            type="button"
            onClick={handleOpenMeetWindow}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl bg-surface border border-primary/40 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-xs"
            title="Launch in a Zoom / Google Meet styled separate window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Meet Window</span>
          </button>

          {/* Add Habit from Group */}
          <button
            type="button"
            onClick={onOpenAddHabitModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Habit</span>
          </button>

          {/* Broadcast Nudge */}
          <button
            type="button"
            onClick={onNudgeAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nudge</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Squad Members</span>
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-black text-foreground font-mono">
            {members.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Active members</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Focus Room</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {activeStudyingCount} Live
          </div>
          <div className="text-[10px] text-muted-foreground">Studying co-op now</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Top Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {topStreakMember?.currentStreak || 0}d
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {topStreakMember?.displayName || "Squad"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Combined Streak</span>
            <Trophy className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-black text-primary font-mono">
            {totalCombinedStreak} Days
          </div>
          <div className="text-[10px] text-muted-foreground">Group momentum</div>
        </div>
      </div>

      {/* In-Group Quick Habit Checkoff Pill Bar */}
      {pendingDue.length > 0 && (
        <div className="pt-2 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-extrabold uppercase text-primary">
              ⚡ Quick Complete Study Habits:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {pendingDue.slice(0, 3).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => handleQuickCheckoff(h.id, h.name)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{h.name}</span>
                <span className="text-[9px] font-mono font-extrabold text-amber-400 bg-black/20 px-1 py-0.2 rounded">
                  +10 XP
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
