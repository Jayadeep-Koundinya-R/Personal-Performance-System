import { useEffect } from "react";
import { useHabits } from "@/hooks/use-habits";
import { useReflections } from "@/hooks/use-reflections";
import { useUserSettings } from "@/hooks/use-user-settings";
import { X, Sun, CheckCircle2, Circle } from "lucide-react";

interface RitualOverlayProps {
  onDismiss: () => void;
}

export default function RitualOverlay({ onDismiss }: RitualOverlayProps) {
  const { habits, isHabitDueToday, getTodayStr, calculateWeeklyPoints } = useHabits();
  const { saveEntry } = useReflections();
  const { markRitualDone } = useUserSettings();
  const todayStr = getTodayStr();
  const dueToday = habits.filter((h) => isHabitDueToday(h));
  const doneToday = dueToday.filter((h) => h.completedDates.includes(todayStr));
  const pct = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;
  const weeklyXP = calculateWeeklyPoints();

  // Escape key support to cleanly dismiss
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onDismiss]);

  const finish = async () => {
    await markRitualDone();
    onDismiss();
  };

  const quickReflect = async () => {
    await saveEntry(`Morning ritual check-in. Today: ${doneToday.length}/${dueToday.length} habits done.`, "okay");
    await finish();
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
          aria-label="Close morning ritual"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <Sun className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black font-mono tracking-tight text-foreground">Morning Ritual</h2>
          <p className="text-xs text-muted-foreground">60 seconds to prime your focus & momentum</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/70 rounded-2xl p-4 border border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider mb-1">Today's Habits</div>
              <div className="text-2xl font-black font-mono text-primary">{doneToday.length}/{dueToday.length}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{pct}% completed</div>
            </div>
            <div className="bg-surface/70 rounded-2xl p-4 border border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider mb-1">Weekly Momentum</div>
              <div className="text-2xl font-black font-mono text-amber-500">{weeklyXP} XP</div>
              <div className="text-[11px] text-muted-foreground font-mono">Rolling 7 days</div>
            </div>
          </div>

          {dueToday.length > 0 && (
            <div className="bg-surface/50 rounded-2xl p-3 border border-border/50 space-y-2 max-h-36 overflow-y-auto">
              <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold tracking-wider px-1">Top Priorities</div>
              {dueToday.slice(0, 3).map((h) => {
                const isDone = h.completedDates.includes(todayStr);
                return (
                  <div key={h.id} className="flex items-center gap-2.5 px-2 py-1 rounded-xl text-xs text-foreground bg-background/50 border border-border/40">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`truncate font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>{h.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={finish}
            className="flex-1 py-2.5 rounded-2xl border border-border/80 text-xs font-mono font-bold text-muted-foreground hover:bg-surface hover:text-foreground hover:border-border transition-all cursor-pointer"
          >
            Skip for Today
          </button>
          <button
            onClick={quickReflect}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-2xl text-xs font-mono font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            Start Day 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
