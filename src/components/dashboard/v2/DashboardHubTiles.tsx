import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Bell,
  BookOpen,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useGroups } from "@/hooks/use-groups";
import { useReminders } from "@/hooks/use-reminders";
import { useReflections } from "@/hooks/use-reflections";
import { calculateRolling7DayConsistency } from "@/lib/dashboard/vitality";
import { feedbackSounds } from "@/lib/audio/clickFeedback";

export interface DashboardHubTilesProps {
  habits: any[];
  todayStr: string;
  onNavigate?: (section: string) => void;
  targetFocusMinutes?: number;
}

export const DashboardHubTiles: React.FC<DashboardHubTilesProps> = ({
  habits = [],
  todayStr,
  onNavigate,
  targetFocusMinutes = 180,
}) => {
  const { todayFocusMinutes } = useFocusTimer();
  const { groups, members } = useGroups();
  const { reminders } = useReminders();
  const { entries: reflections } = useReflections();

  // 1. Focus: today's focus minutes vs daily target
  const focusTileData = useMemo(() => {
    const mins = todayFocusMinutes || 0;
    const target = targetFocusMinutes || 180;
    const pct = Math.min(100, Math.round((mins / target) * 100));
    return {
      title: "Focus Studio",
      metric: `${mins}m`,
      sub: mins > 0 ? `${pct}% of ${target}m target` : `Target: ${target}m today`,
      badge: mins > 0 ? "Active" : "Ready",
      badgeColor: mins > 0 ? "bg-primary/20 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border",
    };
  }, [todayFocusMinutes, targetFocusMinutes]);

  // 2. Squads: members online now in active groups
  const squadsTileData = useMemo(() => {
    if (!groups || groups.length === 0) {
      return {
        title: "Study Squads",
        metric: "0 Squads",
        sub: "Join or build a squad",
        badge: "Open",
        badgeColor: "bg-muted text-muted-foreground border-border",
      };
    }
    const onlineCount = (members || []).filter((m) => m.isStudying).length;
    return {
      title: "Study Squads",
      metric: `${onlineCount} Online`,
      sub: `${groups.length} active squad${groups.length === 1 ? "" : "s"}`,
      badge: onlineCount > 0 ? "Live" : "Idle",
      badgeColor: onlineCount > 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border",
    };
  }, [groups, members]);

  // 3. Reminders: next impending reminder
  const remindersTileData = useMemo(() => {
    const active = (reminders || []).filter((r) => r.enabled && r.time);
    if (active.length === 0) {
      return {
        title: "Reminders",
        metric: "None Active",
        sub: "Configure habit alarms",
        badge: "Off",
        badgeColor: "bg-muted text-muted-foreground border-border",
      };
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const sorted = [...active].sort((a, b) => {
      const [ha, ma] = a.time.split(":").map(Number);
      const [hb, mb] = b.time.split(":").map(Number);
      const minA = ha * 60 + ma;
      const minB = hb * 60 + mb;
      const diffA = minA >= currentMins ? minA - currentMins : minA + 1440 - currentMins;
      const diffB = minB >= currentMins ? minB - currentMins : minB + 1440 - currentMins;
      return diffA - diffB;
    });

    const next = sorted[0];
    return {
      title: "Reminders",
      metric: next.time,
      sub: next.label || "Habit Alarm",
      badge: `${active.length} set`,
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  }, [reminders]);

  // 4. Reflections: logged today or not
  const reflectionsTileData = useMemo(() => {
    const loggedToday = (reflections || []).some((r) => r.date === todayStr);
    return {
      title: "Reflections",
      metric: loggedToday ? "✓ Logged" : "Pending",
      sub: loggedToday ? "Evening review recorded" : "Daily journal review",
      badge: loggedToday ? "Complete" : "Action Needed",
      badgeColor: loggedToday
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        : "bg-pps-orange/20 text-pps-orange border-pps-orange/30",
    };
  }, [reflections, todayStr]);

  // 5. Analytics: 7-day rolling consistency velocity
  const analyticsTileData = useMemo(() => {
    const rollingScore = calculateRolling7DayConsistency(habits, todayStr);
    return {
      title: "Analytics",
      metric: `${rollingScore}%`,
      sub: "7-Day rolling velocity",
      badge: rollingScore >= 70 ? "Consistent" : rollingScore > 0 ? "Pacing" : "Igniting",
      badgeColor: rollingScore >= 70
        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        : "bg-primary/20 text-primary border-primary/30",
    };
  }, [habits, todayStr]);

  const tiles = [
    {
      id: "tracker",
      icon: <Clock className="w-4 h-4 text-primary" />,
      ...focusTileData,
    },
    {
      id: "social",
      icon: <Users className="w-4 h-4 text-cyan-400" />,
      ...squadsTileData,
    },
    {
      id: "reminders",
      icon: <Bell className="w-4 h-4 text-amber-400" />,
      ...remindersTileData,
    },
    {
      id: "reflections",
      icon: <BookOpen className="w-4 h-4 text-purple-400" />,
      ...reflectionsTileData,
    },
    {
      id: "analytics",
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      ...analyticsTileData,
    },
  ];

  const handleTileClick = (targetSection: string) => {
    feedbackSounds.playClick();
    onNavigate?.(targetSection);
  };

  return (
    <div className="space-y-2 mb-5">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground px-1">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Core Module Radar</span>
        </span>
        <span className="text-[10px] text-muted-foreground/80 font-mono hidden sm:inline">
          Live sync across Focus • Squads • Alarms • Logs • Trends
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => handleTileClick(tile.id)}
            className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-card/90 hover:bg-card border border-border/80 hover:border-primary/50 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg shadow-xs cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* Top row: Icon, Page Name & Status Badge */}
            <div className="flex items-center justify-between gap-1 w-full">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {tile.icon}
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-tight whitespace-nowrap">
                  {tile.title}
                </span>
              </div>
              <span className={`text-[9px] font-mono px-1 py-0.5 rounded-md border shrink-0 font-bold ${tile.badgeColor}`}>
                {tile.badge}
              </span>
            </div>

            {/* Middle: Live Primary Metric */}
            <div className="my-2 min-w-0">
              <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                {tile.metric}
              </div>
              <div className="text-[11px] text-muted-foreground truncate font-medium">
                {tile.sub}
              </div>
            </div>

            {/* Bottom: 1-Click Navigation Link Cue */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-muted-foreground/80 group-hover:text-primary pt-1 border-t border-border/40 w-full transition-colors">
              <span>View module</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardHubTiles;
