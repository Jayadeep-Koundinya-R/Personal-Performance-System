import { useHabits } from "@/hooks/use-habits";
import { useReflections } from "@/hooks/use-reflections";
import { useUserSettings } from "@/hooks/use-user-settings";

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

  const finish = async () => {
    await markRitualDone();
    onDismiss();
  };

  const quickReflect = async () => {
    await saveEntry(`Morning ritual check-in. Today: ${doneToday.length}/${dueToday.length} habits done.`, "okay");
    await finish();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">☀️</div>
          <h2 className="text-xl font-bold">Morning Ritual</h2>
          <p className="text-[13px] text-muted-foreground mt-1">60 seconds to set your day</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Today's habits</div>
            <div className="text-2xl font-bold font-mono text-primary">{doneToday.length}/{dueToday.length}</div>
            <div className="text-[12px] text-muted-foreground">{pct}% complete</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Weekly XP</div>
            <div className="text-2xl font-bold font-mono text-pps-orange">{weeklyXP}</div>
          </div>
          {dueToday.slice(0, 3).map((h) => (
            <div key={h.id} className="flex items-center gap-2 text-[13px]">
              <span>{h.completedDates.includes(todayStr) ? "✅" : "⬜"}</span>
              <span>{h.name}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={finish} className="flex-1 py-2.5 rounded-xl border border-border text-[13px]">Skip</button>
          <button onClick={quickReflect} className="flex-1 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 rounded-xl text-[13px] font-semibold">
            Start Day 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
