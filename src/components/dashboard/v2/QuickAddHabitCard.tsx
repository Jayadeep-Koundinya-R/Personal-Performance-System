import React, { useState } from "react";
import { Plus, Sparkles, Clock, Calendar, Zap, Check } from "lucide-react";
import { TRACK_PRESETS } from "@/constants/onboardingPresets";
import { PrimaryTrackId } from "@/types/onboarding";
import { toast } from "sonner";

interface QuickAddHabitCardProps {
  onAddHabit: (
    name: string,
    category?: string,
    period?: string,
    priority?: string,
    dueDate?: string | null,
    startTime?: string | null,
    endTime?: string | null,
    color?: string
  ) => Promise<string | null>;
  primaryTrack?: string | null;
}

export const QuickAddHabitCard: React.FC<QuickAddHabitCardProps> = ({
  onAddHabit,
  primaryTrack,
}) => {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [period, setPeriod] = useState("Daily");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedChipId, setAddedChipId] = useState<string | null>(null);

  // Resolve track presets for 1-tap adaptive recommendations
  const activeTrackId = (primaryTrack ||
    (typeof window !== "undefined" ? localStorage.getItem("pps_active_track") : null) ||
    "placements") as PrimaryTrackId;

  const trackConfig = TRACK_PRESETS[activeTrackId] || TRACK_PRESETS.placements;
  const recommendedHabits = trackConfig?.anchorHabits || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) {
      if (!name.trim()) toast.error("Please enter a habit name");
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const err = await onAddHabit(
        name.trim(),
        "General",
        period,
        priority,
        todayStr,
        time || null,
        null,
        "indigo"
      );

      if (!err) {
        toast.success(`Habit "${name.trim()}" activated! 🚀`, {
          description: "Ready to check off in your daily stack.",
        });
        setName("");
        setTime("");
      } else {
        toast.error(err);
      }
    } catch {
      toast.error("Failed to create habit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle1TapChipAdd = async (habitTitle: string, category: string, chipId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setAddedChipId(chipId);

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const err = await onAddHabit(
        habitTitle,
        category || "General",
        "Daily",
        "High",
        todayStr,
        null,
        null,
        "indigo"
      );

      if (!err) {
        toast.success(`Added "${habitTitle}" to daily stack! 🎯`, {
          description: `1-tap added for track: ${trackConfig.title}`,
        });
      } else {
        toast.error(err);
      }
    } catch {
      toast.error("Failed to add recommended habit");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setAddedChipId(null), 1200);
    }
  };

  return (
    <div className="bg-card/75 border border-border/70 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all hover:border-primary/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            Quick Habit Creator
          </h4>
        </div>
        <kbd className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border font-mono">
          Q
        </kbd>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add habit (e.g. 2 LeetCode problems, 20m Walk)..."
            className="w-full bg-surface border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-surface border border-border/80 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground focus:text-foreground outline-none focus:border-primary"
          >
            <option value="High">🔴 High Priority</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-surface border border-border/80 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground focus:text-foreground outline-none focus:border-primary"
          >
            <option value="Daily">Daily</option>
            <option value="Today">Today Only</option>
            <option value="Weekly">Weekly</option>
          </select>

          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-surface border border-border/80 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground focus:text-foreground outline-none focus:border-primary"
            title="Scheduled start time"
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-bold transition-all hover:opacity-95 disabled:opacity-40 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Habit</span>
        </button>
      </form>

      {/* Track-Adaptive 1-Tap Habit Chips */}
      {recommendedHabits.length > 0 && (
        <div className="pt-2.5 border-t border-border/50 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1 text-primary">
              <Zap className="w-3 h-3 text-primary fill-current" />
              <span>1-Tap {trackConfig.badge || "Track"} Habits</span>
            </span>
            <span className="text-[9px] font-normal lowercase text-muted-foreground">1-tap add</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {recommendedHabits.map((habit) => {
              const isAdded = addedChipId === habit.id;
              return (
                <button
                  key={habit.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handle1TapChipAdd(habit.title, habit.category, habit.id)}
                  className={`text-[10.5px] font-medium border px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs group ${
                    isAdded
                      ? "bg-pps-green/15 text-pps-green border-pps-green/40"
                      : "bg-surface/80 hover:bg-primary/10 border-border/80 hover:border-primary/40 text-foreground"
                  }`}
                  title={`1-tap add "${habit.title}"`}
                >
                  {isAdded ? (
                    <Check className="w-3 h-3 text-pps-green" />
                  ) : (
                    <span className="text-primary font-black group-hover:scale-110 transition-transform">+</span>
                  )}
                  <span className="truncate max-w-[190px]">{habit.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
